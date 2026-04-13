/**
 * POST /api/competitors/insight/refresh-all
 *
 * Regenerates insights for all scraped competitor accounts belonging to the
 * current user. Called automatically after a scrape completes (fire-and-forget).
 * Has its own maxDuration so it doesn't block the scrape response.
 */
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'
import { generateInsightForAccount } from '../../_lib/generate-insight'

export const maxDuration = 300

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
}

export async function POST() {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: realProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = realProfile?.role === 'admin'
  const impersonatingAs = isAdmin ? await getImpersonatedId() : null
  const profileId = effectiveId(user.id, isAdmin, impersonatingAs)

  // Get all competitors that have scraped reels
  const { data: competitors } = await adminClient
    .from('client_competitors')
    .select('ig_username')
    .eq('profile_id', profileId)

  if (!competitors?.length) return NextResponse.json({ ok: true, updated: 0 })

  // Check which ones actually have reels
  const handles = competitors.map(c => c.ig_username)
  const { data: reelCounts } = await adminClient
    .from('competitor_reels')
    .select('account')
    .in('account', handles)

  const withReels = new Set((reelCounts ?? []).map((r: { account: string }) => r.account))
  const toRefresh = handles.filter(h => withReels.has(h))

  let updated = 0
  for (const handle of toRefresh) {
    try {
      const insight = await generateInsightForAccount(handle)
      if (insight) {
        await adminClient
          .from('client_competitors')
          .update({ insight, insight_updated_at: new Date().toISOString() })
          .eq('ig_username', handle)
          .eq('profile_id', profileId)
        updated++
      }
    } catch (err) {
      console.error(`[insight/refresh-all] Failed for @${handle}:`, String(err))
    }
  }

  return NextResponse.json({ ok: true, updated })
}
