# Supabase — provisionamento (FASE 4.1)

Sem Supabase CLI autenticado neste ambiente → aplicar pelo **Dashboard → SQL Editor**.
Nada aqui é destrutivo (sem DROP DATABASE/SCHEMA/TABLE).

## Ordem de aplicação (banco novo)
1. `supabase/schema.sql` — DDL completo (protocolo, idempotência, outbox, profiles).
2. `supabase/rls.sql` — RLS + policies + RPCs (`get_public_catalog`, `create_booking`).
3. `supabase/seed.sql` — company + 27 modelos + 5 serviços + 3 opções (idempotente).
4. `supabase/verify.sql` — conferência somente-leitura (ETAPA 15).

## Banco que já aplicou o schema da FASE 1/3
1. `supabase/migrations/0002_fase4.sql` (idempotente), depois `rls.sql`, `seed.sql`, `verify.sql`.

## Primeiro administrador
Ver `supabase/first_admin.sql` (Auth → Create user com ADMIN_EMAIL/ADMIN_PASSWORD do
proprietário; depois SQL com o UUID real; login em `/admin/login`).

## Preços
Nenhum seed de preço (R$ 599 do mock é teste). Cadastrar reais em `/admin/precos`.

## App
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx   # anon key — NUNCA service_role no frontend
VITE_USE_MOCK=false
```
Sem credenciais com `VITE_USE_MOCK=false`, o app falha com mensagem explícita
("Supabase credentials not configured.") — nunca opera em mock calado.

## Teste RLS negativo (com banco real; rode onde ANON_KEY/URL existirem, sem imprimi-los)
```bash
# 1. anon NÃO lista clientes (esperado: [] ou erro de policy)
curl -s "$VITE_SUPABASE_URL/rest/v1/clients?select=id" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY"
# 2. anon NÃO lista agendamentos (esperado: [] ou erro)
curl -s "$VITE_SUPABASE_URL/rest/v1/appointments?select=id" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY"
# 3. anon NÃO altera preço (esperado: erro 401/403 ou policy)
curl -s -X PATCH "$VITE_SUPABASE_URL/rest/v1/prices?id=eq.xxx" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" -d '{"price":1}'
# 4. catálogo público via RPC (esperado: JSON com models/services/options/prices)
curl -s -X POST "$VITE_SUPABASE_URL/rest/v1/rpc/get_public_catalog" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" -d '{"p_slug":"iplay"}'
```

## Segurança resumida
- `anon`: zero acesso a tabelas; só `EXECUTE` nas 2 RPCs (definer, validam tudo no servidor).
- `authenticated` não-admin: lê o próprio `profiles`; mais nada.
- Admin: tudo do próprio `company_id` (policies `admin_tenant`).
- Preço final sempre lido do banco (RPC revalida; service revalida no mock).
