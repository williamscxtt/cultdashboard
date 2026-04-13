/**
 * POST /api/competitors/insight
 * Generates (or regenerates) a 2-sentence AI insight for a competitor account
 * based on their top reels and saves it to client_competitors.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'
import { generateInsightForAccount } from '../_lib/generate-insight'

export { generateInsightForAccount }

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

export async function POST(req: NextRequest) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: realProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = realProfile?.role === 'admin'
  const impersonatingAs = isAdmin ? await getImpersonatedId() : null
  const profileId = effectiveId(user.id, isAdmin, impersonatingAs)

  const body = await req.json().catch(() => ({}))
  const { ig_username } = body as { ig_username?: string }
  if (!ig_username) return NextResponse.json({ error: 'ig_username required' }, { status: 400 })

  const handle = ig_username.replace(/^@/, '').trim().toLowerCase()

  const insight = await generateInsightForAccount(handle)
  if (!insight) return NextResponse.json({ error: 'No reels found for this account' }, { status: 404 })

  await adminClient
    .from('client_competitors')
    .update({ insight, insight_updated_at: new Date().toISOString() })
    .eq('ig_username', handle)
    .eq('profile_id', profileId)

  return NextResponse.json({ insight })
}
