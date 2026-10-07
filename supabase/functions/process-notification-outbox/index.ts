// Supabase Edge Function: process-notification-outbox (worker YCloud).
//
// Arquitetura FINAL (sem dependência do navegador):
//   Booking → create_booking → notification_outbox(pending)
//   → CRON server-side (pg_cron, ver supabase/manual_setup/outbox_cron.sql)
//   → ESTA função (service_role) → YCloud → WhatsApp do cliente.
// O usuário pode fechar a página: a linha já está no banco como pending e o
// cron a recolhe. O frontend NÃO dispara esta função.
//
// TEMPLATE (produção — janela 24h NUNCA assumida):
//   Sempre template aprovado (categoria UTILITY). Nome/idioma via secrets:
//     YCLOUD_BOOKING_TEMPLATE_NAME (padrão: iplay_booking_confirmation — IN REVIEW)
//     YCLOUD_BOOKING_TEMPLATE_LANG (padrão: pt_BR)
//   Ordem dos parâmetros (ver TEMPLATE_PARAM_ORDER em message.ts):
//     1 first_name · 2 modelo · 3 serviço+opção · 4 data BR · 5 janela
//     6 pix ("R$ X" ou "a confirmar") · 7 cartão ("R$ Y em até 10x" ou "a confirmar")
//     8 protocolo
//   Texto livre (type=text) é SOMENTE teste técnico dentro de janela de 24h válida,
//   exigindo YCLOUD_ALLOW_FREE_TEXT=true + body {mode:"text"}.
//
// Segurança:
//   - YCLOUD_API_KEY, SUPABASE_SERVICE_ROLE_KEY: SOMENTE aqui (Deno.env).
//     Nunca em VITE_*, nunca no browser, nunca no banco em claro, nunca nos logs.
//   - verify_jwt = false no gateway; autorização EXCLUSIVA via header
//     x-worker-secret === OUTBOX_WORKER_SECRET (obrigatório, sem fallback).
//     Único chamador legítimo: pg_cron (segredo no Vault).
//   - Booking NUNCA falha por causa do WhatsApp (fluxos separados).
//
// Claim/concorrência:
//   - COM migration 0006: RPC claim_notification_batch() — CTE com
//     FOR UPDATE SKIP LOCKED, reclama 'pending' + 'processing' abandonado
//     (claimed_at velho/NULL), nunca 'sent'/'failed', attempts+1 atômico.
//   - SEM 0006 (fallback degradado): UPDATE otimista por id com
//     WHERE status='pending'; sem recuperação de abandonados.
//   - externalId = id do outbox (correlação YCloud/webhook, cf. docs YCloud).
//   - Provider ids: colunas provider_message_id/provider_wamid (0006) +
//     espelho em payload.provider (funciona antes e depois da migration).

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

import {
  buildConfirmationText,
  buildTemplateParams,
  decideSendMode,
  firstNameOf,
  formatDateBR,
  isClaimable,
  normalizeBRPhoneToE164,
  resolveFailure,
  sanitizeError,
  sanitizeException,
  windowLabelOf,
  DEFAULT_STALE_SECONDS,
  type ConfirmationData,
} from './message.ts';

const YCLOUD_SEND_URL = 'https://api.ycloud.com/v2/whatsapp/messages';
const FETCH_TIMEOUT_MS = 15000;
const DEFAULT_TEMPLATE_NAME = 'iplay_booking_confirmation';

interface WorkerEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  YCLOUD_API_KEY?: string;
  YCLOUD_WHATSAPP_FROM?: string;
  YCLOUD_BOOKING_TEMPLATE_NAME?: string;
  YCLOUD_BOOKING_TEMPLATE_LANG?: string;
  YCLOUD_ALLOW_FREE_TEXT?: string;
  OUTBOX_WORKER_SECRET?: string;
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function safeLog(entry: Record<string, unknown>): void {
  console.log(JSON.stringify(entry));
}

function validE164(value: string | undefined): boolean {
  return !!value && /^\+\d{10,15}$/.test(value);
}

// Linha do outbox (pós-0006 inclui claimed_at/provider_*; pré-0006 não).
interface OutboxRow {
  id: string;
  company_id: string;
  appointment_id: string | null;
  type: string;
  destino: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  claimed_at?: string | null;
  provider_message_id?: string | null;
  provider_wamid?: string | null;
}

