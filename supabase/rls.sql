-- iPlay OS — RLS + RPCs públicos (FASE 4). Aplicar APÓS schema.sql (ou 0002_fase4.sql).
--
-- Estratégia:
-- 1. deny-by-default: NENHUMA policy para anon em tabelas. Anon executa apenas
--    as duas RPCs abaixo (SECURITY DEFINER), que validam tudo no servidor.
-- 2. Admin: policies FOR ALL para authenticated, escopadas por company_id via
--    public.profiles (role='admin'). Sem JWT customizado, sem service_role no front.
-- 3. profiles: leitura própria + leitura do admin da empresa; ESCRITA só via SQL
--    (dashboard Supabase) — ninguém vira admin sozinho.

-- ============ helpers ============
create or replace function public.admin_company_id() returns uuid
language sql stable security definer set search_path = public
as $$
  select company_id from public.profiles
  where id = auth.uid() and role = 'admin'
  limit 1
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$;

-- ============ RLS on ============
alter table public.companies enable row level security;
alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.device_models enable row level security;
alter table public.devices enable row level security;
alter table public.services enable row level security;
alter table public.service_options enable row level security;
alter table public.prices enable row level security;
alter table public.addresses enable row level security;
alter table public.appointments enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.profiles enable row level security;

-- ============ grants ============
-- authenticated (admin) opera tabelas; RLS restringe por tenant.
grant select, insert, update, delete on public.companies to authenticated;
grant select, insert, update, delete on public.users to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.device_models to authenticated;
grant select, insert, update, delete on public.devices to authenticated;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.service_options to authenticated;
grant select, insert, update, delete on public.prices to authenticated;
grant select, insert, update, delete on public.addresses to authenticated;
grant select, insert, update, delete on public.appointments to authenticated;
grant select, insert, update, delete on public.notification_outbox to authenticated;
grant select on public.profiles to authenticated;
-- anon: NENHUM grant em tabelas. Só EXECUTE nas RPCs (concedido abaixo).

-- ============ policies: admin por tenant ============
do $$
declare t text;
begin
  foreach t in array array[
    'clients','device_models','devices','services','service_options',
    'prices','addresses','appointments','notification_outbox'
  ] loop
    execute format('drop policy if exists admin_tenant on public.%I', t);
    execute format(
      'create policy admin_tenant on public.%I
         for all to authenticated
         using (company_id = public.admin_company_id())
         with check (company_id = public.admin_company_id())',
      t);
  end loop;
end $$;

drop policy if exists admin_company on public.companies;
create policy admin_company on public.companies
  for select to authenticated
  using (id = public.admin_company_id());

drop policy if exists admin_users on public.users;
create policy admin_users on public.users
  for all to authenticated
  using (company_id = public.admin_company_id())
  with check (company_id = public.admin_company_id());

drop policy if exists own_profile on public.profiles;
create policy own_profile on public.profiles
  for select to authenticated
  using (id = auth.uid() or company_id = public.admin_company_id());
-- SEMPRE sem policy de insert/update/delete em profiles: admin só via SQL.

-- ============ RPC: catálogo público por slug (leitura) ============
create or replace function public.get_public_catalog(p_slug text)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_company_id uuid;
begin
  select id into v_company_id from public.companies
  where slug = p_slug and active = true limit 1;
  if v_company_id is null then
    raise exception 'COMPANY_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'company', (
      select to_jsonb(c) from (
        select id, name, slug, logo_url, phone, whatsapp
        from public.companies where id = v_company_id
      ) c
    ),
    'models', (
      select coalesce(jsonb_agg(m order by m.sort_order), '[]'::jsonb) from (
        select * from public.device_models
        where company_id = v_company_id and active = true
      ) m
    ),
    'services', (
      select coalesce(jsonb_agg(s order by s.sort_order), '[]'::jsonb) from (
        select * from public.services
        where company_id = v_company_id and active = true
      ) s
    ),
    'options', (
      select coalesce(jsonb_agg(o order by o.sort_order), '[]'::jsonb) from (
        select * from public.service_options
        where company_id = v_company_id and active = true
      ) o
    ),
    'prices', (
      select coalesce(jsonb_agg(p order by p.created_at), '[]'::jsonb) from (
        select * from public.prices
        where company_id = v_company_id and active = true
      ) p
    )
  );
end;
$$;

-- ============ RPC: criar agendamento (público, com validações no servidor) ============
create or replace function public.create_booking(
  p_company_slug text,
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_model_id uuid,
  p_service_id uuid,
  p_service_option_id uuid,
  p_zip text, p_street text, p_number text, p_complement text,
  p_neighborhood text, p_city text, p_state text, p_reference text,
  p_date date, p_time time, p_notes text,
  p_idempotency_key text,
  p_source text,
  p_utm_source text, p_utm_medium text, p_utm_campaign text,
  p_utm_content text, p_utm_term text, p_gclid text
)
returns jsonb
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_company_id uuid;
  v_digits text;
  v_client public.clients%rowtype;
  v_price public.prices%rowtype;
  v_device public.devices%rowtype;
  v_address public.addresses%rowtype;
  v_appointment public.appointments%rowtype;
  v_now timestamptz := now();
