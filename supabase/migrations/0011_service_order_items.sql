-- Itens da OS: permite vários serviços preservando os campos primários da OS.
create table if not exists public.service_order_items (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 service_order_id uuid not null references public.service_orders(id) on delete cascade,
 service_id uuid not null references public.services(id),
 service_option_id uuid references public.service_options(id),
 price_id uuid references public.prices(id),
 description text not null,
 quantity integer not null default 1 check (quantity > 0),
 unit_pix numeric(12,2) not null default 0,
 unit_card numeric(12,2) not null default 0,
 discount numeric(12,2) not null default 0,
 created_at timestamptz not null default now()
);
create index if not exists service_order_items_order_idx on public.service_order_items(service_order_id);
alter table public.service_order_items enable row level security;
drop policy if exists admin_tenant on public.service_order_items;
create policy admin_tenant on public.service_order_items for all to authenticated
using (company_id = public.admin_company_id())
with check (company_id = public.admin_company_id());

create or replace function public.seed_service_order_item()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_service text; v_pix numeric; v_card numeric;
begin
 select s.name, coalesce(p.pix_price,new.quoted_pix_total,0),
        coalesce(nullif(p.installment_price,0)*nullif(p.installment_count,0),new.quoted_card_total,0)
 into v_service,v_pix,v_card
 from public.services s
 left join public.prices p on p.id=(select a.price_id from public.appointments a where a.id=new.appointment_id)
 where s.id=new.service_id;
 insert into public.service_order_items(company_id,service_order_id,service_id,service_option_id,price_id,description,quantity,unit_pix,unit_card,discount)
 select new.company_id,new.id,new.service_id,new.service_option_id,a.price_id,coalesce(v_service,'Serviço'),1,coalesce(v_pix,0),coalesce(v_card,0),0
 from public.appointments a where a.id=new.appointment_id;
 return new;
end $$;
drop trigger if exists trg_seed_service_order_item on public.service_orders;
create trigger trg_seed_service_order_item after insert on public.service_orders for each row execute function public.seed_service_order_item();
revoke execute on function public.seed_service_order_item() from public,anon,authenticated;
