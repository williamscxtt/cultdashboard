import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const ALLOWED_FIELDS = [
  'name', 'niche', 'bio', 'coaching_phase', 'monthly_revenue', 'revenue_goal',
  'target_audience', 'posts_per_week', 'content_pillars', 'ninety_day_goal',
  'focus_this_week', 'biggest_challenge', 'why_joined', 'dm_goal',
  'dashboard_bio', 'phase_number',
]

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: `Unauthorized: ${authError?.message}` }, { status: 401 })

    const body = await req.json()

    const updates: Record<string, unknown> = {}
    for (const key of ALLOWED_FIELDS) {
      if (!(key in body)) continue
      const val = body[key]
      if (key === 'posts_per_week') {
        updates[key] = val !== '' && val !== null ? (Number(val) || null) : null
      } else if (key === 'content_pillars') {
        // Expect array from client
        updates[key] = Array.isArray(val) && val.length > 0 ? val : null
      } else {
        updates[key] = typeof val === 'string' && val.trim() !== '' ? val.trim() : null
      }
    }

    const { error } = await adminClient
      .from('profiles')
      .update(updates)
      .eq('id', user.id)

    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[profile/update] ERROR:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
