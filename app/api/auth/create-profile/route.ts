import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { userId, name, email } = await req.json() as {
      userId?: string
      name?: string
      email?: string
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Upsert profile — safe to call even if a trigger already created the row
    const { error } = await adminClient
      .from('profiles')
      .upsert({
        id: userId,
        name: name || '',
        email: email || '',
        role: 'client',
        is_active: true,
        // Mark legacy 5-step onboarding as done — new users go straight to the hub
        onboarding_completed: true,
        // Hub not yet complete — they'll unlock it by filling ≥75% of the hub
        onboarding_hub_complete: false,
      }, { onConflict: 'id', ignoreDuplicates: false })

    if (error) {
      console.error('[create-profile]', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
