type DashboardAccessProfile = {
  billing_exempt?: boolean | null
  billing_provider?: string | null
  membership_tier?: string | null
  subscription_status?: string | null
  subscription_period_end?: string | null
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
 * Creator Cult was historically sold with lifetime access. Those profiles do
 * not have a billing provider, so they must not be sent through a second
 * checkout. New Commas memberships remain tied to their subscription status.
 */
export function hasDashboardAccess(profile: DashboardAccessProfile): boolean {
  if (profile.billing_exempt) return true
  if (isSubscriptionActive(profile.subscription_status)) return true

  if (profile.membership_tier === 'creator_cult') {
    if (!profile.billing_provider) return true
    if (hasUnexpiredAccessWindow(profile.subscription_period_end)) return true
  }

  return false
}
