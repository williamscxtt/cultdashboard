alter table public.profiles
  add column if not exists access_type text;

update public.profiles
set access_type = 'legacy_lifetime'
where membership_tier = 'creator_cult'
  and access_type is null
  and billing_provider is distinct from 'skool';

alter table public.profiles
  drop constraint if exists profiles_access_type_check;

alter table public.profiles
  add constraint profiles_access_type_check
  check (access_type is null or access_type in ('legacy_lifetime', 'skool_subscription'));

create index if not exists profiles_access_type_idx
  on public.profiles (access_type);
