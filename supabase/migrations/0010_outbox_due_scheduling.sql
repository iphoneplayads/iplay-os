-- A fila só reclama notificações cujo horário de envio já chegou.
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
       and (i.scheduled_for is null or i.scheduled_for <= now())
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
     order by coalesce(i.scheduled_for, i.created_at), i.created_at
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

revoke all on function public.claim_notification_batch(int, text[], int) from public, anon, authenticated;
grant execute on function public.claim_notification_batch(int, text[], int) to service_role;
