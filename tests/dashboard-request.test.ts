import assert from 'node:assert/strict'
import test from 'node:test'
import { dashboardRequest } from '../lib/dashboard-request.ts'

test('a stalled tool response gives a bounded retry while preserving saved work', async t => {
  let signal: AbortSignal | undefined
  t.mock.method(globalThis, 'fetch', async (_input, init) => { signal = init.signal; return new Promise(() => {}) })
  await assert.rejects(dashboardRequest('/fixture', {}, 10), /taking too long.*saved work/)
  assert.equal(signal?.aborted, true)
})

test('expired sessions and provider errors produce useful messages instead of infinite loading', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'Unauthorized' }, { status: 401 }))
  await assert.rejects(dashboardRequest('/fixture'), /session has expired/)
  fetch.mock.mockImplementation(async () => Response.json({ error: 'no_competitors', message: 'Add a competitor first.' }, { status: 422 }))
  await assert.rejects(dashboardRequest('/fixture'), /Add a competitor first/)
})

test('a successful saved-data request is private and same-origin', async t => {
  t.mock.method(globalThis, 'fetch', async (_input, init) => {
    assert.equal(init.cache, 'no-store')
    assert.equal(init.credentials, 'same-origin')
    return Response.json({ reels: ['saved'] })
  })
  assert.deepEqual(await dashboardRequest('/fixture'), { reels: ['saved'] })
})
