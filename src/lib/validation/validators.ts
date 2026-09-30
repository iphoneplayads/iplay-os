import type { AddressInput, CustomerInput, SchedulingInput } from '@/types/booking';

const onlyDigits = (v: string) => v.replace(/\D/g, '');

export function validateName(name: string): string | null {
  if (!name.trim()) return 'Informe seu nome.';
  if (name.trim().length < 2) return 'Nome muito curto.';
  return null;
}

export function validatePhone(phone: string): string | null {
  const d = onlyDigits(phone);
  if (!d) return 'Informe seu telefone/WhatsApp.';
  if (d.length < 10 || d.length > 13) return 'Telefone inválido. Use DDD + número.';
  return null;
}

export function validateEmail(email: string): string | null {
  if (!email) return null; // e-mail opcional na FASE 1 (pedido só se preenchido)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return 'E-mail inválido.';
  return null;
}

export function validateCustomer(input: CustomerInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const n = validateName(input.name);
  if (n) errors.name = n;
  const p = validatePhone(input.phone);
  if (p) errors.phone = p;
  const e = validateEmail(input.email);
  if (e) errors.email = e;
  return errors;
}

export function validateZip(zip: string): string | null {
  const d = onlyDigits(zip);
  if (!d) return 'Informe o CEP.';
  if (d.length !== 8) return 'CEP inválido. Use 8 dígitos.';
  return null;
}

export function validateAddress(input: AddressInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const z = validateZip(input.zip_code);
  if (z) errors.zip_code = z;
  if (!input.street.trim()) errors.street = 'Informe a rua/avenida.';
  if (!input.number.trim()) errors.number = 'Informe o número.';
  if (!input.neighborhood.trim()) errors.neighborhood = 'Informe o bairro.';
  if (!input.city.trim()) errors.city = 'Informe a cidade.';
  if (!input.state.trim()) errors.state = 'Informe o estado (UF).';
  return errors;
}

export function validateScheduling(input: SchedulingInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.date) errors.date = 'Escolha a data.';
  if (!input.startTime) errors.startTime = 'Escolha o horário.';
  if (input.date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const picked = new Date(`${input.date}T00:00:00`);
    if (Number.isNaN(picked.getTime())) errors.date = 'Data inválida.';
    else if (picked < today) errors.date = 'A data não pode ser no passado.';
  }
  return errors;
}

export function validateBookingSelection(input: {
  modelId: string | null;
  serviceId: string | null;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.modelId) errors.modelId = 'Escolha o modelo do iPhone.';
  if (!input.serviceId) errors.serviceId = 'Escolha o problema.';
  return errors;
}
