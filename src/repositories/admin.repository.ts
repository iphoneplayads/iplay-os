import type {
  Appointment,
  AppointmentStatus,
  DeviceModel,
  Price,
  Service,
  ServiceOption,
} from '@/types/domain';
import { canTransition, InvalidTransitionError } from '@/lib/booking/transitions';
import { displayInstallment, resolvePriceSave } from '@/lib/pricing';
import { __mockStore } from './mock.repository';
import { mockModels, mockPrices, mockServiceOptions, mockServices } from '@/data/mock/catalog';
import { resolveCompanyId, supa, toFriendlyError } from './supabase/company';

/** Agendamento com dados resolvidos para o painel (joins feitos no repository). */
export interface DetailedAppointment {
  appointment: Appointment;
  clientName: string;
  clientPhone: string;
  modelName: string;
  serviceName: string;
  optionName: string | null;
  /** Valor exibido no histórico: snapshot congelado, com fallback legado. */
  priceValue: number | null;
  quotedPixTotal: number | null;
  quotedCardTotal: number | null;
  addressLine: string;
}

export interface ServiceInput {
  name: string;
  description?: string;
  active?: boolean;
}

export interface ModelInput {
  name: string;
  family?: string;
  year?: number | null;
  active?: boolean;
}

export interface PriceInput {
  modelId: string;
  serviceId: string;
  serviceOptionId: string | null;
  /** Legado: tratado como Pix quando pixValue ausente (compat). UI nova envia pixValue. */
  value: number;
  pixValue?: number | null;
  /** Número = cartão manual; undefined/null = automático (ou manter); cardAuto força recálculo. */
  cardPrice?: number | null;
  cardAuto?: boolean;
  installmentCount?: number | null;
  installmentPrice?: number | null;
  active?: boolean;
}

export interface PricePatch {
  value?: number;
  pixValue?: number | null;
  cardPrice?: number | null;
  cardAuto?: boolean;
  installmentCount?: number | null;
  installmentPrice?: number | null;
  active?: boolean;
}

