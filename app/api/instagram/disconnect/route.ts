import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Resolve effective profile (support admin impersonation)
  const { data: realProfile } = await adminClient
    .from('profiles').select('role').eq('id', user.id).single()
  const impersonatingAs = realProfile?.role === 'admin' ? await getImpersonatedId() : null
  const profileId = effectiveId(user.id, realProfile?.role === 'admin', impersonatingAs)

  // Clear Instagram credentials + all cached/scraped data for this profile
  const results = await Promise.all([
    adminClient
      .from('profiles')
      .update({
        ig_username: null,
        ig_access_token: null,
        comment_analysis_json: null,
        content_insights_json: null,
        content_insights_updated_at: null,
        followers_count: null,
      })
      .eq('id', profileId),
    adminClient.from('client_reels').delete().eq('profile_id', profileId),
    adminClient.from('weekly_scripts').delete().eq('profile_id', profileId),
    adminClient.from('follower_snapshots').delete().eq('profile_id', profileId),
  ])

  const firstError = results.map(r => r.error).find(Boolean)

  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
