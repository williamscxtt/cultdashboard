/**
 * POST /api/auth/signup
 *
 * Server-side signup that bypasses Supabase's built-in SMTP (which has a
 * 4 emails/hour rate limit). Creates the user via admin client with email
 * auto-confirmed, creates their profile, and sends a branded welcome email
 * via Resend.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { Resend } from 'resend'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

function buildWelcomeEmail(name: string, email: string, loginUrl: string): string {
  const firstName = name.split(' ')[0] || 'there'
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:48px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;" cellpadding="0" cellspacing="0">

        <tr><td style="padding-bottom:32px;" align="center">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background:#3B82F6;border-radius:10px;width:40px;height:40px;text-align:center;vertical-align:middle;">
              <span style="color:#fff;font-size:20px;font-weight:800;line-height:40px;">⚡</span>
            </td>
            <td style="padding-left:10px;vertical-align:middle;">
              <span style="color:#F0F0F0;font-size:17px;font-weight:800;letter-spacing:-0.3px;">Creator Cult</span>
            </td>
          </tr></table>
        </td></tr>

        <tr><td style="background:#141414;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:40px 36px;">
          <h1 style="margin:0 0 12px;color:#F0F0F0;font-size:22px;font-weight:800;letter-spacing:-0.4px;">
            Welcome to Creator Cult, ${firstName} 👋
          </h1>
          <p style="margin:0 0 24px;color:rgba(255,255,255,0.5);font-size:14px;line-height:1.7;">
            Your account is ready. Click below to sign in and get started — your dashboard is waiting.
          </p>
          <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
            <a href="${loginUrl}" style="display:inline-block;background:#3B82F6;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:8px;letter-spacing:-0.2px;">
              Go to my dashboard →
            </a>
          </td></tr></table>
          <p style="margin:28px 0 0;color:rgba(255,255,255,0.3);font-size:13px;line-height:1.6;">
            Log in with: <strong style="color:rgba(255,255,255,0.5);">${email}</strong>
          </p>
          <hr style="margin:28px 0;border:none;border-top:1px solid rgba(255,255,255,0.08);" />
          <p style="margin:0;color:rgba(255,255,255,0.2);font-size:11px;line-height:1.6;">
            If you didn't create this account, ignore this email.
          </p>
        </td></tr>

        <tr><td style="padding-top:24px;" align="center">
          <p style="margin:0;color:rgba(255,255,255,0.2);font-size:11px;">Creator Cult · Will Scott Coaching</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json().catch(() => ({})) as {
    name?: string; email?: string; password?: string
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  // Create user via admin — email auto-confirmed, no Supabase SMTP involved
  const { data, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: name || '' },
  })

  if (createError) {
    const msg = createError.message.toLowerCase()
    if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('duplicate')) {
      return NextResponse.json({ error: 'already_exists' }, { status: 409 })
    }
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  const userId = data.user.id

  // Create profile row
  await admin.from('profiles').upsert({
    id: userId,
    name: name || '',
    email: email,
    role: 'client',
    is_active: true,
    onboarding_completed: true,
    onboarding_hub_complete: false,
  }, { onConflict: 'id', ignoreDuplicates: false })

  // Send welcome email via Resend
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const rawFrom = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
    const from = rawFrom.includes('<') ? rawFrom : `Creator Cult <${rawFrom}>`
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://cultdashboard.com'}/client-access`

    await resend.emails.send({
      from,
      to: email,
      subject: 'Welcome to Creator Cult — your dashboard is ready',
      html: buildWelcomeEmail(name || '', email, loginUrl),
    }).catch(err => console.error('[signup] Resend error:', err))
  }

  return NextResponse.json({ ok: true, userId })
}
