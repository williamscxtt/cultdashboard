/**
 * Hook Lab API
 *
 * POST { profileId, topic, emotion }
 *   → Returns 20 hooks across 5 formats tailored to the user's niche + user_type
 *
 * Hook formats: Bold Claim, Story Open, Question, Stat Hook, Trend-jack
 * Emotions: curiosity, aspiration, controversy, fear, entertainment
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase-server'

export const maxDuration = 60

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
    emotion?: string
    customExamples?: string
  }

  const { profileId, topic, emotion, customExamples } = body
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })
  if (!topic?.trim()) return NextResponse.json({ error: 'topic required' }, { status: 400 })

  // Auth: must be admin or own profile
  const { data: realProfile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (realProfile?.role !== 'admin' && user.id !== profileId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch profile data
  const { data: profile } = await admin
    .from('profiles')
    .select('name, niche, target_audience, biggest_challenge, intro_structured, user_type, creator_style')
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
  const brandVoice = iVal('brand_voice', 'voice') || ''
  const hookStyle = iVal('hook_style') || ''
  const creatorStyle = safeStr(profile.creator_style) || iVal('creator_style_hub') || ''
  const offer = iVal('what_you_coach', 'offer_description', 'content_description') || ''

  const contextBlock = isCreator
    ? `Creator type: ${creatorStyle || 'content creator'}
Content niche: ${niche}
Target audience: ${audience}
Brand voice: ${brandVoice}
Preferred hook styles: ${hookStyle}
Content style: ${iVal('creator_style_hub', 'content_style') || ''}`
    : `Coaching niche: ${niche}
Ideal client: ${audience}
Offer: ${offer}
Brand voice: ${brandVoice}
Preferred hook styles: ${hookStyle}
Biggest client challenge: ${iVal('biggest_problem', 'biggest_challenge') || safeStr(profile.biggest_challenge) || ''}`

  const emotionLabel = emotion || 'curiosity'

  // ── Knowledge base: pull real hooks + scripts as voice examples ──────────
  const { data: kbDocs } = await admin
    .from('knowledge_documents')
    .select('title, body, category')
    .in('category', ['Hook', 'Hooks', 'hook', 'Script'])
    .order('created_at', { ascending: false })
    .limit(12)

  const exampleHooks: string[] = []
  for (const doc of (kbDocs ?? [])) {
    const cat = (doc.category ?? '').toLowerCase()
    const body = (doc.body ?? '').trim()
    if (cat === 'hook' || cat === 'hooks') {
      // Hook docs: each line is an example hook
      const lines = body
        .split('\n')
        .map((l: string) => l.replace(/^[-–•*\d.)\s]+/, '').trim())
        .filter((l: string) => l.length > 8 && l.length < 120)
      exampleHooks.push(...lines.slice(0, 8))
    } else if (cat === 'script') {
      // Script docs: first non-empty line is typically the hook
      const firstLine = body
        .split('\n')
        .map((l: string) => l.trim())
        .find((l: string) => l.length > 8 && l.length < 120)
      if (firstLine) exampleHooks.push(firstLine)
    }
  }

  // Merge in any custom examples pasted by the user
  if (customExamples?.trim()) {
    const customLines = customExamples.trim().split('\n')
      .map((l: string) => l.replace(/^[-–•*\d.)\s]+/, '').trim())
      .filter((l: string) => l.length > 8 && l.length < 120)
    exampleHooks.push(...customLines)
  }

  const kbSection = exampleHooks.length > 0
    ? `\n\nEXAMPLE HOOKS FROM THIS CREATOR'S OWN SCRIPTS (study these carefully — match the exact voice, energy, tone, and sentence structure):\n${exampleHooks.slice(0, 24).map((h, i) => `${i + 1}. ${h}`).join('\n')}\n\nThe 20 hooks you write MUST sound like these examples came from the same person.`
    : ''

  const systemPrompt = `You are an expert short-form content hook writer specialising in Instagram Reels and TikTok. You write in the creator's exact voice — direct, no fluff, no filler.

You write hooks that stop the scroll in the first 3 seconds. You know that the hook is 80% of performance.

HOOK FORMATS:
1. Bold Claim — A direct, bold statement that challenges a belief or makes a strong claim
2. Story Open — Pulls the viewer into a story instantly ("I lost everything in 3 months...")
3. Question — A question that makes the viewer think they need to hear the answer
4. Stat Hook — A specific, surprising number or statistic
5. Trend-jack — Connects the topic to a current trend, phrase, or cultural moment

TARGET EMOTION: ${emotionLabel}${kbSection}

RULES:
- Each hook must be under 12 words — tight and punchy
- No filler words ("So", "Today I want to talk about", "In this video")
- Start with the most interesting word possible
- Be specific — vague hooks die
- Voice must match the creator's natural style from the examples above
- Return ONLY a JSON array — no markdown, no extra text`

  const userPrompt = `Generate 20 hooks for the topic: "${topic}"

Creator context:
${contextBlock}

Return exactly 20 hooks as a JSON array in this format:
[
  { "format": "Bold Claim", "hook": "..." },
  { "format": "Story Open", "hook": "..." },
  { "format": "Question", "hook": "..." },
  { "format": "Stat Hook", "hook": "..." },
  { "format": "Trend-jack", "hook": "..." },
  // repeat pattern for 4 more rounds = 20 total
]

Make each hook unique — no repetition of ideas. Tailor them tightly to the creator's niche and audience.${exampleHooks.length > 0 ? ' The hooks in your system prompt show this creator\'s exact style — match it faithfully.' : ''}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  })

  const raw = (message.content[0] as { type: string; text: string }).text.trim()

  // Extract JSON array from response
  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    return NextResponse.json({ error: 'Failed to parse hooks' }, { status: 500 })
  }

  let hooks: Array<{ format: string; hook: string }>
  try {
    hooks = JSON.parse(jsonMatch[0])
  } catch {
    return NextResponse.json({ error: 'Invalid JSON from AI' }, { status: 500 })
  }

  return NextResponse.json({ hooks })
}
