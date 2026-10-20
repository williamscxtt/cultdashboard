import assert from 'node:assert/strict'
import test from 'node:test'
import { authRequest, AuthRequestError } from '../lib/auth-request.ts'

test('a stalled request aborts and gives a retryable error', async t => {
  let signal: AbortSignal | undefined
  t.mock.method(globalThis, 'fetch', (_input, init) => {
    signal = init.signal
    return new Promise(() => {})
  })
  await assert.rejects(authRequest('/api/auth/login', {}, 10), /taking too long/)
  assert.equal(signal?.aborted, true)
})

test('the deadline covers a stalled response body as well as headers', async t => {
  const response = new Response('{}')
  t.mock.method(response, 'json', () => new Promise(() => {}))
  t.mock.method(globalThis, 'fetch', async () => response)
  await assert.rejects(authRequest('/api/auth/login', {}, 10), /taking too long/)
})

test('network and non-JSON failures produce useful errors', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('network failed') })
  await assert.rejects(authRequest('/api/auth/login', {}), /Check your connection/)
  fetch.mock.mockImplementation(async () => new Response('<html>Error</html>', { status: 502 }))
  await assert.rejects(authRequest('/api/auth/login', {}), /could not respond/)
})

test('API errors preserve their status for the existing-account signup path', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'already_exists' }, { status: 409 }))
  await assert.rejects(authRequest('/api/auth/signup', {}), error => error instanceof AuthRequestError && error.status === 409)
})

test('successful requests keep authentication on the same origin', async t => {
  t.mock.method(globalThis, 'fetch', async (path, init) => {
    assert.equal(path, '/api/auth/login')
    assert.equal(init.credentials, 'same-origin')
    assert.equal(init.cache, 'no-store')
    return Response.json({ ok: true, redirectTo: '/dashboard/analytics' })
  })
  assert.equal((await authRequest('/api/auth/login', {})).redirectTo, '/dashboard/analytics')
})
