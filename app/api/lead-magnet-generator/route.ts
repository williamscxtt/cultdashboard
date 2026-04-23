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

/** Pull lead magnet framework content from the knowledge base */
async function fetchLeadMagnetKbContext(): Promise<string> {
  const { data: docs } = await admin
    .from('knowledge_documents')
    .select('title, content, source')
    .or("title.ilike.%lead magnet%,title.ilike.%lead%magnet%,category.eq.Lead Generation,category.eq.Offer Building")
    .order('created_at', { ascending: false })
    .limit(8)

  if (!docs?.length) return ''

  // Prioritise the specific lead magnet docs, cap each to keep tokens reasonable
  return docs
    .map(d => `### ${d.title} (${d.source})\n${d.content.slice(0, 4000)}`)
    .join('\n\n---\n\n')
    .slice(0, 14000)
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
    const kbContext = await fetchLeadMagnetKbContext()

    const prompt = `You are helping ${name} create a lead magnet for their Instagram coaching business.

## Lead Magnet Frameworks from the Knowledge Base
Apply these principles — they represent what actually works:

${kbContext}

---

## Creator Profile
${profileContext}

---

## Your Task

Using the frameworks above, generate 3 lead magnet ideas for this creator. Apply Hormozi's principles:
- A lead magnet must be a COMPLETE SOLUTION to a NARROW PROBLEM (not a general tip list)
- It should be so good they could charge for it — but they give it away to filter leads
- The narrower and more specific the problem it solves, the better it converts
- It must point toward the paid offer — solving one step of the journey, not the whole thing
- Title: outcome-first, specific numbers where possible, no fluff

REJECT any idea that:
- Could apply to anyone (too broad)
- Doesn't filter for the exact ICP
- Is a basic checklist or tip list with no transformation
- Has a vague title like "Ultimate Guide to X" or "5 Tips for Y"

GOOD examples of specific lead magnets:
- "The 15-Minute Morning Routine That Helped 47 Busy Mums Lose Their First 5kg Without Dieting"
- "The DM Script I Use to Book 3 Discovery Calls a Day (Copy-Paste Ready)"
- "The 3-Post Formula That Took Me From 500 to 10K Followers in 6 Weeks"

Return ONLY valid JSON array:
[
  {
    "title": "exact lead magnet title — specific, outcome-first, no fluff",
    "concept": "2-3 sentences: what's in it, what narrow problem it solves, why the ICP wants it immediately",
    "why_it_works": "1-2 sentences: which Hormozi principle this applies and why it filters for the right person and bridges to the paid offer",
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

    const kbContext = await fetchLeadMagnetKbContext()

    const prompt = `Write the full content for this lead magnet PDF for ${name}'s coaching business.

## Framework Reference
${kbContext.slice(0, 6000)}

---

Lead magnet: "${title}"
Concept: ${concept}
Creator profile:
${profileContext}

Structure:
${outline.map((s, i) => `Section ${i + 1}: ${s}`).join('\n')}

Rules:
- Write in a direct, no-fluff coaching voice — confident, specific, zero corporate speak
- Each section: 150-250 words of genuinely useful, actionable content
- This must be valuable enough that someone would pay for it — not a watered-down teaser
- Reference the creator's mechanism/system naturally where relevant
- Apply Hormozi's principle: solve ONE narrow problem completely, don't try to cover everything
- End with a soft CTA that bridges to the paid offer: "Want [next step]? DM me [soft keyword]"

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
