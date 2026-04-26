import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const rawUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://dash.scottvip.com'
const APP_URL = rawUrl.startsWith('http') ? rawUrl.replace(/\/$/, '') : `https://${rawUrl.replace(/\/$/, '')}`

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await adminClient
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      // Admin previewing — send them to the subscribe page to see what clients see
      return NextResponse.json({ url: `${APP_URL}/subscribe` })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${APP_URL}/dashboard/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe/portal]', err)
    return NextResponse.json({ error: 'Failed to open billing portal' }, { status: 500 })
  }
}
