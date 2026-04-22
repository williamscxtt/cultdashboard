/**
 * POST { email }
 * Public endpoint — no auth required.
 * Generates a password reset link and sends it via our branded Resend email.
 * Used by the login page "Forgot password" flow instead of Supabase's default email.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { Resend } from 'resend'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const REDIRECT = 'https://cultdashboard.com/auth/reset-password'

function buildResetEmail(inviteUrl: string): string {
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
          <h1 style="margin:0 0 12px;color:#F0F0F0;font-size:22px;font-weight:800;letter-spacing:-0.4px;">Reset your password</h1>
          <p style="margin:0 0 28px;color:rgba(255,255,255,0.5);font-size:14px;line-height:1.6;">
            Click the button below to set a new password for your Creator Cult account.
          </p>
          <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
            <a href="${inviteUrl}" style="display:inline-block;background:#3B82F6;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:8px;letter-spacing:-0.2px;">
              Reset my password →
            </a>
          </td></tr></table>
          <p style="margin:28px 0 0;color:rgba(255,255,255,0.3);font-size:12px;line-height:1.6;">
            This link expires in 24 hours. If you didn't request this, you can safely ignore it.
          </p>
          <hr style="margin:28px 0;border:none;border-top:1px solid rgba(255,255,255,0.08);" />
          <p style="margin:0;color:rgba(255,255,255,0.2);font-size:11px;line-height:1.6;">
            Or copy this link into your browser:<br />
            <span style="color:rgba(255,255,255,0.35);word-break:break-all;">${inviteUrl}</span>
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
  const { email } = await req.json().catch(() => ({})) as { email?: string }
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  // Generate recovery link via admin API
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: REDIRECT },
  })

  // Always return success to avoid leaking whether an email exists
  if (linkError || !linkData) {
    return NextResponse.json({ ok: true })
  }

  const inviteUrl = (linkData as { properties?: { action_link?: string } } | null)?.properties?.action_link
  if (!inviteUrl) return NextResponse.json({ ok: true })

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const rawFrom = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
    const from = rawFrom.includes('<') ? rawFrom : `Creator Cult <${rawFrom}>`

    await resend.emails.send({
      from,
      to: email,
      subject: 'Reset your Creator Cult password',
      html: buildResetEmail(inviteUrl),
    })
  }

  return NextResponse.json({ ok: true })
}
