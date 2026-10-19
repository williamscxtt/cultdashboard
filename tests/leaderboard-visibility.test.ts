import assert from 'node:assert/strict'
import test from 'node:test'
import { buildLeaderboard, visibleLeaderboard } from '../lib/leaderboard.ts'

const now = new Date('2026-10-17T12:00:00Z')
const profile = (id: string) => ({ id, name: id, ig_username: id })
const snapshot = (id: string) => ({ profile_id: id, date: '2026-10-17', count: 100 })
const reel = (id: string, views: number) => ({ profile_id: id, reel_id: id, date: '2026-10-10', views })
const post = (id: string) => ({ profile_id: id, post_id: id, posted_at: '2026-10-10', content_type: 'reel' })
const sync = (username: string) => ({ username, sync_date: '2026-10-17', status: 'succeeded',
  reels_done: true, reel_count: 1, last_error: null, posts_done: true, post_history_complete: true })

test('hides unavailable, restricted, unsynced, zero-view and zero-post creators', () => {
  const ids = ['active', 'zero_views', 'zero_posts', 'missing_posts', 'restricted', 'stale', 'unsynced']
  const data = buildLeaderboard(ids.map(profile), ids.filter(id => !['stale', 'unsynced'].includes(id)).map(snapshot),
    ids.filter(id => id !== 'unsynced').map(id => reel(id, id === 'zero_views' ? 0 : 1000)), '', now,
    ids.filter(id => !['missing_posts', 'unsynced'].includes(id)).map(id => id === 'restricted'
      ? { ...sync(id), status: 'failed', last_error: 'Instagram post data is unavailable (restricted)' } : sync(id)),
    ids.filter(id => !['zero_posts', 'unsynced'].includes(id)).map(post))
  const visible = visibleLeaderboard(data)
  assert.deepEqual(visible.entries.map(entry => entry.username), ['active'])
  assert.equal(visible.entries[0].followerGrowth, null)
  assert.equal(visible.rankedCount, 1)
  assert.equal(visible.connectedCount, 1)
})

test('reranks visible creators and preserves both founders in summary totals without mutating source data', () => {
  const ids = ['leader', 'active', 'willscottbiz', 'williamscxtt']
  const raw = buildLeaderboard(ids.map(profile), ids.map(snapshot), ids.map(id => reel(id, id === 'leader' ? 0 : 1000)), '', now,
    ids.map(sync), [...ids.map(post), ...Array.from({ length: 5 }, (_, index) => ({ ...post('leader'), post_id: `extra-${index}` }))])
  assert.equal(raw.entries[0].username, 'leader')
  const visible = visibleLeaderboard(raw)
  assert.deepEqual(visible.entries.map(entry => [entry.username, entry.rank]), [['active', 1]])
  assert.equal(raw.entries[1].rank, 2)
  assert.equal(visible.entries[0].score, raw.entries[1].score)
  assert.equal(visible.totalViews, 3000)
  assert.equal(visible.totalPosts, 3)
  assert.equal(visible.postsReadyCount, 3)
  assert.equal(visible.totalFollowerGrowth, 0)
})

test('a hidden connected viewer gets no invitation to reconnect and can reappear after valid data arrives', () => {
  const raw = buildLeaderboard([profile('viewer')], [snapshot('viewer')], [reel('viewer', 0)], 'viewer', now, [sync('viewer')], [post('viewer')])
  assert.equal(visibleLeaderboard(raw).viewerExcluded, true)
  const refreshed = buildLeaderboard([profile('viewer')], [snapshot('viewer')], [reel('viewer', 1)], 'viewer', now, [sync('viewer')], [post('viewer')])
  assert.equal(visibleLeaderboard(refreshed).entries[0].rank, 1)
  assert.equal(visibleLeaderboard(refreshed).viewerExcluded, false)
})

test('an empty visible competition retains founder-only summary figures', () => {
  const raw = buildLeaderboard([profile('willscottbiz')], [snapshot('willscottbiz')], [reel('willscottbiz', 1000)], '', now,
    [sync('willscottbiz')], [post('willscottbiz')])
  const visible = visibleLeaderboard(raw)
  assert.deepEqual(visible.entries, [])
  assert.equal(visible.rankedCount, 0)
  assert.equal(visible.totalViews, 1000)
  assert.equal(visible.totalPosts, 1)
})
