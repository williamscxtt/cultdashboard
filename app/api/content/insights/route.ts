/**
 * Content Insights API
 *
 * GET  ?profileId=... → returns cached insights (null if never generated)
 * POST { profileId }  → generates fresh AI insights, stores in profiles.content_insights_json
 *
 * Claude analyses: reel performance, comment patterns, onboarding goals,
 * brand voice, past scripts — and returns structured, actionable insights.
 * Results are cached; stale after 7 days or after a new Instagram sync.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// ── GET — return cached insights ──────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const profileId = new URL(req.url).searchParams.get('profileId')
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })

  const { data } = await admin
    .from('profiles')
    .select('content_insights_json, content_insights_updated_at')
    .eq('id', profileId)
    .single()

  return NextResponse.json({
    insights: data?.content_insights_json ?? null,
    updated_at: data?.content_insights_updated_at ?? null,
  })
}

// ── POST — generate fresh insights ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { profileId } = await req.json().catch(() => ({})) as { profileId?: string }
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })

  // ── Load all data sources in parallel ────────────────────────────────────
  const [
    { data: profile },
    { data: onboarding },
    { data: reels },
    { data: scripts },
    { data: brandVoice },
  ] = await Promise.all([
    admin.from('profiles')
      .select('name, niche, coaching_phase, target_audience, ninety_day_goal, biggest_challenge, monthly_revenue, revenue_goal, dm_goal, ig_username, followers_count')
      .eq('id', profileId).single(),

    admin.from('onboarding')
      .select('niche, target_audience, main_goal, biggest_challenge, content_experience, brand_voice, unique_story, why_joined_cult')
      .eq('profile_id', profileId).maybeSingle(),

    // Last 60 reels with all insight-relevant fields
    admin.from('client_reels')
      .select('hook, format_type, views, likes, comments, saves, shares, caption, transcript, date, comments_text')
      .eq('profile_id', profileId)
      .order('date', { ascending: false })
      .limit(60),

    // Last 6 weeks of scripts (for hook/format pattern detection)
    admin.from('weekly_scripts')
      .select('scripts_md, week_start')
      .eq('profile_id', profileId)
      .order('week_start', { ascending: false })
      .limit(6),

    admin.from('brand_voice')
      .select('core_voice, hook_frameworks, key_phrases')
      .eq('profile_id', profileId).maybeSingle(),
  ])

  if (!reels || reels.length === 0) {
    return NextResponse.json({ error: 'No reels synced yet. Sync your Instagram account first.' }, { status: 400 })
  }

  // ── Compute format performance summary ───────────────────────────────────
  const formatStats: Record<string, { count: number; totalViews: number; avgViews: number }> = {}
  for (const r of reels) {
    const fmt = r.format_type || 'Unknown'
    if (!formatStats[fmt]) formatStats[fmt] = { count: 0, totalViews: 0, avgViews: 0 }
    formatStats[fmt].count++
    formatStats[fmt].totalViews += r.views ?? 0
  }
  for (const fmt in formatStats) {
    formatStats[fmt].avgViews = Math.round(formatStats[fmt].totalViews / formatStats[fmt].count)
  }
  const sortedFormats = Object.entries(formatStats)
    .sort((a, b) => b[1].avgViews - a[1].avgViews)
    .map(([fmt, s]) => `${fmt}: ${s.count} reels, avg ${fmtViews(s.avgViews)} views`)

  // ── Top & bottom reels ───────────────────────────────────────────────────
  const sorted = [...reels].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
  const top10 = sorted.slice(0, 10).map(r =>
    `[${fmtViews(r.views ?? 0)} views | ${r.format_type || '?'} | ${r.date || ''}] "${r.hook || r.caption?.slice(0, 80) || '(no hook)'}"`
  )
  const bottom5 = sorted.slice(-5).map(r =>
    `[${fmtViews(r.views ?? 0)} views | ${r.format_type || '?'}] "${r.hook || '(no hook)'}"`
  )

  // ── Aggregate recent comments (max 200 total) ────────────────────────────
  const allComments: string[] = []
  for (const r of reels) {
    const arr = r.comments_text as string[] | null
    if (arr?.length) allComments.push(...arr.slice(0, 5))
    if (allComments.length >= 200) break
  }
  const commentSample = allComments.slice(0, 200).join('\n')

  // ── Recent scripts summary (hooks/formats used) ──────────────────────────
  const scriptSummary = (scripts ?? [])
    .map(s => s.scripts_md?.slice(0, 600) || '')
    .filter(Boolean)
    .join('\n---\n')
    .slice(0, 2000)

  // ── Build Claude prompt ───────────────────────────────────────────────────
  const clientContext = [
    `Name: ${profile?.name || 'Unknown'}`,
    `IG: @${profile?.ig_username || '?'} | Followers: ${fmtViews(profile?.followers_count || 0)}`,
    `Niche: ${profile?.niche || onboarding?.niche || 'not set'}`,
    `Target audience: ${profile?.target_audience || onboarding?.target_audience || 'not set'}`,
    `Coaching phase: ${profile?.coaching_phase || 'unknown'}`,
    `90-day goal: ${profile?.ninety_day_goal || 'not set'}`,
    `Biggest challenge: ${profile?.biggest_challenge || onboarding?.biggest_challenge || 'not set'}`,
    `Revenue goal: ${profile?.revenue_goal || 'not set'}`,
    `DM goal: ${profile?.dm_goal || 'not set'}`,
    `Why joined: ${onboarding?.why_joined_cult || 'not set'}`,
    `Brand voice: ${brandVoice?.core_voice?.slice(0, 200) || onboarding?.brand_voice || 'not set'}`,
  ].join('\n')

  const prompt = `You are an expert Instagram growth coach analysing a creator's content performance. Generate structured, brutally honest, and HIGHLY SPECIFIC insights based on real data.

=== CLIENT PROFILE ===
${clientContext}

=== REELS TRACKED: ${reels.length} ===

FORMAT PERFORMANCE (ranked by avg views):
${sortedFormats.join('\n')}

TOP 10 REELS:
${top10.join('\n')}

BOTTOM 5 REELS:
${bottom5.join('\n')}

${commentSample ? `=== SAMPLE AUDIENCE COMMENTS (${allComments.length} total) ===\n${commentSample}\n` : ''}
${scriptSummary ? `=== RECENT SCRIPTS (last 6 weeks) ===\n${scriptSummary}\n` : ''}

=== TASK ===
Generate a comprehensive content intelligence report. Be extremely specific — reference actual numbers, actual hooks, actual formats. No generic advice.

Return ONLY valid JSON in this exact structure:
{
  "comment_overview": "2-3 sentence summary of what the audience says in comments — recurring themes, questions, emotions, what they respond to. Only include if comments available.",
  "whats_working": [
    { "title": "short title", "stat": "e.g. 866K avg views", "detail": "1-2 specific sentences with numbers and examples from their actual content" }
  ],
  "growth_actions": [
    "Specific, actionable step — reference their actual niche, goal, or content pattern. Use numbers where possible."
  ],
  "content_gaps": [
    "A specific untapped opportunity — format they haven't tried, topic their audience wants, angle that competitor data suggests"
  ],
  "best_hook_patterns": [
    { "pattern": "Hook pattern name", "example": "example hook from their top reels", "note": "why it works for their audience" }
  ],
  "avoid": [
    "Specific format or content type that consistently underperforms, with the actual numbers"
  ],
  "phase_focus": "One paragraph of coaching advice specific to their current phase and 90-day goal — what should they be prioritising RIGHT NOW?"
}

Rules:
- whats_working: 2-4 items
- growth_actions: 3-5 specific, ordered by priority
- content_gaps: 2-3 items
- best_hook_patterns: 2-3 items
- avoid: 1-3 items (only genuine patterns, not random bad days)
- Reference real view counts, real hook examples from their data
- If comments are unavailable, set comment_overview to null`

  // ── Call Claude ───────────────────────────────────────────────────────────
  let insights: Record<string, unknown>
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    // Attempt direct parse first; fall back to removing trailing commas (common LLM artefact)
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      const repaired = jsonMatch[0].replace(/,\s*([}\]])/g, '$1')
      parsed = JSON.parse(repaired)
    }
    insights = parsed
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[insights] Claude error:', err)
    return NextResponse.json({ error: `Claude error: ${msg}` }, { status: 500 })
  }

  // ── Cache in profile ──────────────────────────────────────────────────────
  await admin.from('profiles').update({
    content_insights_json: insights,
    content_insights_updated_at: new Date().toISOString(),
  }).eq('id', profileId)

  return NextResponse.json({ insights, updated_at: new Date().toISOString() })
}

function fmtViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return String(n)
}
