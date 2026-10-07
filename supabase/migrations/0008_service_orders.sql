-- iPlay — OS automática a partir do agendamento
-- Migration 0003. Idempotente e não destrutiva.
-- Não altera create_booking(): um trigger AFTER INSERT garante que toda criação
-- de appointment (site/admin/futuras integrações) gere exatamente uma pré-OS.

create sequence if not exists public.service_order_number_seq start 1;

create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  device_id uuid not null references public.devices(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  service_option_id uuid references public.service_options(id) on delete restrict,
  technician_id uuid references public.users(id) on delete set null,

  order_number bigint not null default nextval('public.service_order_number_seq'),
  status text not null default 'scheduled'
    check (status in (
      'scheduled',
      'pickup_requested',
      'received',
      'diagnosis',
      'awaiting_approval',
      'in_repair',
      'ready',
      'out_for_delivery',
      'completed',
      'cancelled'
    )),

  imei text,
  serial_number text,
  intake_notes text,
  diagnosis text,
  technical_notes text,
  customer_approval boolean,
  approved_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,

  quoted_pix_total numeric(10,2)
    check (quoted_pix_total is null or quoted_pix_total >= 0),
  quoted_card_total numeric(10,2)
    check (quoted_card_total is null or quoted_card_total >= 0),

  source text not null default 'appointment',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint service_orders_appointment_key unique (appointment_id),
  constraint service_orders_order_number_key unique (order_number)
);

create index if not exists idx_service_orders_company_status
  on public.service_orders(company_id, status, created_at desc);
create index if not exists idx_service_orders_client
  on public.service_orders(company_id, client_id);
create index if not exists idx_service_orders_device
  on public.service_orders(company_id, device_id);
create index if not exists idx_service_orders_number
  on public.service_orders(company_id, order_number);

-- updated_at automático
drop trigger if exists t_service_orders on public.service_orders;
create trigger t_service_orders
before update on public.service_orders
for each row execute function public.touch_updated_at();

-- Cria uma única pré-OS para cada novo agendamento.
-- Como o trigger roda na mesma transação do INSERT em appointments,
-- falha na OS também reverte o agendamento: nunca ficam dessincronizados.
create or replace function public.create_service_order_from_appointment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.service_orders (
    company_id,
    appointment_id,
    client_id,
    device_id,
    service_id,
    service_option_id,
    status,
    quoted_pix_total,
    quoted_card_total,
    source
  )
  values (
    new.company_id,
    new.id,
    new.client_id,
    new.device_id,
    new.service_id,
    new.service_option_id,
    case when new.status in ('cancelled', 'no_show') then 'cancelled' else 'scheduled' end,
    new.quoted_pix_total,
    new.quoted_card_total,
    coalesce(new.source, 'appointment')
  )
  on conflict (appointment_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_appointment_create_service_order on public.appointments;
create trigger trg_appointment_create_service_order
after insert on public.appointments
for each row execute function public.create_service_order_from_appointment();

-- RLS: somente usuários autenticados da própria empresa.
alter table public.service_orders enable row level security;

grant select, insert, update, delete on public.service_orders to authenticated;
revoke all on public.service_orders from anon;

drop policy if exists admin_tenant on public.service_orders;
create policy admin_tenant on public.service_orders
  for all to authenticated
  using (company_id = public.admin_company_id())
  with check (company_id = public.admin_company_id());

-- A sequence também não precisa ser acessível ao público.
revoke all on sequence public.service_order_number_seq from anon;
grant usage, select on sequence public.service_order_number_seq to authenticated;

-- IMPORTANTE:
-- Esta migration não cria OS retroativamente para appointments antigos.
-- Isso evita transformar histórico em OS sem decisão operacional explícita.
