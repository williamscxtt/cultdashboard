import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

type CommasEventData = {
  event_type?: string
  amount?: number
  currency?: string
  buyer?: { id?: string; email?: string; name?: string }
  item?: { id?: string; title?: string; type?: string }
  subscription?: {
    id?: string
    status?: string
    payment_frequency?: string
    end_date?: string | null
  }
}

type CommasEvent = {
  id?: string
  type?: string
  data?: CommasEventData
  event_type?: string
} & CommasEventData

const SUPPORTED_EVENTS = new Set([
  'subscription.created',
  'subscription.renewed',
  'subscription.recovered',
  'subscription.past_due',
  'subscription.canceled',
  'subscription.completed',
])

function validSignature(rawBody: string, signature: string, secret: string): boolean {
  if (!/^[a-f\d]{64}$/i.test(signature)) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
}

function isCreatorCultProduct(item: CommasEventData['item']): boolean {
  const configuredIds = (process.env.COMMAS_CREATOR_CULT_PRODUCT_IDS ?? '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)

  if (configuredIds.length > 0) return !!item?.id && configuredIds.includes(item.id)
  return item?.title?.toLowerCase().includes('creator cult') ?? false
}

function normalizeStatus(eventType: string): 'active' | 'past_due' | 'canceled' {
  if (eventType === 'subscription.past_due') return 'past_due'
  if (eventType === 'subscription.canceled' || eventType === 'subscription.completed') return 'canceled'
  return 'active'
}

export async function POST(req: NextRequest) {
  const secret = process.env.COMMAS_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })

  const rawBody = await req.text()
  const signature = req.headers.get('x-webhook-signature') ?? ''
  if (!validSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: CommasEvent
  try {
    event = JSON.parse(rawBody) as CommasEvent
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Commas test events are flat; real deliveries use the { id, type, data } envelope.
  const data = event.data ?? event
  const eventType = event.type ?? event.event_type ?? data.event_type
  if (!eventType || !SUPPORTED_EVENTS.has(eventType)) {
    return NextResponse.json({ received: true, ignored: 'unsupported_event' })
  }

  if (!isCreatorCultProduct(data.item)) {
    return NextResponse.json({ received: true, ignored: 'different_product' })
  }

  const email = data.buyer?.email?.trim().toLowerCase()
  if (!email) return NextResponse.json({ received: true, ignored: 'missing_email' })

  if (event.id) {
    const { data: duplicate } = await admin
      .from('billing_events')
      .select('event_id')
      .eq('event_id', event.id)
      .maybeSingle()
    if (duplicate) return NextResponse.json({ received: true, duplicate: true })
  }

  const status = normalizeStatus(eventType)
  const paymentFrequency = data.subscription?.payment_frequency?.toLowerCase()
  const planType = paymentFrequency?.includes('6') ? 'biannual' : 'monthly'
  const amount = typeof data.amount === 'number' ? Math.round(data.amount * 100) : null
  const periodEnd = data.subscription?.end_date ?? null

  const entitlement = {
    email,
    provider: 'commas',
    external_customer_id: data.buyer?.id ?? null,
    external_subscription_id: data.subscription?.id ?? null,
    status,
    plan_type: planType,
    amount,
    currency: data.currency?.toUpperCase() ?? null,
    period_end: periodEnd,
    updated_at: new Date().toISOString(),
  }

  const { error: entitlementError } = await admin
    .from('member_entitlements')
    .upsert(entitlement, { onConflict: 'email' })

  if (entitlementError) {
    console.error('[commas webhook] entitlement update failed:', entitlementError)
    return NextResponse.json({ error: 'Failed to sync membership' }, { status: 500 })
  }

  const { error: profileError } = await admin
    .from('profiles')
    .update({
      membership_tier: 'creator_cult',
      billing_provider: 'commas',
      external_customer_id: entitlement.external_customer_id,
      external_subscription_id: entitlement.external_subscription_id,
      subscription_status: status,
      subscription_period_end: periodEnd,
      plan_type: planType,
      subscription_amount: amount,
      subscription_currency: entitlement.currency,
      is_active: true,
    })
    .eq('email', email)

  if (profileError) {
    console.error('[commas webhook] profile update failed:', profileError)
    return NextResponse.json({ error: 'Failed to sync profile' }, { status: 500 })
  }

  if (event.id) {
    await admin.from('billing_events').insert({
      event_id: event.id,
      provider: 'commas',
      event_type: eventType,
    })
  }

  return NextResponse.json({ received: true })
}
