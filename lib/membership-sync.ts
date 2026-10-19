import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { normalizeMemberEmail } from '@/lib/skool-membership-event'
import { skoolSignupAccess } from '@/lib/skool-signup-access'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

type BillingProvider = 'stripe' | 'commas' | 'skool'
type MembershipStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'

type MemberEntitlement = {
  provider: BillingProvider
  external_customer_id: string | null
  external_subscription_id: string | null
  status: MembershipStatus
  plan_type: 'monthly' | 'biannual' | null
  amount: number | null
  currency: string | null
  period_end: string | null
}

type MembershipProfile = {
  id: string
  access_type: string | null
  billing_provider?: string | null
  billing_exempt?: boolean | null
  role?: string | null
  subscription_status?: string | null
  is_active?: boolean | null
}

export type MembershipAccessUpdates = {
  membership_tier: 'creator_cult'
  access_type: 'skool_subscription' | null
  billing_provider: BillingProvider
  external_customer_id: string | null
  external_subscription_id: string | null
  subscription_status: MembershipStatus
  subscription_period_end: string | null
  skool_access_review_due_at: string | null
  plan_type: 'monthly' | 'biannual' | null
  subscription_amount: number | null
  subscription_currency: string | null
  is_active: boolean
}

function isActiveMembership(status: string): boolean {
  return status === 'active' || status === 'trialing'
}

function entitlementUpdates(entitlement: MemberEntitlement): MembershipAccessUpdates {
  return {
    membership_tier: 'creator_cult',
    access_type: entitlement.provider === 'skool' ? 'skool_subscription' : null,
    billing_provider: entitlement.provider,
    external_customer_id: entitlement.external_customer_id,
    external_subscription_id: entitlement.external_subscription_id,
    subscription_status: entitlement.status,
    subscription_period_end: entitlement.period_end,
    skool_access_review_due_at: null,
    plan_type: entitlement.plan_type,
    subscription_amount: entitlement.amount,
    subscription_currency: entitlement.currency,
    is_active: isActiveMembership(entitlement.status),
  }
}

async function findProfiles(email: string, userId?: string): Promise<MembershipProfile[]> {
  const query = admin.from('profiles').select('id, access_type, billing_exempt, role, billing_provider, subscription_status, is_active')
  const { data, error } = userId
    ? await query.eq('id', userId)
    : await query.ilike('email', email.replace(/[\\%_]/g, '\\$&'))

  if (error) throw error
  return (data ?? []) as MembershipProfile[]
}

export async function applyMembershipToProfiles(
  email: string,
  updates: MembershipAccessUpdates,
  userId?: string,
): Promise<number> {
  const profiles = await findProfiles(normalizeMemberEmail(email), userId)
  const profileIds = profiles
    .filter(profile => profile.access_type !== 'legacy_lifetime' && !profile.billing_exempt && profile.role !== 'admin')
    .filter(profile => !profile.billing_provider || profile.billing_provider === updates.billing_provider)
    .filter(profile => !updates.is_active || profile.is_active !== false
      || (profile.billing_provider === 'skool' && ['canceled', 'unpaid'].includes(profile.subscription_status ?? '')))
    .map(profile => profile.id)

  if (profileIds.length === 0) return 0

  const { error } = await admin
    .from('profiles')
    .update(updates)
    .in('id', profileIds)

  if (error) throw error
  return profileIds.length
}

export async function claimMembershipEntitlement(email: string, userId?: string) {
  const normalizedEmail = normalizeMemberEmail(email)
  if (!normalizedEmail) return null

  const { data, error } = await admin
    .from('member_entitlements')
    .select('provider, external_customer_id, external_subscription_id, status, plan_type, amount, currency, period_end')
    .ilike('email', normalizedEmail.replace(/[\\%_]/g, '\\$&'))
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  const entitlement = data as MemberEntitlement | null
  if (!entitlement) return null

  const updates = entitlementUpdates(entitlement)
  const profilesUpdated = await applyMembershipToProfiles(normalizedEmail, updates, userId)
  return { entitlement, updates, profilesUpdated }
}

/**
 * Signup grants active access immediately. Reconciliation verifies the Skool
 * email and removes the separate review deadline. Unmatched accounts cannot
 * keep using member tools beyond thirty days, even if a check is unavailable.
 */
export async function grantSignupSkoolAccess(email: string, userId: string) {
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('email, created_at, role, is_active, billing_exempt, access_type, billing_provider, subscription_status')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) throw profileError
  // Repeated signup must not reset a deadline, revive churn or a suspension,
  // or replace an independently paid, lifetime, exempt or admin account.
  if (!profile || normalizeMemberEmail(profile.email) !== normalizeMemberEmail(email)
    || profile.role !== 'client' || profile.is_active === false || profile.billing_exempt
    || profile.access_type || profile.billing_provider || profile.subscription_status) {
    return null
  }

  const updates: MembershipAccessUpdates = skoolSignupAccess(profile.created_at)

  const { data, error } = await admin.from('profiles').update(updates).eq('id', userId)
    .is('access_type', null).is('billing_provider', null).is('subscription_status', null)
    .eq('is_active', true).eq('role', 'client').select('id')
  if (error) throw error
  if (!data?.length) return null

  return { updates, reviewDueAt: updates.skool_access_review_due_at, email: normalizeMemberEmail(email) }
}

export async function ensureSignupMembershipAccess(email: string, userId: string) {
  const claimed = await claimMembershipEntitlement(email, userId)
  if (claimed) return { kind: 'verified' as const, ...claimed }

  const signup = await grantSignupSkoolAccess(email, userId)
  return { kind: 'signup' as const, signup }
}
