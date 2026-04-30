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
You are Will Scott's AI offer architect. Your job is to take someone's raw skills, story, and content interests and BUILD them a complete, specific coaching offer from scratch — deciding the niche, avatar, mechanism, price point, and everything else.

CRITICAL CONTEXT: This person does NOT have an existing coaching business or offer. They have skills, a story, and a sense of who they want to help. Your job is to make DECISIONS for them — not ask them to decide. Be opinionated, specific, and confident.

THE PRINCIPLES YOU MUST APPLY:

1. NICHE FROM SKILLS + STORY: The best niche sits at the intersection of what they know deeply, who they can help most credibly, and what the market will pay for. Use their story as the niche anchor — "I went through X and now I help people who are where I was."

2. AVATAR FROM WHO THEY RELATE TO: The ideal client is usually a version of who they used to be. Use their story + who they'd love to help to build a specific, vivid avatar. Not "busy professionals" — "men aged 35-50 who built a successful career but completely neglected their health and now feel invisible in their own body."

3. INVENT THE MECHANISM: Give their approach a proprietary name. It doesn't matter that they haven't named it yet — you name it for them. "The 4-Phase Identity Reset" or "The Dad Strength Protocol" or "The Quiet Confidence Method." Make it feel like a system only they could deliver.

4. SUGGEST A PRICE: Based on their market and the transformation described, suggest a realistic but aspirational price. Don't be timid — high-ticket coaching (£1,000–£3,000 for 3 months) is standard for the Creator Cult model. If the transformation is big, the price should reflect it.

5. DREAM OUTCOME: Paint the "after" picture as vividly as possible. Not "lose weight" — "look in the mirror and actually like what you see for the first time in 5 years, have your partner notice the difference before you say anything, keep up with your kids at the park without gasping."

6. PREDICT OBJECTIONS: Based on the niche and market, predict the 3-4 objections this avatar will have before buying. Don't wait for the user to tell you — you know the market.

7. VALUE STACK: Build out 4-6 deliverables that make the price feel like a steal. Include: main coaching component, accountability/check-ins, a bonus (PDF guide, community, resource library), and a fast-action bonus.

8. GUARANTEE: Create a specific, bold guarantee that removes all buying risk. Concrete with stakes — not "I'll work hard for you."

THE GOLDEN RULE: Every sentence in the output should reference this specific person's situation. No generic coaching language. Read their answers and write for them, not for a template.
`.trim()

function formatAnswers(answers: Record<string, string>): string {
  const labels: Record<string, string> = {
    skills:           'Their skills, expertise, and experience',
    content_direction:'Topics they want to create content about',
    own_story:        'Their personal transformation / story',
    who_to_help:      'Who they want to help (rough idea)',
    dream_result:     'The result they\'d most love to create for someone',
    format_idea:      'How they imagine working with clients + rough price idea',
  }
  return Object.entries(labels)
    .map(([key, label]) => `${label}: ${answers[key] || 'Not provided'}`)
    .join('\n')
}

async function generateOffer(answers: Record<string, string>): Promise<Record<string, unknown>> {
  const prompt = `${OFFER_FRAMEWORK}

=== THEIR RAW INPUTS ===
${formatAnswers(answers)}

=== YOUR TASK ===
Build their complete Precision Offer Blueprint from scratch. You are making DECISIONS for them — decide their niche, name their mechanism, specify the avatar, set the price, predict their objections. Be brutally specific throughout. This must feel like it was built by someone who spent an hour studying exactly their situation.

Return ONLY valid JSON in this exact structure:
{
  "one_liner": "The single most compelling sentence describing their offer. Formula: I help [hyper-specific avatar] [achieve vivid outcome] in [timeframe] without [biggest fear/objection]. Max 25 words. Use specifics from their inputs.",
  "bio_headline": "Instagram bio first line. Under 60 characters. Punchy, scroll-stopping, specific. Do NOT use emojis.",
  "target_avatar": "2-3 sentences. The exact person this is for — so specific the right person reads it and thinks 'that's literally me.' Build this from their story and who they said they want to help.",
  "core_promise": "2-3 sentences. Before vs after. Vivid, emotional, specific. What does their life look like on the other side?",
  "unique_mechanism": "Name their proprietary method — INVENT a compelling name if they don't have one. 2-3 sentences explaining why this approach works when other things haven't. Make it feel systematic and exclusive to them.",
  "value_stack": [
    {
      "name": "Deliverable name",
      "description": "What it includes and why it matters for this specific avatar",
      "perceived_value": "Suggested value e.g. £500 value"
    }
  ],
  "guarantee": "A specific, bold, concrete guarantee with real stakes. Something that eliminates the #1 reason people don't buy.",
  "who_its_for": "3-4 bullet points. Each starts with 'This is for you if...' — use their avatar's specific situation, not generic language.",
  "who_its_not_for": "2-3 bullet points. Who this is NOT for. Be honest — it builds trust and filters out bad fits.",
  "urgency_angle": "1-2 sentences. The real cost of staying where they are. Make it emotional and specific to this avatar's life.",
  "objection_crushers": [
    {
      "objection": "The specific objection this avatar will have",
      "response": "How the offer structure pre-empts or destroys this objection"
    }
  ]
}

Rules:
- value_stack: 4-6 items — include the main coaching component, accountability/check-ins, at least one bonus, and suggest a total price that makes the actual price feel like a steal
- objection_crushers: 3-4 items — predict these yourself based on the niche/market, don't wait for them to tell you
- unique_mechanism: MUST have a proprietary name you invent — something specific and memorable
- Everything references their actual story, skills, and situation — zero generic coaching filler
- If they said they don't know what to charge, suggest a specific price in the value_stack that makes sense for the transformation (typically £997–£2,997 for 3-month 1:1 coaching)`

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
