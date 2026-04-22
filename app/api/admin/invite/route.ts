/**
 * POST { email, name? }
 * Admin-only: reset a client's password to a new temp password and email them their credentials.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { Resend } from 'resend'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

function genTempPassword(): string {
  return 'Cult' + Math.floor(1000 + Math.random() * 9000)
}

function credentialsEmailHtml(name: string | null | undefined, email: string, password: string): string {
  const firstName = name?.split(' ')[0] ?? 'there'
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-bottom:32px;" align="center">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#3B82F6;border-radius:10px;width:40px;height:40px;text-align:center;vertical-align:middle;">
                    <span style="color:#fff;font-size:20px;font-weight:800;line-height:40px;">⚡</span>
                  </td>
                  <td style="padding-left:10px;vertical-align:middle;">
                    <span style="color:#F0F0F0;font-size:17px;font-weight:800;letter-spacing:-0.3px;">Creator Cult</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#141414;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:40px 36px;">
              <h1 style="margin:0 0 12px;color:#F0F0F0;font-size:22px;font-weight:800;letter-spacing:-0.4px;">
                Your login details, ${firstName}
              </h1>
              <p style="margin:0 0 28px;color:rgba(255,255,255,0.5);font-size:14px;line-height:1.6;">
                Here are your Creator Cult dashboard credentials. Use these to log in.
              </p>
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:16px 20px;">
                    <p style="margin:0 0 10px;color:rgba(255,255,255,0.4);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Login details</p>
                    <p style="margin:0 0 6px;color:rgba(255,255,255,0.5);font-size:13px;">Email: <span style="color:#F0F0F0;font-weight:600;">${email}</span></p>
                    <p style="margin:0;color:rgba(255,255,255,0.5);font-size:13px;">Password: <span style="color:#F0F0F0;font-weight:600;font-family:monospace;letter-spacing:0.05em;">${password}</span></p>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="https://cultdashboard.com/login"
                       style="display:inline-block;background:#3B82F6;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:8px;letter-spacing:-0.2px;">
                      Go to dashboard →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0;color:rgba(255,255,255,0.3);font-size:12px;line-height:1.6;">
                You can change your password anytime in Settings once you're logged in.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;" align="center">
              <p style="margin:0;color:rgba(255,255,255,0.2);font-size:11px;">
                Creator Cult · Will Scott Coaching
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({})) as { email?: string; name?: string }
  const email = body.email
  const name = body.name ?? null
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  // Look up the user by email to get their ID
  const { data: { users }, error: listError } = await admin.auth.admin.listUsers()
  if (listError) return NextResponse.json({ error: listError.message }, { status: 400 })

  const targetUser = users.find(u => u.email === email)
  if (!targetUser) return NextResponse.json({ error: 'No account found for that email' }, { status: 404 })

  // Generate and set a new temp password
  const tempPassword = genTempPassword()
  const { error: pwError } = await admin.auth.admin.updateUserById(targetUser.id, { password: tempPassword })
  if (pwError) return NextResponse.json({ error: pwError.message }, { status: 400 })

  // Send credentials email
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const rawFrom = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
    const from = rawFrom.includes('<') ? rawFrom : `Creator Cult <${rawFrom}>`

    const { error: emailError } = await resend.emails.send({
      from,
      to: email,
      subject: `Your Creator Cult login details`,
      html: credentialsEmailHtml(name, email, tempPassword),
    })

    if (emailError) {
      console.error('[invite] Resend error:', emailError)
      return NextResponse.json({ tempPassword, emailSent: false, emailError: emailError.message })
    }

    return NextResponse.json({ tempPassword, emailSent: true })
  }

  return NextResponse.json({ tempPassword, emailSent: false, emailError: 'RESEND_API_KEY not configured' })
}
