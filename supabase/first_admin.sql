-- iPlay OS — Primeiro administrador (FASE 4.1, ETAPA 5).
-- COMO USAR (SQL Editor do Supabase Dashboard, sem nada automático):
-- 1. Authentication → Users → "Create user": informe ADMIN_EMAIL + ADMIN_PASSWORD
--    (fornecidos pelo proprietário do projeto; NÃO inventar, NÃO commitar).
-- 2. Copie o UUID do usuário criado e substitua UUID_DO_USUARIO_AQUI abaixo.
-- 3. Execute este arquivo. 4. Login em /admin/login.
-- Idempotente: rodar 2× mantém/atualiza a role sem duplicar.

insert into public.profiles (id, company_id, role)
values (
  'UUID_DO_USUARIO_AQUI',
  (select id from public.companies where slug = 'iplay'),
  'admin'
)
on conflict (id) do update
  set company_id = excluded.company_id,
      role = 'admin';

-- verificação (leitura; sem secrets):
-- select p.id, u.email, p.role, p.created_at
-- from public.profiles p join auth.users u on u.id = p.id;

-- remover acesso admin (se necessário; NÃO apaga o usuário do Auth):
-- delete from public.profiles where id = 'UUID_DO_USUARIO_AQUI';
