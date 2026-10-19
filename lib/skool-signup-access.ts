/** Active member access while the exact Skool email is checked in reconciliation. */
export const SKOOL_ACCESS_REVIEW_DAYS = 30

export function skoolSignupAccess(createdAt: string) {
  const created = new Date(createdAt).getTime()
  if (!Number.isFinite(created)) throw new Error('Account creation date is required')
  return {
    membership_tier: 'creator_cult' as const,
    access_type: 'skool_subscription' as const,
    billing_provider: 'skool' as const,
    external_customer_id: null,
    external_subscription_id: null,
    subscription_status: 'active' as const,
    subscription_period_end: null,
    skool_access_review_due_at: new Date(created + SKOOL_ACCESS_REVIEW_DAYS * 86400000).toISOString(),
    plan_type: 'monthly' as const,
    subscription_amount: null,
    subscription_currency: null,
    is_active: true,
  }
}
