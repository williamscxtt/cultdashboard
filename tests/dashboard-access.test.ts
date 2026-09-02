import assert from 'node:assert/strict'
import test from 'node:test'
import { hasDashboardAccess } from '../lib/dashboard-access.ts'

test('keeps verified active Skool access open', () => {
  assert.equal(hasDashboardAccess({
    access_type: 'skool_subscription',
    subscription_status: 'active',
    subscription_period_end: null,
  }), true)
})

test('allows provisional Skool access only inside its access window', () => {
  assert.equal(hasDashboardAccess({
    access_type: 'skool_subscription',
    subscription_status: 'trialing',
    subscription_period_end: new Date(Date.now() + 60_000).toISOString(),
  }), true)

  assert.equal(hasDashboardAccess({
    access_type: 'skool_subscription',
    subscription_status: 'trialing',
    subscription_period_end: new Date(Date.now() - 60_000).toISOString(),
  }), false)
})

test('does not grant canceled Skool access', () => {
  assert.equal(hasDashboardAccess({
    access_type: 'skool_subscription',
    subscription_status: 'canceled',
  }), false)
})
