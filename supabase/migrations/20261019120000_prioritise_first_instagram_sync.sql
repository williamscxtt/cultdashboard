-- First-time creators must not wait behind the entire daily refresh roster.
-- Resume existing provider runs first and retain the eight-job concurrency cap.
create or replace function public.claim_instagram_sync_jobs(worker_id uuid, batch_size integer default 4)
returns setof public.instagram_sync_jobs language plpgsql security invoker
set search_path = '' as $$
declare capacity integer;
begin
  perform pg_advisory_xact_lock(188924001);
  select greatest(0, 8 - count(*)::integer) into capacity
    from public.instagram_sync_jobs where status = 'running';
  return query
    with due as (
      select id from public.instagram_sync_jobs
      where status = 'running' and next_attempt_at <= now()
        and (lease_until is null or lease_until < now())
      order by next_attempt_at for update skip locked
      limit least(greatest(batch_size, 1), 4)
    ), fresh as (
      select queued.id from public.instagram_sync_jobs queued
      where queued.status = 'queued' and queued.next_attempt_at <= now()
        and (queued.lease_until is null or queued.lease_until < now())
      order by exists (
        select 1 from public.instagram_sync_jobs previous
        where previous.username = queued.username and previous.status = 'succeeded'
      ), queued.sync_date, queued.created_at, queued.username
      for update of queued skip locked
      limit least(capacity, greatest(0, least(greatest(batch_size, 1), 4) - (select count(*) from due)::integer))
    )
    update public.instagram_sync_jobs j
    set status = 'running', lease_token = worker_id, lease_until = now() + interval '180 seconds', updated_at = now()
    where j.id in (select id from due union all select id from fresh)
    returning j.*;
end;
$$;
