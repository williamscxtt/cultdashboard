/**
 * Offer Builder API
 *
 * GET  ?profileId=...          → return saved offer + answers
 * POST { profileId, answers }  → generate offer from wizard answers + knowledge base
 * PATCH { profileId, feedback } → iterate on existing offer with user feedback
 *
 * Uses Will Scott's Precision Offer Blueprint framework + any relevant KB chunks.
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

// ── Will Scott's Precision Offer Blueprint (baked in) ────────────────────────

const OFFER_FRAMEWORK = `
You are an expert offer strategist applying Will Scott's Precision Offer Blueprint — a proven system for building irresistible offers that convert.

CORE PRINCIPLES YOU MUST APPLY:

1. THE STARVING CROWD: The offer doesn't matter if you're selling to the wrong market. Niching down is the fastest path to success. "Fitness for busy dads over 40" is 10x more powerful than "fitness coach".

2. THE VALUE EQUATION:
   Value = (Dream Outcome × Perceived Likelihood of Achievement) / (Time Delay × Effort & Sacrifice)
   - INCREASE: Dream Outcome (make it vivid and specific), Perceived Likelihood (social proof, guarantee, mechanism)
   - DECREASE: Time Delay (faster results = more valuable), Effort & Sacrifice (easier = more valuable)

3. DREAM OUTCOME: People don't buy products — they buy the feeling of the end state. Paint the "after" picture vividly. Not "lose weight" but "finally feel confident taking your shirt off at the beach, have energy to play with your kids without getting winded, fit into clothes you haven't worn in 5 years."

4. THE UNIQUE MECHANISM: Give your method a proprietary name. "The 3-Phase Metabolic Reset" is infinitely more compelling than "I'll help you eat better." It implies you have a system nobody else has.

5. RISK REVERSAL: The stronger the guarantee, the stronger the offer. Remove ALL risk from the buyer. "If you don't lose 10lbs in 8 weeks I'll refund you and keep coaching you for free" eliminates the #1 objection.

6. THE VALUE STACK: Don't just sell the main thing — stack deliverables until the price feels like a steal. List everything they get, assign perceived value to each, then make the actual price feel ridiculous.

7. SPECIFICITY IS THE CURRENCY OF CREDIBILITY: Every vague claim loses trust. Replace "I help people get fit" with "I help 40-year-old men lose their first 15lbs in 90 days without a gym membership or giving up beer."

8. ADDRESSING OBJECTIONS INSIDE THE OFFER: Pre-empt every objection. "This works even if you've tried before and failed" / "This fits into a busy schedule with just 20 minutes a day" / "You don't need to track calories."

COMMON MISTAKES TO FIX:
- "I help people lose weight" → too vague, no avatar, no specificity, zero belief
- "Online fitness/business/life coach" → no differentiation, sounds like every other coach
- Selling features (workouts, calls) instead of outcomes (the transformation)
- Not addressing why THEY specifically will succeed this time when they've failed before

OFFER STRUCTURE TO PRODUCE:
Generate all sections with extreme specificity. Use the client's actual words and numbers where possible. Make it feel personal, not templated.
`.trim()

// ── Fetch relevant KB chunks via text search ──────────────────────────────────

async function fetchKbChunks(profileId: string): Promise<string> {
  const offerTerms = ['offer', 'avatar', 'dream outcome', 'niche', 'value', 'guarantee', 'mechanism', 'transformation', 'client', 'promise']

  const { data: chunks } = await admin
    .from('knowledge_chunks')
    .select('content, source_type, metadata')
    .or(offerTerms.map(t => `content.ilike.%${t}%`).join(','))
    .limit(8)

  if (!chunks?.length) return ''

  return chunks
    .map(c => c.content)
    .join('\n\n---\n\n')
    .slice(0, 4000)
}

// ── Format wizard answers for prompt ─────────────────────────────────────────

function formatAnswers(answers: Record<string, string>): string {
  const labels: Record<string, string> = {
    niche: 'What they do / niche',
    ideal_client: 'Ideal client description',
    main_problem: '#1 painful problem their client has',
    dream_outcome: 'Dream outcome their client wants',
    unique_mechanism: 'Their unique approach / method',
    timeframe: 'Timeframe for results',
    objections: 'Top objections / fears before buying',
    proof: 'Proof they have (results, credentials, story)',
    format_and_price: 'Service format and price point',
  }
  return Object.entries(labels)
    .map(([key, label]) => `${label}: ${answers[key] || 'Not provided'}`)
    .join('\n')
}

// ── Generate offer from Claude ────────────────────────────────────────────────

async function generateOffer(
  answers: Record<string, string>,
  kbContext: string,
  previousOffer?: Record<string, unknown>,
  feedback?: string
): Promise<Record<string, unknown>> {
  const isIteration = !!(previousOffer && feedback)

  const iterationSection = isIteration ? `
=== PREVIOUS OFFER (to be improved) ===
${JSON.stringify(previousOffer, null, 2)}

=== CLIENT FEEDBACK ON PREVIOUS OFFER ===
${feedback}

The client doesn't like something about the previous offer. Rebuild it from scratch addressing their feedback while keeping the same wizard answers.
` : ''

  const kbSection = kbContext ? `
=== WILL SCOTT'S COACHING KNOWLEDGE ===
${kbContext}

Use the above knowledge to inform and strengthen the offer. This is Will Scott's own methodology — never reference, credit, or mention any external source, person, or framework by name. Present all insights as Will's own advice.
` : ''

  const prompt = `${OFFER_FRAMEWORK}

=== CLIENT'S WIZARD ANSWERS ===
${formatAnswers(answers)}
${kbSection}
${iterationSection}

=== YOUR TASK ===
Build a complete Precision Offer Blueprint for this client. Be brutally specific — use their actual niche, numbers, and situation throughout. Do NOT use generic placeholder language. This must feel like it was written specifically for them.

Return ONLY valid JSON in this exact structure:
{
  "one_liner": "The single most compelling sentence describing what they do. Formula: I help [hyper-specific avatar] [achieve specific outcome] in [timeframe] without [biggest objection/pain]. Max 25 words.",
  "bio_headline": "Instagram-ready bio first line. Under 60 characters. Punchy, specific, scroll-stopping. e.g. 'I help busy dads lose 20lbs in 90 days 🔥'",
  "target_avatar": "2-3 sentences describing the exact person this is for. So specific that the right person reads it and thinks 'that's literally me'.",
  "core_promise": "2-3 sentences. The full transformation promise. What their life looks like before vs after. Make it vivid and emotional.",
  "unique_mechanism": "Name their proprietary system/method and explain in 2-3 sentences why it works when other things haven't. Give it a compelling name if they don't have one.",
  "value_stack": [
    {
      "name": "Deliverable name",
      "description": "What it is and why it matters",
      "perceived_value": "e.g. £500 value"
    }
  ],
  "guarantee": "A specific, bold risk-reversal guarantee that removes all buying risk. Not 'I'll work hard for you' — something concrete with stakes.",
  "who_its_for": "3-4 bullet points describing exactly who this is perfect for. Use 'This is for you if...' language.",
  "who_its_not_for": "2-3 bullet points. Who this is NOT for. This actually increases trust and conversions.",
  "urgency_angle": "1-2 sentences. Why they should act NOW rather than later. What's the cost of delay?",
  "objection_crushers": [
    {
      "objection": "The objection",
      "response": "How the offer pre-empts or destroys it"
    }
  ]
}

Rules:
- value_stack: 4-6 items minimum
- objection_crushers: 3-4 items covering their specific objections
- Everything must reference their actual niche, avatar, and situation
- No generic coaching language — be ruthlessly specific`

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON in Claude response')

  try {
    return JSON.parse(jsonMatch[0])
  } catch {
    const repaired = jsonMatch[0].replace(/,\s*([}\]])/g, '$1')
    return JSON.parse(repaired)
  }
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const profileId = new URL(req.url).searchParams.get('profileId')
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })

  const { data } = await admin
    .from('offer_builder')
    .select('answers, offer_json, iterations, updated_at')
    .eq('profile_id', profileId)
    .maybeSingle()

  return NextResponse.json({
    answers: data?.answers ?? null,
    offer: data?.offer_json ?? null,
    iterations: data?.iterations ?? [],
    updated_at: data?.updated_at ?? null,
  })
}

// ── POST — generate from wizard answers ───────────────────────────────────────

export async function POST(req: NextRequest) {
  const { profileId, answers } = await req.json().catch(() => ({})) as {
    profileId?: string
    answers?: Record<string, string>
  }
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })
  if (!answers || Object.keys(answers).length === 0) {
    return NextResponse.json({ error: 'answers required' }, { status: 400 })
  }

  const kbContext = await fetchKbChunks(profileId)

  let offer: Record<string, unknown>
  try {
    offer = await generateOffer(answers, kbContext)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Generation failed: ${msg}` }, { status: 500 })
  }

  // Save to DB (upsert — one offer per profile)
  await admin.from('offer_builder').upsert({
    profile_id: profileId,
    answers,
    offer_json: offer,
    iterations: [],
    updated_at: new Date().toISOString(),
  }, { onConflict: 'profile_id' })

  return NextResponse.json({ offer, updated_at: new Date().toISOString() })
}

// ── PATCH — iterate with feedback ─────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const { profileId, feedback } = await req.json().catch(() => ({})) as {
    profileId?: string
    feedback?: string
  }
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })
  if (!feedback?.trim()) return NextResponse.json({ error: 'feedback required' }, { status: 400 })

  // Load existing offer + answers
  const { data: existing } = await admin
    .from('offer_builder')
    .select('answers, offer_json, iterations')
    .eq('profile_id', profileId)
    .single()

  if (!existing?.offer_json) {
    return NextResponse.json({ error: 'No existing offer to iterate on' }, { status: 400 })
  }

  const kbContext = await fetchKbChunks(profileId)

  let newOffer: Record<string, unknown>
  try {
    newOffer = await generateOffer(
      existing.answers as Record<string, string>,
      kbContext,
      existing.offer_json as Record<string, unknown>,
      feedback
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Iteration failed: ${msg}` }, { status: 500 })
  }

  // Prepend previous version to iteration history (keep last 5)
  const history = Array.isArray(existing.iterations) ? existing.iterations : []
  const newHistory = [
    { offer: existing.offer_json, feedback, iterated_at: new Date().toISOString() },
    ...history,
  ].slice(0, 5)

  await admin.from('offer_builder').update({
    offer_json: newOffer,
    iterations: newHistory,
    updated_at: new Date().toISOString(),
  }).eq('profile_id', profileId)

  return NextResponse.json({ offer: newOffer, updated_at: new Date().toISOString() })
}
