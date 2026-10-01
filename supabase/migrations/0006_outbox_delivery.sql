-- iPlay OS — 0006_outbox_delivery (PENDENTE — NÃO APLICADA NESTA ETAPA).
--
-- STATUS: arquivo criado para revisão. NÃO aplicar sem autorização expressa.
-- O worker process-notification-outbox opera sem esta migration em modo
-- degradado (claim otimista, sem recuperação de processing abandonado);
-- COM ela, usa claim_notification_batch() com trava de linha + lease.
--
-- POR QUE ela é necessária para a arquitetura final:
-- 1. Sem claimed_at, um worker que travar entre pending→processing e sent/failed
--    deixa a linha em 'processing' para sempre (sem como medir staleness).
-- 2. Sem provider_message_id/provider_wamid dedicados, a correlação com o
--    webhook whatsapp.message.updated exige garimpar payload jsonb.
-- 3. Sem claim em lote com FOR UPDATE SKIP LOCKED, dois workers concorrentes
--    (ex.: duas execuções do cron sobrepostas) disputam as mesmas linhas.
--
-- O QUE FAZ (aditiva, sem tocar migrations 0002–0005 nem recriar tabelas):
-- 1. claimed_at timestamptz (lease observável do claim).
-- 2. provider_message_id / provider_wamid (correlação YCloud ↔ webhook).
-- 3. Índice parcial para varredura de pendências.
-- 4. RPC claim_notification_batch() com SKIP LOCKED: reclama 'pending' +
--    'processing' abandonado (claimed_at velho/NULL), NUNCA 'sent'/'failed'.
--    Uso do worker process-notification-outbox (service_role).
--
-- COMPATIBILIDADE: colunas novas sem default/NOT NULL → registros pending
-- existentes continuam válidos (claimed_at NULL = elegível ao claim).
--
-- COMO APLICAR (somente após autorização):
--   supabase db push --project-ref avliqtinhvhyrzrpgqzk
--   (ou aplicar este arquivo pelo Dashboard → SQL Editor)

-- ---- 1. colunas de entrega (aditivas) ----
alter table public.notification_outbox
  add column if not exists claimed_at timestamptz,
  add column if not exists provider_message_id text,
  add column if not exists provider_wamid text;

-- ---- 2. índice de pendências ----
create index if not exists idx_outbox_pending_claim
  on public.notification_outbox (created_at)
  where status = 'pending';

-- ---- 3. claim em lote com trava de linha (uso do worker) ----
-- Forma canônica com CTE: o FOR UPDATE SKIP LOCKED impede dois workers de
-- reclamarem a mesma linha. Linhas 'processing' com claimed_at ausente
-- (pré-0006) ou mais velho que p_stale_seconds são consideradas abandonadas
-- e voltam ao lote. 'sent'/'failed' nunca são tocados.
-- Segurança: SECURITY DEFINER + search_path fixo, SEM grant para anon/
-- authenticated — só service_role (o worker) executa. Anon continua sem
-- nenhum acesso direto ao outbox (RLS deny-by-default, ver rls.sql).
-- O DROP defensivo abaixo cobre a revisão anterior desta mesma função
-- (nunca aplicada em produção) caso exista em algum ambiente.
drop function if exists public.claim_notification_batch(int, text[]);

create or replace function public.claim_notification_batch(
  p_limit int,
  p_types text[] default array['booking_confirmation'],
  p_stale_seconds int default 600
)
returns setof public.notification_outbox
language plpgsql volatile security definer set search_path = public
as $$
begin
  return query
  with candidates as (
    select i.id
      from public.notification_outbox i
     where i.type = any (p_types)
       and (
             i.status = 'pending'
             or (
               i.status = 'processing'
               and (
                 i.claimed_at is null
                 or i.claimed_at < now() - make_interval(secs => greatest(p_stale_seconds, 60))
               )
             )
           )
     order by i.created_at
     limit greatest(1, least(coalesce(p_limit, 10), 50))
     for update skip locked
  )
  update public.notification_outbox o
     set status = 'processing',
         claimed_at = now(),
         attempts = o.attempts + 1
    from candidates
   where o.id = candidates.id
  returning o.*;
end;
$$;

revoke all on function public.claim_notification_batch(int, text[], int) from public;
revoke all on function public.claim_notification_batch(int, text[], int) from anon, authenticated;
grant execute on function public.claim_notification_batch(int, text[], int) to service_role;
