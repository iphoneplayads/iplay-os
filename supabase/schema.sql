-- iPlay OS — Schema PostgreSQL/Supabase (FASE 1: modelagem; aplicar na FASE 2)
-- Multi-tenant via company_id em todas as tabelas operacionais.
-- RLS: ver supabase/rls.sql (deny-by-default + policy por company_id).

create extension if not exists "pgcrypto";

-- ============ companies ============
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  phone text,
  whatsapp text,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ users (admin/técnicos) ============
create table users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('owner','admin','technician')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, email)
);

-- ============ clients ============
create table clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  phone text not null,
  whatsapp text,
  email text,
  cpf text, -- opcional
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_clients_company on clients(company_id);
create index idx_clients_phone on clients(company_id, phone);

-- ============ device_models (lista dinâmica, editável pelo admin) ============
create table device_models (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  family text,
  year int,
  active boolean not null default true,
  sort_order int not null default 0,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);
create index idx_models_company_sort on device_models(company_id, sort_order);

-- ============ devices ============
create table devices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  model_id uuid not null references device_models(id) on delete restrict,
  imei text,
  serial_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_devices_company_client on devices(company_id, client_id);

-- ============ services (SEM preço) ============
create table services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, slug)
);

-- ============ service_options ============
create table service_options (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  name text not null,
  description text,
  badge text,
  warranty_months int not null default 3,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, service_id, name)
);
create index idx_options_service on service_options(company_id, service_id);

-- ============ prices (única fonte de preço) ============
create table prices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  model_id uuid not null references device_models(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  service_option_id uuid references service_options(id) on delete cascade,
  price numeric(10,2) not null check (price >= 0),
  pix_price numeric(10,2),
  installment_count int,
  installment_price numeric(10,2),
  active boolean not null default true,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, model_id, service_id, service_option_id)
);
create index idx_prices_lookup on prices(company_id, model_id, service_id, service_option_id) where active = true;

-- ============ addresses ============
create table addresses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  appointment_id uuid,
  zip_code text not null,
  street text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  state text not null,
  reference text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_addresses_company on addresses(company_id);

-- ============ appointments ============
create table appointments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid not null references clients(id) on delete restrict,
  device_id uuid not null references devices(id) on delete restrict,
  service_id uuid not null references services(id) on delete restrict,
  service_option_id uuid references service_options(id) on delete restrict,
  price_id uuid references prices(id) on delete set null,
  scheduled_date date not null,
  scheduled_start_time time not null,
  scheduled_end_time time,
  status text not null default 'requested'
    check (status in ('requested','pending','confirmed','in_progress','completed','cancelled','no_show')),
  service_mode text not null default 'mobile' check (service_mode in ('mobile')),
  address_id uuid references addresses(id) on delete set null,
  notes text,
  source text not null default 'site',
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  gclid text,
  -- FASE 4: protocolo público único (gerado no banco) + idempotência de criação.
  protocol text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (protocol),
  unique (idempotency_key)
);
create index idx_appts_company_date on appointments(company_id, scheduled_date);
create index idx_appts_client on appointments(company_id, client_id);
create index idx_appts_protocol on appointments(company_id, protocol);

-- FK circular addresses.appointment_id -> appointments.id (adicionada após criar appointments)
alter table addresses
  add constraint fk_addresses_appointment
  foreign key (appointment_id) references appointments(id) on delete set null;

-- ============ notification_outbox (FASE 4: só estrutura; sem worker) ============
create table notification_outbox (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete set null,
  type text not null default 'booking_confirmation' check (type in ('booking_confirmation')),
  destino text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending','processing','sent','failed')),
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  error_message text
);
create index idx_outbox_status on notification_outbox(company_id, status, created_at);

-- ============ profiles (FASE 4: role admin via Supabase Auth; sem auto-atribuição) ============
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now(),
  unique (id)
);

-- ============ protocolo do agendamento (autoridade: banco, não frontend) ============
create or replace function build_protocol() returns text
language sql volatile set search_path = public
as $$
  select 'IPL-' || to_char(now(), 'YYYYMMDD') || '-' ||
    (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32) + 1)::int, 1), '')
     from generate_series(1, 4))
$$;

create or replace function set_appointment_protocol() returns trigger
language plpgsql set search_path = public
as $$
begin
  if new.protocol is null or new.protocol = '' then
    new.protocol := public.build_protocol();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_appointments_protocol on public.appointments;
create trigger trg_appointments_protocol before insert on public.appointments
for each row execute function public.set_appointment_protocol();

-- ============ updated_at automático ============
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

create trigger t_companies before update on companies for each row execute function touch_updated_at();
create trigger t_users before update on users for each row execute function touch_updated_at();
create trigger t_clients before update on clients for each row execute function touch_updated_at();
create trigger t_models before update on device_models for each row execute function touch_updated_at();
create trigger t_devices before update on devices for each row execute function touch_updated_at();
create trigger t_services before update on services for each row execute function touch_updated_at();
create trigger t_options before update on service_options for each row execute function touch_updated_at();
create trigger t_prices before update on prices for each row execute function touch_updated_at();
create trigger t_addresses before update on addresses for each row execute function touch_updated_at();
create trigger t_appointments before update on appointments for each row execute function touch_updated_at();
-- notification_outbox e profiles não usam updated_at (outbox é append-only; profile é gerenciado via SQL).
