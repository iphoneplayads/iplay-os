// Supabase Edge Function: whatsapp-webhook (YCloud).
//
// Provedor: YCloud (WhatsApp Business App via Coexistence).
// Recebe apenas POST da YCloud com assinatura HMAC-SHA256 por endpoint.
//
// Autenticação oficial (docs YCloud "Configure Webhooks" + "Webhook Integration Guide"):
// - Header: `YCloud-Signature: t={unix_ts},s={hex_hmac}`
// - Mensagem assinada: `{timestamp}.{raw_body}` (raw body exato, sem re-stringify)
// - Chave: `secret` do webhook endpoint (Dashboard → Developers → Webhooks,
//   ou API Retrieve webhook endpoint / Create webhook endpoint)
// - Algoritmo: HMAC-SHA256, saída hex minúscula
//
// Segredo server-side: YCLOUD_WEBHOOK_SECRET (nunca em VITE_*, frontend ou Git).
// Configurado via `supabase secrets set` ou Dashboard.
//
// Escopo DESTA etapa: apenas receber + autenticar + reconhecer eventos.
// Sem chatbot, sem envio de mensagens, sem acesso a banco, sem migrations,
// sem alterar notification_outbox.
//
// Eventos suportados (reconhecer + log mínimo + 200):
// - whatsapp.inbound_message.received  (payload: whatsappInboundMessage)
// - whatsapp.message.updated           (payload: whatsappMessage | whatsappGroup)
// - whatsapp.smb.message.echoes        (payload: whatsappMessage)
// - whatsapp.smb.app.state.sync       (payload: whatsappSmbAppStateSync)
// Eventos desconhecidos: 200 com {ok:true, ignored:true} para evitar retries.
// Erros de autenticação/JSON/envelope: 4xx (YCloud retenta até 7x, depois desiste).
//
// Decisão GET Meta: o handshake GET hub.mode/hub.verify_token/hub.challenge era
// específico do webhook direto da Meta. A YCloud NÃO usa esse fluxo — a verificação
// é por-request via YCloud-Signature em POST. Por isso o GET foi REMOVIDO:
// manter o handshake morto exigiria manter o secret legado
// WHATSAPP_WEBHOOK_VERIFY_TOKEN e uma superfície GET não utilizada.
// Qualquer método != POST agora retorna 405.

// Declaração mínima para typecheck local (o runtime Deno real fornece tudo).
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

export interface WebhookEnv {
  YCLOUD_WEBHOOK_SECRET?: string;
}

export const SUPPORTED_EVENTS = [
  'whatsapp.inbound_message.received',
  'whatsapp.message.updated',
  'whatsapp.smb.message.echoes',
  'whatsapp.smb.app.state.sync',
] as const;

export type SupportedEventType = (typeof SUPPORTED_EVENTS)[number];

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function jsonOk(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ ok: true, ...body }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface ParsedSignature {
  timestamp: string;
  signature: string;
}

/** Parse oficial: `t={ts},s={hex}` (ordem tolerada, espaços tolerados). */
export function parseSignatureHeader(header: string | null): ParsedSignature | null {
  if (!header) return null;
  const parts = header.split(',');
  let timestamp: string | null = null;
  let signature: string | null = null;
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === 't') timestamp = value;
    else if (key === 's') signature = value;
  }
  if (!timestamp || !signature) return null;
  // timestamp: unix seconds em dígitos; assinatura: hex (64 chars p/ SHA256).
  if (!/^\d+$/.test(timestamp)) return null;
  if (!/^[0-9a-fA-F]+$/.test(signature)) return null;
  if (signature.length !== 64) return null;
  return { timestamp, signature: signature.toLowerCase() };
}

function hexEncode(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let out = '';
  for (let i = 0; i < view.length; i++) {
    out += view[i].toString(16).padStart(2, '0');
  }
  return out;
}

/** Comparação em tempo constante para não vazar prefixo via timing. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function computeExpectedSignature(
  secret: string,
  timestamp: string,
  rawBody: string,
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign('HMAC', key, enc.encode(`${timestamp}.${rawBody}`));
  return hexEncode(signed);
}

export async function verifyYCloudSignature(
  rawBody: string,
  header: string | null,
  secret: string | undefined,
): Promise<{ ok: boolean; reason?: string; timestamp?: string }> {
  if (!secret) return { ok: false, reason: 'missing_secret' };
  const parsed = parseSignatureHeader(header);
  if (!parsed) return { ok: false, reason: 'malformed_signature' };
  const expected = await computeExpectedSignature(secret, parsed.timestamp, rawBody);
  if (!timingSafeEqual(expected, parsed.signature)) {
    return { ok: false, reason: 'mismatch', timestamp: parsed.timestamp };
  }
  return { ok: true, timestamp: parsed.timestamp };
}

interface EnvelopeCheck {
  ok: boolean;
  id?: string;
  type?: string;
  body?: Record<string, unknown>;
  error?: string;
}

function checkEnvelope(body: unknown): EnvelopeCheck {
  if (!isRecord(body)) return { ok: false, error: 'Envelope deve ser um objeto JSON.' };
  const id = body.id;
  const type = body.type;
  if (typeof id !== 'string' || id.length === 0) {
    return { ok: false, error: 'Campo essencial ausente: id.' };
  }
  if (typeof type !== 'string' || type.length === 0) {
    return { ok: false, error: 'Campo essencial ausente: type.' };
  }
  return { ok: true, id, type, body };
}

/**
 * Log mínimo e seguro: NUNCA telefones, mensagens, mídia, contatos, tokens.
 * Apenas ids/status/contagens — suficiente para operar sem expor conversa.
 */
