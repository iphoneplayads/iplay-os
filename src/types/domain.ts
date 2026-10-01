/**
 * Tipos de domínio do iPlay OS (FASE 1 — fundação).
 * Espelham as tabelas descritas em DATABASE.md.
 * company_id é o tenant em todas as entidades operacionais.
 */

export type Role = 'owner' | 'admin' | 'technician';

export type AppointmentStatus =
  | 'requested'
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type ServiceMode = 'mobile';

/** Status que BLOQUEIAM uma janela (cancelados/no_show liberam). Espelha o índice parcial do banco. */
export const APPOINTMENT_BLOCKING_STATUSES: readonly AppointmentStatus[] = [
  'requested',
  'pending',
  'confirmed',
  'in_progress',
  'completed',
];

export type AppointmentSource = 'site' | 'whatsapp' | 'manual' | 'ai' | string;

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  company_id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  company_id: string;
  name: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  cpf: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeviceModel {
  id: string;
  company_id: string;
  name: string;
  family: string | null;
  year: number | null;
  active: boolean;
  sort_order: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  company_id: string;
  client_id: string;
  model_id: string;
  imei: string | null;
  serial_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceOption {
  id: string;
  company_id: string;
  service_id: string;
  name: string;
  description: string | null;
  badge: string | null;
  warranty_months: number;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Price {
  id: string;
  company_id: string;
  model_id: string;
  service_id: string;
  service_option_id: string | null;
  price: number;
  pix_price: number | null;
  /**
   * Preço total no cartão. NULL em linhas antigas (fallback: `price`, sem +11%
   * presumido). Linhas novas sempre gravam o valor efetivo (auto ou manual).
   */
  card_price: number | null;
  /** Origem do cartão: false = calculado (+11% sobre o Pix); true = manual do admin. */
  card_price_custom: boolean;
  installment_count: number | null;
  installment_price: number | null;
  active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: string;
  company_id: string;
  client_id: string | null;
  appointment_id: string | null;
  zip_code: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  reference: string | null;
  /** Técnico tem onde estacionar sem custo? NULL = não coletado (agendamentos antigos). */
  parking_free: boolean | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  company_id: string;
  client_id: string;
  device_id: string;
  service_id: string;
  service_option_id: string | null;
  price_id: string | null;
  scheduled_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string | null;
  status: AppointmentStatus;
  service_mode: ServiceMode;
  address_id: string | null;
  notes: string | null;
  source: AppointmentSource;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  gclid: string | null;
  /** FASE 4: protocolo público único (gerado no banco) + chave de idempotência. */
  protocol: string | null;
  idempotency_key: string | null;
  /**
   * Snapshot do orçamento apresentado na criação (copiado da linha de preço).
   * Congelado: edições futuras em prices não alteram o histórico.
   * NULL em agendamentos antigos (sem backfill inventado).
   */
  quoted_pix_total: number | null;
  quoted_card_total: number | null;
  created_at: string;
  updated_at: string;
}

/** Entidades futuras (FASE 5+) — declaradas para preparar a arquitetura, sem uso operacional ainda. */
export interface Technician {
  id: string;
  company_id: string;
  user_id: string;
  name: string;
  phone: string | null;
  active: boolean;
  current_latitude: number | null;
  current_longitude: number | null;
  last_location_update: string | null;
}

/** FASE 4: perfil de acesso administrativo (Supabase Auth + RLS). Sem auto-atribuição. */
export interface AdminProfile {
  id: string;
  company_id: string;
  role: 'admin';
  created_at: string;
}

export type OutboxStatus = 'pending' | 'processing' | 'sent' | 'failed';

/** FASE 4: estrutura do outbox (sem worker nesta fase). */
export interface NotificationOutbox {
  id: string;
  company_id: string;
  appointment_id: string | null;
  type: 'booking_confirmation';
  destino: string;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  attempts: number;
  created_at: string;
  sent_at: string | null;
  error_message: string | null;
}
