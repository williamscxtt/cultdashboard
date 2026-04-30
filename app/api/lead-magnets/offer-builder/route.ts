/**
 * POST /api/lead-magnets/offer-builder
 *
 * Public (no auth). Accepts a lead's contact details + 6 from-scratch answers,
 * builds a complete Precision Offer Blueprint from raw skills/story/direction
 * via Claude, and saves to lead_magnet_submissions.
 *
 * This is designed for people who do NOT yet have an offer or coaching business —
 * Claude decides the niche, avatar, mechanism, price, and objections FOR them.
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

// ── Offer framework ───────────────────────────────────────────────────────────

const OFFER_FRAMEWORK = `
You are Will Scott's AI offer architect. You build complete, specific Precision Offer Blueprints for coaches and creators at any stage — from complete beginners with only a rough sense of their skills, to experienced coaches who know exactly their niche and just want it built out properly.

CRITICAL READING RULE: Before you write anything, scan every answer. For each field:
- If it contains real, specific information → use it exactly as the foundation and build on it
- If it says "I don't know", is blank, vague, or says "not sure" → YOU make the decision for them based on the other answers. Be opinionated and specific. Do not hedge or say "consider doing X" — just decide.

This means the same tool must work for two very different people:
1. Someone who writes "I don't know" in 6 out of 9 fields → you build 90% of the offer for them
2. Someone who fills every field with detailed, specific answers → you refine and amplify what they gave you, adding depth and professional framing

THE PRINCIPLES YOU MUST APPLY:

1. NICHE FIRST: The offer doesn't matter if you're selling to the wrong market. Use their skills + story + content direction to pin down the most specific, defensible niche. "Fitness for busy dads over 40" beats "fitness coach" every time.

2. AVATAR — BUILD OR SHARPEN: If they described their ideal client in detail, use it. If they said "I don't know" or "people like me" — build the avatar from their story. The best avatar is usually a version of who they used to be.

3. THE VALUE EQUATION: Value = (Dream Outcome × Likelihood of Success) / (Time Delay × Effort). Maximise outcome vividness and reduce perceived difficulty. Paint the "after" in detail.

4. MECHANISM — NAME IT: Give their approach a proprietary name. If they have one, refine it. If they said "I don't know" — invent one. "The 90-Day Dad Reset Protocol" or "The Quiet Confidence Method" or "The 4-Phase Metabolic Rebuild." A named system implies exclusivity and expertise.

5. PRICE — SUGGEST IF UNKNOWN: If they gave a price, build the value stack around making it feel like a steal. If they said "I don't know" — suggest a specific price. High-ticket coaching (£997–£2,997 for 3 months) is standard. Match the price to the transformation size.

6. OBJECTIONS — PREDICT IF UNKNOWN: If they listed objections, address them. If they said "I don't know" — predict the 3-4 most common objections for this specific niche and avatar. You know the market.

7. PROOF — WORK WITH WHAT THEY HAVE: If they have results or credentials, use them. If they said "None yet" or "just starting out" — write the offer honestly around that. Beginning coaches can still build compelling offers — lean on their personal transformation story and their conviction.

THE GOLDEN RULE: Every sentence must reference this specific person's situation, niche, and avatar. Zero generic coaching language. Read their answers and write for them, not for a template.
`.trim()

function formatAnswers(answers: Record<string, string>): string {
  const labels: Record<string, string> = {
    skills:           'Skills, expertise, background',
    content_direction:'Topics they want to create content about',
    ideal_client:     'Ideal client description',
    main_problem:     '#1 problem their ideal client has',
    dream_outcome:    'Dream outcome / transformation',
    own_story:        'Their personal story / transformation',
    unique_mechanism: 'Their unique method or approach',
    proof:            'Proof, results, credentials',
    format_and_price: 'Service format and price',
  }
  // Show all provided keys, falling back to the labels above
  const allKeys = Object.keys(labels)
  const extraKeys = Object.keys(answers).filter(k => !allKeys.includes(k))
  const keys = [...allKeys, ...extraKeys]

  return keys
    .filter(k => answers[k])
    .map(k => `${labels[k] ?? k}: ${answers[k]}`)
    .join('\n')
}

async function generateOffer(answers: Record<string, string>): Promise<Record<string, unknown>> {
  const prompt = `${OFFER_FRAMEWORK}

=== THEIR ANSWERS ===
${formatAnswers(answers)}

=== HOW TO INTERPRET THESE ANSWERS ===
- Any answer containing "I don't know", "not sure", "no idea", or that is blank: YOU decide for them — make a specific, confident decision based on everything else they said
- Any answer with real detail: use it, build on it, and make it sharper

=== YOUR TASK ===
Build their complete Precision Offer Blueprint. Where they gave detail, amplify it. Where they said "I don't know", decide for them. Every output field must be ruthlessly specific — names, numbers, timeframes, emotions. Nothing generic.

Return ONLY valid JSON in this exact structure:
{
  "one_liner": "The single most compelling sentence describing their offer. Formula: I help [hyper-specific avatar] [achieve vivid outcome] in [timeframe] without [biggest fear/objection]. Max 25 words.",
  "bio_headline": "Instagram bio first line. Under 60 characters. Punchy, scroll-stopping, specific. No emojis.",
  "target_avatar": "2-3 sentences. The exact person this is for — so specific the right person reads it and thinks 'that's literally me.'",
  "core_promise": "2-3 sentences. Vivid before vs after. Emotional. What does life actually look like on the other side?",
  "unique_mechanism": "Name their proprietary method — invent a compelling name if they don't have one. 2-3 sentences on why this works when other approaches haven't.",
  "value_stack": [
    {
      "name": "Deliverable name",
      "description": "What it includes and why it matters for this specific person",
      "perceived_value": "e.g. £500 value"
    }
  ],
  "guarantee": "A specific, bold, concrete guarantee with real stakes. Eliminates the #1 reason people don't buy.",
  "who_its_for": "3-4 bullet points starting with 'This is for you if...' — use this avatar's specific situation.",
  "who_its_not_for": "2-3 bullet points. Specific, honest — builds trust and filters bad fits.",
  "urgency_angle": "1-2 sentences. The real emotional cost of staying where they are right now.",
  "objection_crushers": [
    {
      "objection": "The specific objection this avatar will have",
      "response": "How the offer structure pre-empts or destroys it"
    }
  ]
}

Rules:
- value_stack: 4-6 items — main coaching component, accountability structure, at least one bonus, fast-action bonus where appropriate
- objection_crushers: 3-4 items — use their stated objections if provided, otherwise predict for the niche
- unique_mechanism: MUST have a proprietary name — specific and memorable
- If no price was given: suggest one in the value_stack (total perceived value vs actual price)
- Everything references their actual words, niche, and situation — zero filler`

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

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    lead?: { name?: string; email?: string; phone?: string }
    answers?: Record<string, string>
  }

  const { lead, answers } = body

  if (!lead?.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (!lead?.email?.trim() && !lead?.phone?.trim()) {
    return NextResponse.json({ error: 'email or phone is required' }, { status: 400 })
  }
  if (!answers || Object.keys(answers).length === 0) {
    return NextResponse.json({ error: 'answers are required' }, { status: 400 })
  }

  let offer: Record<string, unknown>
  try {
    offer = await generateOffer(answers)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[lead-magnets/offer-builder] Generation failed:', msg)
    return NextResponse.json({ error: `Generation failed: ${msg}` }, { status: 500 })
  }

  // Save lead + offer — return offer even if DB write fails
  const { data, error } = await admin
    .from('lead_magnet_submissions')
    .insert({
      tool: 'offer-builder',
      name: lead.name.trim(),
      email: lead.email?.trim() || null,
      phone: lead.phone?.trim() || null,
      answers,
      offer_json: offer,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[lead-magnets/offer-builder] DB insert error:', error.message)
  }

  return NextResponse.json({ offer, id: data?.id ?? null })
}
