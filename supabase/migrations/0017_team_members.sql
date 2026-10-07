-- Cadastro operacional da equipe. auth_user_id só é preenchido quando houver conta Auth vinculada.
create table if not exists public.team_members(
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,
 auth_user_id uuid references auth.users(id) on delete set null,name text not null,email text not null,
 role text not null check(role in('owner','manager','technician','frontdesk','finance')),active boolean not null default true,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(company_id,email));
create index if not exists team_members_company_idx on public.team_members(company_id,active);
alter table public.team_members enable row level security;
drop policy if exists admin_tenant on public.team_members;
create policy admin_tenant on public.team_members for all to authenticated using(company_id=public.admin_company_id()) with check(company_id=public.admin_company_id());