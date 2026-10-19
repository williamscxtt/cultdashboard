import assert from 'node:assert/strict'
import test from 'node:test'
import { signupInput } from '../lib/signup-input.ts'

const member = { name: ' New Creator ', email: ' NEW@example.com ', password: 'a-valid-password' }

test('an Instagram handle is required before account creation can proceed', () => {
  for (const ig_username of [undefined, null, '', '  ', '@', 'https://instagram.com/creator', 'two handles', 'x'.repeat(31), 123]) {
    assert.ok(signupInput({ ...member, ig_username }).error)
  }
  assert.ok(signupInput(null).error)
})

test('signup preserves the member input while saving one canonical Instagram identity', () => {
  assert.deepEqual(signupInput({ ...member, ig_username: ' @New.Creator_ ' }), {
    data: { name: 'New Creator', email: 'new@example.com', password: member.password, ig_username: 'new.creator_' },
  })
})

test('valid handles do not bypass the required email and password', () => {
  assert.ok(signupInput({ ig_username: 'creator' }).error)
  assert.ok(signupInput({ ...member, ig_username: 'creator', password: 'short' }).error)
})
