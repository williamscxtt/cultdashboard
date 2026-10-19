import { NextResponse } from 'next/server'
import { instagramConfig, requireInstagramPilot } from '@/lib/instagram-connection'
import { createInstagramState, canonicalInstagramUsername, INSTAGRAM_SCOPES, INSTAGRAM_STATE_COOKIE, INSTAGRAM_STATE_TTL } from '@/lib/instagram-oauth-security'

export async function GET() {
  try {
    const { user, profile } = await requireInstagramPilot()
    if (!canonicalInstagramUsername(profile.ig_username)) throw new Error('username_required')
    const config = instagramConfig()
    const state = createInstagramState(user.id, profile.ig_username!, config.encryptionKey)
    const params = new URLSearchParams({ client_id: config.appId, redirect_uri: config.redirectUri, scope: INSTAGRAM_SCOPES.join(','), response_type: 'code', state })
    const response = NextResponse.redirect('https://www.instagram.com/oauth/authorize?' + params)
    response.headers.set('Cache-Control', 'no-store')
    response.cookies.set(INSTAGRAM_STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: 'lax', path: '/api/auth/instagram', maxAge: INSTAGRAM_STATE_TTL })
    return response
  } catch (error) {
    const code = error instanceof Error ? error.message : 'configuration'
    return NextResponse.json({ error: ['unauthorized', 'pilot_only', 'impersonating', 'username_required'].includes(code) ? code : 'configuration' }, { status: code === 'unauthorized' ? 401 : code === 'configuration' ? 503 : 403 })
  }
}
