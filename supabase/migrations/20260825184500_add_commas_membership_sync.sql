alter table public.profiles
  add column if not exists billing_provider text,
  add column if not exists external_customer_id text,
  add column if not exists external_subscription_id text,
  add column if not exists subscription_currency text;

create table if not exists public.member_entitlements (
  email text primary key,
  provider text not null,
  external_customer_id text,
  external_subscription_id text,
  status text not null,
  plan_type text,
  amount integer,
  currency text,
  period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_events (
  event_id text primary key,
  provider text not null,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.member_entitlements enable row level security;
alter table public.billing_events enable row level security;

create unique index if not exists member_entitlements_external_subscription_idx
  on public.member_entitlements (provider, external_subscription_id)
  where external_subscription_id is not null;
