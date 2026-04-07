import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/dashboard/settings?ig_error=1', req.url))
  }

  const appId = process.env.INSTAGRAM_APP_ID?.trim()!
  const appSecret = process.env.INSTAGRAM_APP_SECRET?.trim()!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL?.trim()}/api/auth/instagram/callback`

  console.log('[IG callback] appId:', appId, 'redirectUri:', redirectUri)

  try {
    // Exchange code for short-lived token
    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: new URLSearchParams({ client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code, grant_type: 'authorization_code' }),
    })
    const tokenData = await tokenRes.json()
    console.log('[IG callback] token response:', JSON.stringify(tokenData))
    if (tokenData.error_type || tokenData.error) throw new Error(tokenData.error_message || tokenData.error_type || tokenData.error)

    // Exchange for long-lived token (60 days)
    const longRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${tokenData.access_token}`
    )
    const longData = await longRes.json()
    const accessToken = longData.access_token || tokenData.access_token

    // Get Instagram user info
    const userRes = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=id,username&access_token=${accessToken}`
    )
    const userData = await userRes.json()
    if (userData.error) throw new Error(userData.error.message)
    const igUsername = userData.username || null
    const igUserId = userData.id || null

    // Save to Supabase
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('[IG callback] supabase user:', user?.id ?? null, 'authError:', authError?.message ?? null)
    if (!user) throw new Error('Not authenticated — no Supabase session')

    const { error: updateError } = await supabase.from('profiles').update({
      ig_access_token: accessToken,
      ig_username: igUsername,
      ig_user_id: igUserId,
    }).eq('id', user.id)

    console.log('[IG callback] update error:', updateError?.message ?? null, 'username:', igUsername)
    if (updateError) throw new Error(`DB update failed: ${updateError.message}`)

    return NextResponse.redirect(new URL('/dashboard/settings?ig_connected=1', req.url))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Instagram OAuth error:', message)
    return NextResponse.redirect(new URL(`/dashboard/settings?ig_error=${encodeURIComponent(message)}`, req.url))
  }
}
