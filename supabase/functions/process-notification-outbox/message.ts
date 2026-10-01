// Helpers PUROS do worker process-notification-outbox (sem IO, sem secrets).
// Testáveis em Node: node --test supabase/functions/process-notification-outbox/message.test.ts
// NUNCA importar YCLOUD_API_KEY / service_role aqui. Sem fetch, sem banco.

export interface ConfirmationData {
  firstName: string;
  model: string;
  service: string;
  option: string | null;
  dateBR: string;
  windowLabel: string;
  pix: number | null;
  card: number | null;
  protocol: string;
}

export type SendMode = 'template' | 'text';

/** Ordem oficial dos parâmetros do template (ver TEMPLATE_SPEC em index.ts). */
export const TEMPLATE_PARAM_ORDER = [
  'first_name',
  'model',
  'service_option',
  'date_br',
  'window',
  'pix',
  'card',
  'protocol',
] as const;

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatBRL(value: number): string {
  return BRL.format(value);
}

/** Converte número ou null em texto de preço — NUNCA "R$ 0,00" para ausente. */
export function priceText(value: number | null): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return 'a confirmar';
  return formatBRL(value);
}

export function firstNameOf(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? '';
  return first || 'cliente';
}

export function serviceWithOption(service: string, option: string | null): string {
  return option ? `${service} — ${option}` : service;
}

/** 'HH:MM'/'HH:MM:SS' → '09h às 11h'. */
export function windowLabelOf(start: string, end: string | null): string {
  const short = (t: string): string => t.slice(0, 2) + 'h';
  if (!end) return start.slice(0, 5);
  return `${short(start)} às ${short(end)}`;
}

/** 'YYYY-MM-DD' → 'DD/MM/YYYY' (devolve o original se inválido). */
export function formatDateBR(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function buildConfirmationText(d: ConfirmationData): string {
  const lines = [
    'Agendamento confirmado! ✅',
    `Olá, ${d.firstName}! Seu atendimento na iPlay foi agendado.`,
    `📱 ${d.model}`,
    `🔧 ${serviceWithOption(d.service, d.option)}`,
    `📅 ${d.dateBR}`,
    `🕐 ${d.windowLabel}`,
    `💰 Pix: ${priceText(d.pix)}`,
    `💳 Cartão: ${priceText(d.card)} em até 10x sem juros`,
    '📍 Atendimento no endereço informado',
    `Protocolo: ${d.protocol}`,
    'Você receberá atualizações do atendimento por aqui.',
    'iPlay — Seu iPhone em boas mãos.',
  ];
  return lines.join('\n');
}

/** Parâmetros posicionais do template, na ordem de TEMPLATE_PARAM_ORDER. */
export function buildTemplateParams(d: ConfirmationData): string[] {
  return [
    d.firstName,
    d.model,
    serviceWithOption(d.service, d.option),
    d.dateBR,
    d.windowLabel,
    priceText(d.pix),
    `${priceText(d.card)} em até 10x`,
    d.protocol,
  ];
}

export interface PhoneResult {
  ok: boolean;
  e164?: string;
  error?: string;
}

function allSameDigit(digits: string): boolean {
  return /^(\d)\1*$/.test(digits);
}

/**
 * Normaliza telefone BR para E.164 (+55...), formato exigido pela YCloud.
 * Aceita: 10/11 dígitos nacionais, 12/13 com prefixo 55, com ou sem formatação.
 * Falha segura (PHONE_INVALID) para qualquer outro formato — sem "adivinhar".
 */
export function normalizeBRPhoneToE164(raw: string): PhoneResult {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return { ok: false, error: 'PHONE_INVALID' };

  let national: string;
  if (hasPlus) {
    if (!digits.startsWith('55')) return { ok: false, error: 'PHONE_INVALID' };
    national = digits.slice(2);
  } else if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    national = digits.slice(2);
  } else if (digits.length === 10 || digits.length === 11) {
    national = digits;
  } else {
    return { ok: false, error: 'PHONE_INVALID' };
  }

  if (national.length !== 10 && national.length !== 11) return { ok: false, error: 'PHONE_INVALID' };
  const ddd = Number(national.slice(0, 2));
  if (!Number.isInteger(ddd) || ddd < 11 || ddd > 99) return { ok: false, error: 'PHONE_INVALID' };
  if (allSameDigit(national)) return { ok: false, error: 'PHONE_INVALID' };
  // Celular BR tem 11 dígitos (terceiro dígito 9); fixo tem 10.
  if (national.length === 11 && national[2] !== '9') return { ok: false, error: 'PHONE_INVALID' };

  return { ok: true, e164: `+55${national}` };
}

