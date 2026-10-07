-- Orçamentos persistidos no Supabase.
create table if not exists public.quotes(
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,
 client_name text not null,client_phone text,device text not null,description text not null,amount numeric(12,2) not null default 0,
 status text not null default 'draft' check(status in('draft','sent','approved','rejected','converted')),
 service_order_id uuid references public.service_orders(id) on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists quotes_company_created_idx on public.quotes(company_id,created_at desc);
alter table public.quotes enable row level security;
drop policy if exists admin_tenant on public.quotes;
create policy admin_tenant on public.quotes for all to authenticated using(company_id=public.admin_company_id()) with check(company_id=public.admin_company_id());