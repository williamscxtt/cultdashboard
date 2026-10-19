create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- A narrow service-only provisioning function keeps the credential out of SQL
-- migration files and cron commands. Vault encrypts it at rest.
create function public.configure_instagram_statistics_scheduler(cron_secret text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare existing_id uuid; scheduled_id bigint;
begin
  if cron_secret !~ '^[0-9a-f]{64}$' then raise exception 'Invalid cron credential'; end if;
  select id into existing_id from vault.secrets where name = 'instagram_statistics_cron_secret';
  if existing_id is null then
    perform vault.create_secret(cron_secret, 'instagram_statistics_cron_secret', 'Cult Dashboard statistics worker authentication');
  else
    perform vault.update_secret(existing_id, cron_secret);
  end if;
  select cron.schedule('instagram-statistics-worker', '*/5 * * * *',
    $command$select net.http_get(
      url := 'https://cultdashboard.com/api/instagram/sync-all',
      headers := jsonb_build_object('Authorization', 'Bearer ' ||
        (select decrypted_secret from vault.decrypted_secrets where name = 'instagram_statistics_cron_secret')),
      timeout_milliseconds := 180000
    );$command$) into scheduled_id;
  return scheduled_id;
end;
$$;
revoke all on function public.configure_instagram_statistics_scheduler(text) from public, anon, authenticated;
grant execute on function public.configure_instagram_statistics_scheduler(text) to service_role;
revoke all on net.http_request_queue, net._http_response from anon, authenticated;
