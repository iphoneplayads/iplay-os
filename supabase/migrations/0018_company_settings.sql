alter table public.companies add column if not exists document text;
drop policy if exists admin_tenant on public.companies;
create policy admin_tenant on public.companies for all to authenticated using(id=public.admin_company_id()) with check(id=public.admin_company_id());