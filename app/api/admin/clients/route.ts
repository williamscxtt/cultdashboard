import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

function buildInviteEmail(firstName: string, email: string, password: string): string {
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
          <h1 style="margin:0 0 12px;color:#F0F0F0;font-size:22px;font-weight:800;letter-spacing:-0.4px;">You're in, ${firstName} 🎉</h1>
          <p style="margin:0 0 28px;color:rgba(255,255,255,0.5);font-size:14px;line-height:1.6;">
            Your Creator Cult dashboard is ready. Use the login details below to get in.
          </p>
          <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
            <tr>
              <td style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:16px 20px;">
                <p style="margin:0 0 10px;color:rgba(255,255,255,0.4);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Your login details</p>
                <p style="margin:0 0 6px;color:rgba(255,255,255,0.5);font-size:13px;">Email: <span style="color:#F0F0F0;font-weight:600;">${email}</span></p>
                <p style="margin:0;color:rgba(255,255,255,0.5);font-size:13px;">Password: <span style="color:#F0F0F0;font-weight:600;font-family:monospace;letter-spacing:0.05em;">${password}</span></p>
              </td>
            </tr>
          </table>
          <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
            <a href="https://cultdashboard.com/login" style="display:inline-block;background:#3B82F6;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:8px;letter-spacing:-0.2px;">
              Go to dashboard →
            </a>
          </td></tr></table>
          <p style="margin:28px 0 0;color:rgba(255,255,255,0.3);font-size:12px;line-height:1.6;">
            You can change your password anytime in Settings once you're logged in.
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

function genTempPassword(): string {
  return 'Cult' + Math.floor(1000 + Math.random() * 9000)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email, name, ig_username } = await req.json()

  if (!email || !name) {
    return NextResponse.json({ error: 'email and name are required' }, { status: 400 })
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const tempPassword = genTempPassword()

  const { data: newUser, error } = await adminClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Update profile with name and ig_username
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ name, ig_username: ig_username || null })
    .eq('id', newUser.user!.id)

  if (profileError) {
    console.error('Failed to update profile:', profileError)
  }

  // Send credentials email via Resend
  let emailSent = false
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const rawFrom = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
      const from = rawFrom.includes('<') ? rawFrom : `Creator Cult <${rawFrom}>`
      const firstName = name.split(' ')[0]
      await resend.emails.send({
        from,
        to: email,
        subject: `You're in — your Creator Cult login details`,
        html: buildInviteEmail(firstName, email, tempPassword),
      })
      emailSent = true
    } catch (err) {
      console.error('[clients] Failed to send invite email:', err)
    }
  }

  return NextResponse.json({ userId: newUser.user!.id, tempPassword, emailSent })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const body = await req.json()
  const { id, is_active, dm_keyword } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (is_active !== undefined) updates.is_active = is_active
  if (dm_keyword !== undefined) updates.dm_keyword = dm_keyword || null

  const { error } = await adminClient.from('profiles').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await adminClient.auth.admin.deleteUser(id)
  if (error) {
    await adminClient.from('profiles').update({ is_active: false }).eq('id', id)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await adminClient.from('profiles').delete().eq('id', id)

  return NextResponse.json({ ok: true })
}
