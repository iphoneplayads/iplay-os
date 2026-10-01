import type {
  Address,
  Appointment,
  Client,
  Device,
  DeviceModel,
  Price,
  Service,
  ServiceOption,
} from './domain';

/** Estado progressivo do fluxo /agendar (DEFEITO → VALOR → AGENDAMENTO). */
export interface BookingState {
  modelId: string | null;
  serviceId: string | null;
  serviceOptionId: string | null;
  price: Price | null;
  priceMissing: boolean;
  customer: CustomerInput;
  address: AddressInput;
  scheduling: SchedulingInput;
  attribution: AttributionInput;
}

export interface CustomerInput {
  name: string;
  phone: string;
  email: string;
}

export interface AddressInput {
  zip_code: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  reference: string;
  /** Técnico tem onde estacionar sem custo. null = ainda não respondido (bloqueia continuar no fluxo novo). */
  parking_free: boolean | null;
}

export interface SchedulingInput {
  date: string;
  /** Início da janela (HH:MM) — sempre um dos inícios de SCHEDULING_CONFIG.windows. */
  startTime: string;
  /** Fim da janela (HH:MM) — preenchido ao escolher a janela. */
  endTime?: string;
}

export interface AttributionInput {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  gclid: string | null;
}

export type BookingStepId =
  | 'model'
  | 'service'
  | 'option'
  | 'price'
  | 'customer'
  | 'address'
  | 'schedule'
  | 'confirm';

export interface BookingSelection {
  model: DeviceModel | null;
  service: Service | null;
  option: ServiceOption | null;
  price: Price | null;
}

export interface CreateAppointmentInput {
  companyId: string;
  client: CustomerInput;
  deviceModelId: string;
  serviceId: string;
  serviceOptionId: string | null;
  priceId: string | null;
  address: AddressInput;
  scheduling: SchedulingInput;
  notes?: string;
  /** FASE 4: mesma chave em retries → um único agendamento. */
  idempotencyKey?: string;
  attribution: AttributionInput;
  source?: Appointment['source'];
}

export interface CreatedAppointment {
  appointment: Appointment;
  client: Client;
  device: Device;
  address: Address;
}

export interface FieldError {
  field: string;
  message: string;
}
