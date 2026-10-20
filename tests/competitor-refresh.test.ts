import assert from 'node:assert/strict'
import test from 'node:test'
import { competitorUsername, uniqueCompetitorPosts, competitorReelRow } from '../lib/competitor-refresh.ts'

test('competitor input accepts profile links and handles without forwarding invalid provider input', () => {
  assert.equal(competitorUsername(' @ZaneWhelanFitness '), 'zanewhelanfitness')
  assert.equal(competitorUsername('https://www.instagram.com/zane.whelan/?igsh=fixture'), 'zane.whelan')
  for (const input of [null, 12, 'https://evil.example/instagram.com/zane', 'zane/anything', 'https://instagram.com/reel/abc/', 'bad name']) {
    assert.equal(competitorUsername(input), null)
  }
})

test('duplicate and overlapping provider results produce one current row per Reel', () => {
  const posts = uniqueCompetitorPosts([
    { ownerUsername: 'Creator.One', shortCode: 'collab', timestamp: '2026-10-20T10:00:00Z', videoPlayCount: 50 },
    { ownerUsername: 'creator.two', shortCode: 'collab', timestamp: '2026-10-20T10:00:00Z', videoPlayCount: 60 },
    { ownerUsername: 'creator.one', shortCode: 'old', timestamp: '2026-10-01T10:00:00Z' },
    { ownerUsername: 'creator.one', shortCode: 'invalid', timestamp: 'bad-date' },
    { ownerUsername: 'untracked', shortCode: 'foreign' },
    { ownerUsername: 'creator.one', shortCode: 'recent', timestamp: '2026-10-18T10:00:00Z' },
  ], ['creator.one', 'creator.two'], '2026-10-13')
  assert.deepEqual(posts.map(post => post.shortCode), ['collab', 'recent'])
  assert.equal(posts[0].videoPlayCount, 60)
})

test('refresh rows retain saved transcripts, hooks, captions and row identity on conflict', () => {
  const row = competitorReelRow({ ownerUsername: 'creator.one', shortCode: 'existing', videoPlayCount: 0,
    videoViewCount: 900, caption: 'Not a spoken hook', timestamp: '2026-10-20T10:00:00Z' }, 'tutorial', '2026-10-W43', '2026-10-20')
  assert.equal(row.views, 0)
  for (const key of ['id', 'transcript', 'hook', 'caption', 'created_at', 'profile_id']) assert.ok(!(key in row))
  const saved = { id: 'saved-id', transcript: 'Full source transcript', hook: 'Spoken hook', caption: 'Saved caption', format_type: 'tutorial' }
  const refreshed = { ...saved, ...row }
  assert.equal(refreshed.transcript, saved.transcript)
  assert.equal(refreshed.id, saved.id)
})
