import assert from 'node:assert/strict'
import test from 'node:test'
import { buildLeaderboard, type LeaderboardProfile, type LeaderboardSnapshot, type LeaderboardReel } from '../lib/leaderboard.ts'

const now = new Date('2026-10-02T12:00:00Z')
const profile = (id: string, username = id): LeaderboardProfile => ({ id, name: `Creator ${id}`, ig_username: username })
const history = (id: string, from: number, to: number): LeaderboardSnapshot[] => [
  { profile_id: id, date: '2026-09-02', count: from },
  { profile_id: id, date: '2026-10-02', count: to },
]
const reel = (id: string, views: number | null, date = '2026-09-20', reelId = id): LeaderboardReel => ({ profile_id: id, reel_id: reelId, views, date })

test('scores absolute follower gains and view volume without percentile compression', () => {
  const data = buildLeaderboard([profile('small'), profile('large')], [...history('small', 100, 120), ...history('large', 10_000, 10_100)], [reel('small', 1000), reel('large', 10_000)], 'small', now)
  const small = data.entries.find(entry => entry.username === 'small')!
  const large = data.entries.find(entry => entry.username === 'large')!
  assert.equal(small.growthPoints, 30)
  assert.equal(small.viewPoints, 1)
  assert.equal(small.score, 31)
  assert.equal(large.score, 160)
  assert.equal(large.rank, 1)
  assert.equal(small.isYou, true)
  assert.equal(data.windowStart, '2026-09-03')
})

test('excludes old and future reels and keeps zero recorded views distinct from missing views', () => {
  const data = buildLeaderboard([profile('a'), profile('b')], [...history('a', 100, 110), ...history('b', 100, 110)], [reel('a', 0), reel('a', 9000, '2026-09-01', 'old'), reel('a', 9000, '2026-10-03', 'future'), reel('b', null)], '', now)
  assert.equal(data.entries.find(entry => entry.username === 'a')!.views, 0)
  assert.equal(data.entries.find(entry => entry.username === 'a')!.rank, 1)
  assert.equal(data.entries.find(entry => entry.username === 'b')!.views, null)
  assert.equal(data.entries.find(entry => entry.username === 'b')!.rank, null)
})

test('ranks measured views while monthly history builds and rejects stale profiles', () => {
  const data = buildLeaderboard([profile('new'), profile('zero'), profile('stale')], [
    { profile_id: 'new', date: '2026-10-02', count: 500 },
    ...history('zero', 0, 5),
    { profile_id: 'stale', date: '2026-09-03', count: 100 },
    { profile_id: 'stale', date: '2026-09-20', count: 200 },
  ], [reel('new', 1000), reel('zero', 1000), reel('stale', 1000)], '', now)
  assert.equal(data.rankedCount, 2)
  assert.equal(data.entries.find(entry => entry.username === 'new')!.followerGrowth, null)
  assert.equal(data.entries.find(entry => entry.username === 'zero')!.growthPercent, null)
  assert.equal(data.entries.find(entry => entry.username === 'stale')!.status, 'needs_sync')
})

test('deduplicates the same linked account and reel across imported profiles', () => {
  const data = buildLeaderboard([profile('a', '@Same.Creator'), profile('b', 'same.creator')], [...history('a', 100, 110), ...history('b', 100, 110)], [reel('a', 1000, undefined, 'same-reel'), reel('b', 1200, undefined, 'same-reel')], 'b', now)
  assert.equal(data.connectedCount, 1)
  assert.equal(data.entries[0].views, 1200)
  assert.equal(data.entries[0].reelCount, 1)
  assert.equal(data.entries[0].isYou, true)
})

test('shows net follower loss but gives it no growth points', () => {
  const data = buildLeaderboard([profile('a')], history('a', 100, 90), [reel('a', 500)], '', now)
  assert.equal(data.entries[0].followerGrowth, -10)
  assert.equal(data.entries[0].growthPercent, -10)
  assert.equal(data.entries[0].growthPoints, 0)
  assert.equal(data.entries[0].score, 0.5)
  assert.equal(data.totalFollowerGrowth, -10)
})

