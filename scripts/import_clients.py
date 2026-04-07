#!/usr/bin/env python3
"""
Import all 40 clients from database_export.xlsx into Supabase cult-dashboard.
Creates auth users with default password Cult2026! and populates profile rows.
"""

from __future__ import annotations
import json
import sys
import time
import pandas as pd
import requests
from datetime import datetime

SUPABASE_URL = "https://nhhpuvpscwpzdocikwjx.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oaHB1dnBzY3dwemRvY2lrd2p4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDYxMjIwMCwiZXhwIjoyMDkwMTg4MjAwfQ.wmz9SXITZV68EK4cxckAA293razGSJMQgG0vdqmMlwQ"
DEFAULT_PASSWORD = "Cult2026!"
EXCEL_PATH = "/Users/williamscott/Downloads/database_export.xlsx"

# Will's email — already an admin, skip auth creation but update profile
ADMIN_EMAIL = "william@blacksite.com"

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


def safe_val(v):
    """Return None for NaN/NaT, else the value."""
    if v is None:
        return None
    try:
        if pd.isna(v):
            return None
    except (TypeError, ValueError):
        pass
    return v


def safe_int(v):
    v = safe_val(v)
    if v is None:
        return None
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return None


def safe_str(v):
    v = safe_val(v)
    if v is None:
        return None
    return str(v).strip() or None


def safe_json(v):
    """Parse JSON string or return dict if already parsed."""
    v = safe_val(v)
    if v is None:
        return None
    if isinstance(v, dict):
        return v
    try:
        return json.loads(v)
    except (json.JSONDecodeError, TypeError):
        return None


def safe_bool(v):
    v = safe_val(v)
    if v is None:
        return False
    if isinstance(v, bool):
        return v
    return str(v).lower() in ('true', 't', '1', 'yes')


def create_auth_user(email: str, name: str) -> str | None:
    """
    Create auth user. Returns user ID.
    If user already exists, fetch and return their ID.
    """
    url = f"{SUPABASE_URL}/auth/v1/admin/users"
    payload = {
        "email": email,
        "password": DEFAULT_PASSWORD,
        "email_confirm": True,
        "user_metadata": {"name": name},
    }
    r = requests.post(url, headers=HEADERS, json=payload)

    if r.status_code in (200, 201):
        user_id = r.json().get("id")
        print(f"  ✓ Created auth user: {email} → {user_id}")
        return user_id

    if r.status_code == 422:
        # User already exists — list and find them
        body = r.json()
        if "already been registered" in str(body).lower() or "already exists" in str(body).lower():
            return get_existing_user_id(email)
        print(f"  ✗ 422 error for {email}: {body}")
        return None

    print(f"  ✗ Failed to create {email}: {r.status_code} {r.text[:200]}")
    return None


def get_existing_user_id(email: str) -> str | None:
    """Look up existing auth user by email."""
    url = f"{SUPABASE_URL}/auth/v1/admin/users?email={requests.utils.quote(email)}&page=1&per_page=1"
    r = requests.get(url, headers=HEADERS)
    if r.status_code == 200:
        data = r.json()
        users = data.get("users", [])
        if users:
            uid = users[0]["id"]
            print(f"  ↩ Already exists: {email} → {uid}")
            return uid
    # Try listing all and searching
    url2 = f"{SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000"
    r2 = requests.get(url2, headers=HEADERS)
    if r2.status_code == 200:
        all_users = r2.json().get("users", [])
        for u in all_users:
            if u.get("email", "").lower() == email.lower():
                uid = u["id"]
                print(f"  ↩ Found existing: {email} → {uid}")
                return uid
    print(f"  ✗ Could not find existing user: {email}")
    return None


