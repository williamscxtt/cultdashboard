import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

const PRICES = {
  monthly:  { id: 'price_1TX1EGB3pws0HrHkAzRYo0Hb', amount: 19700 }, // £197/mo recurring — UPDATE price ID in Stripe when new price created
  sixmonth: { id: 'price_1TX1EMB3pws0HrHkbUU1CiPb', amount: 99700 }, // £997 one-time
}

export async function POST(req: NextRequest) {
  try {
    const { plan, email, name } = await req.json()

    if (!plan || !PRICES[plan as keyof typeof PRICES]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    if (plan === 'monthly') {
      // ── Monthly: SetupIntent to save card, then create subscription on success ──
      // This avoids the subscription→invoice→payment_intent chain entirely.
      // SetupIntent.client_secret is always non-null.
      const customer = await stripe.customers.create({
        ...(email ? { email } : {}),
        ...(name  ? { name  } : {}),
        metadata: { source: 'apply_form' },
      })

      const setupIntent = await stripe.setupIntents.create({
        customer: customer.id,
        usage: 'off_session',
        automatic_payment_methods: { enabled: true },
        metadata: { source: 'apply_form', plan: 'monthly', price_id: PRICES.monthly.id },
      })

      return NextResponse.json({
        clientSecret: setupIntent.client_secret,
        intentType: 'setup_intent',
        type: 'setup_for_subscription',
      })
    }

    // ── 6-month: simple one-time PaymentIntent ──
    const paymentIntent = await stripe.paymentIntents.create({
      amount: PRICES.sixmonth.amount,
      currency: 'gbp',
      automatic_payment_methods: { enabled: true },
      ...(email ? { receipt_email: email } : {}),
      metadata: { source: 'apply_form', plan: 'sixmonth', name: name ?? '' },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      intentType: 'payment_intent',
      type: 'payment_intent',
    })

  } catch (err) {
    console.error('[apply-session]', err)
    return NextResponse.json({ error: 'Failed to create payment session' }, { status: 500 })
  }
}
