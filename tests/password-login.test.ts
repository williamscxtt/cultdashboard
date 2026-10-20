import assert from 'node:assert/strict'
import test, { type TestContext } from 'node:test'
import { NextRequest } from 'next/server'
import { POST } from '../app/api/auth/login/route.ts'

const userId = '00000000-0000-4000-8000-000000000001'
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
const token = encode({ alg: 'HS256', typ: 'JWT' }) + '.' + encode({ sub: userId, exp: Math.floor(Date.now() / 1000) + 3600 }) + '.fixture'
function request(body: unknown, origin = 'https://dashboard.example') {
  return new NextRequest('https://dashboard.example/api/auth/login', { method: 'POST',
    headers: { 'Content-Type': 'application/json', origin, cookie: 'sb-auth-fixture-auth-token.2=stale' }, body: JSON.stringify(body) })
}
function configure(t: TestContext) {
  for (const [name, value] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: 'https://auth-fixture.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fixture-key' })) {
    const before = process.env[name]
    process.env[name] = value
    t.after(() => { if (before === undefined) delete process.env[name]; else process.env[name] = before })
  }
}
function authSuccess() {
  return Response.json({ access_token: token, refresh_token: 'fixture-refresh', token_type: 'bearer', expires_in: 3600,
    user: { id: userId, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid',
      app_metadata: {}, user_metadata: {}, identities: [], created_at: new Date().toISOString() } })
}

test('missing credentials and cross-origin requests do not contact Auth', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('must not run') })
  assert.equal((await POST(request({}))).status, 400)
  assert.equal((await POST(request({ email: 'a@b.test', password: 'fixture' }, 'https://other.example'))).status, 403)
  assert.equal(fetch.mock.callCount(), 0)
})

test('incorrect credentials return a clear error without exposing account existence or setting cookies', async t => {
  configure(t)
  t.mock.method(globalThis, 'fetch', async (_input, init) => {
    assert.deepEqual(JSON.parse(init.body as string), { email: 'fixture@example.invalid', password: ' spaces kept ', gotrue_meta_security: {} })
    return Response.json({ code: 'invalid_credentials', message: 'Invalid login credentials' }, { status: 400 })
  })
  const response = await POST(request({ email: ' FIXTURE@example.invalid ', password: ' spaces kept ' }))
  assert.equal(response.status, 401)
  assert.match((await response.json()).error, /Create your Dashboard account/)
  assert.equal(response.headers.get('set-cookie'), null)
  assert.match(response.headers.get('cache-control')!, /no-store/)
})

test('successful login sets fresh session cookies and preserves legacy onboarding routing', async t => {
  configure(t)
  t.mock.method(globalThis, 'fetch', async input => String(input).includes('/auth/v1/token')
    ? authSuccess() : Response.json([{ role: 'client', onboarding_completed: false }]))
  const response = await POST(request({ email: 'fixture@example.invalid', password: 'fixture' }))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true, redirectTo: '/dashboard/onboarding' })
  const cookies = response.cookies.getAll()
  assert.ok(cookies.some(cookie => cookie.name === 'sb-auth-fixture-auth-token' && cookie.value.startsWith('base64-')))
  assert.ok(cookies.some(cookie => cookie.name === 'sb-auth-fixture-auth-token.2' && cookie.maxAge === 0))
})

test('established accounts go directly to Analytics without another dashboard redirect', async t => {
  configure(t)
  t.mock.method(globalThis, 'fetch', async input => String(input).includes('/auth/v1/token')
    ? authSuccess() : Response.json([{ role: 'client', onboarding_completed: true }]))
  const response = await POST(request({ email: 'fixture@example.invalid', password: 'fixture' }))
  assert.equal((await response.json()).redirectTo, '/dashboard/analytics')
})

test('a profile read failure returns a retryable response and no partial session cookies', async t => {
  configure(t)
  t.mock.method(globalThis, 'fetch', async input => String(input).includes('/auth/v1/token')
    ? authSuccess() : Response.json({ message: 'temporarily unavailable' }, { status: 500 }))
  const response = await POST(request({ email: 'fixture@example.invalid', password: 'fixture' }))
  assert.equal(response.status, 503)
  assert.equal(response.headers.get('set-cookie'), null)
})
