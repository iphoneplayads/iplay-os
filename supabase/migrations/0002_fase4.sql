-- iPlay OS — Migration 0002 (FASE 4).
-- Para bancos que JÁ aplicaram o schema da FASE 1/3.
-- Bancos novos: aplique supabase/schema.sql (já consolidado) e ignore este arquivo.
-- Idempotente: pode ser executada mais de uma vez.

-- ---- appointments: protocolo + idempotência ----
alter table public.appointments add column if not exists protocol text;
alter table public.appointments add column if not exists idempotency_key text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'appointments_protocol_key') then
    alter table public.appointments add constraint appointments_protocol_key unique (protocol);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'appointments_idempotency_key_key') then
    alter table public.appointments add constraint appointments_idempotency_key_key unique (idempotency_key);
  end if;
end $$;

create index if not exists idx_appts_protocol on public.appointments(company_id, protocol);

-- ---- notification_outbox ----
create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
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
create index if not exists idx_outbox_status on public.notification_outbox(company_id, status, created_at);

-- ---- profiles ----
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now(),
  unique (id)
);

-- ---- protocolo: função + trigger (autoridade: banco) ----
create or replace function public.build_protocol() returns text
language sql volatile set search_path = public
as $$
  select 'IPL-' || to_char(now(), 'YYYYMMDD') || '-' ||
    (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32) + 1)::int, 1), '')
     from generate_series(1, 4))
$$;

create or replace function public.set_appointment_protocol() returns trigger
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

-- preenche protocolo de registros antigos (função já existe neste ponto)
update public.appointments
set protocol = public.build_protocol()
where protocol is null or protocol = '';