async function ycloudSend(args: {
  apiKey: string;
  from: string;
  to: string;
  externalId: string;
  mode: 'template' | 'text';
  templateName?: string;
  templateLang?: string;
  textBody?: string;
  templateParams?: string[];
}): Promise<{ ok: boolean; status: number | null; providerId?: string; wamid?: string; raw: string }> {
  const body: Record<string, unknown> =
    args.mode === 'text'
      ? {
          from: args.from,
          to: args.to,
          type: 'text',
          text: { body: args.textBody, preview_url: false },
          externalId: args.externalId,
        }
      : {
          from: args.from,
          to: args.to,
          type: 'template',
          template: {
            name: args.templateName,
            language: { code: args.templateLang ?? 'pt_BR', policy: 'deterministic' },
            components: [
              {
                type: 'body',
                parameters: (args.templateParams ?? []).map((text) => ({ type: 'text', text })),
              },
            ],
          },
          externalId: args.externalId,
        };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(YCLOUD_SEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': args.apiKey },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const raw = await res.text().catch(() => '');
    if (!res.ok) return { ok: false, status: res.status, raw };
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return { ok: false, status: res.status, raw: 'resposta não-JSON da YCloud' };
    }
    // Doc oficial: 200 + {id, status:"accepted", ...}. Só conta como enviado
    // quando a YCloud ACEITA (id presente).
    if (typeof data.id !== 'string' || !data.id) {
      return { ok: false, status: res.status, raw: raw.slice(0, 200) };
    }
    return {
      ok: true,
      status: res.status,
      providerId: data.id,
      wamid: typeof data.wamid === 'string' ? data.wamid : undefined,
      raw,
    };
  } catch {
    return { ok: false, status: null, raw: '' };
  } finally {
    clearTimeout(timer);
  }
}

type DbClient = {
  rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
  from: (table: string) => unknown;
};

function isMissingRoutine(error: { code?: string } | null): boolean {
  return !!error && (error.code === '42883' || error.code === 'PGRST202');
}

/** Código PostgREST de coluna inexistente (pré-0006). */
const MISSING_COLUMN_CODE = '42703';

/**
 * Claim de um lote: prefere a RPC claim_notification_batch (0006, com
 * SKIP LOCKED + recuperação de abandonados); cai para o modo otimista
 * pré-0006 quando a função ainda não existe no banco.
 */
async function claimBatch(
  db: DbClient,
  limit: number,
  outboxId: string | null,
): Promise<{ jobs: OutboxRow[]; via: 'rpc' | 'legacy' }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = db as any;
  const { data, error } = await db.rpc('claim_notification_batch', {
    p_limit: outboxId ? 1 : limit,
    p_types: ['booking_confirmation', 'google_review_request'],
    p_stale_seconds: DEFAULT_STALE_SECONDS,
  });
  if (!error) {
    let jobs = (data ?? []) as OutboxRow[];
    if (outboxId) jobs = jobs.filter((j) => j.id === outboxId);
    return { jobs, via: 'rpc' };
  }
  if (!isMissingRoutine(error)) {
    throw new Error(`claim_rpc_failed: ${error.message}`);
  }
  // Fallback pré-0006: localiza pendings e reclama um a um com
  // UPDATE ... WHERE status='pending' (perdedor recebe 0 linhas → skipped).
  let query = client
    .from('notification_outbox')
    .select('id,company_id,appointment_id,type,destino,payload,status,attempts')
    .eq('status', 'pending')
    .in('type', ['booking_confirmation', 'google_review_request'])
    .order('created_at', { ascending: true })
    .limit(outboxId ? 1 : limit);
  if (outboxId) query = query.eq('id', outboxId);
  const listed = await query;
  if (listed.error) throw new Error(`outbox_list_failed: ${listed.error.message}`);
  const jobs: OutboxRow[] = [];
  for (const row of (listed.data ?? []) as OutboxRow[]) {
    if (!['booking_confirmation', 'google_review_request'].includes(row.type) || !isClaimable({ status: row.status, claimed_at: null }, Date.now())) {
      continue;
    }
    const claimed = await client
      .from('notification_outbox')
      .update({ status: 'processing', attempts: row.attempts + 1 })
      .eq('id', row.id)
      .eq('status', 'pending')
      .select('id,company_id,appointment_id,type,destino,payload,status,attempts');
    if (!claimed.error && claimed.data && (claimed.data as OutboxRow[]).length > 0) {
      jobs.push((claimed.data as OutboxRow[])[0]);
    }
  }
  return { jobs, via: 'legacy' };
}

