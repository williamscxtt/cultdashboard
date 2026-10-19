import assert from 'node:assert/strict'
import test from 'node:test'
import { buildLeaderboard } from '../lib/leaderboard.ts'
import { insightFingerprint, leaderboardInsightFacts, validateLeaderboardInsights } from '../lib/leaderboard-insight-model.ts'
const now=new Date('2026-10-03T10:00:00Z')
const data=buildLeaderboard([{id:'a',name:'Creator',ig_username:'creator'}],[{profile_id:'a',date:'2026-10-02',count:100},{profile_id:'a',date:'2026-10-03',count:105}],[{profile_id:'a',reel_id:'one',date:'2026-10-02',views:1000}],'',now)
test('insight facts exclude partial follower gains and attributed conversion',()=>{
  const facts=leaderboardInsightFacts(data)[0]
  assert.equal(facts.monthlyNetFollowers,null)
  assert.equal(facts.followerHistoryComplete,false)
  assert.equal(facts.largestReelShareOfViews,1)
  assert.equal('name' in facts,false)
  assert.equal('rank' in facts,false)
})
test('rejects creator mismatches, invented figures and causal claims',()=>{
  for(const item of [{username:'someoneelse',title:'Activity',text:'Keep publishing.'},{username:'creator',title:'Activity',text:'Views doubled.'},{username:'creator',title:'Activity',text:'You gained 100 followers.'},{username:'creator',title:'Conversion',text:'The content is converting well.'}]) assert.throws(()=>validateLeaderboardInsights([{...item,takeaway:'Compare the strongest Reel with a routine post and test a new opening.'}],data))
})
test('accepts a measured-pattern insight and fingerprints its actual source metrics',()=>{
  const items=validateLeaderboardInsights([{username:'creator',title:'A standout Reel',text:'Most of the recorded reach is concentrated in a standout Reel. That post is worth studying before treating the whole feed as a repeatable success.',takeaway:'Compare the strongest Reel with a routine post. Test its useful idea with a fresh example and opening.'}],data)
  assert.equal(items[0].username,'creator')
  const changed={...data,entries:data.entries.map(e=>({...e,views:e.views!+1}))}
  assert.notEqual(insightFingerprint(data),insightFingerprint(changed))
})
test('rejects generic advice and an absent, empty or slogan-only takeaway',()=>{
  const measured={username:'creator',title:'A standout Reel',text:'Most recorded reach comes from a single post worth comparing with the routine posts.'}
  for(const takeaway of [undefined,'','Keep publishing.','Keep posting and stay consistent with content and eventually the results will come.']) assert.throws(()=>validateLeaderboardInsights([{...measured,takeaway}],data))
  assert.throws(()=>validateLeaderboardInsights([{...measured,text:'Keep publishing and stay consistent.',takeaway:'Compare the strongest Reel with a routine post and test a fresh opening.'}],data))
})
test('checks unsupported follower claims in the practical takeaway as well as analysis',()=>{
  assert.throws(()=>validateLeaderboardInsights([{username:'creator',title:'Repeatable reach',text:'The strongest Reel is a useful example to study.',takeaway:'Use this successful format to convert your audience into followers every time you publish.'}],data))
})
test('rejects giving multiple creators the same practical takeaway',()=>{
  const multiple={...data,entries:[data.entries[0],{...data.entries[0],username:'another',rank:2}]}
  const takeaway='Compare the strongest Reel with a routine post and test a new opening.'
  assert.throws(()=>validateLeaderboardInsights(['creator','another'].map(username=>({username,title:'A useful example',text:'The strongest post is worth comparing with routine posts.',takeaway})),multiple))
})
