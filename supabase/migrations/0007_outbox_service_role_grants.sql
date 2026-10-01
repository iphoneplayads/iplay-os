-- iPlay OS — 0007_outbox_service_role_grants (PENDENTE — NÃO APLICADA).
--
-- STATUS: arquivo criado para revisão. NÃO aplicar sem autorização expressa.
-- Aplicar somente após a reconciliação do histórico (0002–0005) estar correta,
-- pelo fluxo normal: supabase db push (esta será a única pendente).
--
-- CAUSA RAIZ (diagnóstico de produção): service_role NÃO possuía UPDATE
-- (nem SELECT) em public.notification_outbox. Por isso:
-- claim_notification_batch funcionava (SECURITY DEFINER executa com os
-- privilégios do owner, postgres), MAS o UPDATE direto do worker via
-- PostgREST falhava → finish() unrecorded (antes da correção defensiva,
-- escapava como 500 Internal Server Error).
--
-- RLS: service_role possui BYPASSRLS no Supabase — as policies (ex.
-- admin_tenant, só para authenticated) NÃO se aplicam a ele. O que faltava
-- era GRANT de tabela: checagem de privilégio é independente do RLS.
-- RLS permanece HABILITADO; nenhuma policy criada/alterada/removida;
-- nada concedido a anon ou authenticated.
--
-- NÃO toca nas migrations 0002–0006. Só GRANTs (idempotentes: reexecutar
-- é seguro e sem efeito adicional).

-- ---- 1. worker: leitura + finalização do outbox ----
-- SELECT: o caminho legado de claim lista pendings (pré-0006); com 0006 o
-- claim vai pela RPC, mas a leitura direta permanece como fallback.
-- UPDATE: finish() grava status/sent_at/error_message/provider ids.
-- Sem INSERT (linhas nascem via create_booking), sem DELETE/TRUNCATE
-- (o worker nunca remove linhas).
grant select, update on public.notification_outbox to service_role;

-- ---- 2. worker: leitura das entidades do booking (SOMENTE SELECT) ----
-- O worker carrega appointment → client/device/model/service/option via
-- service_role para montar a mensagem de confirmação; nunca escreve
-- nessas tabelas (nenhum INSERT/UPDATE/DELETE aqui).
-- Seção mantida mínima e explícita: apenas o SELECT que o código usa
-- (process-notification-outbox/index.ts, leituras encadeadas do job).
grant select on public.appointments to service_role;
grant select on public.clients to service_role;
grant select on public.devices to service_role;
grant select on public.device_models to service_role;
grant select on public.services to service_role;
grant select on public.service_options to service_role;
