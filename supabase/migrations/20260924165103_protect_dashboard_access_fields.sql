-- Members can edit their content/profile, but only trusted server/admin flows
-- may grant, revoke or relink Dashboard access.
create or replace function public.protect_dashboard_access_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() and
    (new.id, new.email, new.role, new.is_active, new.billing_exempt,
     new.access_type, new.billing_provider, new.membership_tier,
     new.subscription_status, new.subscription_period_end)
    is distinct from
    (old.id, old.email, old.role, old.is_active, old.billing_exempt,
     old.access_type, old.billing_provider, old.membership_tier,
     old.subscription_status, old.subscription_period_end)
  then
    raise exception 'Membership access can only be changed by an administrator.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.protect_dashboard_access_fields() from public;
create trigger protect_dashboard_access_fields
before update on public.profiles
for each row execute function public.protect_dashboard_access_fields();
