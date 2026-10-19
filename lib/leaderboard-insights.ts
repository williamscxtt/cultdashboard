import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { leaderboardDatabase, loadLeaderboard } from '@/lib/leaderboard-data'
import type { LeaderboardData } from '@/lib/leaderboard'
import { insightFingerprint, leaderboardInsightFacts, validateLeaderboardInsights, type LeaderboardInsights } from '@/lib/leaderboard-insight-model'
import { LEADERBOARD_INSIGHT_SYSTEM, LEADERBOARD_INSIGHT_TOOL } from '@/lib/leaderboard-insight-prompt'

export async function readLeaderboardInsights(data: LeaderboardData): Promise<LeaderboardInsights | null> {
  const result = await leaderboardDatabase().from('leaderboard_insights').select('items,generated_at')
    .eq('sync_date', data.windowEnd).eq('fingerprint', insightFingerprint(data)).eq('status', 'ready').maybeSingle()
  if (result.error || !result.data?.generated_at) return null
  try { return { items: validateLeaderboardInsights(result.data.items, data), generatedAt: result.data.generated_at } }
  catch { return null }
}

export async function refreshLeaderboardInsights() {
  if (process.env.LEADERBOARD_AI_ENABLED !== 'true' || !process.env.ANTHROPIC_API_KEY) return { insight: 'not_enabled' }
  const data = await loadLeaderboard()
  const facts = leaderboardInsightFacts(data)
  if (!facts.length || facts.some(creator => creator.posts === null)) return { insight: 'waiting_for_posts' }
  const db = leaderboardDatabase()
  const fingerprint = insightFingerprint(data)
  const claim = await db.rpc('claim_public_leaderboard_insight', { sync_day: data.windowEnd, source_fingerprint: fingerprint })
  if (claim.error) throw new Error('Could not claim leaderboard insight')
  if (!claim.data) return { insight: 'cached_or_in_progress' }
  const lease = claim.data as string
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 45000, maxRetries: 1 })
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 2000,
      system: LEADERBOARD_INSIGHT_SYSTEM,
      tools: [LEADERBOARD_INSIGHT_TOOL], tool_choice: { type: 'tool', name: 'save_insights' },
      messages: [{ role: 'user', content: JSON.stringify({ currentPeriod: [data.windowStart,data.windowEnd], creators: facts }) }],
    })
    const block = response.content.find(item => item.type === 'tool_use')
    if (!block || block.type !== 'tool_use') throw new Error('AI did not return an insight')
    const items = validateLeaderboardInsights((block.input as { items?: unknown }).items, data)
    const saved = await db.from('leaderboard_insights').update({ status: 'ready', items, generated_at: new Date().toISOString(), lease_token: null, lease_until: null })
      .eq('sync_date', data.windowEnd).eq('fingerprint', fingerprint).eq('lease_token', lease).select('sync_date')
    if (saved.error || !saved.data?.length) throw new Error('Insight lease was lost')
    return { insight: 'ready' }
  } catch (error) {
    await db.from('leaderboard_insights').update({ status: 'failed', lease_token: null, lease_until: null, next_attempt_at: new Date(Date.now()+3600000).toISOString() })
      .eq('sync_date', data.windowEnd).eq('lease_token', lease)
    console.error('[leaderboard-insight]', error instanceof Error ? error.message : 'Generation failed')
    return { insight: 'retry_later' }
  }
}
