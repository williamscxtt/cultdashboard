#!/usr/bin/env python3
import json, urllib.request

SUPABASE_URL = "https://nhhpuvpscwpzdocikwjx.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oaHB1dnBzY3dwemRvY2lrd2p4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDYxMjIwMCwiZXhwIjoyMDkwMTg4MjAwfQ.wmz9SXITZV68EK4cxckAA293razGSJMQgG0vdqmMlwQ"
USER_ID = "64b9d029-781c-426b-bac6-5144671c95b5"

req = urllib.request.Request(
    f"{SUPABASE_URL}/auth/v1/admin/users/{USER_ID}",
    method="GET",
    headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
    }
)
resp = urllib.request.urlopen(req)
user = json.loads(resp.read())
print("email:", user.get("email"))
print("email_confirmed_at:", user.get("email_confirmed_at"))
print("confirmed_at:", user.get("confirmed_at"))
print("banned_until:", user.get("banned_until"))
