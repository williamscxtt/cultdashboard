export type SkoolMembershipEvent = {
  eventType: string
  email: string
  memberId: string | null
  subscriptionId: string | null
  eventId: string | null
  isActive: boolean
}

const ACTIVE_EVENTS = new Set([
  'active',
  'joined',
  'member_joined',
  'new_member',
  'new_paid_member',
  'paid_member',
  'subscription_activated',
  'subscription_created',
])

const INACTIVE_EVENTS = new Set([
  'canceled',
  'cancelled',
  'inactive',
  'member_canceled',
  'member_cancelled',
  'member_removed',
  'removed',
  'subscription_canceled',
  'subscription_cancelled',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function normalizeEventType(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

export function normalizeMemberEmail(value: string): string {
  return value.trim().toLowerCase()
}

function candidateRecords(body: Record<string, unknown>): Record<string, unknown>[] {
  const records = [body]
  for (const key of ['data', 'member', 'customer', 'contact', 'payload']) {
    const nested = body[key]
    if (isRecord(nested)) records.push(nested)
  }
  return records
}

function firstString(records: Record<string, unknown>[], keys: string[]): string {
  const wanted = new Set(keys.map(normalizeKey))

  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      if (!wanted.has(normalizeKey(key))) continue
      if (typeof value === 'string' && value.trim()) return value.trim()
      if (typeof value === 'number') return String(value)
    }
  }

  return ''
}

/**
 * Skool's Zapier trigger is commonly forwarded without a dedicated event field.
 * A secret-authenticated request to this paid-member-only endpoint therefore
 * defaults to an active join when it contains a member email.
 */
export function parseSkoolMembershipEvent(body: unknown): SkoolMembershipEvent | null {
  if (!isRecord(body)) return null

  const records = candidateRecords(body)
  const email = normalizeMemberEmail(firstString(records, [
    'email',
    'email_address',
    'member_email',
    'subscription_email',
    'customer_email',
  ]))

  if (!email) return null

  const rawEventType = firstString(records, [
    'event',
    'event_type',
    'action',
    'status',
    'trigger',
    'type',
  ])
  const eventType = normalizeEventType(rawEventType || 'new_paid_member')

  const isActive = ACTIVE_EVENTS.has(eventType)
  const isInactive = INACTIVE_EVENTS.has(eventType)
  if (!isActive && !isInactive) return null

  return {
    eventType,
    email,
    memberId: firstString(records, ['member_id', 'user_id', 'customer_id']) || null,
    subscriptionId: firstString(records, [
      'subscription_id',
      'transaction_id',
      'payment_id',
    ]) || null,
    eventId: firstString(records, ['event_id', 'id']) || null,
    isActive,
  }
}
