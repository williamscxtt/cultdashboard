import test from 'node:test'
import assert from 'node:assert/strict'
import {weeklyWindow,weeklyEvidence,weeklyFallback,analysisSections,cachedWeeklyAnalysis,weeklyCommentary,weeklyFactLead} from './weekly-analysis.ts'
const now=new Date('2026-10-08T15:00:00Z')
const sync={status:'succeeded',completed_at:'2026-10-08T14:35:00Z',posts_done:true,post_history_complete:true}
const reel=(id,date,views=100)=>({reel_id:id,date,views,likes:null,comments:null,saves:null,format_type:null,hook:null,caption:null})
test('a week is exactly seven UTC publication dates, with a disjoint preceding week',()=>{
 assert.deepEqual(weeklyWindow(now),{start:'2026-10-02',end:'2026-10-08',previous_start:'2026-09-25'})
 assert.deepEqual(weeklyWindow(new Date('2026-11-01T00:01:00Z')),{start:'2026-10-26',end:'2026-11-01',previous_start:'2026-10-19'})
 const e=weeklyEvidence({now,sync,posts:[],reels:[reel('OLD','2026-10-01'),reel('NEW','2026-10-02'),reel('FUTURE','2026-10-09')]})
 assert.deepEqual(e.reels.map(r=>r.reel_id),['NEW']);assert.equal(e.previous_reels.length,1)
})
test('feed/Reel overlap is deduplicated, including non-grid Reels, photos and one piece per carousel',()=>{
 const e=weeklyEvidence({now,sync,reels:[reel('R','2026-10-07'),reel('HIDDEN','2026-10-08')],posts:[
  {post_id:'R',posted_at:'2026-10-07T14:00:00Z',content_type:'reel'},
  {post_id:'C',posted_at:'2026-10-07T15:00:00Z',content_type:'carousel'},
  {post_id:'P',posted_at:'2026-10-08T15:00:00Z',content_type:'photo'}]})
 assert.equal(e.posts.length,4);assert.deepEqual(e.types,{reel:2,carousel:1,photo:1});assert.equal(e.active_days,2)
})
test('the supplied daily-poster scenario captures 10 pieces on seven days, rather than zero',()=>{
 const dates=['08','07','07','06','05','04','03','02','02']
 const e=weeklyEvidence({now,sync,reels:dates.map((d,i)=>reel(`R${i}`,`2026-10-${d}`)),posts:[{post_id:'C',posted_at:'2026-10-06T13:00:00Z',content_type:'carousel'}]})
 assert.equal(e.posts.length,10);assert.equal(e.types.reel,9);assert.equal(e.active_days,7);assert.equal(e.source,'ready')
 assert.match(weeklyFallback(e).what_worked,/10 posts/)
})
test('empty/incomplete syncs never become accusations of not posting',()=>{
 const e=weeklyEvidence({now,sync:{...sync,status:'running',completed_at:null},posts:[],reels:[]})
 const report=weeklyFallback(e);assert.equal(e.source,'syncing');assert.match(report.what_worked,/does not mean you have not been posting/)
 assert.doesNotMatch(JSON.stringify(report),/production failure|you posted zero|non.negotiable|3 reels/i)
})
test('failed queries, truncated results, stale histories and future sync times cannot support a complete assessment',()=>{
 for(const options of [{queryFailed:true},{truncated:true}]){
  const e=weeklyEvidence({now,sync,posts:[],reels:[],...options});assert.equal(e.source,'unavailable');assert.match(weeklyFallback(e).what_worked,/could not be verified/)
 }
 for(const completed_at of ['2026-10-01T00:00:00Z','2026-10-09T00:00:00Z','bad']){
  assert.equal(weeklyEvidence({now,sync:{...sync,completed_at},posts:[],reels:[]}).source,'partial')
 }
})
test('input order is stable, unknown views remain unknown, and pinned publication dates stay outside the week',()=>{
 const rows=[reel('B','2026-10-06',null),reel('A','2026-10-06',0),reel('PIN','2020-01-01')]
 const a=weeklyEvidence({now,sync,posts:[],reels:rows}),b=weeklyEvidence({now,sync,posts:[],reels:[...rows].reverse()})
 assert.deepEqual(a,b);assert.equal(a.reels[1].views,null);assert.equal(a.reels[0].views,0)
})
test('unversioned, mismatched or shaming report caches are rejected immediately, regardless of age',()=>{
 const sections={what_worked:'A measured observation',what_to_improve:'A specific test',this_week:'Compare two openings'}
 const meta={version:3,input_key:'old',generated_at:now.toISOString(),source:'ready',ai:true}
 assert.equal(cachedWeeklyAnalysis(JSON.stringify(sections),'old'),null)
 assert.equal(cachedWeeklyAnalysis(JSON.stringify({...sections,_meta:meta}),'fresh'),null)
 assert.ok(cachedWeeklyAnalysis(JSON.stringify({...sections,_meta:meta}),'old'))
 assert.equal(analysisSections({...sections,what_worked:'You posted zero reels this week'}),null)
 assert.equal(analysisSections({...sections,what_to_improve:'Complete content production failure.'}),null)
 assert.equal(analysisSections({...sections,this_week:'Non-negotiable: post three reels'}),null)
 assert.equal(analysisSections({what_worked:'valid'}),null)
})
test('photo-only activity is real activity and its neutral fallback is reusable',()=>{
 const e=weeklyEvidence({now,sync,posts:[{post_id:'P',posted_at:'2026-10-08T09:00:00Z',content_type:'photo'}],reels:[]})
 assert.equal(e.posts.length,1);assert.equal(e.types.reel,0)
 const report={...weeklyFallback(e),_meta:{version:3,input_key:'photos',ai:false}}
 assert.ok(cachedWeeklyAnalysis(JSON.stringify(report),'photos'))
})

test('AI arithmetic, misranking and unequal-age decline claims are rejected before caching',()=>{
 const sections={what_worked:'The invitation makes the next action clear.',what_to_improve:'Try a question opening on the same topic.',this_week:'Test that question with the same caption.'}
 assert.ok(weeklyCommentary(sections))
 for(const what_to_improve of ['Plays declined sharply this week.','Tutorials averaged 3482 plays.','This format outperformed the others.','Measure comments as conversion intent.']) assert.equal(weeklyCommentary({...sections,what_to_improve}),null)
 const e=weeklyEvidence({now,sync,posts:[],reels:[{...reel('T','2026-10-04',10228),format_type:'Talking Head'},{...reel('Q','2026-10-02',6037),format_type:'Q&A'},{...reel('M','2026-10-02',9168),format_type:'Trend/Meme'}]})
 assert.match(weeklyFactLead(e),/labelled Talking Head and has 10,228 plays/)
 assert.doesNotMatch(weeklyFactLead(e),/Trend|Q&A/)
})
