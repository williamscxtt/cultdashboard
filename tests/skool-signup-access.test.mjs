import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import Module from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const root = new URL('../', import.meta.url).pathname
function load(file, overrides = {}) {
  const m = new Module(root + file)
  m.filename = root + file
  m.require = name => name in overrides ? overrides[name] : require(name)
  m._compile(ts.transpileModule(readFileSync(m.filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, m.filename)
  return m.exports
}
const policy = load('lib/skool-signup-access.ts')
const access = load('lib/dashboard-access.ts')
const fresh = () => ({ id: 'member', email: 'member@example.test', created_at: new Date().toISOString(), role: 'client', is_active: true, billing_exempt: false, access_type: null, billing_provider: null, subscription_status: null })
function service(profile, entitlement = null) {
  const writes = []
  const db = { from(table) {
    let mutation = null
    const query = { select: () => query, eq: () => query, ilike: () => query, is: () => query, order: () => query, limit: () => query,
      maybeSingle: async () => ({ data: table === 'profiles' ? profile : entitlement, error: null }),
      update: value => { mutation = value; return query }, in: () => query,
      then(resolve) { if (mutation) writes.push(mutation); resolve({data: mutation ? [{id:profile?.id}] : [profile], error: null}) } }
    return query
  } }
  const sync = load('lib/membership-sync.ts', { 'server-only': {}, '@supabase/supabase-js': {createClient: () => db}, '@/lib/skool-membership-event': {normalizeMemberEmail: x => String(x ?? '').trim().toLowerCase()}, '@/lib/skool-signup-access': policy })
  return { sync, writes }
}
test('signup grants active access immediately with an immutable thirty-day review deadline', async () => {
  const p = fresh(); const {sync,writes} = service(p)
  const result = await sync.ensureSignupMembershipAccess(p.email,p.id)
  assert.equal(result.kind,'signup'); assert.equal(writes[0].subscription_status,'active')
  assert.equal(writes[0].subscription_period_end,null)
  assert.equal(Date.parse(writes[0].skool_access_review_due_at)-Date.parse(p.created_at),30*86400000)
  assert.equal(access.canUseDashboard(writes[0]),true)
})
test('unmatched access stops at the deadline for pages and member tools', () => {
  assert.equal(access.canUseDashboard({...policy.skoolSignupAccess('2020-01-01T00:00:00Z')}),false)
  assert.equal(access.hasEndedSkoolMembership({...policy.skoolSignupAccess('2020-01-01T00:00:00Z')}),false)
})
test('verified access remains open after thirty days and churn blocks it', async () => {
  const p = {...fresh(),...policy.skoolSignupAccess('2020-01-01T00:00:00Z')}
  const entitlement = {provider:'skool',status:'active',period_end:null,plan_type:'monthly'}
  const {sync,writes} = service(p,entitlement)
  await sync.ensureSignupMembershipAccess(p.email,p.id)
  assert.equal(writes[0].skool_access_review_due_at,null);assert.equal(access.canUseDashboard(writes[0]),true)
  const canceled = service(p,{...entitlement,status:'canceled'})
  await canceled.sync.ensureSignupMembershipAccess(p.email,p.id)
  assert.equal(canceled.writes.length,1);assert.equal(access.canUseDashboard(canceled.writes[0]),false)
})
test('repeat signup does not extend or remove the review deadline', async () => {
  const p={...fresh(),...policy.skoolSignupAccess('2020-01-01T00:00:00Z')};const {sync,writes}=service(p)
  assert.equal((await sync.ensureSignupMembershipAccess(p.email,p.id)).signup,null);assert.equal(writes.length,0)
})
test('signup preserves churn, suspensions, lifetime, exemptions, admin and another provider', async () => {
  for (const patch of [{subscription_status:'canceled'},{is_active:false},{access_type:'legacy_lifetime'},{billing_exempt:true},{role:'admin'},{billing_provider:'stripe'}]) {
    const p={...fresh(),...patch};const {sync,writes}=service(p)
    await sync.ensureSignupMembershipAccess(p.email,p.id);assert.equal(writes.length,0,JSON.stringify(patch))
  }
})
test('a paid match does not overwrite a manual suspension or another provider', async () => {
  for (const patch of [{is_active:false},{billing_provider:'stripe'},{access_type:'legacy_lifetime'},{billing_exempt:true},{role:'admin'}]) {
    const p={...fresh(),...patch};const {sync,writes}=service(p,{provider:'skool',status:'active',period_end:null})
    await sync.ensureSignupMembershipAccess(p.email,p.id);assert.equal(writes.length,0,JSON.stringify(patch))
  }
})
test('an exact verified rejoin restores the same canceled Skool account', async () => {
  const p={...fresh(),is_active:false,access_type:'skool_subscription',billing_provider:'skool',subscription_status:'canceled'}
  const {sync,writes}=service(p,{provider:'skool',status:'active',period_end:null})
  await sync.ensureSignupMembershipAccess(p.email,p.id);assert.equal(writes.length,1);assert.equal(access.canUseDashboard(writes[0]),true)
})
test('deadline calculations reject missing creation dates and do not reset older accounts', () => {
  assert.throws(()=>policy.skoolSignupAccess('invalid'))
  assert.equal(policy.skoolSignupAccess('2026-10-08T00:00:00Z').skool_access_review_due_at,'2026-11-07T00:00:00.000Z')
})
