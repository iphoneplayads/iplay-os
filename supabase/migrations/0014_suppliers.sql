-- Fornecedores do iPlay Gestão.
create table if not exists public.suppliers(
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,
 name text not null,phone text,email text,document text,notes text,active boolean not null default true,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists suppliers_company_name_idx on public.suppliers(company_id,name);
alter table public.suppliers enable row level security;
drop policy if exists admin_tenant on public.suppliers;
create policy admin_tenant on public.suppliers for all to authenticated using(company_id=public.admin_company_id()) with check(company_id=public.admin_company_id());