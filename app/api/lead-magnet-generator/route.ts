/**
 * Lead Magnet Generator API
 *
 * POST { profileId, action: 'ideas' }                              → generate 3 lead magnet ideas
 * POST { profileId, action: 'generate', title, concept, outline }  → generate full content for a chosen idea
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase-server'

export const maxDuration = 120

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    profileId?: string
    action?: string
    title?: string
    concept?: string
    outline?: string[]
  }

  const { profileId, action } = body
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })

  // Auth check: must be admin or own profile
  const isOwnProfile = user.id === profileId
  const { data: adminCheck } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  const isAdmin = adminCheck?.is_admin === true

  if (!isOwnProfile && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch profile data
  const { data: profile } = await admin
    .from('profiles')
    .select('intro_structured, name, niche, biggest_challenge, ninety_day_goal')
    .eq('id', profileId)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const intro = (profile.intro_structured ?? {}) as Record<string, string>

  const name = profile.name || 'the creator'
  const niche = intro.specific_niche || profile.niche || ''
  const idealClient = intro.ideal_client || intro.target_audience || ''
  const biggestProblem = intro.biggest_problem || profile.biggest_challenge || ''
  const storyTransformation = intro.story_transformation || ''
  const mechanismName = intro.story_mechanism_name || intro.unique_mechanism || ''
  const bestClientResult = intro.story_best_client_result || intro.best_client_result || ''
  const leadMagnet = intro.story_lead_magnet || ''

  const profileContext = `- Niche: ${niche}
- Who they help: ${idealClient}
- Their core pain point they address: ${biggestProblem}
- Their transformation story: ${storyTransformation}
- Their system/mechanism: ${mechanismName}
- Their best client result: ${bestClientResult}
- Their current lead magnet (if any): ${leadMagnet}`

  // ── Ideas action ───────────────────────────────────────────────────────────
  if (action === 'ideas') {
    const prompt = `You are helping ${name} create a lead magnet for their Instagram coaching business.

Their profile:
${profileContext}

Generate 3 lead magnet ideas. Each must be:
1. SPECIFIC to their exact niche — not generic ("5 tips for fitness" is terrible)
2. Something their exact ICP would DM for immediately
3. Something that filters OUT the wrong people
4. Deliverable as a 1-5 page PDF or simple guide
5. Title must be specific and outcome-focused, not fluffy

Avoid anything generic. Bad: "free meal plan", "5 morning habits", "social media checklist".
Good: A highly specific resource tied to the exact transformation they sell.

Return ONLY valid JSON array:
[
  {
    "title": "exact lead magnet title",
    "concept": "2-3 sentences: what's in it, what problem it solves, why it's valuable",
    "why_it_works": "1-2 sentences: why this specific idea filters for the right ICP and builds trust toward the paid offer",
    "outline": ["section 1 title: one sentence on what's covered", "section 2...", "section 3...", "section 4...", "section 5..."]
  }
]`

    try {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      })
      const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
      const match = text.match(/\[[\s\S]*\]/)
      if (!match) throw new Error('No JSON array in response')
      let ideas
      try { ideas = JSON.parse(match[0]) }
      catch { ideas = JSON.parse(match[0].replace(/,\s*([}\]])/g, '$1')) }
      return NextResponse.json({ ideas })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ideas generation failed'
      console.error('[lead-magnet-generator/ideas]', msg)
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }

  // ── Generate action ────────────────────────────────────────────────────────
  if (action === 'generate') {
    const { title, concept, outline } = body
    if (!title || !concept || !outline?.length) {
      return NextResponse.json({ error: 'title, concept, and outline required' }, { status: 400 })
    }

    const prompt = `Write the full content for this lead magnet PDF for ${name}'s coaching business.

Lead magnet: "${title}"
Concept: ${concept}
Profile:
${profileContext}

Structure:
${outline.map((s, i) => `Section ${i + 1}: ${s}`).join('\n')}

Rules:
- Write in a direct, no-fluff coaching voice (like Will Scott — confident, specific, no corporate speak)
- Each section: 150-250 words
- Include specific actionable steps, not vague advice
- Reference their mechanism/system naturally where relevant
- End with a soft CTA: "Ready to go further? DM me [their soft CTA keyword] on Instagram"

Return the full content as clean text with section headers. No JSON.`

    try {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      })
      const content = msg.content[0].type === 'text' ? msg.content[0].text : ''
      return NextResponse.json({ content })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Content generation failed'
      console.error('[lead-magnet-generator/generate]', msg)
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
