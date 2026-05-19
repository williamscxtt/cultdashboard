import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import type Stripe from 'stripe'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Must be raw body — do not parse as JSON
export const runtime = 'nodejs'

async function upsertSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

  // In Stripe API 2025-04-30.basil, current_period_end moved from Subscription
  // to SubscriptionItem — read it from the first item.
  const periodEnd = sub.items?.data?.[0]?.current_period_end ?? null

  const updates = {
    stripe_subscription_id: sub.id,
    subscription_status: sub.status,
    subscription_period_end: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null,
    subscription_trial_end: sub.trial_end
      ? new Date(sub.trial_end * 1000).toISOString()
      : null,
  }

  const { error } = await adminClient
    .from('profiles')
    .update(updates)
    .eq('stripe_customer_id', customerId)

  if (error) console.error('[webhook] upsertSubscription error:', error)
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[webhook] signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session

      // ── Auto-provision account for new customers ──────────────────────────
      const email = session.customer_details?.email ?? session.customer_email
      const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id

      if (email) {
        // Check if a profile already exists for this email
        const { data: existingProfile } = await adminClient
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle()

        if (!existingProfile) {
          // New customer — the /welcome page handles instant login via magic link.
          // Webhook creates the user here as a silent fallback (e.g. browser closed
          // before /welcome loaded). No invite email sent — welcome page is primary.
          const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
            email,
            email_confirm: true,
          })
          if (createErr) {
            console.error('[webhook] createUser error:', createErr)
          } else if (created?.user) {
            await adminClient.from('profiles').upsert({
              id: created.user.id,
              email,
              role: 'client',
              is_active: true,
              stripe_customer_id: stripeCustomerId ?? null,
              date_joined: new Date().toISOString().split('T')[0],
            }, { onConflict: 'id' })
          }
        } else {
          // Returning customer — ensure active + update stripe customer id
          await adminClient.from('profiles').update({
            is_active: true,
            ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
          }).eq('id', existingProfile.id)
        }
      }

      // ── Subscription upsert (existing logic) ─────────────────────────────
      if (session.mode === 'subscription' && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(
          typeof session.subscription === 'string' ? session.subscription : session.subscription.id
        )
        await upsertSubscription(sub)
      }
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      await upsertSubscription(event.data.object as Stripe.Subscription)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
      await adminClient
        .from('profiles')
        .update({
          subscription_status: 'canceled',
          stripe_subscription_id: null,
          subscription_period_end: null,
          subscription_trial_end: null,
        })
        .eq('stripe_customer_id', customerId)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
      if (customerId) {
        await adminClient
          .from('profiles')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_customer_id', customerId)
      }
      break
    }

    default:
      break
  }

  return NextResponse.json({ received: true })
}
