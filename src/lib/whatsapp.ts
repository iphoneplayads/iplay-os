/**
 * WhatsApp — link wa.me (client-side apenas).
 * O envio AUTOMÁTICO de confirmações é server-side, na Edge Function
 * process-notification-outbox via YCloud (nunca chama a API daqui).
 * Este módulo mantém só mensagem pronta + link para CTAs secundários.
 * O destino é o NÚMERO DO CLIENTE (nunca o da iPlay no lugar dele).
 */
export interface BookingMessageInput {
  name: string;
  protocol: string;
  model: string;
  service: string;
  option: string | null;
  value: string;
  date: string;
  time: string;
  address: string;
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function buildBookingMessage(input: BookingMessageInput): string {
  const lines = [
    `Olá, ${input.name}!`,
    '',
    'Seu atendimento na iPlay foi solicitado.',
    '',
    `Protocolo: ${input.protocol}`,
    `iPhone: ${input.model}`,
    `Serviço: ${input.service}`,
    `Opção: ${input.option ?? '—'}`,
    `Valor: ${input.value}`,
    `Data: ${input.date}`,
    `Horário: ${input.time}`,
    `Endereço: ${input.address}`,
    '',
    'A iPlay entrará em contato para confirmar o atendimento.',
  ];
  return lines.join('\n');
}

/**
 * wa.me exige DDI+DDD. Números BR de 10/11 dígitos ganham o prefixo 55;
 * demais formatos passam como estão (multiempresa futuro).
 */
export function buildWaLink(clientPhone: string, message: string): string {
  const digits = onlyDigits(clientPhone);
  const dest = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  return `https://wa.me/${dest}?text=${encodeURIComponent(message)}`;
}
