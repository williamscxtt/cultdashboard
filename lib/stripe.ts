import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

export const STRIPE_PRICE_ID = 'price_1TQR9OB3pws0HrHkDOIbwXdD'
export const TRIAL_DAYS = 30

// ── Creator Cult Membership: £997 for the first 6 months, then £150/month ──
export const MEMBERSHIP_ONETIME_PRICE_ID = 'price_1TrbhdB3pws0HrHkF7OmrDFL' // £997 one-time (first 6 months)
export const MEMBERSHIP_MONTHLY_PRICE_ID = 'price_1TrbheB3pws0HrHkl2WRRmm8' // £150/mo (after 6 months)
export const MEMBERSHIP_ACCESS_DAYS = 182 // prepaid access window (~6 months)

/** True while a profile is inside its prepaid Creator Cult membership window. */
export function isWithinMembershipWindow(
  membershipTier: string | null | undefined,
  periodEnd: string | null | undefined,
): boolean {
  if (membershipTier !== 'creator_cult' || !periodEnd) return false
  return new Date(periodEnd).getTime() > Date.now()
}

/** Subscription statuses that grant dashboard access */
export function isSubscriptionActive(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing'
}