test('uses an available monthly baseline but labels a shorter tracked history accurately', () => {
  const data = buildLeaderboard([profile('a')], [
    { profile_id: 'a', date: '2026-08-01', count: 1 },
    { profile_id: 'a', date: '2026-09-01', count: 1 },
    { profile_id: 'a', date: '2026-09-17', count: 100 },
    { profile_id: 'a', date: '2026-10-02', count: 120 },
    { profile_id: 'a', date: '2026-10-03', count: 9999 },
  ], [reel('a', 500)], '', now)
  assert.equal(data.entries[0].followerGrowth, null)
  assert.equal(data.entries[0].observedFollowerGrowth, 20)
  assert.equal(data.entries[0].trackedDays, 15)
  assert.equal(data.entries[0].lastSynced, '2026-10-02')
})

test('equal metrics get equal points and ordering stays deterministic', () => {
  const data = buildLeaderboard([profile('b'), profile('a')], [...history('b', 100, 110), ...history('a', 100, 110)], [reel('b', 500), reel('a', 500)], '', now)
  assert.equal(data.entries[0].username, 'a')
  assert.equal(data.entries[0].score, data.entries[1].score)
  assert.equal(data.entries[0].score, 15.5)
})

test('handles an empty leaderboard without invalid scores', () => {
  assert.deepEqual(buildLeaderboard([], [], [], '', now).entries, [])
})

const sync = (username: string, status = 'succeeded', reelCount: number | null = 0, error: string | null = null) => ({
  username, sync_date: '2026-10-02', status, reels_done: status === 'succeeded', reel_count: reelCount, last_error: error,
})

test('keeps both founder accounts out of rankings while including their posts and views in the summary', () => {
  const profiles = [profile('personal', ' @WilliamsCxtt '), profile('alias', 'williamscxtt'), profile('business', 'WillScottBiz'), profile('member')]
  const snapshots = profiles.flatMap(p => history(p.id, 100, p.id === 'member' ? 110 : 100_000))
  const reels = profiles.map(p => reel(p.id, p.id === 'member' ? 1000 : 24_000_000))
  const syncs = profiles.map(p => ({ ...sync(p.ig_username!.trim().replace(/^@/, '').toLowerCase()), posts_done: true, post_history_complete: true }))
  const posts = profiles.map(p => ({ profile_id: p.id, post_id: p.id, posted_at: '2026-09-20T12:00:00Z', content_type: 'reel' }))
  const data = buildLeaderboard(profiles, snapshots, reels, 'alias', now, syncs, posts)
  assert.deepEqual(data.entries.map(e => e.username), ['member'])
  assert.equal(data.entries[0].rank, 1)
  assert.equal(data.entries[0].score, 266)
  assert.equal(data.connectedCount, 1)
  assert.equal(data.rankedCount, 1)
  assert.equal(data.totalViews, 72_001_000)
  assert.equal(data.totalFollowerGrowth, 10)
  assert.equal(data.totalPosts, 4)
  assert.equal(data.postsReadyCount, 3)
  assert.equal(data.growthReadyCount, 1)
  assert.equal(data.viewerExcluded, true)
  assert.equal(buildLeaderboard(profiles, snapshots, reels, 'member', now, syncs, posts).viewerExcluded, false)
})

test('deduplicates business aliases in the summary without creating a founder score or monthly growth', () => {
  const profiles = [profile('business', 'willscottbiz'), profile('alias', ' @WillScottBiz ')]
  const data = buildLeaderboard(profiles, profiles.flatMap(p => history(p.id, 100, 1000)),
    [reel('business', 500, undefined, 'same'), reel('alias', 700, undefined, 'same')], 'business', now,
    [{ ...sync('willscottbiz'), posts_done: true, post_history_complete: true }],
    profiles.map(p => ({ profile_id: p.id, post_id: 'same', posted_at: '2026-09-20', content_type: 'reel' })))
  assert.deepEqual(data.entries, [])
  assert.equal(data.connectedCount, 0)
  assert.equal(data.rankedCount, 0)
  assert.equal(data.totalFollowerGrowth, 0)
  assert.equal(data.growthReadyCount, 0)
  assert.equal(data.totalViews, 700)
  assert.equal(data.totalPosts, 1)
  assert.equal(data.viewerExcluded, true)
})

