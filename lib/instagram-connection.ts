import 'server-only'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { getImpersonatedId } from '@/lib/effective-user'
import { canonicalInstagramUsername, decryptInstagramToken, encryptInstagramToken, parseInstagramLongToken } from '@/lib/instagram-oauth-security'

export function instagramAdmin() {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
}
export function instagramConfig() {
  const appId = process.env.INSTAGRAM_APP_ID?.trim(), appSecret = process.env.INSTAGRAM_APP_SECRET?.trim(), encryptionKey = process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY?.trim()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')
  if (!appId || !appSecret || !encryptionKey || !/^[a-f0-9]{64}$/i.test(encryptionKey) || !baseUrl || !baseUrl.startsWith('https://')) throw new Error('configuration')
  return { appId, appSecret, encryptionKey, baseUrl, redirectUri: baseUrl + '/api/auth/instagram/callback' }
}
// Only the real admin's own account until Advanced Access is approved.
export async function requireInstagramPilot() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthorized')
  const { data: profile, error } = await instagramAdmin().from('profiles').select('id,role,ig_username').eq('id', user.id).single()
  if (error || !profile || profile.role !== 'admin') throw new Error('pilot_only')
  if (await getImpersonatedId()) throw new Error('impersonating')
  return { user, profile }
}
export async function instagramJson(url: string, init?: RequestInit) {
  // Never propagate URLs, fetch errors or provider responses containing credentials.
  try {
    const response = await fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(15000) })
    const data = await response.json()
    if (!response.ok || data.error || data.error_type) throw new Error('provider_error')
    return data
  } catch { throw new Error('provider_error') }
}
export async function instagramGraph(path: string, token: string, params: Record<string, string> = {}) {
  const url = new URL('https://graph.instagram.com/v24.0/' + path)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return instagramJson(url.toString(), { headers: { Authorization: 'Bearer ' + token } })
}
export async function instagramConnectionMetadata(profileId: string, username: string | null) {
  const { data, error } = await instagramAdmin().from('instagram_connections').select('username,expires_at,connected_at,status,last_checked_at,last_error').eq('profile_id', profileId).maybeSingle()
  if (error) throw new Error('storage')
  if (!data) return null
  return { ...data, status: data.username !== canonicalInstagramUsername(username) || Date.parse(data.expires_at) <= Date.now() ? 'reconnect_required' : data.status }
}
export async function instagramConnectionToken(profileId: string, username: string | null) {
  const config = instagramConfig(), admin = instagramAdmin()
  const { data, error } = await admin.from('instagram_connections').select('*').eq('profile_id', profileId).maybeSingle()
  if (error || !data || data.status !== 'active' || data.username !== canonicalInstagramUsername(username) || Date.parse(data.expires_at) <= Date.now()) throw new Error('reconnect_required')
  let token = decryptInstagramToken(data.token_ciphertext, profileId, config.encryptionKey)
  // Refresh eligible long-lived tokens within 14 days of expiry.
  if (Date.parse(data.expires_at) - Date.now() < 14 * 86400000 && Date.now() - Date.parse(data.refreshed_at) >= 86400000) {
    const url = new URL('https://graph.instagram.com/refresh_access_token')
    url.searchParams.set('grant_type', 'ig_refresh_token'); url.searchParams.set('access_token', token)
    const refreshed = parseInstagramLongToken(await instagramJson(url.toString()))
    const { error: saveError } = await admin.from('instagram_connections').update({ token_ciphertext: encryptInstagramToken(refreshed.accessToken, profileId, config.encryptionKey), expires_at: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(), refreshed_at: new Date().toISOString() }).eq('profile_id', profileId).eq('token_ciphertext', data.token_ciphertext)
    if (saveError) throw new Error('storage')
    token = refreshed.accessToken
  }
  return { token, instagramUserId: data.graph_user_id as string }
}
