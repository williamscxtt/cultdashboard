import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Service-key client — bypasses RLS so we can insert without auth
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const VALID = new Set(['modal_open', 'stripe_monthly', 'stripe_biannual'])

export async function POST(req: NextRequest) {
  try {
    const { event_type } = await req.json()
    if (!VALID.has(event_type)) {
      return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 })
    }
    await adminClient.from('checkout_events').insert({ event_type })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
