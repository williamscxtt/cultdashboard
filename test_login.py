#!/usr/bin/env python3
import json, urllib.request

SUPABASE_URL = "https://nhhpuvpscwpzdocikwjx.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oaHB1dnBzY3dwemRvY2lrd2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTIyMDAsImV4cCI6MjA5MDE4ODIwMH0.BGUv5u5glkpfziZqbd6ncclAXWwMWZAEVfy9qKfzQzA"

email = "willadmin@scottvip.com"
password = "Cult2024Admin"

req = urllib.request.Request(
    f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
    data=json.dumps({"email": email, "password": password}).encode(),
    method="POST",
    headers={
        "apikey": ANON_KEY,
        "Content-Type": "application/json",
    }
)
try:
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read())
    print("✓ Login successful!")
    print("User ID:", data["user"]["id"])
    print("Email:", data["user"]["email"])
except urllib.error.HTTPError as e:
    err = json.loads(e.read())
    print("✗ Login failed:", err)
