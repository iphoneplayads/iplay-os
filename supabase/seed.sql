-- iPlay OS — Seed FASE 4.1 (aplicar após schema.sql).
-- IDEMPOTENTE: pode rodar N vezes sem duplicar (ON CONFLICT DO NOTHING).
-- NÃO cadastra preços: valores reais via /admin/precos (nunca inventar preço).
-- "Troca de vidro" (prompt) = "Troca de vidro da tela" (slug troca-de-vidro-da-tela).

insert into public.companies (name, slug, phone, whatsapp, email, active)
values ('iPlay', 'iplay', '(11) 99999-9999', '5511999999999', 'contato@iplay.exemplo', true)
on conflict (slug) do nothing;

-- ============ 27 modelos (lista de suporte FASE 1; sort = mais novo primeiro) ============
with c as (select id from public.companies where slug = 'iplay')
insert into public.device_models (company_id, name, family, year, sort_order)
select c.id, v.name, v.family, v.year, v.ord
from c cross join (values
  ('iPhone 17 Pro Max', '17', 2025, 1),
  ('iPhone 17 Pro', '17', 2025, 2),
  ('iPhone 17 Air', '17', 2025, 3),
  ('iPhone 17', '17', 2025, 4),
  ('iPhone 16 Pro Max', '16', 2024, 5),
  ('iPhone 16 Pro', '16', 2024, 6),
  ('iPhone 16 Plus', '16', 2024, 7),
  ('iPhone 16', '16', 2024, 8),
  ('iPhone 15 Pro Max', '15', 2023, 9),
  ('iPhone 15 Pro', '15', 2023, 10),
  ('iPhone 15 Plus', '15', 2023, 11),
  ('iPhone 15', '15', 2023, 12),
  ('iPhone 14 Pro Max', '14', 2022, 13),
  ('iPhone 14 Pro', '14', 2022, 14),
  ('iPhone 14 Plus', '14', 2022, 15),
  ('iPhone 14', '14', 2022, 16),
  ('iPhone 13 Pro Max', '13', 2021, 17),
  ('iPhone 13 Pro', '13', 2021, 18),
  ('iPhone 13 mini', '13', 2021, 19),
  ('iPhone 13', '13', 2021, 20),
  ('iPhone 12 Pro Max', '12', 2020, 21),
  ('iPhone 12 Pro', '12', 2020, 22),
  ('iPhone 12 mini', '12', 2020, 23),
  ('iPhone 12', '12', 2020, 24),
  ('iPhone 11 Pro Max', '11', 2019, 25),
  ('iPhone 11 Pro', '11', 2019, 26),
  ('iPhone 11', '11', 2019, 27)
) as v(name, family, year, ord)
on conflict (company_id, name) do nothing;

-- ============ 5 serviços (slugs = contrato estável com o frontend) ============
with c as (select id from public.companies where slug = 'iplay')
insert into public.services (company_id, name, slug, description, sort_order)
select c.id, v.name, v.slug, v.description, v.ord
from c cross join (values
  ('Troca de tela', 'troca-de-tela', 'Substituição completa da tela.', 1),
  ('Troca de bateria', 'troca-de-bateria', 'Substituição da bateria.', 2),
  ('Troca de vidro traseiro', 'troca-de-vidro-traseiro', 'Substituição do vidro traseiro.', 3),
  ('Troca de vidro da tela', 'troca-de-vidro-da-tela', 'Substituição somente do vidro da tela.', 4),
  ('Outro problema', 'outro-problema', 'Diagnóstico para outros defeitos.', 5)
) as v(name, slug, description, ord)
on conflict (company_id, slug) do nothing;

-- ============ 3 opções de troca de tela (nomes exatos; sem especificação inventada) ============
with c as (select id from public.companies where slug = 'iplay'),
s as (select id, company_id from public.services
      where slug = 'troca-de-tela' and company_id = (select id from c))
insert into public.service_options
  (company_id, service_id, name, description, badge, warranty_months, sort_order)
select s.company_id, s.id,
  v.name, v.description, v.badge::text, v.warranty, v.ord
from s cross join (values
  ('Premium',
   'Opção econômica para quem procura menor preço.',
   null, 3, 1),
  ('Pro',
   'Melhor equilíbrio entre qualidade, preço e garantia.',
   'MAIS ESCOLHIDA', 12, 2),
  ('Original Remanufaturada',
   'Tela original Apple remanufaturada.',
   null, 12, 3)
) as v(name, description, badge, warranty, ord)
on conflict (company_id, service_id, name) do nothing;

-- ============ PREÇOS: nenhum seed automático ============
-- R$ 599 e demais valores do mock são DADOS DE TESTE, não preço comercial.
-- Cadastre os valores reais em /admin/precos após o provisionamento.

-- ============ PRIMEIRO ADMINISTRADOR (ver supabase/first_admin.sql) ============
-- 1. Dashboard → Authentication → Users → Create user (ADMIN_EMAIL + ADMIN_PASSWORD
--    informados pelo proprietário; nunca inventar, nunca commitar).
-- 2. Executar supabase/first_admin.sql no SQL Editor com o UUID real.
-- 3. Login em /admin/login.