/** Resultado de escrita no outbox — updateOutbox NUNCA lança exceção. */
export interface UpdateResult {
  ok: boolean;
  stage: 'primary' | 'fallback';
  code?: string;
  message?: string;
}

async function tryUpdate(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any,
  id: string,
  patch: Record<string, unknown>,
): Promise<Omit<UpdateResult, 'stage'>> {
  try {
    const res = await table.update(patch).eq('id', id);
    if (!res.error) return { ok: true };
    return { ok: false, code: res.error?.code, message: res.error?.message };
  } catch (e) {
    return { ok: false, code: 'THROWN', message: sanitizeException(e) };
  }
}

/**
 * UPDATE com fallbacks, sem nunca lançar:
 * 1. patch completo;
 * 2. se 42703 (colunas 0006 ausentes), repete sem provider_message_id/wamid;
 * 3. em qualquer falha persistente, tenta o mínimo {status, error_message}.
 * Devolve o resultado para o chamador registrar/logar.
 */
async function updateOutbox(db: DbClient, id: string, patch: Record<string, unknown>): Promise<UpdateResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = (db as any).from('notification_outbox');
  const primary = await tryUpdate(table, id, patch);
  if (primary.ok) return { ok: true, stage: 'primary' };
  let last = primary;
  if (primary.code === MISSING_COLUMN_CODE) {
    const { provider_message_id: _pm, provider_wamid: _pw, ...stripped } = patch;
    void _pm;
    void _pw;
    const strippedResult = await tryUpdate(table, id, stripped);
    if (strippedResult.ok) return { ok: true, stage: 'fallback' };
    last = strippedResult;
  }
  const minimal = await tryUpdate(table, id, {
    status: patch.status,
    error_message: patch.error_message ?? null,
  });
  if (minimal.ok) return { ok: true, stage: 'fallback' };
  return { ok: false, stage: 'fallback', code: minimal.code ?? last.code, message: minimal.message ?? last.message };
}

export interface FinishOutcome {
  recorded: boolean;
  stage: 'primary' | 'fallback' | 'unrecorded';
  code?: string;
}

/**
 * Grava o desfecho de um job no outbox. NUNCA lança exceção: qualquer falha
 * de escrita é registrada via safeLog (só id/etapa/código sanitizado —
 * sem payload, telefone, nome, endereço, secrets ou headers) e reportada
 * no retorno. É isso que impede um job quebrado de derrubar o worker.
 */
export async function finishOutbox(
  db: DbClient,
  jobId: string,
  patch: Record<string, unknown>,
): Promise<FinishOutcome> {
  try {
    const result = await updateOutbox(db, jobId, patch);
    if (result.ok) return { recorded: true, stage: result.stage };
    safeLog({
      event: 'outbox_finish_failed',
      at: new Date().toISOString(),
      id: jobId,
      stage: result.stage,
      code: result.code ?? 'unknown',
    });
    return { recorded: false, stage: result.stage, code: result.code };
  } catch (e) {
    safeLog({
      event: 'outbox_finish_failed',
      at: new Date().toISOString(),
      id: jobId,
      stage: 'unrecorded',
      code: 'THROWN',
    });
    void sanitizeException(e);
    return { recorded: false, stage: 'unrecorded', code: 'THROWN' };
  }
}

