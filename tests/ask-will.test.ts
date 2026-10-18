import assert from 'node:assert/strict'
import test from 'node:test'
import { buildMemberContext } from '../lib/ask-will/context.ts'
import { inferIntent, normaliseMode, shouldUseDeepModel } from '../lib/ask-will/intent.ts'
import { WILL_OS } from '../lib/ask-will/prompt.ts'
import { extractFileSearchSources, parseModelOutput } from '../lib/ask-will/sources.ts'

test('classifies common Creator Cult questions without a model call', () => {
  assert.equal(inferIntent('Why are people leaving my Reel after the first two seconds?'), 'content')
  assert.equal(inferIntent('How should I handle this price objection in the DMs?'), 'sales')
  assert.equal(inferIntent('What poll should I add to my Instagram Stories?'), 'stories')
  assert.equal(inferIntent('My bio does not make my ideal client clear'), 'positioning')
  assert.equal(normaliseMode('unknown'), 'deep')
  assert.equal(shouldUseDeepModel('Write this caption', 'quick'), false)
})

test('builds a relevant compact member context instead of dumping every data source', () => {
  const profile = {
    name: 'Rob',
    ig_username: 'rob',
    intro_structured: {
      specific_niche: 'Dads becoming one percent better each day',
      ideal_client: 'Busy fathers',
      monthly_revenue: '£2,000',
    },
  }
  const activity = {
    reels: [{ hook: 'Most dads get this wrong', views: 1200, format_type: 'talking head' }],
    competitorReels: [], audits: [], stories: [],
    sales: [{ stage: 'Closed Won', deal_value: 500 }],
  }
  const content = buildMemberContext(profile, activity, 'content')
  assert.match(content, /Busy fathers/)
  assert.match(content, /Most dads get this wrong/)
  assert.doesNotMatch(content, /Closed Won/)
  assert.doesNotMatch(content, /£2,000/)
})

test('deduplicates file-search evidence and keeps the best score', () => {
  const sources = extractFileSearchSources([
    { type: 'file_search_call', results: [
      { file_id: 'file_1', filename: 'hooks.md', score: 0.3, attributes: { title: 'Hooks', source_path: 'knowledge/brain/concepts/hooks.md' } },
      { file_id: 'file_1', filename: 'hooks.md', score: 0.8, attributes: { title: 'Hooks', source_path: 'knowledge/brain/concepts/hooks.md' } },
    ] },
  ])
  assert.equal(sources.length, 1)
  assert.equal(sources[0].score, 0.8)
  assert.equal(sources[0].title, 'Hooks')
})

test('structured output rejects an empty answer and caps conversation memory', () => {
  assert.throws(() => parseModelOutput('{"answer":"","conversation_summary":"","memory_candidates":[]}'))
  const parsed = parseModelOutput(JSON.stringify({
    answer: 'Do this next.',
    conversation_summary: 'a'.repeat(1500),
    memory_candidates: Array.from({ length: 20 }, (_, index) => ({ kind: 'goal', key: String(index), value: 'x', confidence: 1 })),
  }))
  assert.equal(parsed.conversation_summary.length, 1200)
  assert.equal(parsed.memory_candidates.length, 8)
})

test('Will OS preserves source provenance, privacy and variable answer length', () => {
  assert.match(WILL_OS, /Never imply that an outside framework/)
  assert.match(WILL_OS, /Do not reveal private operational notes/)
  assert.match(WILL_OS, /Match length to the problem/)
  assert.match(WILL_OS, /No em dashes/)
})
