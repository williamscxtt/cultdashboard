#!/usr/bin/env python3
import json, urllib.request, sys

SUPABASE_URL = "https://nhhpuvpscwpzdocikwjx.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oaHB1dnBzY3dwemRvY2lrd2p4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDYxMjIwMCwiZXhwIjoyMDkwMTg4MjAwfQ.wmz9SXITZV68EK4cxckAA293razGSJMQgG0vdqmMlwQ"

email = sys.argv[1]
password = sys.argv[2]

def api(method, path, body=None):
    req = urllib.request.Request(
        f"{SUPABASE_URL}{path}",
        data=json.dumps(body).encode() if body else None,
        method=method,
        headers={
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": "application/json",
        }
    )
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())

# Create auth user
print("Creating auth user...")
user = api("POST", "/auth/v1/admin/users", {
    "email": email,
    "password": password,
    "email_confirm": True,
})
user_id = user["id"]
print(f"Created user: {user_id}")

# Upsert profile as admin
print("Setting admin role...")
req = urllib.request.Request(
    f"{SUPABASE_URL}/rest/v1/profiles",
    data=json.dumps({"id": user_id, "email": email, "name": "Will Scott", "role": "admin", "is_active": True, "onboarding_completed": True}).encode(),
    method="POST",
    headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
)
urllib.request.urlopen(req)
print(f"\nDone. Log in with:\n  Email: {email}\n  Password: {password}")
