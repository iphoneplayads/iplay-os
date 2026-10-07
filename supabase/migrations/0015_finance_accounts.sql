-- Contas a pagar e receber do iPlay Gestão.
create table if not exists public.account_entries(
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,
 type text not null check(type in('receivable','payable')),description text not null,category text not null default '',
 amount numeric(12,2) not null check(amount>=0),due_date date not null,paid boolean not null default false,paid_at timestamptz,
 service_order_id uuid references public.service_orders(id) on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists account_entries_company_due_idx on public.account_entries(company_id,due_date);
alter table public.account_entries enable row level security;
drop policy if exists admin_tenant on public.account_entries;
create policy admin_tenant on public.account_entries for all to authenticated using(company_id=public.admin_company_id()) with check(company_id=public.admin_company_id());
create or replace function public.settle_account_entry(p_id uuid)
returns public.account_entries language plpgsql security definer set search_path=public as $$
declare v_company uuid;v_row public.account_entries;
begin select company_id into v_company from public.profiles where id=auth.uid() and role='admin';if v_company is null then raise exception 'NOT_AUTHORIZED';end if;
update public.account_entries set paid=true,paid_at=coalesce(paid_at,now()),updated_at=now() where id=p_id and company_id=v_company returning * into v_row;
if v_row.id is null then raise exception 'ACCOUNT_NOT_FOUND';end if;return v_row;end $$;
revoke all on function public.settle_account_entry(uuid) from public,anon;grant execute on function public.settle_account_entry(uuid) to authenticated;