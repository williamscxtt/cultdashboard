import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

type SkoolMembershipEvent = {
  event?: string
  event_type?: string
  action?: string
  email?: string
  member_email?: string
  member_id?: string
  transaction_id?: string
  event_id?: string
}

const ACTIVE_EVENTS = new Set(['member_joined', 'new_paid_member', 'active'])
const INACTIVE_EVENTS = new Set(['member_removed', 'member_canceled', 'member_cancelled', 'canceled', 'cancelled'])

function secretsMatch(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received)
  const expectedBuffer = Buffer.from(expected)
  if (receivedBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(receivedBuffer, expectedBuffer)
}

export async function POST(req: NextRequest) {
  const secret = process.env.SKOOL_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Membership sync not configured' }, { status: 503 })

  const authorization = req.headers.get('authorization') ?? ''
  const receivedSecret = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : req.headers.get('x-skool-webhook-secret') ?? ''

  if (!secretsMatch(receivedSecret, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null) as SkoolMembershipEvent | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const eventType = (body.event ?? body.event_type ?? body.action ?? '').trim().toLowerCase()
  const isActive = ACTIVE_EVENTS.has(eventType)
  const isInactive = INACTIVE_EVENTS.has(eventType)
  if (!isActive && !isInactive) {
    return NextResponse.json({ error: 'Unsupported membership event' }, { status: 400 })
  }

  const email = (body.email ?? body.member_email ?? '').trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'Member email is required' }, { status: 400 })

  const status = isActive ? 'active' : 'canceled'
  const entitlement = {
    email,
    provider: 'skool',
    external_customer_id: body.member_id ?? null,
    external_subscription_id: body.transaction_id ?? null,
    status,
    plan_type: 'monthly',
    amount: null,
    currency: null,
    period_end: null,
    updated_at: new Date().toISOString(),
  }

  const { error: entitlementError } = await admin
    .from('member_entitlements')
    .upsert(entitlement, { onConflict: 'email' })

  if (entitlementError) {
    console.error('[skool membership] entitlement update failed:', entitlementError)
    return NextResponse.json({ error: 'Failed to sync membership' }, { status: 500 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id, access_type')
    .eq('email', email)
    .maybeSingle()

  // Original Creator Cult members retain lifetime access even if they later
  // leave the Skool community.
  if (profile && profile.access_type !== 'legacy_lifetime') {
    const { error: profileError } = await admin
      .from('profiles')
      .update({
        membership_tier: 'creator_cult',
        access_type: 'skool_subscription',
        billing_provider: 'skool',
        external_customer_id: entitlement.external_customer_id,
        external_subscription_id: entitlement.external_subscription_id,
        subscription_status: status,
        subscription_period_end: null,
        plan_type: 'monthly',
        subscription_amount: null,
        subscription_currency: null,
        is_active: isActive,
      })
      .eq('id', profile.id)

    if (profileError) {
      console.error('[skool membership] profile update failed:', profileError)
      return NextResponse.json({ error: 'Failed to sync profile' }, { status: 500 })
    }
  }

  if (body.event_id || body.transaction_id) {
    await admin.from('billing_events').upsert({
      event_id: body.event_id ?? `${eventType}:${body.transaction_id}`,
      provider: 'skool',
      event_type: eventType,
    }, { onConflict: 'event_id', ignoreDuplicates: true })
  }

  return NextResponse.json({ received: true, access: isActive ? 'granted' : 'revoked' })
}
