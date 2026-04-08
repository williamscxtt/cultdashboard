/**
 * GET  ?profileId=  → { available: bool, unlocks_at: string|null }
 * POST { profileId } → { analysis, unlocks_at }
 *
 * Analyses comment sections across the client's last 30 days of reels.
 * Gated once per 7 days per client.
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

export async function GET(req: NextRequest) {
  const profileId = new URL(req.url).searchParams.get('profileId')
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })

  const { data: profile } = await adminClient
    .from('profiles')
    .select('comment_analysis_unlocks_at')
    .eq('id', profileId)
    .single()

  const unlocksAt: string | null = profile?.comment_analysis_unlocks_at ?? null
  const available = !unlocksAt || new Date(unlocksAt) <= new Date()

  return NextResponse.json({ available, unlocks_at: unlocksAt })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { profileId?: string }
  const { profileId } = body
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })

  const { data: profile } = await adminClient
    .from('profiles')
    .select('*, comment_analysis_unlocks_at')
    .eq('id', profileId)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const unlocksAt: string | null = profile.comment_analysis_unlocks_at ?? null
  if (unlocksAt && new Date(unlocksAt) > new Date()) {
    return NextResponse.json({ error: 'locked', unlocks_at: unlocksAt }, { status: 429 })
  }

  // Fetch last 30 days of reels with comment text
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: reels } = await adminClient
    .from('client_reels')
    .select('hook, caption, views, comments_text, format_type')
    .eq('profile_id', profileId)
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('views', { ascending: false })
    .limit(30)

  const reelList = reels ?? []
  const reelsWithComments = reelList.filter(r => r.comments_text && Array.isArray(r.comments_text) && r.comments_text.length > 0)

  if (reelsWithComments.length === 0) {
    return NextResponse.json({ error: 'no_comments', message: 'No comment data available yet. Sync your Instagram to collect comments.' }, { status: 422 })
  }

  const intro = (profile.intro_structured ?? {}) as Record<string, string>
  const niche = intro.specific_niche || intro.what_you_coach || profile.niche || 'coaching'
  const targetAudience = intro.ideal_client || profile.target_audience || 'their audience'

  // Build comment summary for prompt
  const commentSummary = reelsWithComments.map(r => {
    const hook = r.hook || r.caption?.slice(0, 60) || '(no hook)'
    const comments = (r.comments_text as string[]).slice(0, 15).join('\n  - ')
    return `Reel: "${hook}" (${(r.views ?? 0).toLocaleString()} views)\nComments:\n  - ${comments}`
  }).join('\n\n')

  const prompt = `You are an expert social media strategist. Analyse the comment sections from a creator's recent Instagram reels.

CREATOR:
- Niche: ${niche}
- Target audience: ${targetAudience}
- Total reels with comments analysed: ${reelsWithComments.length}

COMMENT DATA:
${commentSummary}

Return ONLY valid JSON:
{
  "consensus": "2-3 sentence summary of the overall sentiment and reaction in the comment sections. What do people think of this creator?",
  "top_emotions": ["Specific emotion/reaction seen repeatedly", "Second emotion", "Third emotion"],
  "common_questions": [
    { "question": "Exact or paraphrased question being asked", "frequency": "high/medium/low", "content_idea": "A video idea that answers this question" },
    { "question": "Second common question", "frequency": "high/medium/low", "content_idea": "Video idea" },
    { "question": "Third question if found", "frequency": "medium/low", "content_idea": "Video idea" }
  ],
  "objections_or_doubts": ["Any scepticism or pushback showing up in comments", "Second objection if present"],
  "content_opportunities": ["Specific video idea based on what commenters are asking for", "Second idea", "Third idea"],
  "audience_insight": "One key insight about this creator's audience based on their comments — who they are, what they care about, what stage they're at."
}`

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'Analysis parse failed' }, { status: 500 })
    const analysis = JSON.parse(match[0])

    // Set lock: 7 days from now
    const nextUnlock = new Date()
    nextUnlock.setDate(nextUnlock.getDate() + 7)
    await adminClient
      .from('profiles')
      .update({ comment_analysis_unlocks_at: nextUnlock.toISOString() })
      .eq('id', profileId)

    return NextResponse.json({ analysis, unlocks_at: nextUnlock.toISOString() })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Analysis failed'
    console.error('[comments/analyze]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
