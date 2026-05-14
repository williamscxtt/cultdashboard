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
        expand: ['latest_invoice.payment_intent'],
        metadata: { source: 'apply_form', plan: 'monthly' },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoice = subscription.latest_invoice as any
      let clientSecret: string | null = invoice?.payment_intent?.client_secret ?? null

      // Fallback: expand may have returned the PI as a bare ID string
      if (!clientSecret) {
        const piId = typeof invoice?.payment_intent === 'string' ? invoice.payment_intent : null
        if (piId) {
          const pi = await stripe.paymentIntents.retrieve(piId)
          clientSecret = pi.client_secret
        }
      }

      if (!clientSecret) {
        console.error('[apply-session] No client_secret on subscription invoice', subscription.id)
        return NextResponse.json({ error: 'Failed to create payment session. Please try the 6-month plan or contact Will.' }, { status: 500 })
      }

      return NextResponse.json({
        clientSecret,
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
