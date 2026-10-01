# iPlay OS — Arquitetura (FASE 1–3)

## 1. Visão geral
Fundação do sistema operacional da iPlay: `DEFEITO → VALOR → AGENDAMENTO → SERVIÇO → IPHONE NOVO DE NOVO`.
FASE 1 entregou a fundação com mocks; FASE 3 implementou o fluxo de orçamento/agendamento e o
backend real via Supabase (ativo por env, com fallback para mock).

## 2. Stack
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS v4 + react-router-dom v7.
- Backend (FASE 1): camada de serviços + repositories em TS no próprio front (sem servidor próprio).
- Banco (FASE 2): Supabase/PostgreSQL (`supabase/schema.sql`, `rls.sql`, `seed.sql`).

## 3. Estrutura
```
src/
  config/        # app.ts (tenant padrão, flags), constants.ts (slugs, PROBLEM_OPTIONS)
  types/         # domain.ts, booking.ts, analytics.ts
  lib/           # supabase/client.ts (singleton anon key + getActiveBackend), validation/, utils/, analytics/, attribution.ts
  data/mock/     # catalog.ts — ÚNICO lugar com mocks
  repositories/  # mock.repository.ts, supabase/{catalog,booking}.repository.ts, factory.ts (único ponto de troca)
  services/      # catalog.service.ts, appointments.service.ts (revalida preço do banco ao gravar)
  services/      # catalog.service.ts, appointments.service.ts
  hooks/         # useBookingFlow, useAttribution
  components/    # ui/, booking/, layout/
  pages/         # public/HomePage, booking/BookingPage, admin/AdminPages
  App.tsx        # rotas /, /agendar, /admin*
supabase/        # schema.sql, rls.sql, seed.sql
```

## 4. Regras respeitadas
- Lógica de negócio em `services/`; UI só renderiza e despacha.
- Preços NUNCA hardcoded: `getPrice(company, model, service, option)`; ausente → "Preço ainda não cadastrado."
- `services` sem preço; preço vive em `prices` (Pix + cartão; regra em `src/config/pricing.ts`, centavos inteiros em `src/lib/pricing.ts`).
- Multi-tenant: `company_id` em todas as entidades; repositories validam tenant; RLS preparado.
- Mocks isolados em `src/data/mock`, acessados só via `repositories/`.
- Analytics só buffer (`lib/analytics/events.ts`); atribuição UTM/gclid preservada até `createAppointment`.

## 5. Fluxo de dados (/agendar)
`useBookingFlow` → `catalog.service` → `repositories.factory` → mock ou Supabase (via `getActiveBackend()`)
→ `appointments.service.validateAppointment/createAppointment` (revalida o preço no banco antes de
gravar) → `booking` repository (dedupe de cliente por telefone, status inicial `requested`) → sucesso.
Atribuição capturada uma vez (`useAttribution` + sessionStorage) e anexada ao appointment.
→ Etapa de data/janela: `availability.service.getDayWindows` (config `SCHEDULING_CONFIG` + ocupação
real via `booking.getOccupiedSlots`) → grava janela como `scheduled_start/end_time`; trava atômica
no banco (teste `WINDOW_TAKEN` + índice único parcial).

## 6. Decisões técnicas
- Tailwind v4 via `@tailwindcss/vite` (sem config JS).
- Slugs de serviço como contrato estável (`troca-de-tela` etc.) em vez de UUID no código.
- `service_mode` fixo `mobile` ("Nós vamos até você").
- Backend selecionado por env: `VITE_USE_MOCK=false` + `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`
  → Supabase; qualquer outra combinação → mock. Padrão local: mock.
- Somente anon key no frontend; nunca service_role.
- Status inicial do agendamento: `requested` (solicitado) — ver mapeamento em DATABASE.md.
- Admin sem auth (auth + RLS aplicado no banco entram antes da produção; policies em `supabase/rls.sql`).
- WhatsApp na FASE 3 é só CTA com link `wa.me` pré-preenchido (estrutura; sem API oficial).

## 7. FASE 4 — Supabase configurável + admin
- `anon` tem ZERO acesso a tabelas; fluxo público usa RPCs definer
  (`get_public_catalog`, `create_booking`) que validam tenant/catálogo/preço no servidor.
- Admin (`authenticated` + `profiles.role='admin'`): policies `admin_tenant` por `company_id`.
- `profiles` sem policies de escrita: admin só via SQL (sem auto-atribuição).
- Protocolo `IPL-YYYYMMDD-XXXX` gerado no banco (trigger); idempotência por
  `idempotency_key` (unique) ponta a ponta (botão + service + banco).
- Preço ausente/inativo bloqueia a criação (`PriceNotAvailableError`).
- Outbox `notification_outbox` só como tabela (sem worker, sem chamadas falsas).
- Painel em `pages/admin/*` via `AdminRepository` (mock + Supabase); transições de
  status em fonte única (`lib/booking/transitions.ts`).

## 8. Identidade visual (oficial — `brand-reference/`, `public/brand/`)
- Paleta: Noite `#0A0F0D` 60% · Musgo `#16211A` 20% · Branco `#F5F6F2` 10% · Lima `#B4F000` 10%
  (destaque; texto sobre lima sempre Noite). Cinza `#9AA39E`, linha `#26322B`, névoa `#CFD6D2`.
- Tipos: Sora 800 (títulos, preços, números) · DM Sans 400/500/700 (textos) via Google Fonts.
- Tokens centralizados em `src/index.css` (`@theme` Tailwind v4); componentes usam
  `bg-noite/bg-musgo/text-lima/...` — sem hex espalhado.
- Logo original em `public/brand/logo-iplay.png` via `components/brand/Logo.tsx` (sem redesenhar;
  só sobre fundo escuro, sem esticar).
- Cartões Musgo radius 20 · botões primários Lima · seleção ativa Lima · preço em cartão
  Lima (padrão "post" do guia) · foco visível Lima.
- Backend, RPCs, auth e regras de negócio intactos — redesign 100% presentacional.
