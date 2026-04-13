import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'
import { calcHubFilledCount, ONBOARDING_UNLOCK_THRESHOLD } from '@/lib/onboarding-keys'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: `Unauthorized: ${authError?.message}` }, { status: 401 })

    // Support impersonation
    const { data: realProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const impersonatingAs = realProfile?.role === 'admin' ? await getImpersonatedId() : null
    const profileId = effectiveId(user.id, realProfile?.role === 'admin', impersonatingAs)

    const body = await req.json()

    // Extract named profile columns from payload
    const { intro_structured, ...profileFields } = body

    const ALLOWED_STR = [
      'name', 'niche', 'bio', 'target_audience', 'monthly_revenue', 'revenue_goal',
      'posts_per_week', 'content_pillars', 'ninety_day_goal', 'biggest_challenge',
      'why_joined', 'dm_goal', 'coaching_phase', 'focus_this_week', 'dashboard_bio',
      'ig_username',
    ]

    const updates: Record<string, unknown> = {}
    for (const key of ALLOWED_STR) {
      if (!(key in profileFields)) continue
      const val = profileFields[key]
      if (key === 'posts_per_week') {
        updates[key] = val !== '' && val !== null ? (Number(val) || null) : null
      } else if (key === 'content_pillars') {
        updates[key] = Array.isArray(val) && val.length > 0 ? val : null
      } else if (key === 'ig_username') {
        // Strip @ prefix and lowercase
        updates[key] = typeof val === 'string' && val.trim() !== ''
          ? val.trim().replace(/^@/, '').toLowerCase()
          : null
      } else {
        updates[key] = typeof val === 'string' && val.trim() !== '' ? val.trim() : null
      }
    }

    // Boolean flag — mark onboarding complete
    if ('onboarding_completed' in profileFields) {
      updates.onboarding_completed = Boolean(profileFields.onboarding_completed)
    }

    // Always store full intro_structured
    if (intro_structured && typeof intro_structured === 'object') {
      updates.intro_structured = intro_structured

      // Auto-unlock the sidebar once ≥75% of hub questions are answered
      const filledCount = calcHubFilledCount(intro_structured as Record<string, unknown>)
      if (filledCount >= ONBOARDING_UNLOCK_THRESHOLD) {
        updates.onboarding_hub_complete = true
      }
    }

    const { error } = await adminClient
      .from('profiles')
      .update(updates)
      .eq('id', profileId)

    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[profile/onboarding] ERROR:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
