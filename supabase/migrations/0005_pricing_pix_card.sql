-- iPlay OS — Migration 0005 (preço Pix + preço total no cartão).

-- Aditiva e idempotente: sem DROP TABLE/SCHEMA/DATABASE, sem apagar dados,

-- sem backfill inventado. Pode ser executada mais de uma vez.

--

-- O que faz:

--  1. prices.card_price (NULL = será definido pelo admin; linhas antigas ficam

--     NULL e usam a regra de compatibilidade no código, nunca +11% presumido);

--  2. prices.card_price_custom (origem do cartão quando card_price IS NOT NULL:
--     false = automático +11%; true = manual. Com card_price IS NULL a linha é
--     LEGADA e o flag é só DEFAULT, sem significado de "automático");

--  3. appointments.quoted_pix_total / quoted_card_total (snapshot congelado).

-- NÃO toca nas migrations 0003/0004 nem em nenhuma regra existente.

-- ---- 1. colunas (idempotentes; NULL preservado para registros existentes) ----

alter table public.prices add column if not exists card_price numeric(10,2);

alter table public.prices add column if not exists card_price_custom boolean not null default false;

alter table public.appointments add column if not exists quoted_pix_total numeric(10,2);

alter table public.appointments add column if not exists quoted_card_total numeric(10,2);

-- ---- 2. checks >= 0 nas novas colunas monetárias ----

do $$

begin

  if not exists (select 1 from pg_constraint where conname = 'prices_card_price_nonneg') then

    alter table public.prices add constraint prices_card_price_nonneg check (card_price is null or card_price >= 0);

  end if;

  if not exists (select 1 from pg_constraint where conname = 'appointments_quoted_pix_nonneg') then

    alter table public.appointments add constraint appointments_quoted_pix_nonneg check (quoted_pix_total is null or quoted_pix_total >= 0);

  end if;

  if not exists (select 1 from pg_constraint where conname = 'appointments_quoted_card_nonneg') then

    alter table public.appointments add constraint appointments_quoted_card_nonneg check (quoted_card_total is null or quoted_card_total >= 0);

  end if;

end $$;


-- ---- 3. create_booking com snapshot (mesma assinatura: CREATE OR REPLACE seguro) ----
-- Corpo identico ao rls.sql vigente; sem mudanca de assinatura, sem DROP.
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
  p_utm_content text, p_utm_term text, p_gclid text,
  p_end_time time default null,
  p_parking_free boolean default null
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
  v_end time;
  v_constraint text;
  v_quoted_pix numeric(10,2);
  v_quoted_card numeric(10,2);
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

  -- SNAPSHOT do orçamento apresentado: copiado da linha autoritativa para que
  -- edições futuras em prices não alterem o histórico. Regra de compatibilidade:
  -- Pix = pix_price ?? price; Cartão = card_price ?? price (legado, sem +11% presumido).
  v_quoted_pix := coalesce(v_price.pix_price, v_price.price);
  v_quoted_card := coalesce(v_price.card_price, v_price.price);

  -- JANELA: recusa atômica se já ocupada por status que bloqueia.
  -- (O índice único parcial uq_appts_window_active é a trava final contra
  --  concorrência; este teste devolve o erro amigável WINDOW_TAKEN.)
  if exists (
    select 1 from public.appointments
    where company_id = v_company_id
      and scheduled_date = p_date
      and scheduled_start_time = p_time
      and status not in ('cancelled', 'no_show')
  ) then
    raise exception 'WINDOW_TAKEN';
  end if;

  v_end := coalesce(p_end_time, p_time + interval '2 hours');

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
     neighborhood, city, state, reference, parking_free)
  values
    (v_company_id, v_client.id, p_zip, p_street, p_number, nullif(p_complement, ''),
     p_neighborhood, p_city, p_state, nullif(p_reference, ''), p_parking_free)
  returning * into v_address;

  -- INSERT atômico: a trava final é o índice único parcial. Se duas requisições
  -- passarem pelo IF EXISTS juntas, a perdedora cai aqui. Convertemos SOMENTE
  -- esse caso em WINDOW_TAKEN (outras constraints seguem com o erro original).
  -- Tudo roda numa transação só: qualquer erro reverte client/device/address
  -- criados acima — sem registros órfãos.
  begin
    insert into public.appointments
      (company_id, client_id, device_id, service_id, service_option_id, price_id,
       scheduled_date, scheduled_start_time, scheduled_end_time, status, service_mode, address_id,
       notes, source, utm_source, utm_medium, utm_campaign, utm_content, utm_term, gclid,
       idempotency_key, quoted_pix_total, quoted_card_total)
    values
      (v_company_id, v_client.id, v_device.id, p_service_id, p_service_option_id, v_price.id,
       p_date, p_time, v_end, 'requested', 'mobile', v_address.id,
       nullif(p_notes, ''), coalesce(p_source, 'site'),
       nullif(p_utm_source, ''), nullif(p_utm_medium, ''), nullif(p_utm_campaign, ''),
       nullif(p_utm_content, ''), nullif(p_utm_term, ''), nullif(p_gclid, ''),
       nullif(p_idempotency_key, ''), v_quoted_pix, v_quoted_card)
    returning * into v_appointment;
  exception
    when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'uq_appts_window_active' then
        raise exception 'WINDOW_TAKEN';
      elsif v_constraint = 'appointments_idempotency_key_key' then
        -- corrida com a MESMA chave: devolve o registro vencedor (já commitado).
        select * into v_appointment from public.appointments
        where idempotency_key = nullif(p_idempotency_key, '') and company_id = v_company_id limit 1;
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
        raise;
      else
        raise;
      end if;
  end;

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
