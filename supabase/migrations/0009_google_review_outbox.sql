-- Pós-venda: agenda pedido de avaliação 4 dias após conclusão da OS.
-- Não envia WhatsApp por si só; apenas cria uma pendência idempotente na outbox.

-- Tipos suportados pela fila.
alter table public.notification_outbox drop constraint if exists notification_outbox_type_check;
alter table public.notification_outbox add constraint notification_outbox_type_check
  check (type in ('booking_confirmation', 'google_review_request'));


alter table public.notification_outbox
  add column if not exists service_order_id uuid references public.service_orders(id) on delete cascade,
  add column if not exists scheduled_for timestamptz;

create unique index if not exists notification_outbox_review_order_uidx
  on public.notification_outbox(service_order_id, type)
  where service_order_id is not null and type = 'google_review_request';

create index if not exists notification_outbox_due_idx
  on public.notification_outbox(status, scheduled_for)
  where status = 'pending';

create or replace function public.schedule_google_review_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
begin
  if new.status = 'completed'
     and old.status is distinct from 'completed'
     and new.completed_at is not null then

    select coalesce(nullif(c.whatsapp,''), c.phone)
      into v_phone
      from public.clients c
     where c.id = new.client_id
       and c.company_id = new.company_id;

    if v_phone is not null and btrim(v_phone) <> '' then
      insert into public.notification_outbox(
        company_id, appointment_id, service_order_id, type, destino,
        payload, status, attempts, scheduled_for
      )
      values(
        new.company_id, new.appointment_id, new.id, 'google_review_request', v_phone,
        jsonb_build_object('order_number', new.order_number),
        'pending', 0, new.completed_at + interval '4 days'
      )
      on conflict (service_order_id, type)
        where service_order_id is not null and type = 'google_review_request'
      do nothing;
    end if;
  end if;

  if old.status = 'completed'
     and new.status is distinct from 'completed' then
    delete from public.notification_outbox
     where service_order_id = new.id
       and type = 'google_review_request'
       and status = 'pending';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_schedule_google_review_request on public.service_orders;
create trigger trg_schedule_google_review_request
after update of status on public.service_orders
for each row execute function public.schedule_google_review_request();

revoke execute on function public.schedule_google_review_request() from public, anon, authenticated;
