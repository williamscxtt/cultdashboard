/**
 * Series Planner API
 *
 * POST { profileId, topic, episodes, goal }
 *   → Returns a full episode plan for a content series
 *
 * Goals: followers, leads, revenue, views
 * Episodes: 3–30
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase-server'

export const maxDuration = 90

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function safeStr(v: unknown): string {
  if (!v) return ''
  return String(v).trim()
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    profileId?: string
    topic?: string
    episodes?: number
    goal?: string
  }

  const { profileId, topic, episodes = 5, goal = 'followers' } = body
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })
  if (!topic?.trim()) return NextResponse.json({ error: 'topic required' }, { status: 400 })

  const clampedEpisodes = Math.min(30, Math.max(3, Math.round(episodes)))

  // Auth: must be admin or own profile
  const { data: realProfile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (realProfile?.role !== 'admin' && user.id !== profileId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch profile
  const { data: profile } = await admin
    .from('profiles')
    .select('name, niche, target_audience, intro_structured, user_type, creator_style')
    .eq('id', profileId)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const p = profile
  const intro = (p.intro_structured ?? {}) as Record<string, unknown>
  function iVal(...keys: string[]): string {
    for (const k of keys) {
      const v = intro[k] || p[k as keyof typeof p]
      if (v && safeStr(v)) return safeStr(v)
    }
    return ''
  }

  const isCreator = profile.user_type === 'creator'
  const niche = iVal('specific_niche', 'content_niche', 'niche') || safeStr(profile.niche) || ''
  const audience = iVal('ideal_client', 'target_audience') || safeStr(profile.target_audience) || ''
  const brandVoice = iVal('brand_voice') || ''
  const creatorStyle = safeStr(profile.creator_style) || ''

  const goalFraming = isCreator
    ? {
        followers: 'growing the audience — each episode should have a strong CTA to follow and share',
        leads: 'driving DMs and profile traffic — each episode ends with a soft CTA to engage directly',
        revenue: 'converting to sales — each episode builds desire for a digital product or offer',
        views: 'maximising watch time and shares — entertainment and hooks are paramount',
      }[goal] ?? 'growing the audience'
    : {
        followers: 'building authority and growing reach in the coaching niche',
        leads: 'generating qualified leads — each episode drives prospects to DM',
        revenue: 'closing clients — each episode builds desire for the offer and drives sales conversations',
        views: 'establishing expertise and building trust at scale',
      }[goal] ?? 'building authority'

  const systemPrompt = `You are an expert content series strategist for short-form video (Instagram Reels / TikTok).

You plan multi-part content series that build momentum, grow audiences, and achieve specific goals.

A great series:
- Has a clear overarching theme and title
- Each episode stands alone but leaves the viewer wanting the next
- Hooks are specific and different for each episode
- CTAs align with the series goal
- Content builds narrative momentum across episodes

Return ONLY valid JSON — no markdown, no extra text.`

  const userPrompt = `Plan a ${clampedEpisodes}-episode content series.

Series topic/theme: "${topic}"
Goal: ${goal} (${goalFraming})

Creator context:
Type: ${isCreator ? `Content creator — ${creatorStyle || 'creator'}` : 'Coaching creator'}
Niche: ${niche}
Audience: ${audience}
Brand voice: ${brandVoice}

Return a JSON object in this exact format:
{
  "series_title": "...",
  "series_hook": "One-sentence description of why people should follow this series",
  "episodes": [
    {
      "episode": 1,
      "title": "...",
      "hook": "The opening hook for this episode (under 12 words)",
      "key_point": "The single most important thing this episode teaches or shows",
      "recommended_length": "15s / 30s / 60s / 90s",
      "cta": "The specific call-to-action for this episode"
    }
    // repeat for all ${clampedEpisodes} episodes
  ]
}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  })

  const raw = (message.content[0] as { type: string; text: string }).text.trim()

  // Extract JSON object
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return NextResponse.json({ error: 'Failed to parse series plan' }, { status: 500 })
  }

  let series: {
    series_title: string
    series_hook: string
    episodes: Array<{
      episode: number
      title: string
      hook: string
      key_point: string
      recommended_length: string
      cta: string
    }>
  }

  try {
    series = JSON.parse(jsonMatch[0])
  } catch {
    return NextResponse.json({ error: 'Invalid JSON from AI' }, { status: 500 })
  }

  return NextResponse.json({ series })
}