test('ranks a confirmed empty reel window without converting missing data to zero', () => {
  const data = buildLeaderboard([profile('empty'), profile('missing')], [...history('empty', 100, 110), ...history('missing', 100, 110)], [], '', now, [sync('empty')])
  assert.equal(data.entries.find(entry => entry.username === 'empty')!.views, 0)
  assert.equal(data.entries.find(entry => entry.username === 'empty')!.rank, 1)
  assert.equal(data.entries.find(entry => entry.username === 'missing')!.views, null)
  assert.equal(data.entries.find(entry => entry.username === 'missing')!.rank, null)
})

test('shows unavailable handles, failed syncs and active syncs separately from follower history', () => {
  const data = buildLeaderboard([profile('unavailable'), profile('failed'), profile('active'), profile('new')], [{ profile_id: 'new', date: '2026-10-02', count: 100 }], [], '', now, [
    sync('unavailable', 'failed', null, 'Instagram profile did not return a valid follower count (not_found)'),
    sync('failed', 'failed', null, 'Apify request failed (HTTP 502)'),
    sync('active', 'running', null), sync('new'),
  ])
  assert.equal(data.entries.find(entry => entry.username === 'unavailable')!.syncIssue, 'account_unavailable')
  assert.equal(data.entries.find(entry => entry.username === 'failed')!.status, 'sync_failed')
  assert.equal(data.entries.find(entry => entry.username === 'active')!.status, 'syncing')
  assert.equal(data.entries.find(entry => entry.username === 'new')!.status, 'ranked')
})

test('uses the latest sync status and rejects stale or future empty-window proofs', () => {
  const jobs = [sync('a'), {...sync('a', 'failed', null, 'Temporary failure'), sync_date: '2026-10-01'},
    {...sync('stale'), sync_date: '2026-09-20'}, {...sync('future'), sync_date: '2026-10-03'}]
  const data = buildLeaderboard([profile('a'), profile('stale'), profile('future')], [...history('a', 100, 110), ...history('stale', 100, 110), ...history('future', 100, 110)], [], '', now, jobs)
  assert.equal(data.entries.find(entry => entry.username === 'a')!.rank, 1)
  assert.equal(data.entries.find(entry => entry.username === 'a')!.syncIssue, null)
  assert.equal(data.entries.find(entry => entry.username === 'stale')!.views, null)
  assert.equal(data.entries.find(entry => entry.username === 'future')!.views, null)
})

test('short follower changes stay separate from monthly scoring', () => {
  const first = {profile_id: 'new', date: '2026-10-01', count: 100}
  const latest = {profile_id: 'new', date: '2026-10-02', count: 105}
  assert.equal(buildLeaderboard([profile('new')], [first], [reel('new', 500)], '', now).rankedCount, 1)
  const data = buildLeaderboard([profile('new')], [first, latest], [reel('new', 500)], '', now)
  assert.equal(data.rankedCount, 1)
  assert.equal(data.entries[0].followerGrowth, null)
  assert.equal(data.entries[0].observedFollowerGrowth, 5)
  assert.equal(data.entries[0].growthPoints, 0)
  assert.equal(data.entries[0].trackedDays, 1)
})

test('identifies Instagram restrictions separately from a missing handle', () => {
  const data = buildLeaderboard([profile('restricted')], [], [], '', now, [sync('restricted', 'failed', null, 'Instagram profile did not return a valid follower count (restricted)')])
  assert.equal(data.entries[0].syncIssue, 'account_restricted')
  assert.equal(data.entries[0].rank, null)
})

test('ranks two measured zero follower counts with no growth points', () => {
  const data = buildLeaderboard([profile('empty')], history('empty', 0, 0), [], '', now, [sync('empty')])
  assert.equal(data.rankedCount, 1)
  assert.equal(data.entries[0].followerGrowth, 0)
  assert.equal(data.entries[0].growthPoints, 0)
  assert.equal(data.entries[0].score, 0)
})

