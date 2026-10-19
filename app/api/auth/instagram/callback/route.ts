import { NextRequest, NextResponse } from 'next/server'
import { instagramAdmin, instagramConfig, instagramGraph, instagramJson, requireInstagramPilot } from '@/lib/instagram-connection'
import { canonicalInstagramUsername, encryptInstagramToken, INSTAGRAM_STATE_COOKIE, parseInstagramLongToken, parseInstagramTokenResponse, verifyInstagramState } from '@/lib/instagram-oauth-security'

export async function GET(req: NextRequest) {
  let outcome = 'connection_failed'
  try {
    const { user, profile } = await requireInstagramPilot()
    const config = instagramConfig()
    verifyInstagramState(req.nextUrl.searchParams.get('state'), req.cookies.get(INSTAGRAM_STATE_COOKIE)?.value, user.id, profile.ig_username || '', config.encryptionKey)
    if (req.nextUrl.searchParams.has('error')) throw new Error('cancelled')
    const code = req.nextUrl.searchParams.get('code')
    if (!code) throw new Error('invalid_state')
    const short = parseInstagramTokenResponse(await instagramJson('https://api.instagram.com/oauth/access_token', { method: 'POST', body: new URLSearchParams({ client_id: config.appId, client_secret: config.appSecret, redirect_uri: config.redirectUri, code, grant_type: 'authorization_code' }) }))
    const longUrl = new URL('https://graph.instagram.com/access_token')
    longUrl.searchParams.set('grant_type', 'ig_exchange_token'); longUrl.searchParams.set('client_secret', config.appSecret); longUrl.searchParams.set('access_token', short.accessToken)
    const long = parseInstagramLongToken(await instagramJson(longUrl.toString()))
    const account = await instagramGraph('me', long.accessToken, { fields: 'id,user_id,username' })
    const username = canonicalInstagramUsername(account.username)
    if (!username || username !== canonicalInstagramUsername(profile.ig_username)) throw new Error('account_mismatch')
    const instagramUserId = String(account.user_id || account.id || '')
    if (!/^[0-9]+$/.test(instagramUserId)) throw new Error('connection_failed')
    const now = new Date().toISOString()
    const { error } = await instagramAdmin().from('instagram_connections').upsert({ profile_id: user.id, instagram_user_id: short.userId, graph_user_id: instagramUserId, username, token_ciphertext: encryptInstagramToken(long.accessToken, user.id, config.encryptionKey), permissions: short.permissions, expires_at: new Date(Date.now() + long.expiresIn * 1000).toISOString(), connected_at: now, refreshed_at: now, status: 'active', last_error: null })
    if (error) throw new Error('storage')
    outcome = 'connected'
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (['cancelled', 'invalid_state', 'account_mismatch', 'missing_permissions', 'unauthorized', 'pilot_only', 'impersonating'].includes(message)) outcome = message
    // No auth code, token, provider response or credential-bearing URL is logged.
  }
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim() || req.nextUrl.origin
  const response = NextResponse.redirect(new URL('/dashboard/settings?ig_result=' + outcome, base))
  response.headers.set('Cache-Control', 'no-store')
  response.cookies.set(INSTAGRAM_STATE_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/api/auth/instagram', maxAge: 0 })
  return response
}
