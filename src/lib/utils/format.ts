export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatInstallment(count: number, value: number): string {
  return `${count}x de ${formatBRL(value)}`;
}

/**
 * Aceita "599,90", "599.90", "1.234,56" → 599.9 / 1234.56.
 * Retorna null quando não é um valor monetário válido (<= 0 ou inválido).
 */
export function parseBRLInput(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, '');
  if (!cleaned) return null;
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const value = Math.round(Number(normalized) * 100) / 100;
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function todayISODate(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 'YYYY-MM-DD' → 'DD/MM/YYYY' (exibição BR; devolve o original se inválido). */
export function formatDateBR(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function minBookingDate(): string {
  return todayISODate();
}
