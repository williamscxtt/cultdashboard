import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { applyMembershipToProfiles, type MembershipAccessUpdates } from '@/lib/membership-sync'
import { parseSkoolMembershipEvent } from '@/lib/skool-membership-event'

export const runtime = 'nodejs'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

function secretsMatch(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received)
  const expectedBuffer = Buffer.from(expected)
  if (receivedBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(receivedBuffer, expectedBuffer)
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now()
  const requestId = req.headers.get('x-vercel-id')
  const secret = process.env.SKOOL_WEBHOOK_SECRET
  if (!secret) {
    console.error(JSON.stringify({ level: 'error', message: 'Skool membership sync not configured', requestId }))
    return NextResponse.json({ error: 'Membership sync not configured' }, { status: 503 })
  }

  const authorization = req.headers.get('authorization') ?? ''
  const receivedSecret = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : req.headers.get('x-skool-webhook-secret') ?? ''

  if (!secretsMatch(receivedSecret, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null) as unknown
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const membershipEvent = parseSkoolMembershipEvent(body)
  if (!membershipEvent) {
    return NextResponse.json({ error: 'A supported membership event and member email are required' }, { status: 400 })
  }

  const status = membershipEvent.isActive ? 'active' : 'canceled'
  const entitlement = {
    email: membershipEvent.email,
    provider: 'skool',
    external_customer_id: membershipEvent.memberId,
    external_subscription_id: membershipEvent.subscriptionId,
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

  const accessUpdates: MembershipAccessUpdates = {
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
    is_active: membershipEvent.isActive,
  }

  let profilesUpdated = 0
  try {
    profilesUpdated = await applyMembershipToProfiles(membershipEvent.email, accessUpdates)
  } catch (profileError) {
    console.error(JSON.stringify({
      level: 'error', message: 'Skool profile sync failed', requestId,
      error: profileError instanceof Error ? profileError.message : String(profileError),
      durationMs: Date.now() - startedAt,
    }))
    return NextResponse.json({ error: 'Failed to sync profile' }, { status: 500 })
  }

  if (membershipEvent.eventId || membershipEvent.subscriptionId) {
    await admin.from('billing_events').upsert({
      event_id: membershipEvent.eventId ?? `${membershipEvent.eventType}:${membershipEvent.subscriptionId}`,
      provider: 'skool',
      event_type: membershipEvent.eventType,
    }, { onConflict: 'event_id', ignoreDuplicates: true })
  }

  console.log(JSON.stringify({
    level: 'info', message: 'Skool membership synced', requestId,
    eventType: membershipEvent.eventType,
    access: membershipEvent.isActive ? 'granted' : 'revoked',
    profilesUpdated,
    durationMs: Date.now() - startedAt,
  }))

  return NextResponse.json({
    received: true,
    access: membershipEvent.isActive ? 'granted' : 'revoked',
    profilesUpdated,
  })
}
