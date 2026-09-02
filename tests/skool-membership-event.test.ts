import assert from 'node:assert/strict'
import test from 'node:test'
import { parseSkoolMembershipEvent } from '../lib/skool-membership-event.ts'

test('accepts the minimal Zapier paid-member payload', () => {
  assert.deepEqual(parseSkoolMembershipEvent({ Email: ' Member@Example.COM ' }), {
    eventType: 'new_paid_member',
    email: 'member@example.com',
    memberId: null,
    subscriptionId: null,
    eventId: null,
    isActive: true,
  })
})

test('accepts nested and human-readable Zapier field names', () => {
  assert.deepEqual(parseSkoolMembershipEvent({
    data: {
      'Member Email': 'person@example.com',
      'Event Type': 'New Paid Member',
      'Member ID': 123,
    },
  }), {
    eventType: 'new_paid_member',
    email: 'person@example.com',
    memberId: '123',
    subscriptionId: null,
    eventId: null,
    isActive: true,
  })
})

test('recognises a cancellation', () => {
  const parsed = parseSkoolMembershipEvent({
    member_email: 'person@example.com',
    action: 'Subscription Cancelled',
  })

  assert.equal(parsed?.isActive, false)
  assert.equal(parsed?.eventType, 'subscription_cancelled')
})

test('rejects a payload without an email or with an unknown event', () => {
  assert.equal(parseSkoolMembershipEvent({ event: 'new_paid_member' }), null)
  assert.equal(parseSkoolMembershipEvent({ email: 'person@example.com', event: 'something_else' }), null)
})
