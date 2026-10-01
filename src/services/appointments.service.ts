import { APP_CONFIG } from '@/config/app';
import {
  validateAddress,
  validateBookingSelection,
  validateCustomer,
  validateScheduling,
} from '@/lib/validation/validators';
import { endTimeForWindow } from '@/lib/scheduling';
import { getRepositories } from '@/repositories/factory';
import { getPrice } from './catalog.service';
import type { CreateAppointmentInput, CreatedAppointment, FieldError } from '@/types/booking';

/** Valida o agendamento completo antes de persistir. Mensagens em pt-BR. */
export function validateAppointment(input: CreateAppointmentInput): FieldError[] {
  const errors: FieldError[] = [];
  if (input.companyId !== APP_CONFIG.company.id) {
    errors.push({ field: 'companyId', message: 'Empresa inválida.' });
  }
  const sel = validateBookingSelection({ modelId: input.deviceModelId, serviceId: input.serviceId });
  for (const [field, message] of Object.entries(sel)) errors.push({ field, message });
  if (!input.serviceOptionId && input.serviceId === 'svc-screen') {
    errors.push({ field: 'serviceOptionId', message: 'Escolha a solução (Premium, Pro ou Original Remanufaturada).' });
  }
  const c = validateCustomer(input.client);
  for (const [field, message] of Object.entries(c)) errors.push({ field: `customer.${field}`, message });
  const a = validateAddress(input.address);
  for (const [field, message] of Object.entries(a)) errors.push({ field: `address.${field}`, message });
  const s = validateScheduling(input.scheduling);
  for (const [field, message] of Object.entries(s)) errors.push({ field: `scheduling.${field}`, message });
  return errors;
}

export async function createAppointment(input: CreateAppointmentInput): Promise<CreatedAppointment> {
  const errors = validateAppointment(input);
  if (errors.length > 0) {
    throw new AppointmentValidationError(errors);
  }
  // Segurança (§16/§13 FASE 4): o preço final é sempre recuperado do banco na hora
  // de gravar — nunca se confia no priceId enviado pelo navegador. Sem preço ativo,
  // o agendamento NÃO é criado.
  const authoritative = await getPrice(input.deviceModelId, input.serviceId, input.serviceOptionId);
  if (!authoritative) {
    throw new PriceNotAvailableError();
  }
  // Janela: garante o fim correspondente ao início (a UI sempre envia os dois).
  const endTime = input.scheduling.endTime ?? endTimeForWindow(input.scheduling.startTime);
  return getRepositories().booking.createAppointment({
    ...input,
    priceId: authoritative.id,
    scheduling: { ...input.scheduling, endTime },
  });
}

export class PriceNotAvailableError extends Error {
  constructor() {
    super('Preço ainda não cadastrado para esta combinação. Fale com a iPlay para confirmar o valor.');
    this.name = 'PriceNotAvailableError';
  }
}

export class AppointmentValidationError extends Error {
  errors: FieldError[];
  constructor(errors: FieldError[]) {
    super('Dados do agendamento inválidos.');
    this.name = 'AppointmentValidationError';
    this.errors = errors;
  }
}