/**
 * Produção = template. Texto livre SOMENTE para teste técnico dentro de janela
 * de 24h, com flag explícita YCLOUD_ALLOW_FREE_TEXT=true e mode='text' no body.
 */
export function decideSendMode(
  allowFreeText: boolean,
  requestedMode: unknown,
): { mode: SendMode } | { error: 'TEXT_NOT_ALLOWED' } {
  if (requestedMode === 'text') {
    if (allowFreeText) return { mode: 'text' };
    return { error: 'TEXT_NOT_ALLOWED' };
  }
  return { mode: 'template' };
}

/** Erro sanitizado para notification_outbox.error_message: sem PII, sem chaves. */
export function sanitizeError(status: number | null, rawBody: string): string {
  let snippet = rawBody.slice(0, 200).replace(/\s+/g, ' ').trim();
  // Remove possíveis segredos acidentais (tokens longos) sem destruir o diagnóstico.
  snippet = snippet.replace(/[A-Za-z0-9_\-]{32,}/g, '[redacted]');
  if (status == null) return `YCloud network: ${snippet || 'falha de rede'}`.slice(0, 280);
  return `YCloud ${status}: ${snippet || 'sem detalhe'}`.slice(0, 280);
}

/** Erro de exceção sanitizado: sem PII, sem segredos, sem valores longos. */
export function sanitizeException(e: unknown): string {
  const raw = e instanceof Error ? e.message || 'Error' : String(e ?? 'unknown');
  const clean = raw
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[A-Za-z0-9_\-]{32,}/g, '[redacted]')
    .replace(/\+?\d{10,}/g, '[redacted]')
    .slice(0, 200);
  return clean || 'WORKER_EXCEPTION';
}

/** 4xx (exceto 429) = definitivo; 429/5xx/rede = transitório (mantém pending). */
export function isTransientFailure(status: number | null): boolean {
  if (status == null) return true;
  if (status === 429) return true;
  return status >= 500;
}

export const MAX_OUTBOX_ATTEMPTS = 8;
export const DEFAULT_STALE_SECONDS = 600;

/** Decisão pura de retry: transitória + abaixo do teto volta a pending. */
export function resolveFailure(
  attemptsAfterClaim: number,
  status: number | null,
  maxAttempts: number = MAX_OUTBOX_ATTEMPTS,
): { status: 'pending' | 'failed'; result: 'retry' | 'failed' } {
  if (isTransientFailure(status) && attemptsAfterClaim < maxAttempts) {
    return { status: 'pending', result: 'retry' };
  }
  return { status: 'failed', result: 'failed' };
}

export interface ClaimCandidate {
  status: string;
  claimed_at: string | null;
}

/**
 * Espelha o predicado da RPC claim_notification_batch (pós-0006):
 * - 'sent'/'failed' NUNCA são reclamados;
 * - 'pending' sempre é elegível (inclusive linhas pré-0006, claimed_at NULL);
 * - 'processing' só é recuperado quando abandonado (claimed_at ausente ou
 *   mais velho que o timeout) — nunca enquanto outro worker pode estar ativo.
 */
export function isClaimable(
  row: ClaimCandidate,
  nowMs: number,
  staleSeconds: number = DEFAULT_STALE_SECONDS,
): boolean {
  if (row.status === 'pending') return true;
  if (row.status !== 'processing') return false;
  if (!row.claimed_at) return true;
  const claimedMs = Date.parse(row.claimed_at);
  if (!Number.isFinite(claimedMs)) return true;
  return nowMs - claimedMs > staleSeconds * 1000;
}