function safeLog(entry: Record<string, unknown>): void {
  console.log(JSON.stringify(entry));
}

function summarizeKnownEvent(
  type: string,
  body: Record<string, unknown>,
): { ok: boolean; summary?: Record<string, unknown>; error?: string } {
  if (type === 'whatsapp.inbound_message.received') {
    const msg = body.whatsappInboundMessage;
    if (!isRecord(msg)) {
      return { ok: false, error: 'Campo essencial ausente: whatsappInboundMessage.' };
    }
    const messageId = typeof msg.id === 'string' ? msg.id : undefined;
    const kind = typeof msg.type === 'string' ? msg.type : 'unknown';
    return { ok: true, summary: { messageId: messageId ?? 'unknown', kind } };
  }
  if (type === 'whatsapp.message.updated') {
    // Caso grupo usa `whatsappGroup` em vez de `whatsappMessage` (docs YCloud).
    const msg = body.whatsappMessage;
    const group = body.whatsappGroup;
    if (isRecord(msg)) {
      const status = typeof msg.status === 'string' ? msg.status : 'unknown';
      const messageId = typeof msg.id === 'string' ? msg.id : 'unknown';
      return { ok: true, summary: { messageId, status } };
    }
    if (isRecord(group)) {
      const status = typeof group.status === 'string' ? group.status : 'unknown';
      return { ok: true, summary: { groupStatus: status } };
    }
    return { ok: false, error: 'Campo essencial ausente: whatsappMessage/whatsappGroup.' };
  }
  if (type === 'whatsapp.smb.message.echoes') {
    const msg = body.whatsappMessage;
    if (!isRecord(msg)) {
      return { ok: false, error: 'Campo essencial ausente: whatsappMessage.' };
    }
    const status = typeof msg.status === 'string' ? msg.status : 'unknown';
    const messageId = typeof msg.id === 'string' ? msg.id : 'unknown';
    return { ok: true, summary: { messageId, status } };
  }
  if (type === 'whatsapp.smb.app.state.sync') {
    const sync = body.whatsappSmbAppStateSync;
    if (!isRecord(sync)) {
      return { ok: false, error: 'Campo essencial ausente: whatsappSmbAppStateSync.' };
    }
    const items = Array.isArray(sync.stateSync) ? sync.stateSync.length : 0;
    return { ok: true, summary: { items } };
  }
  return { ok: false, error: 'Evento desconhecido.' };
}

async function handlePost(req: Request, env: WebhookEnv): Promise<Response> {
  const secret = env.YCLOUD_WEBHOOK_SECRET ?? '';

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return jsonError(400, 'Corpo ilegível.');
  }

  // Autentica ANTES de interpretar o JSON (assinatura cobre o raw body exato).
  const signatureHeader = req.headers.get('ycloud-signature');
  const verified = await verifyYCloudSignature(raw, signatureHeader, secret || undefined);
  if (!verified.ok) {
    if (verified.reason === 'missing_secret') {
      safeLog({ event: 'ycloud_webhook_misconfigured', at: new Date().toISOString() });
      return jsonError(500, 'Webhook temporariamente indisponível.');
    }
    return jsonError(401, 'Assinatura inválida.');
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return jsonError(400, 'Corpo deve ser JSON válido.');
  }

  const envelope = checkEnvelope(body);
  if (!envelope.ok || !envelope.id || !envelope.type || !envelope.body) {
    return jsonError(400, envelope.error ?? 'Evento inválido.');
  }
  const { id, type, body: record } = envelope;

  if (!(SUPPORTED_EVENTS as readonly string[]).includes(type)) {
    safeLog({
      event: 'ycloud_webhook_ignored',
      at: new Date().toISOString(),
      id,
      type,
    });
    // 200 para não gerar retries da YCloud (até 7 tentativas em horas).
    return jsonOk({ ignored: true, type, id });
  }

  const result = summarizeKnownEvent(type, record);
  if (!result.ok) {
    return jsonError(400, result.error ?? 'Evento inválido.');
  }

  safeLog({
    event: 'ycloud_webhook_received',
    at: new Date().toISOString(),
    id,
    type,
    bytes: raw.length,
    ...result.summary,
  });

  return jsonOk({ type, id });
}

export function handleRequest(req: Request, env: WebhookEnv): Response | Promise<Response> {
  if (req.method !== 'POST') return jsonError(405, 'Método não suportado.');
  return handlePost(req, env);
}

if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  Deno.serve((req: Request) =>
    handleRequest(req, {
      YCLOUD_WEBHOOK_SECRET: Deno.env.get('YCLOUD_WEBHOOK_SECRET'),
    }),
  );
}
