import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { ensureSignupMembershipAccess } from '@/lib/membership-sync'
import { normalizeMemberEmail } from '@/lib/skool-membership-event'
import { createClient } from '@/lib/supabase-server'
import { instagramUsername } from '@/lib/instagram-statistics'
import { enqueueInstagramStatistics } from '@/lib/instagram-statistics-sync'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { userId: requestedUserId, name, ig_username } = await req.json() as {
      userId?: string
      name?: string
      email?: string
      ig_username?: unknown
    }

    if (requestedUserId && requestedUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const userId = user.id
    const normalizedEmail = normalizeMemberEmail(user.email)
    const existing = await adminClient.from('profiles').select('ig_username').eq('id', userId).maybeSingle()
    if (existing.error) throw existing.error
    const savedUsername = instagramUsername(existing.data?.ig_username)
    const username = savedUsername || instagramUsername(ig_username) || instagramUsername(user.user_metadata?.ig_username)
    if (!username) return NextResponse.json({ error: 'Enter your Instagram username to finish creating your account.' }, { status: 400 })

    // Never reset an existing profile or claim another member's email/access.
    const { error } = await adminClient
      .from('profiles')
      .upsert({
        id: userId,
        name: name || '',
        email: normalizedEmail,
        ig_username: username,
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

    // An Auth trigger may already have inserted the profile. Fill only its
    // missing handle; repeated profile creation cannot replace a saved account.
    if (existing.data && !savedUsername) {
      const update = adminClient.from('profiles').update({ ig_username: username }).eq('id', userId)
      const result = existing.data.ig_username === null
        ? await update.is('ig_username', null)
        : await update.eq('ig_username', existing.data.ig_username)
      if (result.error) throw result.error
    }

    if (normalizedEmail) {
      await ensureSignupMembershipAccess(normalizedEmail, userId)
    }
    await enqueueInstagramStatistics(userId).catch(() => {
      console.error('[create-profile] Could not queue Instagram statistics', userId)
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
