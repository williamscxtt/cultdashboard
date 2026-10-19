import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { ensureSignupMembershipAccess } from '@/lib/membership-sync'
import { normalizeMemberEmail } from '@/lib/skool-membership-event'
import { createClient } from '@/lib/supabase-server'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { userId: requestedUserId, name } = await req.json() as {
      userId?: string
      name?: string
      email?: string
    }

    if (requestedUserId && requestedUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const userId = user.id
    const normalizedEmail = normalizeMemberEmail(user.email)

    // Never reset an existing profile or claim another member's email/access.
    const { error } = await adminClient
      .from('profiles')
      .upsert({
        id: userId,
        name: name || '',
        email: normalizedEmail,
        role: 'client',
        is_active: true,
        // Mark legacy 5-step onboarding as done — new users go straight to the hub
        onboarding_completed: true,
        // Hub not yet complete — they'll unlock it by filling ≥75% of the hub
        onboarding_hub_complete: false,
      }, { onConflict: 'id', ignoreDuplicates: true })

    if (error) {
      console.error('[create-profile]', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (normalizedEmail) {
      await ensureSignupMembershipAccess(normalizedEmail, userId)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
