/**
 * Protocolo público do agendamento (FASE 4 §4).
 * Formato: IPL-YYYYMMDD-XXXX (alfabeto sem 0/1/I/O para ditado fácil).
 * Autoridade de unicidade: banco (trigger + unique). Aqui só formatação/validação.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function buildProtocol(on: Date = new Date(), rand: () => number = Math.random): string {
  const y = on.getFullYear();
  const m = `${on.getMonth() + 1}`.padStart(2, '0');
  const d = `${on.getDate()}`.padStart(2, '0');
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  }
  return `IPL-${y}${m}${d}-${suffix}`;
}

export function isValidProtocol(value: string): boolean {
  return /^IPL-\d{8}-[A-Z0-9]{4}$/.test(value);
}
