import assert from 'node:assert/strict'
import test from 'node:test'
import { activityInsight } from '../lib/leaderboard-activity.ts'
import type { LeaderboardEntry } from '../lib/leaderboard.ts'

const base = { username:'jun',name:'Jun',postCount:163,previousPostCount:96,activeDays:28,postTypes:{reel:163},topReelShare:0.02,views:347717,reelCount:163 } as unknown as LeaderboardEntry
test('increased output explains its measured breadth and gives an actionable experiment',()=>{
  const insight=activityInsight(base,[base])
  assert.match(insight.text,/163 feed posts across 28 days/)
  assert.match(insight.text,/up 67/)
  assert.match(insight.text,/2%/)
  assert.match(insight.takeaway,/weekly output target/)
})
test('stronger reach per Reel is compared with both leaders, without inventing content topics',()=>{
  const leader={...base,username:'steffen',name:'Steffen',views:1078340,reelCount:138,postCount:142,previousPostCount:523,topReelShare:0.05}
  const insight=activityInsight(leader,[base,leader])
  assert.match(insight.title,/reach from each Reel/)
  assert.match(insight.text,/7,814 recorded views/)
  assert.match(insight.text,/3.7 times Jun’s average/)
  assert.match(insight.takeaway,/repeated audience problem/)
  assert.doesNotMatch(insight.text,/training|diet|hook|caused|converting/)
})
test('a concentrated view total does not become a claim about success across the feed',()=>{
  const insight=activityInsight({...base,topReelShare:0.8},[base])
  assert.match(insight.text,/80%/)
  assert.match(insight.title,/One Reel/)
  assert.match(insight.takeaway,/ordinary post/)
})
test('zero and unavailable posting histories do not generate false positive posting claims',()=>{
  const empty=activityInsight({...base,postCount:0,previousPostCount:0,activeDays:0,topReelShare:null,views:0,reelCount:0},[])
  assert.match(empty.text,/0 feed posts/)
  assert.doesNotMatch(empty.title,/bigger|rhythm/)
  const pending=activityInsight({...base,postCount:null},[])
  assert.match(pending.title,/incomplete/)
})
