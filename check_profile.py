#!/usr/bin/env python3
import json, urllib.request

SUPABASE_URL = "https://nhhpuvpscwpzdocikwjx.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oaHB1dnBzY3dwemRvY2lrd2p4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDYxMjIwMCwiZXhwIjoyMDkwMTg4MjAwfQ.wmz9SXITZV68EK4cxckAA293razGSJMQgG0vdqmMlwQ"

req = urllib.request.Request(
    f"{SUPABASE_URL}/rest/v1/profiles?select=id,email,ig_username,ig_user_id,ig_access_token",
    headers={"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}
)
profiles = json.loads(urllib.request.urlopen(req).read())
for p in profiles:
    token_preview = (p['ig_access_token'] or '')[:30] + '...' if p.get('ig_access_token') else 'NULL'
    print(f"{p['email']}")
    print(f"  ig_username: {p['ig_username']}")
    print(f"  ig_user_id:  {p['ig_user_id']}")
    print(f"  token:       {token_preview}")
    print()