export interface AdminRepository {
  listDetailedAppointments(companyId: string, limit?: number): Promise<DetailedAppointment[]>;
  updateAppointmentStatus(
    companyId: string,
    appointmentId: string,
    status: AppointmentStatus,
  ): Promise<Appointment>;
  /** Listagens administrativas INCLUEM inativos (o catálogo público filtra). */
  listAllModels(companyId: string): Promise<DeviceModel[]>;
  listAllServices(companyId: string): Promise<Service[]>;
  listAllOptions(companyId: string): Promise<ServiceOption[]>;
  listAllPrices(companyId: string): Promise<Price[]>;
  createService(companyId: string, input: ServiceInput): Promise<Service>;
  updateService(companyId: string, id: string, input: Partial<ServiceInput>): Promise<Service>;
  createModel(companyId: string, input: ModelInput): Promise<DeviceModel>;
  updateModel(companyId: string, id: string, input: Partial<ModelInput>): Promise<DeviceModel>;
  createPrice(companyId: string, input: PriceInput): Promise<Price>;
  updatePrice(companyId: string, id: string, input: PricePatch): Promise<Price>;
}

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`;
const now = () => new Date().toISOString();

function addressLineOf(a: {
  street: string; number: string; complement: string | null;
  neighborhood: string; city: string; state: string; zip_code: string;
}): string {
  return `${a.street}, ${a.number}${a.complement ? ` — ${a.complement}` : ''} · ${a.neighborhood}, ${a.city}/${a.state} · CEP ${a.zip_code}`;
}

/* ================= MOCK (dev/testes; mesmas regras) ================= */

function findService(companyId: string, id: string): Service {
  const svc = mockServices.find((s) => s.company_id === companyId && s.id === id);
  if (!svc) throw new Error('Serviço não encontrado.');
  return svc;
}

function findModel(companyId: string, id: string): DeviceModel {
  const model = mockModels.find((m) => m.company_id === companyId && m.id === id);
  if (!model) throw new Error('Modelo não encontrado.');
  return model;
}

export const mockAdminRepository: AdminRepository = {
  async listAllModels(companyId) {
    return mockModels
      .filter((m) => m.company_id === companyId)
      .sort((a, b) => a.sort_order - b.sort_order);
  },

  async listAllServices(companyId) {
    return mockServices
      .filter((s) => s.company_id === companyId)
      .sort((a, b) => a.sort_order - b.sort_order);
  },

  async listAllOptions(companyId) {
    return mockServiceOptions
      .filter((o) => o.company_id === companyId)
      .sort((a, b) => a.sort_order - b.sort_order);
  },

  async listAllPrices(companyId) {
    return mockPrices.filter((p) => p.company_id === companyId);
  },

  async listDetailedAppointments(companyId, limit = 200) {
    const { appointments, clients, devices, addresses } = __mockStore();
    const rows = appointments
      .filter((a) => a.company_id === companyId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, limit);
    return rows.map((appointment) => {
      const client = clients.find((c) => c.id === appointment.client_id);
      const device = devices.find((d) => d.id === appointment.device_id);
      const model = mockModels.find((m) => m.id === device?.model_id);
      const service = mockServices.find((s) => s.id === appointment.service_id);
      const option = mockServiceOptions.find((o) => o.id === appointment.service_option_id);
      const price = mockPrices.find((p) => p.id === appointment.price_id);
      const address = addresses.find((a) => a.id === appointment.address_id);
      return {
        appointment,
        clientName: client?.name ?? '—',
        clientPhone: client?.phone ?? '—',
        modelName: model?.name ?? '—',
        serviceName: service?.name ?? '—',
        optionName: option?.name ?? null,
        priceValue: appointment.quoted_card_total ?? (price ? Number(price.price) : null),
        quotedPixTotal: appointment.quoted_pix_total,
        quotedCardTotal: appointment.quoted_card_total,
        addressLine: address ? addressLineOf(address) : '',
      };
    });
  },

  async updateAppointmentStatus(companyId, appointmentId, status) {
    const { appointments } = __mockStore();
    const appt = appointments.find((a) => a.company_id === companyId && a.id === appointmentId);
    if (!appt) throw new Error('Agendamento não encontrado.');
    if (!canTransition(appt.status, status)) throw new InvalidTransitionError(appt.status, status);
    appt.status = status;
    appt.updated_at = now();
    return appt;
  },

  async createService(companyId, input) {
    const name = input.name.trim();
    if (!name) throw new Error('Informe o nome do serviço.');
    const slug = slugify(name);
    if (mockServices.some((s) => s.company_id === companyId && s.slug === slug)) {
      throw new Error('Já existe um serviço com esse nome.');
    }
    const timestamp = now();
    const svc: Service = {
      id: uid('svc'), company_id: companyId, name, slug,
      description: input.description?.trim() || null,
      active: input.active ?? true,
      sort_order: Math.max(0, ...mockServices.map((s) => s.sort_order)) + 1,
      created_at: timestamp, updated_at: timestamp,
    };
    mockServices.push(svc);
    return svc;
  },

  async updateService(companyId, id, input) {
    const svc = findService(companyId, id);
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new Error('Informe o nome do serviço.');
      svc.name = name;
    }
    if (input.description !== undefined) svc.description = input.description.trim() || null;
    if (input.active !== undefined) svc.active = input.active;
    svc.updated_at = now();
    return svc;
  },

  async createModel(companyId, input) {
    const name = input.name.trim();
    if (!name) throw new Error('Informe o nome do modelo.');
    if (mockModels.some((m) => m.company_id === companyId && m.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('Já existe um modelo com esse nome.');
    }
    const timestamp = now();
    const model: DeviceModel = {
      id: uid('model'), company_id: companyId, name,
      family: input.family?.trim() || null,
      year: input.year ?? null,
      active: input.active ?? true,
      sort_order: Math.max(0, ...mockModels.map((m) => m.sort_order)) + 1,
      image_url: null, created_at: timestamp, updated_at: timestamp,
    };
    mockModels.push(model);
    return model;
  },

  async updateModel(companyId, id, input) {
    const model = findModel(companyId, id);
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new Error('Informe o nome do modelo.');
      model.name = name;
    }
    if (input.family !== undefined) model.family = input.family.trim() || null;
    if (input.year !== undefined) model.year = input.year;
    if (input.active !== undefined) model.active = input.active;
    model.updated_at = now();
    return model;
  },

  async createPrice(companyId, input) {
    findModel(companyId, input.modelId);
    findService(companyId, input.serviceId);
    if (input.serviceOptionId) {
      const opt = mockServiceOptions.find(
        (o) => o.company_id === companyId && o.id === input.serviceOptionId,
      );
      if (!opt || opt.service_id !== input.serviceId) throw new Error('Categoria inválida para este serviço.');
    }
    if (!(input.value > 0)) throw new Error('Informe um preço válido maior que zero.');
    if (
      mockPrices.some(
        (p) =>
          p.company_id === companyId &&
          p.model_id === input.modelId &&
          p.service_id === input.serviceId &&
          (p.service_option_id ?? null) === (input.serviceOptionId ?? null),
      )
    ) {
      throw new Error('Já existe preço para esta combinação. Edite o existente.');
    }
    // Novo fluxo: `value` (legado) vale como Pix quando pixValue ausente.
    const pix = input.pixValue ?? input.value;
    if (!(pix > 0)) throw new Error('Informe um preço Pix válido maior que zero.');
    if (input.cardPrice !== undefined && input.cardPrice !== null && !(input.cardPrice > 0)) {
      throw new Error('Informe um preço de cartão válido maior que zero.');
    }
    const resolved = resolvePriceSave({ pix, cardPrice: input.cardPrice, cardAuto: input.cardAuto });
    const timestamp = now();
    const installmentCount = input.installmentCount ?? 10;
    const price: Price = {
      id: uid('price'), company_id: companyId,
      model_id: input.modelId, service_id: input.serviceId,
      service_option_id: input.serviceOptionId,
      price: resolved.card,
      pix_price: pix,
      card_price: resolved.card,
      card_price_custom: resolved.custom,
      installment_count: installmentCount,
      installment_price: input.installmentPrice ?? displayInstallment(resolved.card, installmentCount),
      active: input.active ?? true,
      valid_from: null, valid_until: null,
      created_at: timestamp, updated_at: timestamp,
    };
    mockPrices.push(price);
    return price;
  },

  async updatePrice(companyId, id, input) {
    const price = mockPrices.find((p) => p.company_id === companyId && p.id === id);
    if (!price) throw new Error('Preço não encontrado.');
    const pixTouched = input.pixValue !== undefined || input.value !== undefined;
    const nextPix = input.pixValue ?? input.value ?? price.pix_price ?? price.price;
    if (pixTouched && !(nextPix > 0)) throw new Error('Informe um preço Pix válido maior que zero.');
    if (input.cardPrice !== undefined && input.cardPrice !== null && !(input.cardPrice > 0)) {
      throw new Error('Informe um preço de cartão válido maior que zero.');
    }
    const priceTouched = pixTouched || input.cardPrice !== undefined || input.cardAuto === true;
    if (pixTouched) price.pix_price = nextPix;
    if (priceTouched) {
      const resolved = resolvePriceSave({
        pix: nextPix,
        cardPrice: input.cardPrice,
        cardAuto: input.cardAuto,
        currentCustom: price.card_price_custom,
        currentCard: price.card_price,
      });
      price.card_price = resolved.card;
      price.card_price_custom = resolved.custom;
      price.price = resolved.card;
      price.installment_price = input.installmentPrice ?? displayInstallment(resolved.card, price.installment_count ?? 10);
    }
    if (input.installmentCount !== undefined) price.installment_count = input.installmentCount;
    if (input.installmentPrice !== undefined) price.installment_price = input.installmentPrice;
    if (input.active !== undefined) price.active = input.active;
    price.updated_at = now();
    return price;
  },
};

/* ================= SUPABASE (sessão do admin; RLS impõe o tenant) ================= */

export const supabaseAdminRepository: AdminRepository = {
  async listAllModels(_companyId) {
    const database = supa();
    const companyId = await resolveCompanyId();
    const { data, error } = await database
      .from('device_models').select('*').eq('company_id', companyId).order('sort_order');
    if (error) throw toFriendlyError(error, 'Não foi possível carregar os modelos.');
    return (data ?? []) as DeviceModel[];
  },

  async listAllServices(_companyId) {
    const database = supa();
    const companyId = await resolveCompanyId();
    const { data, error } = await database
      .from('services').select('*').eq('company_id', companyId).order('sort_order');
    if (error) throw toFriendlyError(error, 'Não foi possível carregar os serviços.');
    return (data ?? []) as Service[];
  },

  async listAllPrices(_companyId) {
    const database = supa();
    const companyId = await resolveCompanyId();
    const { data, error } = await database
      .from('prices').select('*').eq('company_id', companyId);
    if (error) throw toFriendlyError(error, 'Não foi possível carregar os preços.');
    return (data ?? []) as Price[];
  },

  async listAllOptions(_companyId) {
    const database = supa();
    const companyId = await resolveCompanyId();
    const { data, error } = await database
      .from('service_options').select('*').eq('company_id', companyId).order('sort_order');
    if (error) throw toFriendlyError(error, 'Não foi possível carregar as categorias.');
    return (data ?? []) as ServiceOption[];
  },

  async listDetailedAppointments(_companyId, limit = 200) {
    const database = supa();
    const companyId = await resolveCompanyId();
    const { data: appts, error } = await database
      .from('appointments')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw toFriendlyError(error, 'Não foi possível carregar os agendamentos.');
    const rows = (appts ?? []) as Appointment[];
    const ids = (key: 'client_id' | 'device_id' | 'service_id' | 'service_option_id' | 'price_id' | 'address_id') =>
      [...new Set(rows.map((r) => r[key]).filter((v): v is string => v != null))];

    async function fetchByIds<T>(table: string, values: string[]): Promise<T[]> {
      if (values.length === 0) return [];
      const { data, error: err } = await database.from(table).select('*').in('id', values);
      if (err) throw toFriendlyError(err, 'Não foi possível carregar os agendamentos.');
      return (data ?? []) as T[];
    }

    const [clients, devices, services, options, prices, addresses] = await Promise.all([
      fetchByIds<{ id: string; name: string; phone: string }>('clients', ids('client_id')),
      fetchByIds<{ id: string; model_id: string }>('devices', ids('device_id')),
      fetchByIds<{ id: string; name: string }>('services', ids('service_id')),
      fetchByIds<{ id: string; name: string }>('service_options', ids('service_option_id')),
      fetchByIds<{ id: string; price: number }>('prices', ids('price_id')),
      fetchByIds<{
        id: string; street: string; number: string; complement: string | null;
        neighborhood: string; city: string; state: string; zip_code: string;
      }>('addresses', ids('address_id')),
    ]);
    const deviceModelIds = [...new Set(devices.map((d) => d.model_id))];
    const modelsFull = await fetchByIds<{ id: string; name: string }>('device_models', deviceModelIds);

    const byId = <T extends { id: string }>(arr: T[]) => new Map(arr.map((x) => [x.id, x]));
    const mClients = byId(clients);
    const mDevices = byId(devices);
    const mServices = byId(services);
    const mOptions = byId(options);
    const mPrices = byId(prices);
    const mAddresses = byId(addresses);
    const mModels = byId(modelsFull);

    return rows.map((appointment) => {
      const client = mClients.get(appointment.client_id);
      const model = mModels.get(mDevices.get(appointment.device_id)?.model_id ?? '');
      const address = mAddresses.get(appointment.address_id ?? '');
      return {
        appointment,
        clientName: client?.name ?? '—',
        clientPhone: client?.phone ?? '—',
        modelName: model?.name ?? '—',
        serviceName: mServices.get(appointment.service_id)?.name ?? '—',
        optionName: appointment.service_option_id
          ? (mOptions.get(appointment.service_option_id)?.name ?? '—')
          : null,
        priceValue: appointment.quoted_card_total ?? (appointment.price_id ? Number(mPrices.get(appointment.price_id)?.price ?? NaN) || null : null),
        quotedPixTotal: appointment.quoted_pix_total,
        quotedCardTotal: appointment.quoted_card_total,
        addressLine: address ? addressLineOf(address) : '',
      };
    });
  },

  async updateAppointmentStatus(_companyId, appointmentId, status) {
    const database = supa();
    const companyId = await resolveCompanyId();
    const { data: current, error: fetchError } = await database
      .from('appointments')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', appointmentId)
      .maybeSingle();
    if (fetchError) throw toFriendlyError(fetchError, 'Não foi possível alterar o status.');
    if (!current) throw new Error('Agendamento não encontrado.');
    const row = current as Appointment;
    if (!canTransition(row.status, status)) throw new InvalidTransitionError(row.status, status);
    const { data, error } = await database
      .from('appointments')
      .update({ status })
      .eq('company_id', companyId)
      .eq('id', appointmentId)
      .select()
      .single();
    if (error) throw toFriendlyError(error, 'Não foi possível alterar o status.');
    return data as Appointment;
  },

  async createService(_companyId, input) {
    const database = supa();
    const companyId = await resolveCompanyId();
    const name = input.name.trim();
    if (!name) throw new Error('Informe o nome do serviço.');
    const base = slugify(name) || 'servico';
    const { data: existing, error: listError } = await database
      .from('services')
      .select('slug')
      .eq('company_id', companyId);
    if (listError) throw toFriendlyError(listError, 'Não foi possível criar o serviço.');
    const taken = new Set(((existing ?? []) as Array<{ slug: string }>).map((s) => s.slug));
    let slug = base;
    for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
    const { data, error } = await database
      .from('services')
      .insert({
        company_id: companyId, name, slug,
        description: input.description?.trim() || null, active: input.active ?? true,
      })
      .select()
      .single();
    if (error) throw toFriendlyError(error, 'Não foi possível criar o serviço.');
    return data as Service;
  },

  async updateService(_companyId, id, input) {
    const database = supa();
    const companyId = await resolveCompanyId();
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) {
      if (!input.name.trim()) throw new Error('Informe o nome do serviço.');
      patch.name = input.name.trim();
    }
    if (input.description !== undefined) patch.description = input.description.trim() || null;
    if (input.active !== undefined) patch.active = input.active;
    const { data, error } = await database
      .from('services')
      .update(patch)
      .eq('company_id', companyId)
      .eq('id', id)
      .select()
      .single();
    if (error) throw toFriendlyError(error, 'Não foi possível salvar o serviço.');
    return data as Service;
  },

  async createModel(_companyId, input) {
    const database = supa();
    const companyId = await resolveCompanyId();
    const name = input.name.trim();
    if (!name) throw new Error('Informe o nome do modelo.');
    const { data, error } = await database
      .from('device_models')
      .insert({
        company_id: companyId, name, family: input.family?.trim() || null,
        year: input.year ?? null, active: input.active ?? true,
      })
      .select()
      .single();
    if (error) throw toFriendlyError(error, 'Não foi possível criar o modelo.');
    return data as DeviceModel;
  },

  async updateModel(_companyId, id, input) {
    const database = supa();
    const companyId = await resolveCompanyId();
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) {
      if (!input.name.trim()) throw new Error('Informe o nome do modelo.');
      patch.name = input.name.trim();
    }
    if (input.family !== undefined) patch.family = input.family.trim() || null;
    if (input.year !== undefined) patch.year = input.year;
    if (input.active !== undefined) patch.active = input.active;
    const { data, error } = await database
      .from('device_models')
      .update(patch)
      .eq('company_id', companyId)
      .eq('id', id)
      .select()
      .single();
    if (error) throw toFriendlyError(error, 'Não foi possível salvar o modelo.');
    return data as DeviceModel;
  },

  async createPrice(_companyId, input) {
    const database = supa();
    const companyId = await resolveCompanyId();
    const pix = input.pixValue ?? input.value;
    if (!(pix > 0)) throw new Error('Informe um preço Pix válido maior que zero.');
    if (input.cardPrice !== undefined && input.cardPrice !== null && !(input.cardPrice > 0)) {
      throw new Error('Informe um preço de cartão válido maior que zero.');
    }
    const resolved = resolvePriceSave({ pix, cardPrice: input.cardPrice, cardAuto: input.cardAuto });
    const installmentCount = input.installmentCount ?? 10;
    const { data, error } = await database
      .from('prices')
      .insert({
        company_id: companyId, model_id: input.modelId, service_id: input.serviceId,
        service_option_id: input.serviceOptionId,
        price: resolved.card,
        pix_price: pix,
        card_price: resolved.card,
        card_price_custom: resolved.custom,
        installment_count: installmentCount,
        installment_price:
          input.installmentPrice ?? displayInstallment(resolved.card, installmentCount),
        active: input.active ?? true,
      })
      .select()
      .single();
    if (error) throw toFriendlyError(error, 'Não foi possível criar o preço.');
    return data as Price;
  },

  async updatePrice(_companyId, id, input) {
    const database = supa();
    const companyId = await resolveCompanyId();
    const patch: Record<string, unknown> = {};
    const pixTouched = input.pixValue !== undefined || input.value !== undefined;
    const priceTouched = pixTouched || input.cardPrice !== undefined || input.cardAuto === true;
    if (priceTouched) {
      // Lê a linha atual para preservar cartão personalizado quando só o Pix muda.
      const { data: current, error: fetchError } = await database
        .from('prices')
        .select('pix_price, price, card_price, card_price_custom, installment_count')
        .eq('company_id', companyId)
        .eq('id', id)
        .single();
      if (fetchError || !current) throw toFriendlyError(fetchError ?? { code: '', message: 'not found' }, 'Preço não encontrado.');
      const row = current as { pix_price: number | null; price: number; card_price: number | null; card_price_custom: boolean; installment_count: number | null };
      const nextPix = input.pixValue ?? input.value ?? row.pix_price ?? row.price;
      if (!(nextPix > 0)) throw new Error('Informe um preço Pix válido maior que zero.');
      if (input.cardPrice !== undefined && input.cardPrice !== null && !(input.cardPrice > 0)) {
        throw new Error('Informe um preço de cartão válido maior que zero.');
      }
      const resolved = resolvePriceSave({
        pix: nextPix,
        cardPrice: input.cardPrice,
        cardAuto: input.cardAuto,
        currentCustom: row.card_price_custom,
        currentCard: row.card_price,
      });
      patch.pix_price = nextPix;
      patch.card_price = resolved.card;
      patch.card_price_custom = resolved.custom;
      patch.price = resolved.card;
      patch.installment_price =
        input.installmentPrice ?? displayInstallment(resolved.card, row.installment_count ?? 10);
    }
    if (input.installmentCount !== undefined) patch.installment_count = input.installmentCount;
    if (input.installmentPrice !== undefined) patch.installment_price = input.installmentPrice;
    if (input.active !== undefined) patch.active = input.active;
    const { data, error } = await database
      .from('prices')
      .update(patch)
      .eq('company_id', companyId)
      .eq('id', id)
      .select()
      .single();
    if (error) throw toFriendlyError(error, 'Não foi possível salvar o preço.');
    return data as Price;
  },
};
