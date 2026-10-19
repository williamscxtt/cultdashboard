-- pg_net grants PUBLIC access by default; revoking individual roles alone
-- does not remove inherited access to queued authentication headers.
revoke all on net.http_request_queue, net._http_response from public, anon, authenticated;
