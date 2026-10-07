-- Acionamentos de garantia vinculados às OS e aos itens executados.
create table if not exists public.warranty_claims(
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,
 service_order_id uuid not null references public.service_orders(id) on delete cascade,
 service_order_item_id uuid references public.service_order_items(id) on delete set null,notes text not null,
 status text not null default 'opened' check(status in('opened','in_analysis','approved','rejected','resolved')),
 created_at timestamptz not null default now(),resolved_at timestamptz,unique(service_order_id,service_order_item_id));
create index if not exists warranty_claims_company_idx on public.warranty_claims(company_id,created_at desc);
alter table public.warranty_claims enable row level security;
drop policy if exists admin_tenant on public.warranty_claims;
create policy admin_tenant on public.warranty_claims for all to authenticated using(company_id=public.admin_company_id()) with check(company_id=public.admin_company_id());