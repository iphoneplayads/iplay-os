import { APP_CONFIG } from '@/config/app';
import { SCHEDULING_CONFIG } from '@/config/scheduling';
import type { Appointment } from '@/types/domain';
import type { CreateAppointmentInput, CreatedAppointment } from '@/types/booking';
import { WindowTakenError } from '@/lib/booking/errors';
import { getSupabaseClient, missingCredentialsError } from '@/lib/supabase/client';
import { resolveCompanyId } from './company';
import type { BookingRepository } from '../mock.repository';

function db() {
  const client = getSupabaseClient();
  if (!client) throw missingCredentialsError();
  return client;
}

/** Mapeia erros da RPC para erros de negócio (exportado para testes). */
export function mapBookingRpcError(rpcError: { message: string }): Error {
  const msg = rpcError.message;
  if (msg.includes('WINDOW_TAKEN') || msg.includes('uq_appts_window_active')) {
    return new WindowTakenError();
  }
  if (msg.includes('PRICE_NOT_AVAILABLE')) {
    return new Error('Preço ainda não cadastrado para esta combinação.');
  }
  if (msg.includes('MODEL_NOT_FOUND') || msg.includes('SERVICE_NOT_FOUND') || msg.includes('OPTION_NOT_FOUND')) {
    return new Error('Modelo, serviço ou opção inválidos.');
  }
  if (msg.includes('COMPANY_NOT_FOUND')) {
    return new Error('Empresa inválida.');
  }
  return new Error('Não foi possível concluir seu agendamento agora. Tente novamente.');
}

/**
 * Agendamentos via Supabase — mesma interface do mock (FASE 4).
 * Criação pela RPC `create_booking` (definer): valida catálogo, revalida preço,
 * deduplica cliente, gera protocolo no banco, garante idempotência e registra
 * o outbox — tudo no servidor. Anon NÃO escreve direto nas tabelas.
 */
export const supabaseBookingRepository: BookingRepository = {
  async createAppointment(input: CreateAppointmentInput): Promise<CreatedAppointment> {
    const { data, error } = await db().rpc('create_booking', {
      p_company_slug: APP_CONFIG.company.slug,
      p_client_name: input.client.name,
      p_client_phone: input.client.phone,
      p_client_email: input.client.email || '',
      p_client_cpf: input.client.cpf || '',
      p_model_id: input.deviceModelId,
      p_service_id: input.serviceId,
      p_service_option_id: input.serviceOptionId,
      p_zip: input.address.zip_code,
      p_street: input.address.street,
      p_number: input.address.number,
      p_complement: input.address.complement || '',
      p_neighborhood: input.address.neighborhood,
      p_city: input.address.city,
      p_state: input.address.state,
      p_reference: input.address.reference || '',
      p_date: input.scheduling.date,
      p_time: input.scheduling.startTime,
      p_notes: input.notes ?? '',
      p_idempotency_key: input.idempotencyKey ?? '',
      p_source: input.source ?? 'site',
      p_utm_source: input.attribution.utm_source ?? '',
      p_utm_medium: input.attribution.utm_medium ?? '',
      p_utm_campaign: input.attribution.utm_campaign ?? '',
      p_utm_content: input.attribution.utm_content ?? '',
      p_utm_term: input.attribution.utm_term ?? '',
      p_gclid: input.attribution.gclid ?? '',
      p_end_time: input.scheduling.endTime ?? null,
      p_parking_free: input.address.parking_free ?? null,
    });
    if (error) throw mapBookingRpcError(error);
    const bundle = data as unknown as CreatedAppointment;
    return bundle;
  },

  async getOccupiedSlots(_companyId: string, dateISO: string): Promise<Array<{ start_time: string; end_time: string }>> {
    // Leitura pública pela RPC get_day_availability (definer): só horários,
    // nunca dados de clientes. Anon NÃO lê a tabela appointments.
    const { data, error } = await db().rpc('get_day_availability', {
      p_slug: APP_CONFIG.company.slug,
      p_date: dateISO,
      p_windows: SCHEDULING_CONFIG.windows.map((w) => ({ start: w.start, end: w.end })),
    });
    if (error) throw mapBookingRpcError(error);
    const payload = data as unknown as {
      windows?: Array<{ start_time: string; end_time: string; taken: boolean }>;
    };
    return (payload.windows ?? [])
      .filter((w) => w.taken)
      .map((w) => ({ start_time: w.start_time.slice(0, 5), end_time: w.end_time.slice(0, 5) }));
  },

  async listAppointments(_companyId: string): Promise<Appointment[]> {
    // Uso administrativo (sessão autenticada). Anon é bloqueado pelo RLS.
    // O tenant real é resolvido pelo slug — o frontend nunca guarda UUID.
    const database = db();
    const companyId = await resolveCompanyId();
    const { data, error } = await database
      .from('appointments')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Appointment[];
  },
};

