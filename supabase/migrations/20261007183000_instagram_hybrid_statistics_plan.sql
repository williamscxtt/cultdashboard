alter table public.instagram_sync_jobs add column if not exists statistics_plan jsonb;
comment on column public.instagram_sync_jobs.statistics_plan is 'Durable daily statistics phases: official new-Reel discovery, lower-cost monthly play counts, and official gap completion. Null retains the original official-only workflow.';
notify pgrst, 'reload schema';
