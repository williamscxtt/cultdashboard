import { NextRequest, NextResponse } from 'next/server'
import { stripe, MEMBERSHIP_ONETIME_PRICE_ID } from '@/lib/stripe'

/**
 * Public (unauthenticated) checkout for the Creator Cult Membership.
 *
 * The £997 is a ONE-TIME payment-mode charge so that Buy Now Pay Later
 * (Klarna / Clearpay / Affirm) stays available — BNPL is not supported in
 * Checkout subscription mode. We save the card ONLY for card payers via a
 * per-payment-method `setup_future_usage`, which does NOT suppress BNPL. The
 * webhook then grants 6 months of access and, for card payers, starts the
 * £150/mo subscription with a 6-month trial so it auto-renews afterwards.
 */
export async function POST(req: NextRequest) {
  const origin = new URL(req.url).origin
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: MEMBERSHIP_ONETIME_PRICE_ID, quantity: 1 }],
      // Save cards for the later £150/mo subscription WITHOUT excluding BNPL.
      payment_method_options: { card: { setup_future_usage: 'off_session' } },
      customer_creation: 'always',
      billing_address_collection: 'auto',
      allow_promotion_codes: true,
      success_url: `${origin}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=canceled`,
      metadata: { plan: 'creator_cult_membership' },
      payment_intent_data: { metadata: { plan: 'creator_cult_membership' } },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe/checkout-membership]', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
