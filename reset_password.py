#!/usr/bin/env python3
import json, urllib.request, urllib.error, sys

SUPABASE_URL = "https://nhhpuvpscwpzdocikwjx.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oaHB1dnBzY3dwemRvY2lrd2p4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDYxMjIwMCwiZXhwIjoyMDkwMTg4MjAwfQ.wmz9SXITZV68EK4cxckAA293razGSJMQgG0vdqmMlwQ"
USER_ID = "251e7513-60dc-4a17-82cd-77e59c886b00"

new_password = sys.argv[1] if len(sys.argv) > 1 else None
if not new_password:
    print("Usage: python3 reset_password.py <new_password>")
    sys.exit(1)

req = urllib.request.Request(
    f"{SUPABASE_URL}/auth/v1/admin/users/{USER_ID}",
    data=json.dumps({"password": new_password}).encode(),
    method="PUT",
    headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
    }
)
resp = urllib.request.urlopen(req)
result = json.loads(resp.read())
print(f"Password updated for {result.get('email')}")
