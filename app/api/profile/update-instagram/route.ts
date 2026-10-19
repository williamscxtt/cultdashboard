import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'
import { instagramUsername } from '@/lib/instagram-statistics'
import { enqueueInstagramStatistics } from '@/lib/instagram-statistics-sync'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: `Unauthorized: ${authError?.message}` }, { status: 401 })

    const { ig_username } = await req.json()

    const { data: realProfile } = await adminClient
      .from('profiles').select('role, ig_username').eq('id', user.id).single()

    const impersonatingAs = realProfile?.role === 'admin' ? await getImpersonatedId() : null
    const profileId = effectiveId(user.id, realProfile?.role === 'admin', impersonatingAs)

    // Get current username on the effective profile
    const { data: currentProfile } = await adminClient
      .from('profiles').select('ig_username').eq('id', profileId).single()

    const cleaned = instagramUsername(ig_username)
    if (!cleaned) return NextResponse.json({ error: 'Enter a valid Instagram username.' }, { status: 400 })

    const usernameChanged = cleaned !== instagramUsername(currentProfile?.ig_username)

    // Update username
    const { error } = await adminClient
      .from('profiles')
      .update({ ig_username: cleaned })
      .eq('id', profileId)

    if (error) throw new Error(error.message)

    // If username changed, wipe all old scraped data so it's clean for the new account
    if (usernameChanged) {
      await Promise.all([
        adminClient.from('client_reels').delete().eq('profile_id', profileId),
        adminClient.from('weekly_scripts').delete().eq('profile_id', profileId),
        adminClient.from('follower_snapshots').delete().eq('profile_id', profileId),
        adminClient.from('profiles').update({ comment_analysis_json: null, content_insights_json: null, content_insights_updated_at: null, followers_count: null }).eq('id', profileId),
      ])
    }

    await enqueueInstagramStatistics(profileId).catch(() => {
      console.error('[profile/update-instagram] Could not queue statistics', profileId)
    })
    return NextResponse.json({ ok: true, ig_username: cleaned, wiped: usernameChanged && !!cleaned })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[profile/update-instagram] ERROR:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