const post = (id: string, code: string, posted_at = '2026-09-20T10:00:00Z', content_type = 'reel') => ({ profile_id: id, post_id: code, posted_at, content_type })
const postsSync = (username: string) => ({ ...sync(username), posts_done: true, post_history_complete: true })

test('a large view lead survives follower loss using the same formula for everyone', () => {
  const data = buildLeaderboard([profile('reach'), profile('growth')], [...history('reach', 1000000, 999000), ...history('growth', 10000, 11000)], [reel('reach', 24500000), reel('growth', 5000000)], '', now)
  assert.equal(data.entries[0].username, 'reach')
  assert.equal(data.entries[0].score, 24500)
  assert.equal(data.entries[1].growthPoints, 1500)
  assert.equal(data.entries[1].score, 6500)
})

test('publishing more earns points even with equal audience results', () => {
  const data = buildLeaderboard([profile('active'), profile('quiet')], [...history('active',100,100),...history('quiet',100,100)], [reel('active',1000),reel('quiet',1000)], '', now, [postsSync('active'),postsSync('quiet')], [post('active','one'),post('active','two'),post('quiet','one')])
  assert.equal(data.entries[0].username, 'active')
  assert.equal(data.entries[0].postCount, 2)
  assert.equal(data.entries[0].postingPoints, 500)
  assert.equal(data.entries[0].score - data.entries[1].score, 250)
})

test('counts feed formats once and compares equal non-overlapping posting windows', () => {
  const data = buildLeaderboard([profile('a','shared'),profile('b','shared')], history('a',100,100), [reel('a',1000)], '', now, [postsSync('shared')], [
    post('a','carousel','2026-09-03T00:00:00Z','carousel'),post('b','carousel','2026-09-03T00:00:00Z','carousel'),
    post('a','photo','2026-09-03T01:00:00Z','photo'),post('a','reel'),
    post('a','previous-last','2026-09-02T23:59:59Z'),post('a','previous-first','2026-08-04T00:00:00Z'),
    post('a','too-old','2026-08-03T23:59:59Z'),post('a','future','2026-10-02T15:00:00Z'),
  ])
  assert.equal(data.entries[0].postCount,3)
  assert.equal(data.entries[0].previousPostCount,2)
  assert.equal(data.entries[0].activeDays,2)
  assert.deepEqual(data.entries[0].postTypes,{carousel:1,photo:1,reel:1})
})

test('partial post collections do not masquerade as complete counts or earn posting points', () => {
  const data = buildLeaderboard([profile('a')],history('a',100,100),[reel('a',1000)],'',now,[{...postsSync('a'),post_history_complete:false}],[post('a','one')])
  assert.equal(data.entries[0].postCount,null)
  assert.equal(data.entries[0].previousPostCount,null)
  assert.equal(data.entries[0].postingPoints,0)
  assert.equal(data.entries[0].score,1)
})

test('a complete empty post history is a measured zero', () => {
  const data=buildLeaderboard([profile('a')],history('a',100,100),[],'',now,[postsSync('a')])
  assert.equal(data.entries[0].postCount,0)
  assert.equal(data.entries[0].previousPostCount,0)
  assert.equal(data.postsReadyCount,1)
})

test('a 29-day follower interval remains observed rather than monthly', () => {
  const data=buildLeaderboard([profile('a')],[{profile_id:'a',date:'2026-09-03',count:100},{profile_id:'a',date:'2026-10-02',count:1100}],[reel('a',1000)],'',now)
  assert.equal(data.entries[0].trackedDays,29)
  assert.equal(data.entries[0].observedFollowerGrowth,1000)
  assert.equal(data.entries[0].followerGrowth,null)
  assert.equal(data.entries[0].growthPoints,0)
  assert.equal(data.growthReadyCount,0)
})

test('absolute follower gains from a zero baseline have valid monthly points without an invented percentage',()=>{
  const data=buildLeaderboard([profile('a')],history('a',0,10),[reel('a',1000)],'',now)
  assert.equal(data.entries[0].followerGrowth,10)
  assert.equal(data.entries[0].growthPercent,null)
  assert.equal(data.entries[0].growthPoints,15)
  assert.equal(data.growthReadyCount,1)
})
