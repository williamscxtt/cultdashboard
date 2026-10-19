import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { createInstagramState, verifyInstagramState, encryptInstagramToken, decryptInstagramToken, parseInstagramTokenResponse, parseInstagramLongToken, verifyInstagramSignedRequest, INSTAGRAM_SCOPES } from '../lib/instagram-oauth-security'

const key = 'a1'.repeat(32), now = 1000000
test('OAuth state requires the starting browser, user, handle and unexpired signature', () => {
  const state = createInstagramState('owner', '@Creator', key, now)
  assert.doesNotThrow(() => verifyInstagramState(state, state, 'owner', 'creator', key, now + 1))
  for (const args of [[null, state, 'owner', 'creator', key, now], [state, undefined, 'owner', 'creator', key, now], [state, state, 'other', 'creator', key, now], [state, state, 'owner', 'newhandle', key, now], [state, state, 'owner', 'creator', key, now + 600000], [state + 'x', state + 'x', 'owner', 'creator', key, now]] as const) assert.throws(() => verifyInstagramState(args[0], args[1], args[2], args[3], args[4], args[5]))
})
test('tokens are encrypted and bound to one profile; altered ciphertext fails', () => {
  const encrypted = encryptInstagramToken('private-token', 'owner', key)
  assert.ok(!encrypted.includes('private-token'))
  assert.equal(decryptInstagramToken(encrypted, 'owner', key), 'private-token')
  assert.throws(() => decryptInstagramToken(encrypted, 'other', key))
  const pieces = encrypted.split('.'); pieces[3] = Buffer.from('modified').toString('base64url')
  assert.throws(() => decryptInstagramToken(pieces.join('.'), 'owner', key))
})
test('current wrapped and historical flat token formats preserve both required grants', () => {
  const data = { access_token: 'token', user_id: '123', permissions: INSTAGRAM_SCOPES.join(',') }
  assert.deepEqual(parseInstagramTokenResponse({ data: [data] }), parseInstagramTokenResponse(data))
  assert.throws(() => parseInstagramTokenResponse({ data: [data, data] }))
  assert.throws(() => parseInstagramTokenResponse({ ...data, permissions: 'instagram_business_basic' }), /missing_permissions/)
  assert.throws(() => parseInstagramTokenResponse({ ...data, data: [data] }))
  assert.throws(() => parseInstagramLongToken({ access_token: 'short' }))
  assert.throws(() => parseInstagramLongToken({ access_token: 'short', expires_in: 3600 }))
})
test('signed deletion requires a genuine HMAC, supported algorithm and numeric account id', () => {
  const payload = Buffer.from(JSON.stringify({ algorithm: 'HMAC-SHA256', user_id: '123' })).toString('base64url')
  const signature = createHmac('sha256', 'secret').update(payload).digest('base64url')
  assert.equal(verifyInstagramSignedRequest(signature + '.' + payload, 'secret'), '123')
  assert.throws(() => verifyInstagramSignedRequest(signature + '.' + payload, 'different'))
  assert.throws(() => verifyInstagramSignedRequest(signature + '.' + payload + 'x', 'secret'))
})
