import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

export const STRIPE_PRICE_ID = 'price_1TQR9OB3pws0HrHkDOIbwXdD'
export const TRIAL_DAYS = 30

/** Subscription statuses that grant dashboard access */
export function isSubscriptionActive(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing'
}
