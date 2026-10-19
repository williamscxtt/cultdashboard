import assert from 'node:assert/strict'
import test from 'node:test'
import { FOUNDER_ACCOUNTS, founderProfileIds, founderOverview, type FounderStatistics } from '../lib/founder-statistics.ts'

test('only exact founder profile identities can load combined statistics', () => {
  const profiles = FOUNDER_ACCOUNTS.map(account => ({ id: account.id, ig_username: account.username }))
  assert.equal(founderProfileIds(FOUNDER_ACCOUNTS[0].id, profiles).length, 2)
  assert.deepEqual(founderProfileIds('another-member', profiles), [])
  assert.equal(founderProfileIds(FOUNDER_ACCOUNTS[0].id, [{ ...profiles[0], ig_username: 'another-account' }, profiles[1]]).length, 1)
})

const sample: FounderStatistics = {
  measuredAt: '2026-10-17T12:00:00Z', viewsReady: true, postsReady: true,
  reels: [
    { reel_id: 'personal', date: '2026-10-01', views: 1000 },
    { reel_id: 'business', date: '2026-10-10', views: 2000 },
    { reel_id: 'business', date: '2026-10-10', views: 2500 },
    { reel_id: 'prior', date: '2026-09-01', views: 500 },
    { reel_id: 'unknown', date: '2026-10-10', views: null },
    { reel_id: 'future', date: '2026-11-01', views: 9999 },
  ],
  posts: [
    { post_id: 'personal', posted_at: '2026-10-01' },
    { post_id: 'business', posted_at: '2026-10-10' },
    { post_id: 'business', posted_at: '2026-10-10' },
    { post_id: 'photo', posted_at: '2026-10-11' },
    { post_id: 'prior', posted_at: '2026-09-01' },
    { post_id: 'future', posted_at: '2026-11-01' },
  ],
}

test('combined cards count both pages once, include feed photos and respect equal current/prior windows', () => {
  const overview = founderOverview(sample, 30)
  assert.equal(overview.views, 3500)
  assert.equal(overview.previousViews, 500)
  assert.equal(overview.posts, 3)
  assert.equal(overview.previousPosts, 1)
  assert.equal(founderOverview(sample, 7).views, 0)
})

test('missing sync and longer incomplete posting histories remain unknown instead of zero', () => {
  assert.equal(founderOverview({ ...sample, viewsReady: false }, 30).views, null)
  assert.equal(founderOverview({ ...sample, postsReady: false }, 30).posts, null)
  assert.equal(founderOverview(sample, 90).posts, null)
  assert.equal(founderOverview({ ...sample, reels: [], posts: [] }, 30).posts, 0)
})
