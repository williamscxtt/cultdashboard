create table public.instagram_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  sync_date date not null,
  username text not null,
  profile_ids uuid[] not null,
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed','skipped')),
  profile_run_id text,
  reels_run_id text,
  profile_done boolean not null default false,
  reels_done boolean not null default false,
  profile_attempts integer not null default 0,
  reels_attempts integer not null default 0,
  last_error text,
  reel_count integer,
  lease_token uuid,
  lease_until timestamptz,
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(sync_date, username)
);
create index instagram_sync_jobs_due on public.instagram_sync_jobs(next_attempt_at)
  where status in ('queued','running');
alter table public.instagram_sync_jobs enable row level security;
revoke all on public.instagram_sync_jobs from public, anon, authenticated;
grant select, insert, update, delete on public.instagram_sync_jobs to service_role;

create function public.claim_instagram_sync_jobs(worker_id uuid, batch_size integer default 4)
returns setof public.instagram_sync_jobs language plpgsql security invoker
set search_path = '' as $$
declare capacity integer;
begin
  -- Serialize claims as well as locking rows to bound concurrent paid Actor runs.
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
      select id from public.instagram_sync_jobs
      where status = 'queued' and next_attempt_at <= now()
        and (lease_until is null or lease_until < now())
      order by sync_date, created_at for update skip locked
      limit least(capacity, greatest(0, least(greatest(batch_size, 1), 4) - (select count(*) from due)::integer))
    )
    update public.instagram_sync_jobs j
    set status = 'running', lease_token = worker_id, lease_until = now() + interval '180 seconds', updated_at = now()
    where j.id in (select id from due union all select id from fresh)
    returning j.*;
end;
$$;
revoke all on function public.claim_instagram_sync_jobs(uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_instagram_sync_jobs(uuid, integer) to service_role;
