/**
 * POST /api/instagram/sync-all
 *
 * Called by Vercel Cron (daily at 6am UTC) — syncs every active client.
 * Auth: Bearer {CRON_SECRET}
 *
 * Also callable manually as admin from the dashboard.
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export const maxDuration = 60 // Just kicks off fire-and-forget per-profile syncs

export async function POST(req: NextRequest) {
  // Verify cron secret (Vercel sets this automatically for scheduled crons)
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      // Also allow admin requests from within the dashboard (no secret needed if already authed)
      const { createClient: createServerClient } = await import('@/lib/supabase-server')
      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { data: profile } = await adminClient
        .from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
  }

  // Fetch all active profiles that have an IG username set
  const { data: profiles, error } = await adminClient
    .from('profiles')
    .select('id, ig_username, name')
    .not('ig_username', 'is', null)
    .neq('ig_username', '')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!profiles?.length) return NextResponse.json({ queued: 0, message: 'No profiles with Instagram configured' })

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  // Fire-and-forget a sync for each profile — they execute independently
  let queued = 0
  for (const profile of profiles) {
    fetch(`${baseUrl}/api/instagram/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: profile.id }),
    }).catch(err => {
      console.error(`[sync-all] Failed to queue sync for ${profile.ig_username}:`, err)
    })
    queued++
  }

  console.log(`[sync-all] Queued ${queued} Instagram syncs`)
  return NextResponse.json({ queued, profiles: profiles.map(p => p.ig_username) })
}
