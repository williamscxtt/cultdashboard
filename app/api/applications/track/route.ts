import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { session_id, step } = await req.json()
    if (!session_id || typeof step !== 'number') {
      return NextResponse.json({ ok: false })
    }

    // Upsert — ignore duplicate (session_id, step) pairs
    await adminClient.from('apply_funnel_steps').upsert(
      { session_id, step },
      { onConflict: 'session_id,step', ignoreDuplicates: true }
    )

    return NextResponse.json({ ok: true })
  } catch {
    // Non-blocking — never break the form
    return NextResponse.json({ ok: false })
  }
}
