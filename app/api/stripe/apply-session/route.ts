import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'

const PRICES = {
  monthly:  { id: 'price_1TX1EGB3pws0HrHkAzRYo0Hb', amount: 9500  }, // £95/mo recurring
  sixmonth: { id: 'price_1TX1EMB3pws0HrHkbUU1CiPb', amount: 39500 }, // £395 one-time
}

export async function POST(req: NextRequest) {
  try {
    const { plan, email, name } = await req.json()

    if (!plan || !PRICES[plan as keyof typeof PRICES]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const isMonthly = plan === 'monthly'

    if (isMonthly) {
      // ── Subscription: create customer → subscription → return payment intent client_secret
      const customer = await stripe.customers.create({
        ...(email ? { email } : {}),
        ...(name  ? { name  } : {}),
        metadata: { source: 'apply_form' },
      })

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: PRICES.monthly.id }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        // Expand both: new customers (no saved card) get pending_setup_intent,
        // returning customers with a card get latest_invoice.payment_intent
        expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
        metadata: { source: 'apply_form', plan: 'monthly' },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoice = subscription.latest_invoice as any
      let clientSecret: string | null = null
      let intentType: 'payment_intent' | 'setup_intent' = 'payment_intent'

      // Case 1: customer had a saved payment method → payment_intent on invoice
      const pi = invoice?.payment_intent
      if (pi) {
        const secret = typeof pi === 'object' ? pi.client_secret : null
        if (!secret && typeof pi === 'string') {
          const fetched = await stripe.paymentIntents.retrieve(pi)
          clientSecret = fetched.client_secret
        } else {
          clientSecret = secret
        }
        intentType = 'payment_intent'
      }

      // Case 2: new customer, no saved card → pending_setup_intent
      if (!clientSecret) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const seti = subscription.pending_setup_intent as any
        if (seti) {
          clientSecret = typeof seti === 'object' ? seti.client_secret : null
          if (!clientSecret && typeof seti === 'string') {
            const fetched = await stripe.setupIntents.retrieve(seti)
            clientSecret = fetched.client_secret
          }
          intentType = 'setup_intent'
        }
      }

      if (!clientSecret) {
        console.error('[apply-session] No client_secret on subscription', subscription.id)
        return NextResponse.json({ error: 'Failed to create payment session' }, { status: 500 })
      }

      return NextResponse.json({
        clientSecret,
        intentType,
        type: 'subscription',
      })
    } else {
      // ── One-time: create PaymentIntent directly
      const paymentIntent = await stripe.paymentIntents.create({
        amount: PRICES.sixmonth.amount,
        currency: 'gbp',
        automatic_payment_methods: { enabled: true },
        ...(email ? { receipt_email: email } : {}),
        metadata: { source: 'apply_form', plan: 'sixmonth', name: name ?? '' },
      })

      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        type: 'payment_intent',
      })
    }
  } catch (err) {
    console.error('[apply-session]', err)
    return NextResponse.json({ error: 'Failed to create payment session' }, { status: 500 })
  }
}
