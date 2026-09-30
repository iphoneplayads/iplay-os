# iPlay OS — Fundação + Orçamento/Agendamento (FASE 1–4)

Sistema operacional da iPlay: `DEFEITO → VALOR → AGENDAMENTO → SERVIÇO → IPHONE NOVO DE NOVO`.

## Rodar
```bash
npm install
npm run dev      # http://localhost:5173 (usa mocks por padrão)
npm run build    # tsc + vite build
```

Rotas: `/` · `/agendar` · `/admin/login` · `/admin` · `/admin/agendamentos` · `/admin/precos` · `/admin/servicos` · `/admin/modelos`.

## Backend (mock × Supabase)
Padrão: mocks isolados (`VITE_USE_MOCK` diferente de `false`).
Para o Supabase real:
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx   # anon key — NUNCA service_role no frontend
VITE_USE_MOCK=false
```
Pré-requisitos no banco: aplicar `supabase/schema.sql` (ou `migrations/0002_fase4.sql`) +
`supabase/rls.sql` + `supabase/seed.sql`, e cadastrar preços. Detalhes em `supabase/README.md`.

## Primeiro administrador
1. Dashboard Supabase → Authentication → Users → Create user.
2. `insert into profiles (id, company_id, role)` com o UUID (ver `supabase/seed.sql`).
3. Login em `/admin/login`. Não existe cadastro público de admin.

## Testes
```bash
npm run build    # tsc + vite (obrigatório verde)
```
Smoke FASE 3/4 (36 checagens: catálogo, preço, validações, dedupe, protocolo,
idempotência, transições, CRUD admin, WhatsApp, parsing BR) roda via esbuild+node
contra o código real — arquivos temporários removidos após execução.

## Docs
- `ARCHITECTURE.md` · `DATABASE.md` · `ROADMAP.md`
- SQL: `supabase/schema.sql`, `supabase/rls.sql`, `supabase/seed.sql`
