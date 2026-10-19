create table public.instagram_posts (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  post_id text not null,
  posted_at timestamptz not null,
  content_type text not null check (content_type in ('reel','carousel','photo')),
  primary key (profile_id, post_id)
);
create index instagram_posts_profile_date on public.instagram_posts(profile_id, posted_at);
alter table public.instagram_posts enable row level security;
revoke all on public.instagram_posts from anon, authenticated;
grant all on public.instagram_posts to service_role;

alter table public.instagram_sync_jobs add column posts_done boolean not null default false;
alter table public.instagram_sync_jobs add column post_history_complete boolean not null default false;

create table public.leaderboard_insights (
  sync_date date primary key,
  fingerprint text not null,
  status text not null default 'pending' check (status in ('pending','generating','ready','failed')),
  items jsonb,
  generated_at timestamptz,
  lease_token uuid,
  lease_until timestamptz,
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now()
);
alter table public.leaderboard_insights enable row level security;
revoke all on public.leaderboard_insights from anon, authenticated;
grant all on public.leaderboard_insights to service_role;

create function public.claim_leaderboard_insight(sync_day date, source_fingerprint text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare existing public.leaderboard_insights; token uuid := gen_random_uuid();
begin
  insert into public.leaderboard_insights(sync_date,fingerprint) values(sync_day,source_fingerprint) on conflict do nothing;
  select * into existing from public.leaderboard_insights where sync_date=sync_day for update;
  if existing.status='generating' and existing.lease_until>now() then return null; end if;
  if existing.fingerprint=source_fingerprint and (existing.status='ready' or existing.attempts>=3 or existing.next_attempt_at>now()) then return null; end if;
  update public.leaderboard_insights set fingerprint=source_fingerprint,status='generating',lease_token=token,
    lease_until=now()+interval '2 minutes',attempts=case when fingerprint=source_fingerprint then attempts+1 else 1 end,
    items=null,generated_at=null where sync_date=sync_day;
  return token;
end $$;
revoke all on function public.claim_leaderboard_insight(date,text) from public,anon,authenticated;
grant execute on function public.claim_leaderboard_insight(date,text) to service_role;
