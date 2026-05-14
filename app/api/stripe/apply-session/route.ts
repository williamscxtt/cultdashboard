import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

const PRICE_IDS = {
  monthly:  'price_1TX1EGB3pws0HrHkAzRYo0Hb', // £95/mo recurring
  sixmonth: 'price_1TX1EMB3pws0HrHkbUU1CiPb', // £395 one-time
}

export async function POST(req: NextRequest) {
  const origin = new URL(req.url).origin
  try {
    const { plan, email, name } = await req.json()

    if (!plan || !PRICE_IDS[plan as keyof typeof PRICE_IDS]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const priceId  = PRICE_IDS[plan as keyof typeof PRICE_IDS]
    const isMonthly = plan === 'monthly'

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded_page',
      mode: isMonthly ? 'subscription' : 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      return_url: `${origin}/apply/success?session_id={CHECKOUT_SESSION_ID}`,
      ...(email ? { customer_email: email } : {}),
      ...(isMonthly ? { subscription_data: { metadata: { source: 'apply_form' } } } : {}),
      billing_address_collection: 'auto',
      allow_promotion_codes: true,
      metadata: { source: 'apply_form', name: name ?? '', plan },
    })

    return NextResponse.json({ clientSecret: session.client_secret })
  } catch (err) {
    console.error('[apply-session]', err)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
