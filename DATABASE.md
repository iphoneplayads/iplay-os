# iPlay OS — Banco de dados (FASE 1–3)

DDL pronto em `supabase/schema.sql`; RLS em `supabase/rls.sql`; seed mínimo em `supabase/seed.sql`.
Na FASE 3 o app grava de verdade via `repositories/supabase/` quando o env seleciona esse backend.

## Tabelas
| Tabela | Chave tenant | Notas |
|---|---|---|
| companies | — (raiz) | slug único |
| users | company_id | roles owner/admin/technician; unique(company,email) |
| clients | company_id | cpf opcional |
| device_models | company_id | lista dinâmica; unique(company,name); sort_order |
| devices | company_id + client_id | unique não imposta (1 cliente → N aparelhos) |
| services | company_id | SEM preço; unique(company,slug) |
| service_options | company_id + service_id | warranty_months, badge (ex. MAIS ESCOLHIDA) |
| prices | company_id + model + service + option | única fonte de preço; unique(company,model,service,option); `card_price` (total cartão, NULL=legado) + `card_price_custom` (auto +11% vs manual) |
| addresses | company_id | lat/long nuláveis (GPS futuro) |
| appointments | company_id | status + service_mode mobile; UTM/gclid; FKs p/ client/device/service/option/price/address; **protocol + idempotency_key únicos (FASE 4)**; snapshot `quoted_pix_total`/`quoted_card_total` (imutável) |
| notification_outbox | company_id | FASE 4: type/destino/payload/status/attempts (só estrutura, sem worker) |
| profiles | company_id | FASE 4: id (= auth.users), role admin; escrita só via SQL |

## Relacionamentos
- Company → Clients → Devices → Appointments
- Company → Services → ServiceOptions → Prices; DeviceModel → Prices
- Appointment → Client, Device, Service, ServiceOption?, Price?, Address?

## Índices
- `idx_prices_lookup(company,model,service,option) WHERE active` (leitura quente do fluxo)
- `idx_appts_company_date`, `idx_clients_phone`, `idx_models_company_sort`
- `uq_appts_window_active(company,date,start) WHERE status NOT IN ('cancelled','no_show')` — trava atômica anti-dupla-janela; cancelados/no_show liberam

## Integridade
- Preço obtido por tupla (company, model, service, option); ausente → mensagem, nunca invenção.
- Nome "Original Remanufaturada" exato (não "Original").
- `updated_at` via trigger `touch_updated_at()`.

## Multi-tenant + RLS
- Todo acesso filtra `company_id`; repositories mock fazem `assertTenant`; repositories Supabase filtram por `company_id` em toda query.
- Ao provisionar: aplicar `schema.sql`, depois habilitar RLS + policies por `company_id` (`rls.sql` traz o template). Sem policies que permitam insert anônimo escopado, a anon key não grava — isso é configuração de banco, não de código.
- FASE 2: `enable row level security` + policy `company_id = request_company_id()` em todas as tabelas operacionais; anon key no front, secrets só no servidor.
- Futuro: technicians, technician_schedules, technician_locations, appointment_assignments (tipos stub em `types/domain.ts`).

## FASE 3 — mapeamento prompt → modelo (sem renomear nada existente)
A tabela `agendamentos` do prompt é `appointments`; campos PT mapeados:
| Prompt (PT) | Modelo (EN) |
|---|---|
| cliente_id | `appointments.client_id` |
| modelo_id | `devices.model_id` (via `appointments.device_id`) |
| servico_id | `appointments.service_id` |
| data / horario | `scheduled_date` / `scheduled_start_time` |
| endereco, bairro, cidade (+nº, CEP, UF, complemento, referência) | `addresses.*` ligada por `address_id` + `addresses.appointment_id` |
| observacoes | `appointments.notes` |
| status `solicitado` | `status = 'requested'` (default no DDL; rótulo "Solicitado" no admin) |

Regras FASE 3 aplicadas nos dois backends:
- Dedupe de cliente por telefone (só dígitos) dentro do tenant; registro reutilizado e atualizado, nunca duplicado.
- Preço final revalidado no banco em `appointments.service.createAppointment` antes de gravar (o `priceId` do navegador é descartado).

## Janelas de atendimento (delivery; sem tabelas novas)
- Regra em `src/config/scheduling.ts` (SEG–SÁB 09–19, 5 janelas de 2h; domingo fechado; capacidade 1).
- Gravação em `appointments.scheduled_date` + `scheduled_start/end_time` (fim sempre preenchido).
- Disponibilidade real: `booking.getOccupiedSlots` (mock lê memória; Supabase via RPC `get_day_availability`, só horários, sem dados de clientes).
- Conflito: teste `WINDOW_TAKEN` na `create_booking` + índice `uq_appts_window_active`; status que bloqueiam em `APPOINTMENT_BLOCKING_STATUSES` (`types/domain.ts`).