def upsert_profile(user_id: str, row: dict, is_admin: bool = False):
    """Upsert a row into the profiles table."""
    intro = safe_json(row.get("intro_structured"))
    insights = safe_json(row.get("intro_insights"))

    # Extract useful fields from intro_structured
    niche = None
    target_audience = None
    biggest_challenge = None
    why_joined = None
    posts_per_week = None
    monthly_revenue = None

    if intro:
        niche = intro.get("specific_niche") or intro.get("niche") or intro.get("what_you_coach")
        target_audience = intro.get("ideal_client") or intro.get("target_audience")
        biggest_challenge = intro.get("biggest_problem") or intro.get("biggest_challenge")
        why_joined = intro.get("why_cult") or intro.get("why_joined")
        posts_per_week = safe_int(intro.get("posts_per_week") or intro.get("posting_frequency"))
        monthly_revenue = intro.get("monthly_revenue") or intro.get("current_revenue")

    ig_username = safe_str(row.get("instagram_username"))

    profile = {
        "id": user_id,
        "role": "admin" if is_admin else "client",
        "name": safe_str(row.get("name")) or safe_str(row.get("email", "")).split("@")[0],
        "email": safe_str(row.get("email")),
        "is_active": safe_bool(row.get("is_active")) if not is_admin else True,
        "ig_username": ig_username.lstrip("@") if ig_username else None,
        "onboarding_completed": safe_bool(row.get("onboarding_complete")),
        # Phase & dates
        "phase_number": safe_int(row.get("phase")) or 1,
        "date_joined": safe_str(row.get("date_joined")),
        # Starting metrics
        "starting_followers": safe_int(row.get("starting_followers")),
        "starting_avg_views": safe_int(row.get("starting_avg_reel_views")),
        "starting_revenue": safe_str(row.get("starting_monthly_revenue")),
        "ninety_day_follower_goal": safe_int(row.get("ninety_day_follower_goal")),
        "ninety_day_revenue_goal": safe_str(row.get("ninety_day_revenue_goal")),
        "starting_active_clients": safe_int(row.get("starting_active_clients")),
        # Content
        "intro_structured": intro,
        "intro_freeform": safe_str(row.get("intro_freeform")),
        "intro_insights": insights,
        "dashboard_bio": safe_str(row.get("dashboard_bio")),
        "weekly_checklist": safe_json(row.get("weekly_checklist")),
        # Derived from intro
        "niche": niche,
        "target_audience": target_audience,
        "biggest_challenge": biggest_challenge,
        "why_joined": why_joined,
        "posts_per_week": posts_per_week,
        "monthly_revenue": monthly_revenue,
    }

    # Remove None values to avoid overwriting existing data with nulls on upsert
    # Actually keep them so we always have a full upsert
    url = f"{SUPABASE_URL}/rest/v1/profiles"
    r = requests.post(
        url,
        headers={**HEADERS, "Prefer": "resolution=merge-duplicates,return=representation"},
        json=profile,
    )
    if r.status_code in (200, 201):
        print(f"  ✓ Profile upserted for {profile['email']}")
        return True
    else:
        print(f"  ✗ Profile upsert failed for {profile['email']}: {r.status_code} {r.text[:300]}")
        return False


def main():
    print("=" * 60)
    print("CULT Dashboard — Client Import Script")
    print(f"Target: {SUPABASE_URL}")
    print("=" * 60)

    # Load Excel
    print("\nLoading Excel...")
    xl = pd.read_excel(EXCEL_PATH, sheet_name="profiles")
    print(f"Found {len(xl)} profiles")

    results = {"created": 0, "existed": 0, "failed": 0, "skipped": 0}

    for i, row in xl.iterrows():
        email = safe_str(row.get("email"))
        name = safe_str(row.get("name")) or (email.split("@")[0] if email else f"Client {i}")

        if not email:
            print(f"\n[{i+1}/{len(xl)}] SKIP — no email for row {i}")
            results["skipped"] += 1
            continue

        is_admin = email.lower() == ADMIN_EMAIL.lower()

        print(f"\n[{i+1}/{len(xl)}] {name} <{email}>{' (ADMIN)' if is_admin else ''}")

        if is_admin:
            # For Will, just update his profile — don't recreate auth
            user_id = get_existing_user_id(email)
            if user_id:
                upsert_profile(user_id, row.to_dict(), is_admin=True)
                results["existed"] += 1
            else:
                print(f"  ! Admin user not found, creating...")
                user_id = create_auth_user(email, name)
                if user_id:
                    upsert_profile(user_id, row.to_dict(), is_admin=True)
                    results["created"] += 1
                else:
                    results["failed"] += 1
            continue

        # Create auth user
        user_id = create_auth_user(email, name)
        if not user_id:
            results["failed"] += 1
            continue

        # Upsert profile
        ok = upsert_profile(user_id, row.to_dict())
        if ok:
            results["created"] += 1
        else:
            results["failed"] += 1

        # Small delay to avoid rate limiting
        time.sleep(0.2)

    print("\n" + "=" * 60)
    print("IMPORT COMPLETE")
    print(f"  Created/Updated : {results['created']}")
    print(f"  Already existed  : {results['existed']}")
    print(f"  Failed           : {results['failed']}")
    print(f"  Skipped          : {results['skipped']}")
    print("=" * 60)
    print(f"\nAll clients can log in with password: {DEFAULT_PASSWORD}")


if __name__ == "__main__":
    main()