begin
  -- empresa ativa
  select id into v_company_id from public.companies
  where slug = p_company_slug and active = true limit 1;
  if v_company_id is null then
    raise exception 'COMPANY_NOT_FOUND';
  end if;

  -- idempotência: mesma chave → devolve o agendamento já criado
  if p_idempotency_key is not null and p_idempotency_key <> '' then
    select * into v_appointment from public.appointments
    where idempotency_key = p_idempotency_key and company_id = v_company_id limit 1;
    if found then
      select * into v_client from public.clients where id = v_appointment.client_id;
      select * into v_device from public.devices where id = v_appointment.device_id;
      select * into v_address from public.addresses where id = v_appointment.address_id;
      return jsonb_build_object(
        'appointment', to_jsonb(v_appointment),
        'client', to_jsonb(v_client),
        'device', to_jsonb(v_device),
        'address', to_jsonb(v_address),
        'deduplicated', true
      );
    end if;
  end if;

  -- validações de catálogo (tudo ativo e do tenant)
  if not exists (select 1 from public.device_models
                 where id = p_model_id and company_id = v_company_id and active = true) then
    raise exception 'MODEL_NOT_FOUND';
  end if;
  if not exists (select 1 from public.services
                 where id = p_service_id and company_id = v_company_id and active = true) then
    raise exception 'SERVICE_NOT_FOUND';
  end if;
  if p_service_option_id is not null
     and not exists (select 1 from public.service_options
                     where id = p_service_option_id and company_id = v_company_id
                       and service_id = p_service_id and active = true) then
    raise exception 'OPTION_NOT_FOUND';
  end if;

  -- preço: autoridade é o banco; inexistente/inativo → não cria
  if p_service_option_id is null then
    select * into v_price from public.prices
    where company_id = v_company_id and model_id = p_model_id
      and service_id = p_service_id and service_option_id is null and active = true limit 1;
  else
    select * into v_price from public.prices
    where company_id = v_company_id and model_id = p_model_id
      and service_id = p_service_id and service_option_id = p_service_option_id
      and active = true limit 1;
  end if;
  if not found then
    raise exception 'PRICE_NOT_AVAILABLE';
  end if;

  -- dedupe de cliente por telefone (só dígitos) dentro do tenant
  v_digits := regexp_replace(coalesce(p_client_phone, ''), '\D', '', 'g');
  select * into v_client from public.clients
  where company_id = v_company_id
    and regexp_replace(phone, '\D', '', 'g') = v_digits
  limit 1;

  if found then
    update public.clients set
      name = p_client_name,
      whatsapp = p_client_phone,
      email = nullif(p_client_email, ''),
      updated_at = v_now
    where id = v_client.id
    returning * into v_client;
  else
    insert into public.clients (company_id, name, phone, whatsapp, email)
    values (v_company_id, p_client_name, p_client_phone, p_client_phone, nullif(p_client_email, ''))
    returning * into v_client;
  end if;

  insert into public.devices (company_id, client_id, model_id)
  values (v_company_id, v_client.id, p_model_id)
  returning * into v_device;

  insert into public.addresses
    (company_id, client_id, zip_code, street, number, complement,
     neighborhood, city, state, reference)
  values
    (v_company_id, v_client.id, p_zip, p_street, p_number, nullif(p_complement, ''),
     p_neighborhood, p_city, p_state, nullif(p_reference, ''))
  returning * into v_address;

  insert into public.appointments
    (company_id, client_id, device_id, service_id, service_option_id, price_id,
     scheduled_date, scheduled_start_time, status, service_mode, address_id,
     notes, source, utm_source, utm_medium, utm_campaign, utm_content, utm_term, gclid,
     idempotency_key)
  values
    (v_company_id, v_client.id, v_device.id, p_service_id, p_service_option_id, v_price.id,
     p_date, p_time, 'requested', 'mobile', v_address.id,
     nullif(p_notes, ''), coalesce(p_source, 'site'),
     nullif(p_utm_source, ''), nullif(p_utm_medium, ''), nullif(p_utm_campaign, ''),
     nullif(p_utm_content, ''), nullif(p_utm_term, ''), nullif(p_gclid, ''),
     nullif(p_idempotency_key, ''))
  returning * into v_appointment;

  update public.addresses set appointment_id = v_appointment.id
  where id = v_address.id
  returning * into v_address;

  -- outbox: confirmação WhatsApp futura (sem worker nesta fase)
  insert into public.notification_outbox
    (company_id, appointment_id, type, destino, payload, status)
  values
    (v_company_id, v_appointment.id, 'booking_confirmation', v_client.phone,
     jsonb_build_object('protocol', v_appointment.protocol, 'client', v_client.name),
     'pending');

  return jsonb_build_object(
    'appointment', to_jsonb(v_appointment),
    'client', to_jsonb(v_client),
    'device', to_jsonb(v_device),
    'address', to_jsonb(v_address),
    'deduplicated', false
  );
end;
$$;

-- RPCs executáveis por anon + authenticated (tabelas continuam sem grant p/ anon)
revoke all on function public.get_public_catalog(text) from public;
revoke all on function public.create_booking(
  text, text, text, text, uuid, uuid, uuid,
  text, text, text, text, text, text, text, text,
  date, time, text, text, text,
  text, text, text, text, text, text
) from public;
grant execute on function public.get_public_catalog(text) to anon, authenticated;
grant execute on function public.create_booking(
  text, text, text, text, uuid, uuid, uuid,
  text, text, text, text, text, text, text, text,
  date, time, text, text, text,
  text, text, text, text, text, text
) to anon, authenticated;
