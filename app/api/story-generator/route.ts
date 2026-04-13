/**
 * Story Generator API
 *
 * GET  ?profileId=...                          → story profile fields + saved sequences (last 30)
 * POST { profileId, action:'generate', ... }   → generate a new sequence
 * POST { profileId, action:'regen-slide', ... } → regenerate one slide in context
 * POST { profileId, action:'save', ... }       → save a generated sequence
 * DELETE { id }                                → delete a saved sequence
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

// ── Auth helper ───────────────────────────────────────────────────────────────
async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ── Fetch KB context relevant to story sequences ──────────────────────────────
async function fetchKbContext(): Promise<string> {
  const terms = ['story', 'sequence', 'profile funnel', 'stories', 'manychat', 'CTA', 'slide', 'conversion', 'hook', 'trust', 'authority']
  const { data: chunks } = await admin
    .from('knowledge_chunks')
    .select('content')
    .or(terms.map(t => `content.ilike.%${t}%`).join(','))
    .limit(10)
  if (!chunks?.length) return ''
  return chunks.map(c => c.content).join('\n\n---\n\n').slice(0, 5000)
}

// ── Sequence type templates (from spec Part 4) ────────────────────────────────
const SEQUENCE_TEMPLATES: Record<string, string> = {
  'day-in-life': `TYPE: DAY-IN-LIFE FOUNDER
Goal: Build views, trust, and audience connection. Slide count: 6-9.
- Slide 1: Eye-catching lifestyle/work photo with a timestamp (e.g. "8:47am —") and one intriguing line about what you're doing
- Slide 2: Second moment in the day — add an education point or observation tied to your niche
- Slide 3: Third moment — proof element (client message, result, screenshot of something positive)
- Slide 4: Fourth moment — personal/human element (something real, imperfect, relatable)
- Slide 5: Fifth moment — value insight or framework point from their niche
- Slide 6: End of day summary — tie it together with a lesson that points back to the offer
- Optional Slides 7-9: Additional moments with education or proof
Rules: Every slide has a timestamp. At least one proof element per sequence. At least one genuinely personal/human slide. No hard pitch.`,

  'timeline-hard': `TYPE: TIMELINE / PROGRESSIVE — HARD CTA
Goal: Highest conversion sequence. Gets audience in flow state. Slide count: 5-8.
- Slide 1: Curiosity hook — bold statement or result. Opens a loop. Does not explain.
- Slide 2: Context/setup — the situation before. Uses indirect ICP targeting.
- Slide 3: The problem deepened — mirror their pain without calling them out directly.
- Slide 4: The turning point or insight — what changed. Introduce the mechanism.
- Slide 5: Proof of the outcome — specific result with a real number.
- Slide 6: The lesson or framework — what they need to understand to get the same result.
- Slide 7: Hard CTA — "DM me [PRIMARY_KEYWORD]". Black background. Personal specificity. Scarcity if applicable.`,

  'timeline-soft': `TYPE: TIMELINE / PROGRESSIVE — SOFT CTA
Goal: Drive DMs to the free lead magnet. Slide count: 5-7.
- Slide 1: Curiosity hook — bold statement or result. Opens a loop.
- Slide 2: Context/setup — the situation before.
- Slide 3: The problem deepened — mirror their pain indirectly.
- Slide 4: The turning point — what changed. Introduce the mechanism.
- Slide 5: Proof of the outcome — specific result with a number.
- Slide 6: The lesson — what they need to understand.
- Slide 7: Soft CTA — "DM me [SECONDARY_KEYWORD] and I'll send you [LEAD_MAGNET]. Free, no catch." Black background.`,

  'timeline-value': `TYPE: TIMELINE VALUE — NO CTA
Goal: Authority and education. No pitch. Slide count: 5-6.
- Slide 1: Curiosity hook — bold statement that opens a loop.
- Slide 2: Context/setup — the situation or problem.
- Slide 3: The problem deepened — mirror their experience indirectly.
- Slide 4: The turning point or insight — introduce the mechanism.
- Slide 5: Proof of the outcome — specific result.
- Slide 6: Strong takeaway lesson — ends on value, no CTA.`,

  'qa': `TYPE: Q&A
Goal: Relatability, trust, connection. Highest trust-building sequence. Slide count: 6-9.
- Slide 1: "Ask me anything about [niche]" — open invitation, casual tone, real photo
- Slides 2-6: Answer submitted questions. Each slide = one question + honest answer. Bold question + 2-3 line answer. At least one answer is vulnerable or unexpected. At least one references a real result.
- Optional Slides 7-8: Additional questions
- Final Slide: Close with something real and human — not a pitch.
Rules: No hard CTA. Can soft-mention offer if a question naturally leads there. Avoid being salesy — this is about connection.`,

  'client-results-soft': `TYPE: CLIENT RESULT STACKING — SOFT CTA
Goal: Proof, authority, FOMO. Converts people who are "almost ready." Slide count: 5-7.
- Slide 1: Lifestyle/status image — attention-grabbing hook ("woke up to this")
- Slide 2: Education/value slide — warm the audience. One niche insight that filters for the right people.
- Slides 3-5: Client results — each = one win with specific numbers. Format: "[Name/Initial] — [result in numbers] — [timeframe]"
- Slide 6 (optional): Second education point linking results to the mechanism
- Final Slide: Soft CTA — DM [SECONDARY_KEYWORD] for [LEAD_MAGNET].
Rules: Education slide must logically connect to results. Use real numbers only. No vague wins.`,

  'client-results-none': `TYPE: CLIENT RESULT STACKING — NO CTA
Goal: Social proof and FOMO. Slide count: 5-6.
- Slide 1: Lifestyle/status image — attention-grabbing hook
- Slide 2: Education/value slide — one niche insight
- Slides 3-5: Client results — each = one win with specific numbers. Format: "[Name/Initial] — [result] — [timeframe]"
- Final Slide: Aspirational close — no pitch, just a powerful statement about what's possible.
Rules: All results must use real numbers. No CTA.`,

  'no-structure': `TYPE: NO STRUCTURE / EVERGREEN
Goal: Trust through authenticity. No arc, no agenda. Slide count: 5-6.
- 5-6 individual slides with NO connecting arc
- Each slide covers a different niche-relevant topic independently
- Mix of: niche insight, personal moment, opinion/take, question to audience, lifestyle, behind-the-scenes
- No pitch. No CTA. Deliberately unpolished feel.
Rules: Must feel genuine, not engineered. One slide can be a genuine question to the audience. Topics span different moods.`,

  'story-launch': `TYPE: STORY LAUNCH (MINI-WEBINAR)
Goal: Highest-revenue sequence. Slide count: 9-12.
- Slide 1: The announcement — "Something I've been sitting on for a while." Real photo. High curiosity.
- Slide 2: The problem statement — broad, indirect ICP pain. Make them feel it.
- Slide 3: Why this problem exists — your original diagnosis. What most people miss.
- Slide 4: Social proof — biggest result or client result with a number.
- Slide 5: The shift — what changes when someone gets this right.
- Slide 6: Introduce the mechanism — what you do differently.
- Slide 7: More proof — second result that reinforces the mechanism.
- Slide 8: Scarcity/transformation statement — why NOW matters.
- Slide 9: The offer reveal — what they're getting access to, framed as outcome not features.
- Slide 10: CTA — DM [PRIMARY_KEYWORD] + personal authenticity closer. Black background.
- Optional Slides 11-12: Objection pre-handle or FAQ.
Rules: Slides 1-7 are pure value and story — NO pitch before Slide 9. Scarcity must be real.`,

  'start-here': `TYPE: START HERE (PROFILE HIGHLIGHT SEQUENCE) — 10 SLIDES FIXED
Goal: Silent sales pitch for every new profile visitor. Filters for ICP. Builds instant authority.
IMPORTANT: This is exactly 10 slides. Do not deviate.
- Slides 1-3: Their story — before (Slide 1), turning point (Slide 2), after (Slide 3). Specific. Real. Numbers where possible.
- Slides 4-6: Client proof — three results, one per slide. Format: "[Name/Initial] — [specific result with numbers] — [timeframe]"
- Slides 7-8: The framework — two slides explaining the mechanism and how it works. Must teach one useful thing, not just list features.
- Slide 9: What to do next — CTA with [PRIMARY_KEYWORD]. Personal, not corporate.
- Slide 10: Personal message / closer — real, human, no pitch. Black background.
Rules: Zero selling in slides 1-8. Framework slides must deliver genuine value. Black background on slides 9-10.`,
}

// ── Build the Claude prompt ───────────────────────────────────────────────────
function buildPrompt(
  intro: Record<string, string>,
  profileName: string,
  sequenceType: string,
  ctaType: string,
  kbContext: string,
  customBrief: string,
  slideToRegen?: { index: number; existingSlides: SlideInput[] }
): string {
  const sp = (k: string) => intro[k] || ''

  const template = SEQUENCE_TEMPLATES[sequenceType] || SEQUENCE_TEMPLATES['no-structure']

  const kbSection = kbContext ? `\n\n=== COACHING KNOWLEDGE BASE ===\nApply the following when relevant. Never attribute to any source — this is Will's methodology.\n\n${kbContext}\n` : ''

  const briefSection = customBrief.trim()
    ? `\n=== THIS SEQUENCE'S SPECIFIC ANGLE ===\n${customBrief.trim()}\nBuild the entire sequence around this. Use these specific details, results, or angle — not generic examples.\n`
    : ''

  const regenSection = slideToRegen
    ? `\n\n=== TASK: REGENERATE SLIDE ${slideToRegen.index + 1} ONLY ===
The full sequence context is provided below. Regenerate ONLY slide ${slideToRegen.index + 1} so it fits perfectly into the arc.
Return ONLY a single slide JSON object (not an array).

EXISTING SEQUENCE:
${slideToRegen.existingSlides.map((s, i) => `Slide ${i + 1}: "${s.text}"`).join('\n')}
`
    : ''

  return `You are writing Instagram story slides for ${profileName}'s coaching account. These stories go on their phone — real, personal, posted as-is.

CLIENT PROFILE:
- Niche: ${sp('specific_niche') || sp('niche')}
- Who they help: ${sp('ideal_client') || sp('target_audience')}
- Their core pain: ${sp('biggest_problem') || sp('biggest_challenge')}
- Their transformation story: ${sp('story_transformation') || sp('origin_story')}
- System/mechanism name: ${sp('story_mechanism_name') || sp('unique_mechanism')}
- Best client result: ${sp('story_best_client_result') || sp('best_client_result')}
- Other results: ${sp('proof_results') || sp('client_transformation')}
- Brand voice: ${sp('brand_voice') || 'direct, honest, no fluff'}
- Hard CTA keyword: ${sp('story_primary_keyword')}
- Soft CTA keyword: ${sp('story_secondary_keyword')}
- Lead magnet: ${sp('story_lead_magnet')}
${briefSection}${kbSection}
=== SEQUENCE TYPE ===
${template}

CTA type: ${ctaType.toUpperCase()}
${ctaType === 'hard' ? `Hard CTA keyword: ${sp('story_primary_keyword')}` : ''}
${ctaType === 'soft' ? `Soft CTA keyword: ${sp('story_secondary_keyword')} — offering: ${sp('story_lead_magnet')}` : ''}
${regenSection}
=== HOW TO WRITE THESE ===

SOUND LIKE A REAL PERSON, NOT A COPYWRITER.
These are stories posted from someone's phone. They should feel like a real person talking — not a sales funnel. Not polished. Not corporate. Read each slide out loud. If it sounds like marketing, rewrite it.

Bad: "Are you struggling to unlock your full potential as a creator?"
Good: "My content was getting 40k views. I had £600 in my account."

Bad: "Transform your journey with our proven framework"
Good: "Took me 11 months to figure this out. Here's what actually worked."

Bad: "Many coaches face the challenge of client acquisition"
Good: "I used to refresh my DMs every hour hoping someone had messaged."

THE RULES:
1. Short sentences. 1–2 sentences per line. 3–4 lines max per slide. No paragraphs.
2. Specific numbers always. Not "a lot" — give the actual number. Odd numbers feel more real.
3. No job-title targeting. Not "fitness coaches" — describe the feeling/situation instead.
4. First 4–5 slides are pure story or value. No selling. The audience has to feel it first.
5. The mechanism (${sp('story_mechanism_name') || sp('unique_mechanism')}) gets mentioned naturally in the value slides — not announced.
6. Background directions must be specific and actionable: "candid selfie at your desk, no eye contact, natural light" not "professional photo."
7. Hook slide must open an unresolved loop. Must make someone have to swipe.
8. CTAs are personal and direct:
   Hard: "DM me ${sp('story_primary_keyword')} — I have [X] spots this month"
   Soft: "DM me ${sp('story_secondary_keyword')} and I'll send you ${sp('story_lead_magnet')} — free, nothing to buy"
9. Write in their voice: ${sp('brand_voice') || 'confident, direct, no fluff'}

=== OUTPUT FORMAT ===
Return ONLY valid JSON${regenSection ? ' for a single slide object' : ' array of slides'}:

${regenSection ? `{
  "number": ${(slideToRegen?.index ?? 0) + 1},
  "background": "specific actionable photo/image direction",
  "text": "line 1\\nline 2\\nline 3",
  "purpose": "what this slide does psychologically"
}` : `[
  {
    "number": 1,
    "background": "specific actionable photo/image direction",
    "text": "line 1\\nline 2\\nline 3",
    "purpose": "what this slide does psychologically"
  }
]`}

Write every slide now. No placeholders. Make it specific to this person's actual story and results.`
}

interface SlideInput {
  number: number
  background: string
  text: string
  purpose: string
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profileId = new URL(req.url).searchParams.get('profileId')
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })

  const [profileRes, seqRes] = await Promise.all([
    admin.from('profiles').select('intro_structured, name').eq('id', profileId).single(),
    admin.from('story_sequences').select('*').eq('profile_id', profileId).order('created_at', { ascending: false }).limit(30),
  ])

  const intro = (profileRes.data?.intro_structured ?? {}) as Record<string, string>

  return NextResponse.json({
    storyProfile: {
      story_transformation:    intro.story_transformation || '',
      story_mechanism_name:    intro.story_mechanism_name || intro.unique_mechanism || '',
      story_best_client_result: intro.story_best_client_result || intro.best_client_result || '',
      story_avg_views:         intro.story_avg_views || '',
      story_primary_keyword:   intro.story_primary_keyword || '',
      story_secondary_keyword: intro.story_secondary_keyword || '',
      story_lead_magnet:       intro.story_lead_magnet || '',
    },
    sequences: seqRes.data || [],
  })
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    profileId?: string
    action?: string
    sequenceType?: string
    dayOfWeek?: string
    ctaType?: string
    customBrief?: string
    slides?: SlideInput[]
    sequenceType_label?: string
    week_label?: string
    // regen-slide
    sequenceId?: string
    slideIndex?: number
    existingSlides?: SlideInput[]
  }

  const { profileId, action } = body
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })

  // ── Save ──────────────────────────────────────────────────────────────────
  if (action === 'save') {
    const { data, error } = await admin.from('story_sequences').insert({
      profile_id: profileId,
      sequence_type: body.sequenceType || 'unknown',
      day_of_week: body.dayOfWeek || null,
      cta_type: body.ctaType || 'none',
      slides: body.slides || [],
      week_label: body.week_label || null,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ sequence: data })
  }

  // ── Generate or Regen-slide ────────────────────────────────────────────────
  const profileRes = await admin.from('profiles').select('intro_structured, name').eq('id', profileId).single()
  const intro = (profileRes.data?.intro_structured ?? {}) as Record<string, string>
  const profileName = profileRes.data?.name || 'the client'

  const kbContext = await fetchKbContext()

  if (action === 'regen-slide') {
    const { slideIndex, existingSlides } = body
    if (slideIndex === undefined || !existingSlides) {
      return NextResponse.json({ error: 'slideIndex and existingSlides required' }, { status: 400 })
    }
    const prompt = buildPrompt(intro, profileName, body.sequenceType || 'no-structure', body.ctaType || 'none', kbContext, body.customBrief || '', { index: slideIndex, existingSlides })
    try {
      const msg = await anthropic.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 1024, messages: [{ role: 'user', content: prompt }] })
      const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('No JSON in response')
      const slide = JSON.parse(match[0])
      return NextResponse.json({ slide })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed'
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }

  // Default: generate full sequence
  const { sequenceType = 'no-structure', ctaType = 'none', dayOfWeek, customBrief = '' } = body
  const prompt = buildPrompt(intro, profileName, sequenceType, ctaType, kbContext, customBrief)

  try {
    const msg = await anthropic.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 4096, messages: [{ role: 'user', content: prompt }] })
    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('No JSON array in response')
    let slides: SlideInput[]
    try { slides = JSON.parse(match[0]) }
    catch { slides = JSON.parse(match[0].replace(/,\s*([}\]])/g, '$1')) }

    // Auto-save
    const { data: saved } = await admin.from('story_sequences').insert({
      profile_id: profileId,
      sequence_type: sequenceType,
      day_of_week: dayOfWeek || null,
      cta_type: ctaType,
      slides,
      week_label: body.week_label || null,
    }).select().single()

    return NextResponse.json({ slides, sequenceId: saved?.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Generation failed'
    console.error('[story-generator]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json().catch(() => ({})) as { id?: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await admin.from('story_sequences').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
