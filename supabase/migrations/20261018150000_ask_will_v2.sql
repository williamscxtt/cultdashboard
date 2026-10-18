-- Ask Will v2: versioned knowledge, evidence traces, reviewed memory and feedback.

alter table public.ai_conversations
  add column if not exists summary text not null default '',
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.ask_will_knowledge_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  vector_store_id text not null,
  document_count integer not null default 0,
  total_words integer not null default 0,
  manifest jsonb not null default '{}',
  status text not null default 'staged' check (status in ('staged', 'active', 'archived', 'failed')),
  created_at timestamptz not null default now(),
  activated_at timestamptz
);

create unique index if not exists ask_will_one_active_knowledge_version
  on public.ask_will_knowledge_versions ((status))
  where status = 'active';

create table if not exists public.ask_will_answer_runs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  session_id text not null,
  openai_response_id text,
  model text not null,
  mode text not null check (mode in ('quick', 'deep', 'draft')),
  intent text not null,
  prompt_version text not null,
  knowledge_version text not null,
  question text not null,
  answer text not null,
  sources jsonb not null default '[]',
  input_tokens integer,
  output_tokens integer,
  status text,
  created_at timestamptz not null default now()
);

create index if not exists ask_will_answer_runs_profile_created
  on public.ask_will_answer_runs (profile_id, created_at desc);

create index if not exists ask_will_answer_runs_session
  on public.ask_will_answer_runs (session_id, created_at);

create table if not exists public.ask_will_feedback (
  id uuid primary key default gen_random_uuid(),
  answer_run_id uuid not null references public.ask_will_answer_runs(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  useful boolean,
  sounds_like_will boolean,
  issue_type text check (issue_type in ('missed_point', 'wrong_or_outdated', 'generic', 'voice', 'unsafe', 'other')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(answer_run_id, profile_id)
);

create table if not exists public.ask_will_memories (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('goal', 'offer', 'audience', 'constraint', 'decision', 'experiment', 'result', 'preference')),
  key text not null,
  value text not null,
  confidence real not null default 1 check (confidence >= 0 and confidence <= 1),
  status text not null default 'pending' check (status in ('pending', 'active', 'rejected', 'expired')),
  source_session_id text,
  source_message text,
  dedupe_key text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, dedupe_key)
);

create index if not exists ask_will_memories_profile_status
  on public.ask_will_memories (profile_id, status, updated_at desc);

alter table public.ask_will_knowledge_versions enable row level security;
alter table public.ask_will_answer_runs enable row level security;
alter table public.ask_will_feedback enable row level security;
alter table public.ask_will_memories enable row level security;

-- Ask Will reaches these tables only through authenticated server routes using
-- the service role. Keep them unavailable through the public Data API even if
-- this project's default privileges grant new public tables to client roles.
revoke all on table public.ask_will_knowledge_versions from anon, authenticated;
revoke all on table public.ask_will_answer_runs from anon, authenticated;
revoke all on table public.ask_will_feedback from anon, authenticated;
revoke all on table public.ask_will_memories from anon, authenticated;

drop policy if exists "ask_will_versions_admin" on public.ask_will_knowledge_versions;
create policy "ask_will_versions_admin" on public.ask_will_knowledge_versions
  for all to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "ask_will_runs_self" on public.ask_will_answer_runs;
create policy "ask_will_runs_self" on public.ask_will_answer_runs
  for select to authenticated using (profile_id = (select auth.uid()));

drop policy if exists "ask_will_runs_admin" on public.ask_will_answer_runs;
create policy "ask_will_runs_admin" on public.ask_will_answer_runs
  for all to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "ask_will_feedback_self" on public.ask_will_feedback;
create policy "ask_will_feedback_self" on public.ask_will_feedback
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists "ask_will_feedback_admin" on public.ask_will_feedback;
create policy "ask_will_feedback_admin" on public.ask_will_feedback
  for all to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "ask_will_memories_self" on public.ask_will_memories;
create policy "ask_will_memories_self" on public.ask_will_memories
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists "ask_will_memories_admin" on public.ask_will_memories;
create policy "ask_will_memories_admin" on public.ask_will_memories
  for all to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
