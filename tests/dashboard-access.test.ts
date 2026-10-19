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

test('churn blocks an existing account and rejoining restores the same account', async () => {
  const { canUseDashboard, hasEndedSkoolMembership } = await import('../lib/dashboard-access.ts')
  const profile = { access_type: 'skool_subscription', subscription_status: 'active', is_active: true }
  assert.equal(canUseDashboard(profile), true)
  profile.subscription_status = 'canceled'
  profile.is_active = false
  assert.equal(canUseDashboard(profile), false)
  assert.equal(hasEndedSkoolMembership(profile), true)
  profile.subscription_status = 'active'
  profile.is_active = true
  assert.equal(canUseDashboard(profile), true)
  assert.equal(hasEndedSkoolMembership(profile), false)
})

test('preserves lifetime and exempt grants and the admin role', async () => {
  const { canUseDashboard } = await import('../lib/dashboard-access.ts')
  assert.equal(canUseDashboard({ access_type: 'legacy_lifetime', subscription_status: 'canceled', is_active: true }), true)
  assert.equal(canUseDashboard({ billing_exempt: true, subscription_status: 'canceled', is_active: true }), true)
  assert.equal(canUseDashboard({ role: 'admin' }), true)
  assert.equal(canUseDashboard({ access_type: 'legacy_lifetime', is_active: false }), false)
})

test('does not tell an unverified member that their Skool membership ended', async () => {
  const { hasEndedSkoolMembership } = await import('../lib/dashboard-access.ts')
  assert.equal(hasEndedSkoolMembership({ access_type: 'skool_subscription', subscription_status: 'trialing', subscription_period_end: '2020-01-01' }), false)
})
