-- Peças consumidas por OS e custo histórico.
create table if not exists public.service_order_parts(
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,
 service_order_id uuid not null references public.service_orders(id) on delete cascade,inventory_item_id uuid not null references public.inventory_items(id),
 quantity integer not null check(quantity>0),unit_cost numeric(12,2) not null default 0,created_at timestamptz not null default now());
create index if not exists service_order_parts_order_idx on public.service_order_parts(service_order_id);
alter table public.service_order_parts enable row level security;
drop policy if exists admin_tenant on public.service_order_parts;
create policy admin_tenant on public.service_order_parts for all to authenticated using(company_id=public.admin_company_id()) with check(company_id=public.admin_company_id());
create or replace function public.add_service_order_part(p_service_order_id uuid,p_inventory_item_id uuid,p_quantity integer)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_company uuid;v_cost numeric;v_id uuid;
begin
 select company_id into v_company from profiles where id=auth.uid() and role='admin';
 if v_company is null then raise exception 'Unauthorized'; end if;
 if p_quantity<=0 then raise exception 'Invalid quantity'; end if;
 perform 1 from service_orders where id=p_service_order_id and company_id=v_company;
 if not found then raise exception 'Service order not found'; end if;
 select cost into v_cost from inventory_items where id=p_inventory_item_id and company_id=v_company and active=true;
 if not found then raise exception 'Inventory item not found'; end if;
 perform adjust_inventory_stock(p_inventory_item_id,p_quantity,'out','Uso na OS',p_service_order_id);
 insert into service_order_parts(company_id,service_order_id,inventory_item_id,quantity,unit_cost) values(v_company,p_service_order_id,p_inventory_item_id,p_quantity,coalesce(v_cost,0)) returning id into v_id;
 return v_id;
end$$;
revoke all on function public.add_service_order_part(uuid,uuid,integer) from public;
revoke all on function public.add_service_order_part(uuid,uuid,integer) from anon;
grant execute on function public.add_service_order_part(uuid,uuid,integer) to authenticated;