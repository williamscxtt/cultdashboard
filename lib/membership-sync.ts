import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { normalizeMemberEmail } from '@/lib/skool-membership-event'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

const PROVISIONAL_ACCESS_DAYS = 14

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
  subscription_status?: string | null
}

export type MembershipAccessUpdates = {
  membership_tier: 'creator_cult'
  access_type: 'skool_subscription' | null
  billing_provider: BillingProvider
  external_customer_id: string | null
  external_subscription_id: string | null
  subscription_status: MembershipStatus
  subscription_period_end: string | null
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
    plan_type: entitlement.plan_type,
    subscription_amount: entitlement.amount,
    subscription_currency: entitlement.currency,
    is_active: isActiveMembership(entitlement.status),
  }
}

async function findProfiles(email: string, userId?: string): Promise<MembershipProfile[]> {
  const query = admin.from('profiles').select('id, access_type')
  const { data, error } = userId
    ? await query.eq('id', userId)
    : await query.ilike('email', email)

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
    .filter(profile => profile.access_type !== 'legacy_lifetime')
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
    .ilike('email', normalizedEmail)
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
 * New accounts get a bounded access window while Skool/Zapier catches up.
 * A verified join replaces this with normal active Skool access. The window
 * prevents a delayed automation from blocking real members without turning
 * public signup into permanent free access.
 */
export async function grantProvisionalSkoolAccess(email: string, userId: string) {
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('access_type, billing_provider, subscription_status')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) throw profileError
  // Only grant the one-time window to a genuinely unlinked profile. Never
  // revive a canceled membership or overwrite another billing entitlement.
  if (!profile || profile.access_type || profile.billing_provider || profile.subscription_status) {
    return null
  }

  const expiresAt = new Date(Date.now() + PROVISIONAL_ACCESS_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const updates: MembershipAccessUpdates = {
    membership_tier: 'creator_cult',
    access_type: 'skool_subscription',
    billing_provider: 'skool',
    external_customer_id: null,
    external_subscription_id: null,
    subscription_status: 'trialing',
    subscription_period_end: expiresAt,
    plan_type: 'monthly',
    subscription_amount: null,
    subscription_currency: null,
    is_active: true,
  }

  const { error } = await admin.from('profiles').update(updates).eq('id', userId)
  if (error) throw error

  return { updates, expiresAt, email: normalizeMemberEmail(email) }
}

export async function ensureSignupMembershipAccess(email: string, userId: string) {
  const claimed = await claimMembershipEntitlement(email, userId)
  if (claimed) return { kind: 'verified' as const, ...claimed }

  const provisional = await grantProvisionalSkoolAccess(email, userId)
  return { kind: 'provisional' as const, provisional }
}
