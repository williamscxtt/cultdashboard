import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const INSTAGRAM_SCOPES = ['instagram_business_basic', 'instagram_business_manage_insights'] as const
export const INSTAGRAM_STATE_COOKIE = 'cult_instagram_oauth'
export const INSTAGRAM_STATE_TTL = 10 * 60

function key(value: string) {
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error('configuration')
  return Buffer.from(value, 'hex')
}
function equal(a: string, b: string) {
  const first = Buffer.from(a), second = Buffer.from(b)
  return first.length === second.length && timingSafeEqual(first, second)
}
export function canonicalInstagramUsername(value: string | null | undefined) {
  const username = (value || '').trim().replace(/^@/, '').toLowerCase()
  return /^[a-z0-9._]{1,30}$/.test(username) ? username : ''
}
export function createInstagramState(userId: string, username: string, secret: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ userId, username: canonicalInstagramUsername(username), nonce: randomBytes(24).toString('base64url'), expires: now + INSTAGRAM_STATE_TTL * 1000 })).toString('base64url')
  return `${payload}.${createHmac('sha256', key(secret)).update('instagram-oauth:' + payload).digest('base64url')}`
}
export function verifyInstagramState(state: string | null, cookie: string | undefined, userId: string, username: string, secret: string, now = Date.now()) {
  if (!state || !cookie || state.length > 2048 || !equal(state, cookie)) throw new Error('invalid_state')
  const parts = state.split('.')
  if (parts.length !== 2 || !equal(parts[1], createHmac('sha256', key(secret)).update('instagram-oauth:' + parts[0]).digest('base64url'))) throw new Error('invalid_state')
  const data = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
  if (data.userId !== userId || data.username !== canonicalInstagramUsername(username) || !data.nonce || !Number.isFinite(data.expires) || data.expires <= now || data.expires > now + INSTAGRAM_STATE_TTL * 1000) throw new Error('invalid_state')
}
export function encryptInstagramToken(token: string, profileId: string, secret: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(secret), iv)
  cipher.setAAD(Buffer.from('instagram-token:' + profileId))
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.')
}
export function decryptInstagramToken(value: string, profileId: string, secret: string) {
  const [version, iv, tag, encrypted, extra] = value.split('.')
  if (version !== 'v1' || !iv || !tag || !encrypted || extra) throw new Error('invalid_token')
  const decipher = createDecipheriv('aes-256-gcm', key(secret), Buffer.from(iv, 'base64url'))
  decipher.setAAD(Buffer.from('instagram-token:' + profileId))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8')
}
export function parseInstagramTokenResponse(input: unknown) {
  const outer = input as Record<string, unknown> | null
  if (!outer || typeof outer !== 'object' || outer.error || outer.error_type) throw new Error('token_exchange')
  const wrapped = outer.data
  if (wrapped !== undefined && (!Array.isArray(wrapped) || wrapped.length !== 1 || outer.access_token)) throw new Error('token_exchange')
  const data = (wrapped ? (wrapped as unknown[])[0] : outer) as Record<string, unknown>
  if (!data || typeof data.access_token !== 'string' || !data.access_token || !/^[0-9]+$/.test(String(data.user_id || ''))) throw new Error('token_exchange')
  const permissions = Array.isArray(data.permissions) ? data.permissions : typeof data.permissions === 'string' ? data.permissions.split(',') : []
  const granted = permissions.filter((p): p is string => typeof p === 'string').map(p => p.trim())
  if (!INSTAGRAM_SCOPES.every(scope => granted.includes(scope))) throw new Error('missing_permissions')
  return { accessToken: data.access_token, userId: String(data.user_id), permissions: granted }
}
export function parseInstagramLongToken(input: unknown) {
  const data = input as Record<string, unknown> | null
  if (!data || data.error || typeof data.access_token !== 'string' || !data.access_token || typeof data.expires_in !== 'number' || !Number.isFinite(data.expires_in) || data.expires_in < 86400) throw new Error('long_token_exchange')
  return { accessToken: data.access_token, expiresIn: data.expires_in }
}
export function verifyInstagramSignedRequest(signed: string, appSecret: string) {
  const parts = signed.split('.')
  if (parts.length !== 2 || signed.length > 20000) throw new Error('invalid_signature')
  const expected = createHmac('sha256', appSecret).update(parts[1]).digest('base64url')
  if (!equal(parts[0], expected)) throw new Error('invalid_signature')
  const data = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
  if (data.algorithm !== 'HMAC-SHA256' || !/^[0-9]+$/.test(String(data.user_id || ''))) throw new Error('invalid_signature')
  return String(data.user_id)
}
