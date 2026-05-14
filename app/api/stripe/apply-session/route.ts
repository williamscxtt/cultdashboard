import { NextRequest, NextResponse } from 'next/server'
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
      const customer = await stripe.customers.create({
        ...(email ? { email } : {}),
        ...(name  ? { name  } : {}),
        metadata: { source: 'apply_form' },
      })

      // Expand latest_invoice so we can read confirmation_secret (API 2026-04-22.dahlia)
      // and also pending_setup_intent for the free-trial / $0 invoice edge case
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: PRICES.monthly.id }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice', 'pending_setup_intent'],
        metadata: { source: 'apply_form', plan: 'monthly' },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoice = subscription.latest_invoice as any
      let clientSecret: string | null = null
      let intentType: 'payment_intent' | 'setup_intent' = 'payment_intent'

      // ── API 2026-04-22.dahlia: invoice.confirmation_secret.client_secret ──
      if (invoice?.confirmation_secret?.client_secret) {
        clientSecret = invoice.confirmation_secret.client_secret
        intentType = 'payment_intent'
      }

      // ── Fallback A: invoice.payment_intent (older API behaviour) ──
      if (!clientSecret && invoice?.payment_intent) {
        const pi = invoice.payment_intent
        if (typeof pi === 'object' && pi.client_secret) {
          clientSecret = pi.client_secret
          intentType = 'payment_intent'
        } else if (typeof pi === 'string') {
          const fetched = await stripe.paymentIntents.retrieve(pi)
          clientSecret = fetched.client_secret
          intentType = 'payment_intent'
        }
      }

      // ── Fallback B: pending_setup_intent (free trial / $0 first invoice) ──
      if (!clientSecret) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const seti = subscription.pending_setup_intent as any
        if (seti) {
          const setiId = typeof seti === 'string' ? seti : seti.id
          const fetched = await stripe.setupIntents.retrieve(setiId)
          clientSecret = fetched.client_secret
          intentType = 'setup_intent'
        }
      }

      if (!clientSecret) {
        console.error('[apply-session] No client_secret — sub:', subscription.id,
          '| invoice type:', typeof invoice,
          '| confirmation_secret:', JSON.stringify(invoice?.confirmation_secret),
          '| payment_intent:', typeof invoice?.payment_intent === 'object'
            ? JSON.stringify(invoice?.payment_intent)?.slice(0, 120)
            : invoice?.payment_intent,
        )
        return NextResponse.json({ error: 'Failed to create payment session' }, { status: 500 })
      }

      return NextResponse.json({ clientSecret, intentType, type: 'subscription' })

    } else {
      // ── One-time: create PaymentIntent directly ──
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
    }
  } catch (err) {
    console.error('[apply-session]', err)
    return NextResponse.json({ error: 'Failed to create payment session' }, { status: 500 })
  }
}
