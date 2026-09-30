import type {
  Address,
  Appointment,
  Client,
  Device,
  DeviceModel,
  Price,
  Service,
  ServiceOption,
} from '@/types/domain';
import type { CreateAppointmentInput, CreatedAppointment } from '@/types/booking';
import { buildProtocol } from '@/lib/booking/protocol';
import { COMPANY_ID, mockModels, mockPrices, mockServiceOptions, mockServices } from '@/data/mock/catalog';

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString();
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`;
const onlyDigits = (v: string) => v.replace(/\D/g, '');

function assertTenant(companyId: string): void {
  if (!companyId) throw new Error('company_id é obrigatório (tenant isolation).');
  if (companyId !== COMPANY_ID) throw new Error('Tenant desconhecido no mock.');
}

export interface CatalogRepository {
  listModels(companyId: string): Promise<DeviceModel[]>;
  listServices(companyId: string): Promise<Service[]>;
  listServiceOptions(companyId: string, serviceId: string): Promise<ServiceOption[]>;
  findPrice(companyId: string, modelId: string, serviceId: string, serviceOptionId: string | null): Promise<Price | null>;
  listPrices(companyId: string): Promise<Price[]>;
}

export interface BookingRepository {
  createAppointment(input: CreateAppointmentInput): Promise<CreatedAppointment>;
  listAppointments(companyId: string): Promise<Appointment[]>;
}

const memoryAppointments: Appointment[] = [];
const memoryClients: Client[] = [];
const memoryDevices: Device[] = [];
const memoryAddresses: Address[] = [];
const memoryByIdempotency = new Map<string, CreatedAppointment>();

/** Acesso interno ao store em memória (usado pelo admin mock; não usar na UI). */
export function __mockStore() {
  return {
    appointments: memoryAppointments,
    clients: memoryClients,
    devices: memoryDevices,
    addresses: memoryAddresses,
  };
}

export const mockCatalogRepository: CatalogRepository = {
  async listModels(companyId) {
    assertTenant(companyId);
    await delay();
    return mockModels.filter((m) => m.company_id === companyId && m.active);
  },
  async listServices(companyId) {
    assertTenant(companyId);
    await delay();
    return mockServices.filter((s) => s.company_id === companyId && s.active);
  },
  async listServiceOptions(companyId, serviceId) {
    assertTenant(companyId);
    await delay();
    return mockServiceOptions.filter(
      (o) => o.company_id === companyId && o.service_id === serviceId && o.active,
    );
  },
  async findPrice(companyId, modelId, serviceId, serviceOptionId) {
    assertTenant(companyId);
    await delay(80);
    return (
      mockPrices.find(
        (p) =>
          p.company_id === companyId &&
          p.model_id === modelId &&
          p.service_id === serviceId &&
          (p.service_option_id ?? null) === (serviceOptionId ?? null) &&
          p.active,
      ) ?? null
    );
  },
  async listPrices(companyId) {
    assertTenant(companyId);
    await delay();
    return mockPrices.filter((p) => p.company_id === companyId);
  },
};

export const mockBookingRepository: BookingRepository = {
  async createAppointment(input) {
    assertTenant(input.companyId);
    await delay(200);
    // FASE 4 §14: idempotência real — mesma chave → mesmo agendamento, sem duplicar.
    const key = input.idempotencyKey?.trim() || null;
    if (key) {
      const hit = memoryByIdempotency.get(key);
      if (hit && hit.appointment.company_id === input.companyId) return hit;
    }
    const timestamp = now();
    // FASE 3: dedupe — reutiliza cliente existente pelo telefone (só dígitos),
    // atualizando nome/e-mail/whatsapp com os dados mais recentes. Sem duplicados.
    const phoneDigits = onlyDigits(input.client.phone);
    let client: Client | undefined = memoryClients.find(
      (c) => c.company_id === input.companyId && onlyDigits(c.phone) === phoneDigits,
    );
    if (client) {
      const updated: Client = {
        ...client,
        name: input.client.name,
        whatsapp: input.client.phone,
        email: input.client.email || null,
        updated_at: timestamp,
      };
      const idx = memoryClients.findIndex((c) => c.id === updated.id);
      memoryClients[idx] = updated;
      client = updated;
    } else {
      client = {
        id: uid('client'), company_id: input.companyId,
        name: input.client.name, phone: input.client.phone,
        whatsapp: input.client.phone, email: input.client.email || null,
        cpf: null, notes: null, created_at: timestamp, updated_at: timestamp,
      };
      memoryClients.push(client);
    }
    const finalClient = client;
    const device: Device = {
      id: uid('device'), company_id: input.companyId, client_id: finalClient.id,
      model_id: input.deviceModelId, imei: null, serial_number: null,
      notes: null, created_at: timestamp, updated_at: timestamp,
    };
    const addressId = uid('address');
    // Protocolo único gerado aqui (no Supabase, a autoridade é o trigger do banco).
    let protocol = buildProtocol();
    while (memoryAppointments.some((a) => a.protocol === protocol)) {
      protocol = buildProtocol();
    }
    const appointment: Appointment = {
      id: uid('appt'), company_id: input.companyId,
      client_id: finalClient.id, device_id: device.id,
      service_id: input.serviceId, service_option_id: input.serviceOptionId,
      price_id: input.priceId,
      scheduled_date: input.scheduling.date,
      scheduled_start_time: input.scheduling.startTime,
      scheduled_end_time: null,
      status: 'requested', service_mode: 'mobile',
      address_id: addressId, notes: input.notes ?? null,
      source: input.source ?? 'site',
      utm_source: input.attribution.utm_source,
      utm_medium: input.attribution.utm_medium,
      utm_campaign: input.attribution.utm_campaign,
      utm_content: input.attribution.utm_content,
      utm_term: input.attribution.utm_term,
      gclid: input.attribution.gclid,
      protocol, idempotency_key: key,
      created_at: timestamp, updated_at: timestamp,
    };
    memoryDevices.push(device);
    memoryAppointments.push(appointment);
    const address = {
      id: addressId, company_id: input.companyId, client_id: finalClient.id,
      appointment_id: appointment.id,
      zip_code: input.address.zip_code, street: input.address.street,
      number: input.address.number, complement: input.address.complement || null,
      neighborhood: input.address.neighborhood, city: input.address.city,
      state: input.address.state, reference: input.address.reference || null,
      latitude: null, longitude: null, created_at: timestamp, updated_at: timestamp,
    };
    const result = { appointment, client: finalClient, device, address };
    memoryAddresses.push(address);
    if (key) memoryByIdempotency.set(key, result);
    return result;
  },
  async listAppointments(companyId) {
    assertTenant(companyId);
    await delay();
    return [...memoryAppointments].filter((a) => a.company_id === companyId);
  },
};

export function __resetMockMemory(): void {
  memoryAppointments.length = 0;
  memoryClients.length = 0;
  memoryDevices.length = 0;
  memoryAddresses.length = 0;
  memoryByIdempotency.clear();
}
