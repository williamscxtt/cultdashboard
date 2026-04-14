import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { name, email, instagram_handle, monthly_revenue, niche, followers, biggest_challenge, revenue_goal } = body

  if (!email || !name) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }

  const { error } = await adminClient
    .from('applications')
    .insert({ name, email, instagram_handle, monthly_revenue, niche, followers, biggest_challenge, revenue_goal })

  if (error) {
    // Don't block the user if DB write fails — they should still see the payment link
    console.error('[applications] insert error:', error.message)
  }

  return NextResponse.json({ ok: true })
}
