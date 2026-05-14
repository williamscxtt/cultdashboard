import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

const MONTHLY_PRICE_ID = 'price_1TX1EGB3pws0HrHkAzRYo0Hb'

export async function POST(req: NextRequest) {
  try {
    const { setupIntentId } = await req.json()

    if (!setupIntentId) {
      return NextResponse.json({ error: 'Missing setupIntentId' }, { status: 400 })
    }

    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId)

    if (setupIntent.status !== 'succeeded') {
      return NextResponse.json({ error: 'Setup not completed' }, { status: 400 })
    }

    const customerId = typeof setupIntent.customer === 'string'
      ? setupIntent.customer
      : setupIntent.customer?.id

    const paymentMethodId = typeof setupIntent.payment_method === 'string'
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id

    if (!customerId || !paymentMethodId) {
      return NextResponse.json({ error: 'Missing customer or payment method' }, { status: 400 })
    }

    // Attach payment method to customer and set as default
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    })

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: MONTHLY_PRICE_ID }],
      default_payment_method: paymentMethodId,
      metadata: { source: 'apply_form', plan: 'monthly' },
    })

    console.log('[activate-subscription] created sub:', subscription.id, 'status:', subscription.status)

    return NextResponse.json({ subscriptionId: subscription.id, status: subscription.status })
  } catch (err) {
    console.error('[activate-subscription]', err)
    return NextResponse.json({ error: 'Failed to activate subscription' }, { status: 500 })
  }
}
