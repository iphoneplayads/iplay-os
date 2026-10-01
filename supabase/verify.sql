-- iPlay OS — Verificação pós-provisionamento (FASE 4.1, ETAPA 15).
-- SOMENTE LEITURA: nenhum INSERT/UPDATE/DELETE/DROP aqui.

-- 1. tabelas esperadas
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('companies','users','clients','device_models','devices',
    'services','service_options','prices','addresses','appointments',
    'notification_outbox','profiles')
order by 1;

-- 2. RLS ativo em todas
select tablename, rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
  and tablename in ('companies','users','clients','device_models','devices',
    'services','service_options','prices','addresses','appointments',
    'notification_outbox','profiles')
order by 1;

-- 3. policies (esperado: admin_tenant nas 9 operacionais; admin_company/admin_users;
--    own_profile; NENHUMA policy para anon em tabelas)
select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
order by 1, 2;

-- 4. constraints de unicidade/integridade em appointments
select conname, pg_get_constraintdef(oid) as definicao
from pg_constraint
where conrelid = 'public.appointments'::regclass
  and contype in ('u','f','c')
order by 1;

-- 5. índices importantes
select indexname
from pg_indexes
where schemaname = 'public'
  and indexname in ('idx_prices_lookup','idx_appts_company_date','idx_appts_client',
    'idx_appts_protocol','idx_clients_phone','idx_models_company_sort',
    'idx_outbox_status','idx_addresses_company','uq_appts_window_active')
order by 1;

-- 6. trigger de protocolo + funções/RPCs
select trigger_name, event_object_table
from information_schema.triggers
where trigger_schema = 'public' and trigger_name = 'trg_appointments_protocol';

select p.proname as funcao,
       pg_get_function_identity_arguments(p.oid) as assinatura
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('get_public_catalog','get_day_availability','create_booking','build_protocol',
    'set_appointment_protocol','admin_company_id','is_admin')
order by 1;

-- 7. contagens (seed esperado: 1 empresa, 27 modelos, 5 serviços, 3 opções, 0 preços)
select 'companies' as tabela, count(*) as total from public.companies
union all select 'device_models', count(*) from public.device_models
union all select 'services', count(*) from public.services
union all select 'service_options', count(*) from public.service_options
union all select 'prices', count(*) from public.prices
union all select 'appointments', count(*) from public.appointments
union all select 'profiles', count(*) from public.profiles
order by 1;

-- 8. coluna operacional de estacionamento (migration 0004; NULL = não coletado)
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'addresses'
  and column_name = 'parking_free';

-- 9. colunas de preço Pix/cartão + snapshot (migration 0005)
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and ((table_name = 'prices' and column_name in ('card_price', 'card_price_custom'))
    or (table_name = 'appointments' and column_name in ('quoted_pix_total', 'quoted_card_total')))
order by 1, 2;
