-- Estoque real do iPlay Gestão.
create table if not exists public.inventory_items(
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 sku text not null, name text not null, category text not null default '', compatible_models text[] not null default '{}',
 cost numeric(12,2) not null default 0, sale_price numeric(12,2) not null default 0,
 quantity integer not null default 0, minimum_stock integer not null default 0, active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id,sku));
create table if not exists public.inventory_movements(
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 item_id uuid not null references public.inventory_items(id) on delete cascade,
 type text not null check(type in('in','out','adjustment')), quantity integer not null check(quantity>0),
 reason text not null, service_order_id uuid references public.service_orders(id) on delete set null, created_at timestamptz not null default now());
alter table public.inventory_items enable row level security; alter table public.inventory_movements enable row level security;
drop policy if exists admin_tenant on public.inventory_items; create policy admin_tenant on public.inventory_items for all to authenticated using(company_id=public.admin_company_id()) with check(company_id=public.admin_company_id());
drop policy if exists admin_tenant on public.inventory_movements; create policy admin_tenant on public.inventory_movements for all to authenticated using(company_id=public.admin_company_id()) with check(company_id=public.admin_company_id());
create or replace function public.adjust_inventory_stock(p_item_id uuid,p_quantity int,p_type text,p_reason text,p_service_order_id uuid default null)
returns public.inventory_items language plpgsql security definer set search_path=public as $$
declare v_company uuid;v_delta int;v_item public.inventory_items;
begin
 select company_id into v_company from public.profiles where id=auth.uid() and role='admin';if v_company is null then raise exception 'NOT_AUTHORIZED';end if;
 if p_quantity<=0 or p_type not in('in','out','adjustment') then raise exception 'INVALID_MOVEMENT';end if;
 select * into v_item from public.inventory_items where id=p_item_id and company_id=v_company for update;if v_item.id is null then raise exception 'ITEM_NOT_FOUND';end if;
 v_delta:=case when p_type='in' then p_quantity when p_type='out' then -p_quantity else p_quantity end;if v_item.quantity+v_delta<0 then raise exception 'INSUFFICIENT_STOCK';end if;
 update public.inventory_items set quantity=quantity+v_delta,updated_at=now() where id=p_item_id returning * into v_item;
 insert into public.inventory_movements(company_id,item_id,type,quantity,reason,service_order_id) values(v_company,p_item_id,p_type,p_quantity,p_reason,p_service_order_id);return v_item;
end $$;
revoke all on function public.adjust_inventory_stock(uuid,int,text,text,uuid) from public,anon;grant execute on function public.adjust_inventory_stock(uuid,int,text,text,uuid) to authenticated;