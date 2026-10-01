# iPlay OS — Roadmap

## FASE 1 — Fundação ✅ (esta entrega)
- [x] Arquitetura, tipos, serviços, repositories + mocks isolados
- [x] UI pública (/), fluxo /agendar (8 etapas), admin estrutural
- [x] Schema SQL + RLS planejado + docs

## FASE 2 — Supabase (código pronto; ativação pendente de credenciais)
- [x] Cliente real (anon key) + `getActiveBackend()`; repositories Supabase implementados; `factory.ts` troca sem tocar UI/serviços
- [ ] Provisionar: aplicar `schema.sql` + `seed.sql`, habilitar RLS + policies (`rls.sql`), cadastrar preços/modelos/serviços
- [ ] Ativar: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` + `VITE_USE_MOCK=false`
- [ ] Auth (login admin/técnico) e CRUD preços/serviços/modelos (ainda pendentes)

## FASE 3 — Orçamento e agendamento ✅
- [x] Fluxo modelo → serviço → opção → orçamento ("Seu orçamento" + "Agendar atendimento" + voltar e alterar)
- [x] Preço do banco (mock ou Supabase conforme backend); ausente → "Preço ainda não cadastrado."
- [x] Dados do cliente (sem conta) + dedupe por telefone; endereço + observação do técnico; data/horário (sem passado)
- [x] Revisão ("Seu atendimento") + "Confirmar atendimento" com anti-duplo-clique; status inicial `requested` (solicitado)
- [x] Sucesso ("Atendimento solicitado!") com protocolo/detalhes + CTA WhatsApp (link, sem API)
- [x] Erros técnicos no console + mensagens amigáveis pt-BR; preço revalidado no banco ao gravar

## FASE 4 — Supabase configurável + admin + WhatsApp (estrutura) ✅
- [x] Cliente anon-only + `factory` por env; repositories Supabase (RPCs) e admin (mock + Supabase)
- [x] Auth admin (Supabase Auth + `profiles`); `/admin/*` protegido; login/logout; sem cadastro público
- [x] Painel: agendamentos (busca/filtro/status validado), serviços/modelos/preços (CRUD + ativação lógica)
- [x] Protocolo único `IPL-YYYYMMDD-XXXX` (banco é a autoridade) + idempotência real (chave por tentativa)
- [x] Preço ausente/inativo BLOQUEIA criação (§13); outbox `notification_outbox` (só tabela, sem worker)
- [x] CTA "Confirmar pelo WhatsApp" (link wa.me p/ número do cliente + mensagem pronta; sem API)
- [ ] Provisionar banco (schema → rls → seed), criar primeiro admin via SQL, cadastrar preços, ativar `VITE_USE_MOCK=false`

## FASE 4.1 — Provisionamento Supabase (código pronto; ativação aguarda credenciais)

## Janelas de atendimento ✅
- [x] Migration aditiva `0003_scheduling_windows.sql` (índice único parcial + `get_day_availability` + `create_booking` com trava `WINDOW_TAKEN` e `scheduled_end_time`)
- [x] Etapa "Quando podemos ir até você?" (faixa de dias, janelas 09–19 seg–sáb, domingo fechado, passado filtrado, ocupada desabilitada, auto-avanço, resumo + aviso de janela)
- [x] Concorrência: teste no banco + índice parcial (cancelados/no_show liberam); idempotência e revalidação de preço preservadas
- [x] Migrations reproduzíveis (`schema.sql` consolidado + `migrations/0002_fase4.sql` p/ base existente)
- [x] RLS real revisado (deny anon, admin por tenant, RPCs definer) + `verify.sql` somente-leitura
- [x] Seed idempotente (1 empresa, 27 modelos, 5 serviços, 3 opções; zero preços inventados)
- [x] `first_admin.sql` + procedimento sem credenciais fictícias; `.env.example` documentado
- [x] Modo real sem credenciais falha com mensagem explícita (sem mock silencioso)
- [x] Code splitting do supabase-js; build verde; regressão 36/36
- [ ] Humano: criar projeto Supabase → aplicar SQLs → criar admin → cadastrar preços → `VITE_USE_MOCK=false` → testes reais (ETAPAS 16–22)

## Preço Pix + Cartão ✅
- [x] Migration aditiva `0005_pricing_pix_card.sql` (sem DROP destrutivo, sem backfill; `rls.sql`/`schema.sql`/`verify.sql` sincronizados)
- [x] `card_price` + `card_price_custom`; `price` legado espelha o cartão nos novos saves; transição `pix ?? price` / `card ?? price` sem +11% presumido
- [x] Regra central `src/config/pricing.ts` + centavos inteiros (`src/lib/pricing.ts`); admin com auto/manual + "Usar cálculo automático"; site com Pix em destaque + cartão + 10x; snapshot congelado em appointments

## FASE 5 — Operação
- technicians, atribuição, status do atendimento, painel do técnico.

## FASE 6 — Localização
- GPS, Waze/Maps, ETA, rastreamento (só estrutura de lat/long existe hoje).

## FASE 7 — IA
- Funções `consultar_preco`, `consultar_agenda`, `criar/alterar/cancelar_agendamento`, `consultar_cliente/status`, `transferir_para_humano`.

## FASE 8 — Marketing
- Google Ads, atribuição completa, conversões, funil (eventos já instrumentados via `trackEvent`).

## FASE 9 — SaaS
- Múltiplas empresas, planos, cobrança, onboarding, configurações por empresa (tenant já isolado por `company_id`).
