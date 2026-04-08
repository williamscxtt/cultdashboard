/**
 * POST { reelId, profileId }
 * Analyses a client's own reel using their transcript, performance data, and onboarding context.
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { reelId?: string; profileId?: string }
  const { reelId, profileId } = body

  if (!reelId || !profileId) {
    return NextResponse.json({ error: 'reelId and profileId required' }, { status: 400 })
  }

  const [reelRes, profileRes, statsRes] = await Promise.all([
    adminClient
      .from('client_reels')
      .select('reel_id, views, likes, comments, hook, caption, transcript, format_type, date')
      .eq('profile_id', profileId)
      .eq('reel_id', reelId)
      .single(),
    adminClient
      .from('profiles')
      .select('name, niche, target_audience, intro_structured, biggest_challenge, ninety_day_goal')
      .eq('id', profileId)
      .single(),
    adminClient
      .from('client_reels')
      .select('views, likes, comments')
      .eq('profile_id', profileId)
      .limit(50),
  ])

  const reel = reelRes.data
  if (!reel) return NextResponse.json({ error: 'Reel not found' }, { status: 404 })

  const profile = profileRes.data
  const intro = (profile?.intro_structured ?? {}) as Record<string, string>
  const niche = intro.specific_niche || intro.what_you_coach || profile?.niche || 'coaching'
  const targetAudience = intro.ideal_client || profile?.target_audience || 'their audience'
  const challenge = intro.biggest_problem || profile?.biggest_challenge || ''
  const goal = intro.goal_90_days || profile?.ninety_day_goal || ''

  // Calculate their avg stats
  const allReels = statsRes.data ?? []
  const avgViews = allReels.length
    ? Math.round(allReels.reduce((a, r) => a + (r.views ?? 0), 0) / allReels.length)
    : 0
  const avgLikes = allReels.length
    ? Math.round(allReels.reduce((a, r) => a + (r.likes ?? 0), 0) / allReels.length)
    : 0

  const reelViews = reel.views ?? 0
  const performanceLabel =
    avgViews === 0 ? 'no comparison data yet' :
    reelViews > avgViews * 2.5 ? `exceptional — ${Math.round(reelViews / avgViews)}x their average` :
    reelViews > avgViews * 1.3 ? `above average (avg: ${avgViews.toLocaleString()})` :
    reelViews < avgViews * 0.4 ? `well below average (avg: ${avgViews.toLocaleString()})` :
    reelViews < avgViews * 0.7 ? `below average (avg: ${avgViews.toLocaleString()})` :
    `around their average of ${avgViews.toLocaleString()}`

  const content = reel.transcript || reel.caption || reel.hook || ''

  const prompt = `You are an expert Instagram content strategist coaching a ${niche} creator.

CREATOR CONTEXT:
- Niche: ${niche}
- Target audience: ${targetAudience}
- Biggest challenge: ${challenge || 'not specified'}
- 90-day goal: ${goal || 'not specified'}
- Their avg views: ${avgViews.toLocaleString()} | Avg likes: ${avgLikes.toLocaleString()}

THIS REEL:
- Views: ${reelViews.toLocaleString()} (${performanceLabel})
- Likes: ${(reel.likes ?? 0).toLocaleString()} | Comments: ${(reel.comments ?? 0).toLocaleString()}
- Format: ${reel.format_type ?? 'unknown'}
- Hook: "${reel.hook ?? '(no hook captured)'}"
- Full transcript/caption:
"${content.slice(0, 1000)}"

Analyse this reel from the perspective of someone who knows their niche deeply. Be direct and specific — reference the actual content.

Return ONLY valid JSON (no markdown):
{
  "verdict": "Exceptional|Strong|Average|Weak|Poor",
  "score": 74,
  "hook_score": 68,
  "performance_context": "One direct sentence on what the numbers tell you about this reel",
  "what_worked": ["Specific thing that worked, referencing the actual content", "Second point if applicable"],
  "what_to_improve": ["Specific actionable improvement", "Second improvement if applicable"],
  "audience_fit": "Does this content actually speak to ${targetAudience}? Be direct — one sentence.",
  "suggested_hook": "A stronger opening line that would grab more attention for this specific audience"
}`

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'Analysis parse failed' }, { status: 500 })
    const analysis = JSON.parse(match[0])

    return NextResponse.json({ analysis })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Analysis failed'
    console.error('[analyze-reel]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
