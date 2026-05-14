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

    if (plan === 'monthly') {
      const customer = await stripe.customers.create({
        ...(email ? { email } : {}),
        ...(name  ? { name  } : {}),
        metadata: { source: 'apply_form' },
      })

      // Create subscription — no expand, we'll fetch everything explicitly
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: PRICES.monthly.id }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        metadata: { source: 'apply_form', plan: 'monthly' },
      })

      // ── Step 1: try to get client_secret from the invoice ──────────────────
      const latestInvoiceRef = subscription.latest_invoice
      const invoiceId = typeof latestInvoiceRef === 'string'
        ? latestInvoiceRef
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        : (latestInvoiceRef as any)?.id ?? null

      if (invoiceId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = await stripe.invoices.retrieve(invoiceId) as any

        // API 2026-04-22.dahlia: confirmation_secret holds the client_secret
        if (invoice.confirmation_secret?.client_secret) {
          return NextResponse.json({
            clientSecret: invoice.confirmation_secret.client_secret,
            intentType: 'payment_intent',
            type: 'subscription',
          })
        }

        // Fallback: explicit payment_intent retrieval
        const piRef = invoice.payment_intent
        if (piRef) {
          const piId = typeof piRef === 'string' ? piRef : (piRef as any).id
          const pi = await stripe.paymentIntents.retrieve(piId)
          if (pi.client_secret) {
            return NextResponse.json({
              clientSecret: pi.client_secret,
              intentType: 'payment_intent',
              type: 'subscription',
            })
          }
        }
      }

      // ── Step 2: pending_setup_intent (free trial / $0 invoice edge case) ──
      const setiRef = subscription.pending_setup_intent
      if (setiRef) {
        const setiId = typeof setiRef === 'string' ? setiRef : (setiRef as any).id
        const seti = await stripe.setupIntents.retrieve(setiId)
        if (seti.client_secret) {
          return NextResponse.json({
            clientSecret: seti.client_secret,
            intentType: 'setup_intent',
            type: 'subscription',
          })
        }
      }

      // ── Nothing worked — log everything we got ─────────────────────────────
      console.error('[apply-session] exhausted all paths — sub:', subscription.id,
        '| latest_invoice:', JSON.stringify(subscription.latest_invoice)?.slice(0, 200),
        '| pending_setup_intent:', JSON.stringify(subscription.pending_setup_intent)?.slice(0, 200),
      )
      return NextResponse.json({ error: 'Failed to create payment session' }, { status: 500 })
    }

    // ── One-time 6-month: simple PaymentIntent (same as williamscxtt.com) ──
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
