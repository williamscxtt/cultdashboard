/**
 * POST { profileId }
 * Generates a weekly per-client content breakdown.
 * Gated to once per 7 days — tracks unlocks_at in profiles table.
 *
 * GET { profileId }
 * Returns the lock status (whether the button is available and when it unlocks).
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
    .select('content_analysis_unlocks_at')
    .eq('id', profileId)
    .single()

  const unlocksAt: string | null = profile?.content_analysis_unlocks_at ?? null
  const available = !unlocksAt || new Date(unlocksAt) <= new Date()

  return NextResponse.json({ available, unlocks_at: unlocksAt })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { profileId?: string }
  const { profileId } = body
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })

  // Check lock
  const { data: profile } = await adminClient
    .from('profiles')
    .select('*, content_analysis_unlocks_at')
    .eq('id', profileId)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const unlocksAt: string | null = profile.content_analysis_unlocks_at ?? null
  if (unlocksAt && new Date(unlocksAt) > new Date()) {
    return NextResponse.json({ error: 'locked', unlocks_at: unlocksAt }, { status: 429 })
  }

  // Fetch their reels (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: reels } = await adminClient
    .from('client_reels')
    .select('views, likes, comments, hook, format_type, date, caption, transcript')
    .eq('profile_id', profileId)
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false })
    .limit(30)

  const intro = (profile.intro_structured ?? {}) as Record<string, string>
  const niche = intro.specific_niche || intro.what_you_coach || profile.niche || 'coaching'
  const targetAudience = intro.ideal_client || profile.target_audience || 'their audience'
  const challenge = intro.biggest_problem || profile.biggest_challenge || ''
  const goal = intro.goal_90_days || profile.ninety_day_goal || ''

  const reelList = (reels ?? [])
  const avgViews = reelList.length
    ? Math.round(reelList.reduce((a, r) => a + (r.views ?? 0), 0) / reelList.length)
    : 0

  // Sort by views for top performers
  const sorted = [...reelList].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
  const top3 = sorted.slice(0, 3)
  const bottom3 = sorted.slice(-3).reverse()

  // Format breakdown
  const formatMap: Record<string, number[]> = {}
  reelList.forEach(r => {
    if (r.format_type) {
      formatMap[r.format_type] = formatMap[r.format_type] ?? []
      formatMap[r.format_type].push(r.views ?? 0)
    }
  })
  const formatSummary = Object.entries(formatMap)
    .map(([fmt, views]) => `${fmt}: ${views.length} reels, avg ${Math.round(views.reduce((a,b) => a+b,0)/views.length).toLocaleString()} views`)
    .join('\n')

  const reelSummary = reelList.map((r, i) =>
    `${i+1}. "${r.hook ?? r.caption?.slice(0,60) ?? '(no hook)'}" | ${(r.views ?? 0).toLocaleString()} views | ${r.format_type ?? 'unknown'} | ${r.date ?? ''}`
  ).join('\n')

  const prompt = `You are an expert Instagram content strategist. Analyse this creator's last 30 days of content.

CREATOR:
- Niche: ${niche}
- Target audience: ${targetAudience}
- Biggest challenge: ${challenge || 'not specified'}
- 90-day goal: ${goal || 'not specified'}
- Total reels analysed: ${reelList.length}
- Average views: ${avgViews.toLocaleString()}

FORMAT BREAKDOWN:
${formatSummary || 'No format data'}

ALL REELS (most recent first):
${reelSummary || 'No reels found'}

TOP PERFORMERS:
${top3.map(r => `"${r.hook ?? r.caption?.slice(0,60) ?? '(no hook)'}" — ${(r.views ?? 0).toLocaleString()} views`).join('\n')}

UNDERPERFORMERS:
${bottom3.map(r => `"${r.hook ?? r.caption?.slice(0,60) ?? '(no hook)'}" — ${(r.views ?? 0).toLocaleString()} views`).join('\n')}

Return ONLY valid JSON:
{
  "headline": "One sentence summary of their content performance this month",
  "content_score": 72,
  "posts_this_period": ${reelList.length},
  "avg_views": ${avgViews},
  "top_format": "the format with highest avg views",
  "format_verdict": "One sentence on which format is working and why",
  "top_hooks": ["Hook 1 from their best reels", "Hook 2", "Hook 3"],
  "what_is_working": ["Specific insight about their content strategy", "Second insight"],
  "what_is_not_working": ["Specific weakness", "Second weakness if applicable"],
  "pattern_insight": "The most important pattern you notice in what gets views vs what doesn't. Be very specific.",
  "this_week_actions": ["Specific action for this week", "Second action", "Third action"],
  "hook_recommendations": ["A hook idea tailored to their niche and audience", "Second hook idea", "Third hook idea"]
}`

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'Analysis parse failed' }, { status: 500 })
    const analysis = JSON.parse(match[0])

    // Set lock: unlocks 7 days from now
    const nextUnlock = new Date()
    nextUnlock.setDate(nextUnlock.getDate() + 7)
    await adminClient
      .from('profiles')
      .update({ content_analysis_unlocks_at: nextUnlock.toISOString() })
      .eq('id', profileId)

    return NextResponse.json({ analysis, unlocks_at: nextUnlock.toISOString() })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Analysis failed'
    console.error('[content/analyze]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
