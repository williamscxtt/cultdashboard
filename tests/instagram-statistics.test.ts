import assert from 'node:assert/strict'
import test from 'node:test'
import {profileFollowers, statisticsReels, statisticsPosts, statisticsJobState, statisticsRetryDelay, statisticsWindow} from '../lib/instagram-statistics.ts'

test('preserves the provider restriction when follower statistics are withheld', () => {
  assert.throws(() => profileFollowers([{username: 'creator', isRestrictedProfile: true, error: 'Restricted profile'}], 'creator'), /\(restricted\)/)
})
test('preserves the provider restriction when reel statistics are withheld', () => {
  assert.throws(() => statisticsReels([{error: 'Restricted profile', isRestrictedProfile: true}], 'creator', '2026-09-03', '2026-10-02'), /\(restricted\)/)
})
test('keeps missing accounts and successful empty windows distinct', () => {
  assert.throws(() => profileFollowers([{username: 'creator', error: 'not_found'}], 'creator'), /\(not_found\)/)
  assert.deepEqual(statisticsReels([{error: 'no_items'}], 'creator', '2026-09-03', '2026-10-02'), [])
})

test('a failed profile lookup does not postpone collection of its running reel scrape', () => {
  const state = statisticsJobState({profile_done:false,reels_done:false,profile_run_id:null,reels_run_id:'saved-paid-run',profile_attempts:1,reels_attempts:1})
  assert.equal(state, 'running')
  assert.equal(statisticsRetryDelay(state, true), 1000)
})
test('retries back off without occupying active actor capacity after runs are collected', () => {
  const state = statisticsJobState({profile_done:false,reels_done:false,profile_run_id:null,reels_run_id:null,profile_attempts:1,reels_attempts:1})
  assert.equal(state, 'queued')
  assert.equal(statisticsRetryDelay(state, true), 300000)
})

test('a saved feed Actor stays resumable after the Reel phase has completed',()=>{
  const job={profile_done:true,reels_done:true,posts_done:false,profile_run_id:null,reels_run_id:'paid-feed-run',profile_attempts:1,reels_attempts:1}
  assert.equal(statisticsJobState(job),'running')
  assert.equal(statisticsJobState({...job,reels_run_id:null,reels_attempts:0}),'queued')
  assert.equal(statisticsJobState({...job,reels_run_id:null,reels_attempts:3}),'failed')
  assert.equal(statisticsJobState({...job,posts_done:true}),'succeeded')
})

test('counts a carousel as one post, keeps recent pinned posts, and rejects unrelated owners',()=>{
  const rows=statisticsPosts([
    {shortCode:'carousel',type:'Sidecar',timestamp:'2026-09-01',ownerUsername:'creator',childPosts:[{id:'child'}]},
    {shortCode:'carousel',type:'Sidecar',timestamp:'2026-09-01',ownerUsername:'creator'},
    {shortCode:'pinned',type:'Video',timestamp:'2026-09-02',ownerUsername:'creator',isPinned:true},
    {shortCode:'wrong',type:'Image',timestamp:'2026-09-03',ownerUsername:'someoneelse'},
    {shortCode:'collaboration',type:'Video',timestamp:'2026-09-03',ownerUsername:'someoneelse',coauthorProducers:[{username:'creator'}]},
    {shortCode:'old',type:'Image',timestamp:'2026-07-01',ownerUsername:'creator'},
  ],'creator',statisticsWindow('2026-10-03',60),'2026-10-03')
  assert.deepEqual(rows.map(p=>p.post_id),['carousel','pinned','collaboration'])
  assert.deepEqual(rows.map(p=>p.content_type),['carousel','reel','reel'])
})

test('a failed post lookup is not an empty month and an empty window stays valid',()=>{
  assert.throws(()=>statisticsPosts([{error:'not_found'}],'creator','2026-08-01','2026-10-03'),/not_found/)
  assert.deepEqual(statisticsPosts([{error:'no_items'}],'creator','2026-08-01','2026-10-03'),[])
})
