export type DashboardAccessProfile = {
  is_active?: boolean | null
  role?: string | null
  billing_exempt?: boolean | null
  billing_provider?: string | null
  access_type?: string | null
  membership_tier?: string | null
  subscription_status?: string | null
  subscription_period_end?: string | null
  skool_access_review_due_at?: string | null
}

export function isSubscriptionActive(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing'
}

function hasUnexpiredAccessWindow(periodEnd: string | null | undefined): boolean {
  if (!periodEnd) return false
  const timestamp = new Date(periodEnd).getTime()
  return Number.isFinite(timestamp) && timestamp > Date.now()
}

/**
 * Original Creator Cult members keep lifetime Dashboard access. New Skool
 * members receive the Dashboard as part of their active Skool subscription.
 */
export function hasDashboardAccess(profile: DashboardAccessProfile): boolean {
  if (profile.billing_exempt) return true
  if (profile.access_type === 'legacy_lifetime') return true
  if (profile.access_type === 'skool_subscription') {
    if (profile.subscription_status === 'active') {
      return !profile.skool_access_review_due_at || hasUnexpiredAccessWindow(profile.skool_access_review_due_at)
    }
    if (profile.subscription_status === 'trialing') {
      return hasUnexpiredAccessWindow(profile.subscription_period_end)
    }
    return false
  }

  if (profile.membership_tier === 'creator_cult') {
    // Backwards compatibility for original members created before access_type.
    if (!profile.access_type && !profile.billing_provider) return true
    if (hasUnexpiredAccessWindow(profile.subscription_period_end)) return true
  }

  return false
}

/** Existing lifetime/manual grants remain independent of a Skool subscription. */
export function canUseDashboard(profile: DashboardAccessProfile): boolean {
  if (profile.role === 'admin') return true
  return profile.is_active !== false && hasDashboardAccess(profile)
}

export const SKOOL_REJOIN_URL = 'https://www.skool.com/creator'

export function hasEndedSkoolMembership(profile: DashboardAccessProfile): boolean {
  return profile.access_type === 'skool_subscription'
    && !profile.billing_exempt
    && ['canceled', 'unpaid'].includes(profile.subscription_status ?? '')
}
