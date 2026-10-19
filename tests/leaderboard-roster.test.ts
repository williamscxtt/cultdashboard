import assert from 'node:assert/strict'
import test from 'node:test'
import { linkedSkoolCreators } from '../lib/leaderboard-roster'
import { buildLeaderboard } from '../lib/leaderboard'

const now = new Date('2026-10-04T12:00:00Z')
const creator = { id: 'skool-member', name: 'Skool Member', ig_username: ' @New.Creator ', is_active: true, excluded: false }

test('a confirmed Skool member can compete without a Dashboard profile or login', () => {
  const profiles = linkedSkoolCreators([creator])
  const data = buildLeaderboard(profiles, [{ profile_id: creator.id, date: '2026-10-04', count: 100 }],
    [{ profile_id: creator.id, reel_id: 'reel', date: '2026-10-03', views: 10000 }], '', now,
    [{ username: 'new.creator', sync_date: '2026-10-04', status: 'succeeded', reels_done: true, reel_count: 1, last_error: null, posts_done: true, post_history_complete: true }],
    [{ profile_id: creator.id, post_id: 'photo', posted_at: '2026-10-03', content_type: 'photo' }])
  assert.equal(data.entries[0].rank, 1)
  assert.equal(data.entries[0].score, 260)
  assert.equal(data.entries[0].followerGrowth, null)
  assert.equal(data.entries[0].isYou, false)
})

test('unconfirmed, inactive and excluded roster records cannot add competitors', () => {
  assert.deepEqual(linkedSkoolCreators([{ ...creator, ig_username: null }, { ...creator, is_active: false },
    { ...creator, excluded: true }, { ...creator, ig_username: 'https://instagram.com/guess' }]), [])
})

test('Skool imports and linked Dashboard accounts merge without doubling posts or views', () => {
  const data = buildLeaderboard([...linkedSkoolCreators([creator]), { id: 'dashboard-member', name: creator.name, ig_username: 'new.creator' }], [],
    ['skool-member', 'dashboard-member'].map(profile_id => ({ profile_id, reel_id: 'same', date: '2026-10-03', views: 1000 })), '', now, [],
    ['skool-member', 'dashboard-member'].map(profile_id => ({ profile_id, post_id: 'same', posted_at: '2026-10-03', content_type: 'reel' })))
  assert.equal(data.connectedCount, 1)
  assert.equal(data.entries[0].views, 1000)
})

test('founder accounts stay excluded when imported from Skool', () => {
  const data = buildLeaderboard(linkedSkoolCreators([{ ...creator, ig_username: 'williamscxtt' },
    { ...creator, id: 'biz', ig_username: 'willscottbiz' }]), [], [], '', now)
  assert.equal(data.connectedCount, 0)
})
