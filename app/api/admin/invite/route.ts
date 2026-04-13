/**
 * POST { email } or { emails: string[] }
 * Sends a "set your password" email to one or more clients.
 *
 * Uses resetPasswordForEmail (anon key) which is the flow that actually fires
 * the configured SMTP provider (Resend). The client clicks the link, lands on
 * /auth/reset-password, sets their password, and they're in.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'

// Admin client — used only for the assertAdmin check
const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Anon client — resetPasswordForEmail must be called with the anon key
// so Supabase routes the email through the configured SMTP provider
const anon = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

const REDIRECT = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`
  : 'https://cultdashboard.com/auth/reset-password'

export async function POST(req: NextRequest) {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({})) as { email?: string; emails?: string[] }

  const targets: string[] = body.emails ?? (body.email ? [body.email] : [])
  if (targets.length === 0) return NextResponse.json({ error: 'email or emails required' }, { status: 400 })

  const results: { email: string; ok: boolean; error?: string }[] = []

  for (const email of targets) {
    const { error } = await anon.auth.resetPasswordForEmail(email, {
      redirectTo: REDIRECT,
    })
    results.push({ email, ok: !error, error: error?.message })

    // Small delay between sends to avoid rate limits
    if (targets.length > 1) await new Promise(r => setTimeout(r, 300))
  }

  const failed = results.filter(r => !r.ok)
  const sent = results.filter(r => r.ok).length

  if (failed.length > 0) {
    console.error('[invite] Failed sends:', failed)
  }

  return NextResponse.json({ sent, failed: failed.map(r => ({ email: r.email, error: r.error })) })
}
