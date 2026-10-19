create table public.instagram_sync_invocations (
  nonce uuid primary key,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.instagram_sync_invocations enable row level security;
revoke all on public.instagram_sync_invocations from public, anon, authenticated;
grant select, insert, update, delete on public.instagram_sync_invocations to service_role;

create function public.consume_instagram_sync_invocation(invocation_nonce uuid)
returns boolean language sql security invoker set search_path = '' as $$
  with consumed as (
    update public.instagram_sync_invocations set consumed_at = now()
    where nonce = invocation_nonce and consumed_at is null and expires_at > now()
    returning nonce
  ) select exists(select 1 from consumed);
$$;
revoke all on function public.consume_instagram_sync_invocation(uuid) from public, anon, authenticated;
grant execute on function public.consume_instagram_sync_invocation(uuid) to service_role;

-- The managed pg_net queue has PUBLIC grants that the project postgres role
-- cannot revoke. It receives only a short-lived, single-use HMAC signature.
-- The long-lived signing key stays in Vault and the Vercel environment.
create function public.invoke_instagram_statistics_worker()
returns bigint language plpgsql security invoker set search_path = '' as $$
declare invocation_id uuid := gen_random_uuid(); stamp text; signing_key text; signature text;
begin
  select decrypted_secret into signing_key from vault.decrypted_secrets
    where name = 'instagram_statistics_cron_secret';
  if signing_key is null then raise exception 'Statistics worker credential is not configured'; end if;
  stamp := floor(extract(epoch from now()))::bigint::text;
  signature := encode(extensions.hmac(invocation_id::text || '.' || stamp, signing_key, 'sha256'), 'hex');
  delete from public.instagram_sync_invocations where expires_at < now() - interval '1 day';
  insert into public.instagram_sync_invocations(nonce,expires_at) values(invocation_id,now()+interval '5 minutes');
  return net.http_get(url := 'https://cultdashboard.com/api/instagram/sync-all',
    headers := jsonb_build_object('x-instagram-sync-nonce',invocation_id::text,
      'x-instagram-sync-timestamp',stamp,'x-instagram-sync-signature',signature),
    timeout_milliseconds := 180000);
end;
$$;
revoke all on function public.invoke_instagram_statistics_worker() from public, anon, authenticated;

create or replace function public.configure_instagram_statistics_scheduler(cron_secret text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare existing_id uuid; scheduled_id bigint;
begin
  if cron_secret !~ '^[0-9a-f]{64}$' then raise exception 'Invalid cron credential'; end if;
  select id into existing_id from vault.secrets where name = 'instagram_statistics_cron_secret';
  if existing_id is null then
    perform vault.create_secret(cron_secret, 'instagram_statistics_cron_secret', 'Cult Dashboard statistics worker signing key');
  else
    perform vault.update_secret(existing_id, cron_secret);
  end if;
  select cron.schedule('instagram-statistics-worker','*/5 * * * *',
    'select public.invoke_instagram_statistics_worker();') into scheduled_id;
  perform cron.alter_job(scheduled_id, active := true);
  return scheduled_id;
end;
$$;
revoke all on function public.configure_instagram_statistics_scheduler(text) from public, anon, authenticated;
grant execute on function public.configure_instagram_statistics_scheduler(text) to service_role;

-- Activate via the private provisioning call after the signed route is deployed.
select cron.alter_job(jobid, active := false) from cron.job where jobname='instagram-statistics-worker';