export async function handleWorkerRequest(req: Request, env: WorkerEnv): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'Método não suportado.' });

  // Auth do worker: EXCLUSIVAMENTE x-worker-secret === OUTBOX_WORKER_SECRET.
  // Sem fallback para Authorization Bearer/anon key e sem modo dev:
  // secret ausente no ambiente, header ausente ou header incorreto → 401.
  // O secret nunca é logado nem retornado.
  if (!env.OUTBOX_WORKER_SECRET) {
    return json(401, { error: 'Não autorizado.' });
  }
  if (req.headers.get('x-worker-secret') !== env.OUTBOX_WORKER_SECRET) {
    return json(401, { error: 'Não autorizado.' });
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, YCLOUD_API_KEY, YCLOUD_WHATSAPP_FROM } = env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: 'Worker temporariamente indisponível.' });
  }
  if (!YCLOUD_API_KEY) return json(500, { error: 'Worker temporariamente indisponível.' });
  if (!validE164(YCLOUD_WHATSAPP_FROM)) {
    safeLog({ event: 'outbox_misconfigured', at: new Date().toISOString(), reason: 'from_invalid' });
    return json(500, { error: 'Worker temporariamente indisponível.' });
  }

  let input: { outbox_id?: unknown; mode?: unknown; limit?: unknown } = {};
  try {
    input = (await req.json()) as typeof input;
  } catch {
    input = {};
  }
  const onlyId = typeof input.outbox_id === 'string' && input.outbox_id ? input.outbox_id : null;
  const limitRaw = typeof input.limit === 'number' ? input.limit : 10;
  const limit = Math.min(Math.max(Math.floor(limitRaw), 1), 50);

  const allowFreeText = env.YCLOUD_ALLOW_FREE_TEXT === 'true';
  const decided = decideSendMode(allowFreeText, input.mode);
  if ('error' in decided) {
    return json(400, { error: 'Texto livre fora da janela de produção não é permitido.' });
  }
  const mode = decided.mode;
  const templateName = env.YCLOUD_BOOKING_TEMPLATE_NAME || DEFAULT_TEMPLATE_NAME;
  const templateLang = env.YCLOUD_BOOKING_TEMPLATE_LANG || 'pt_BR';

  // @ts-ignore import Deno-only (resolvido via esm.sh no deploy; fora do typecheck local)
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let jobs: OutboxRow[];
  let via: string;
  try {
    const claimed = await claimBatch(db, limit, onlyId);
    jobs = claimed.jobs;
    via = claimed.via;
  } catch {
    safeLog({ event: 'outbox_claim_failed', at: new Date().toISOString() });
    return json(500, { error: 'Falha ao reservar pendências.' });
  }

  const processed: Array<Record<string, unknown>> = [];

  // finish() não lança: finishOutbox captura tudo internamente, então um
  // job quebrado nunca interrompe o loop nem a resposta do worker.
  const finish = async (job: OutboxRow, patch: Record<string, unknown>, result: string): Promise<void> => {
    const outcome = await finishOutbox(db, job.id, patch);
    processed.push({
      id: job.id,
      status: outcome.recorded ? result : `${result}:unrecorded`,
      recorded: outcome.recorded,
      stage: outcome.stage,
    });
    safeLog({
      event: 'outbox_processed',
      at: new Date().toISOString(),
      id: job.id,
      result,
      via,
      recorded: outcome.recorded,
      stage: outcome.stage,
      attempts: (patch.attempts as number) ?? job.attempts,
    });
  };

  for (const job of jobs) {
    try {
      if (!job.appointment_id) {
        await finish(job, { status: 'failed', error_message: 'APPOINTMENT_MISSING' }, 'failed');
        continue;
      }
      // Carrega tudo server-side (service_role). Endereço NÃO é carregado:
      // a mensagem só diz "endereço informado", sem expor rua/número.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = db as any;
      const { data: appointment } = await client
        .from('appointments')
        .select(
          'id,company_id,client_id,device_id,service_id,service_option_id,scheduled_date,scheduled_start_time,scheduled_end_time,protocol,quoted_pix_total,quoted_card_total',
        )
        .eq('id', job.appointment_id)
        .maybeSingle();
      if (!appointment) {
        await finish(job, { status: 'failed', error_message: 'APPOINTMENT_NOT_FOUND' }, 'failed');
        continue;
      }
      const [clientRes, deviceRes, serviceRes, optionRes] = await Promise.all([
        client.from('clients').select('id,name,phone,whatsapp').eq('id', appointment.client_id).maybeSingle(),
        client.from('devices').select('id,model_id').eq('id', appointment.device_id).maybeSingle(),
        client.from('services').select('id,name').eq('id', appointment.service_id).maybeSingle(),
        appointment.service_option_id
          ? client.from('service_options').select('id,name').eq('id', appointment.service_option_id).maybeSingle()
          : Promise.resolve({ data: null as { name?: string } | null }),
      ]);
      const modelRes = deviceRes.data
        ? await client.from('device_models').select('id,name').eq('id', deviceRes.data.model_id).maybeSingle()
        : { data: null as { name?: string } | null };

      const clientName: string = clientRes.data?.name ?? 'cliente';
      const rawPhone: string = job.destino || clientRes.data?.phone || clientRes.data?.whatsapp || '';
      const phone = normalizeBRPhoneToE164(rawPhone);
      if (!phone.ok || !phone.e164) {
        await finish(job, { status: 'failed', error_message: 'PHONE_INVALID' }, 'failed');
        continue;
      }

      const data: ConfirmationData = {
        firstName: firstNameOf(clientName),
        model: (modelRes.data?.name as string) ?? 'iPhone',
        service: (serviceRes.data?.name as string) ?? 'Reparo',
        option: (optionRes.data?.name as string) ?? null,
        dateBR: formatDateBR(appointment.scheduled_date),
        windowLabel: windowLabelOf(
          String(appointment.scheduled_start_time).slice(0, 5),
          appointment.scheduled_end_time ? String(appointment.scheduled_end_time).slice(0, 5) : null,
        ),
        pix: appointment.quoted_pix_total ?? null,
        card: appointment.quoted_card_total ?? null,
        protocol: appointment.protocol ?? job.id,
      };

      const send =
        mode === 'text'
          ? await ycloudSend({
              apiKey: YCLOUD_API_KEY,
              from: YCLOUD_WHATSAPP_FROM as string,
              to: phone.e164,
              externalId: job.id,
              mode: 'text',
              textBody: buildConfirmationText(data),
            })
          : await ycloudSend({
              apiKey: YCLOUD_API_KEY,
              from: YCLOUD_WHATSAPP_FROM as string,
              to: phone.e164,
              externalId: job.id,
              mode: 'template',
              templateName,
              templateLang,
              templateParams: buildTemplateParams(data),
            });

      const basePayload =
        job.payload && typeof job.payload === 'object' ? (job.payload as Record<string, unknown>) : {};
      if (send.ok) {
        // sent SOMENTE com aceite documentado da YCloud (200 + id).
        await finish(
          job,
          {
            status: 'sent',
            sent_at: new Date().toISOString(),
            error_message: null,
            provider_message_id: send.providerId ?? null,
            provider_wamid: send.wamid ?? null,
            payload: {
              ...basePayload,
              provider: { id: send.providerId, wamid: send.wamid ?? null, mode },
            },
          },
          'sent',
        );
      } else {
        const decided2 = resolveFailure(job.attempts, send.status);
        await finish(
          job,
          { status: decided2.status, error_message: sanitizeError(send.status, send.raw) },
          decided2.result,
        );
      }
    } catch (e) {
      // Qualquer exceção no corpo do job vira failed com causa sanitizada;
      // finish() não lança, então o loop sempre continua para o próximo job.
      const cause = sanitizeException(e);
      safeLog({ event: 'outbox_job_failed', at: new Date().toISOString(), id: job.id, cause });
      await finish(job, { status: 'failed', error_message: cause }, 'failed');
    }
  }

  return json(200, { ok: true, mode, via, processed });
}

export function handleRequest(req: Request, env: WorkerEnv): Promise<Response> {
  return handleWorkerRequest(req, env);
}

if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  Deno.serve((req: Request) =>
    handleWorkerRequest(req, {
      SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      YCLOUD_API_KEY: Deno.env.get('YCLOUD_API_KEY'),
      YCLOUD_WHATSAPP_FROM: Deno.env.get('YCLOUD_WHATSAPP_FROM'),
      YCLOUD_BOOKING_TEMPLATE_NAME: Deno.env.get('YCLOUD_BOOKING_TEMPLATE_NAME'),
      YCLOUD_BOOKING_TEMPLATE_LANG: Deno.env.get('YCLOUD_BOOKING_TEMPLATE_LANG'),
      YCLOUD_ALLOW_FREE_TEXT: Deno.env.get('YCLOUD_ALLOW_FREE_TEXT'),
      OUTBOX_WORKER_SECRET: Deno.env.get('OUTBOX_WORKER_SECRET'),
    }),
  );
}
