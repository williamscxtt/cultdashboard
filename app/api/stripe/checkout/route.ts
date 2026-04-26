import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { stripe, STRIPE_PRICE_ID, TRIAL_DAYS } from '@/lib/stripe'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://dash.scottvip.com'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await adminClient
      .from('profiles')
      .select('id, email, name, stripe_customer_id, subscription_status')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // Already active — send to portal instead
    if (profile.subscription_status === 'active' || profile.subscription_status === 'trialing') {
      return NextResponse.json({ error: 'already_subscribed' }, { status: 400 })
    }

    // Get or create Stripe customer
    let customerId = profile.stripe_customer_id as string | undefined

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email ?? undefined,
        name: profile.name ?? undefined,
        metadata: { profile_id: profile.id },
      })
      customerId = customer.id

      await adminClient
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', profile.id)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      subscription_data: { trial_period_days: TRIAL_DAYS },
      success_url: `${APP_URL}/dashboard?subscribed=1`,
      cancel_url: `${APP_URL}/subscribe?canceled=1`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe/checkout]', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
