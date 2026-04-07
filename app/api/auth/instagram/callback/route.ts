import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const igError = searchParams.get('error')
  const igErrorReason = searchParams.get('error_reason')

  if (igError || !code) {
    const msg = igErrorReason || igError || 'no_code'
    console.log('[IG callback] early exit — ig_error:', msg)
    return NextResponse.redirect(new URL(`/dashboard/settings?ig_error=${encodeURIComponent(msg)}`, req.url))
  }

  const appId = process.env.INSTAGRAM_APP_ID?.trim()!
  const appSecret = process.env.INSTAGRAM_APP_SECRET?.trim()!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL?.trim()}/api/auth/instagram/callback`

  try {
    // 1. Exchange code for short-lived token
    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: new URLSearchParams({ client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code, grant_type: 'authorization_code' }),
    })
    const tokenData = await tokenRes.json()
    if (tokenData.error_type || tokenData.error) {
      throw new Error(tokenData.error_message || tokenData.error_type || String(tokenData.error))
    }

    // 2. Exchange for long-lived token (60 days)
    const longRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${tokenData.access_token}`
    )
    const longData = await longRes.json()
    const accessToken = longData.access_token || tokenData.access_token

    // 3. Get Instagram user info
    const userRes = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=id,username&access_token=${accessToken}`
    )
    const userData = await userRes.json()
    if (userData.error) throw new Error(userData.error.message)
    const igUsername = userData.username || null
    const igUserId = userData.id || null

    // 4. Identify the logged-in dashboard user via session
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user) throw new Error(`Not authenticated — ${authError?.message ?? 'no session'}`)

    // 5. Save via admin client (bypasses any RLS / session edge-cases)
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ ig_access_token: accessToken, ig_username: igUsername, ig_user_id: igUserId })
      .eq('id', user.id)

    console.log(`[IG callback] user=${user.id} ig=@${igUsername} update_err=${updateError?.message ?? 'none'}`)
    if (updateError) throw new Error(`DB update failed: ${updateError.message}`)

    return NextResponse.redirect(new URL('/dashboard/settings?ig_connected=1', req.url))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[IG callback] ERROR:', message)
    return NextResponse.redirect(new URL(`/dashboard/settings?ig_error=${encodeURIComponent(message)}`, req.url))
  }
}
