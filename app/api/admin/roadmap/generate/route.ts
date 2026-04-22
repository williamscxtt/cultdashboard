/**
 * POST { profileId } — generates a 90-day roadmap for a client using Claude.
 * Stores the result in profiles.roadmap_json + profiles.roadmap_generated_at.
 * Admin-only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 300

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

export async function POST(req: NextRequest) {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { profileId } = await req.json()
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })

  // Fetch profile
  const { data: profile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Fetch top reels
  const { data: reels } = await adminClient
    .from('client_reels')
    .select('reel_id, date, views, likes, comments, caption, hook, transcript, format_type, duration_sec')
    .eq('profile_id', profileId)
    .order('views', { ascending: false })
    .limit(15)

  const s = profile.intro_structured ?? {}
  const transcripts = (profile.call_transcripts ?? []) as Array<{ label: string; content: string; added_at: string }>

  // Build context block
  const profileContext = `
CLIENT PROFILE
==============
Name: ${profile.name || 'Unknown'}
Age: ${s.age || 'Not provided'}
Location: ${s.location || 'Not provided'}
Instagram: @${profile.ig_username || 'Not set'} (${(profile.followers_count ?? 0).toLocaleString()} followers)
Current Monthly Revenue: ${s.monthly_revenue_current || profile.monthly_revenue || '£0'}
Goal (90 days): ${s.goal_90_days || 'Not set'}
Goal (12 months): ${s.goal_12_months || 'Not set'}
Follower goal (90 days): ${s.follower_goal_90 || 'Not set'}

NICHE
-----
${profile.niche || s.specific_niche || 'Not set'}

IDEAL CLIENT
------------
${profile.target_audience || s.ideal_client || 'Not set'}

CLIENT TRANSFORMATION DELIVERED
--------------------------------
${s.client_transformation || 'Not set'}

OFFER
-----
Name/Mechanism: ${s.unique_mechanism || s.story_mechanism_name || 'Not set'}
Description: ${s.offer_description || 'Not set'}
Price: ${s.offer_price || 'Not set'}
Active clients: ${s.active_clients || '0'}

ORIGIN STORY / TRANSFORMATION
------------------------------
${s.story_transformation || s.origin_story || 'Not provided'}

LOWEST POINT
------------
${s.lowest_point || 'Not provided'}

TURNING POINT
-------------
${s.turning_point || 'Not provided'}

UNIQUE MECHANISM / WHY DIFFERENT
---------------------------------
${s.why_different || s.unique_mechanism || 'Not provided'}

CONTROVERSIAL OPINION
---------------------
${s.controversial_opinion || 'Not provided'}

CONTENT ANGLE / POSITIONING
----------------------------
${s.content_angle || 'Not provided'}

BRAND VOICE
-----------
${s.brand_voice || profile.niche || 'Not provided'}

HOOK STYLE
----------
${s.hook_style || 'Not provided'}

BIGGEST PROBLEM RIGHT NOW
-------------------------
${profile.biggest_challenge || s.biggest_problem || 'Not provided'}

WHAT HAS HELD THEM BACK
------------------------
${s.what_held_back || 'Not provided'}

WHAT THEY HAVE TRIED BEFORE
-----------------------------
${s.what_tried_before || 'Not provided'}

PREVIOUS COACHES / PROGRAMS
----------------------------
${s.previous_coaches || 'None mentioned'}

BEST RESULT TO DATE (BEST CLIENT RESULT / OWN TRANSFORMATION)
--------------------------------------------------------------
${s.best_client_result || s.story_best_client_result || 'Not provided'}

WHAT SUCCESS LOOKS LIKE FOR THEM
----------------------------------
${s.what_success_looks_like || 'Not provided'}

CONTENT CONSISTENCY HISTORY
-----------------------------
${s.content_consistency || 'Not provided'}

AVERAGE VIEWS
-------------
${s.avg_views || s.story_avg_views || 'Not provided'}

BEST PERFORMING CONTENT SO FAR
--------------------------------
${s.best_performing_content || 'Not provided'}

WHAT THEY HATE IN THE INDUSTRY
--------------------------------
${s.what_you_hate || 'Not provided'}

PHILOSOPHY
----------
${s.philosophy || 'Not provided'}

WHY THEY JOINED CREATOR CULT
------------------------------
${profile.why_joined || s.why_cult || 'Not provided'}

DM EXPERIENCE
-------------
${s.dm_sales_experience || 'Not provided'}

OCCUPATION BEFORE
-----------------
${s.occupation_before || 'Not provided'}
`.trim()

  const reelsContext = reels && reels.length > 0
    ? `
TOP PERFORMING REELS (by views)
================================
${reels.map((r, i) => `${i + 1}. ${r.views?.toLocaleString()} views | ${r.likes} likes | ${r.comments} comments | ${r.format_type || 'Unknown'} | ${r.date}
   Caption: ${(r.caption || '').slice(0, 200)}
   Hook/Transcript: ${(r.hook || r.transcript || '').slice(0, 200)}
`).join('\n')}`
    : '\nNo reels synced yet.'

  const transcriptContext = transcripts.length > 0
    ? `
CALL TRANSCRIPTS
================
${transcripts.map(t => `--- ${t.label} (${new Date(t.added_at).toLocaleDateString('en-GB')}) ---\n${t.content}`).join('\n\n')}`
    : '\nNo call transcript available — build from form data only.'

  const systemPrompt = `You are Will Scott, the founder of Creator Cult. You are building a personalised 90-day roadmap document for a client.

Your job is to produce a fully custom, high-value plan that Will sends to each client after their onboarding call. Every section must reference specific things from this person's form — specific stories, specific numbers, specific fears. If it could have been written for anyone, it is not good enough.

WILL'S VOICE AND TONE RULES:
- British directness. Short sentences. No corporate language.
- No em dashes. No buzzwords. No filler phrases.
- Write like Will talks — calm, certain, direct, occasionally blunt. Warm but never soft.
- No excessive bolding in body text. Conversational prose, not bullet-point essays.
- Age 19-27 register doesn't apply here — this client is 46. Adjust accordingly.
- The document should feel like advice from someone who has done this and knows exactly what they're talking about.

OUTPUT: Return ONLY valid JSON. No markdown. No code blocks. No explanation. Just the raw JSON object.`

  const userPrompt = `${profileContext}
${reelsContext}
${transcriptContext}

Build the complete 90-day roadmap for this client. Return ONLY valid JSON matching this exact schema:

{
  "cover": {
    "one_liner": "Single sentence capturing their honest state of play right now",
    "stats": [
      {"label": "Followers", "value": "45,712"},
      {"label": "Avg Views", "value": "~1,500"},
      {"label": "Monthly Revenue", "value": "£0"},
      {"label": "Time Posting", "value": "~5 months (with breaks)"}
    ]
  },
  "strengths": [
    "Full sentence — specific credibility asset they have. Not generic praise.",
    "..."
  ],
  "gaps": [
    "Full sentence — specific thing standing between where they are and results.",
    "..."
  ],
  "offer": {
    "name": "Programme name",
    "description": "2-3 sentence description of the offer and what it delivers",
    "delivery_structure": ["Line 1 of how it's delivered", "Line 2", "..."],
    "founding_rate": "£X for first 3 clients",
    "full_rate": "£X once first results are in",
    "cta_keyword": "Single word for ManyChat DM trigger",
    "bio_rewrite": "New one-line bio — specific to them",
    "pricing_rationale": "1-2 sentences explaining the founding rate logic and when to raise it"
  },
  "immediate_actions": [
    {"action": "Short action title", "detail": "Specific instruction — what exactly to do"},
    ...
  ],
  "content": {
    "problem_diagnosis": "2-3 sentences diagnosing their specific content problem from the data",
    "brand_sentence": "The one sentence they repeat in every piece of content. Built from their story.",
    "pillars": [
      {
        "name": "Pillar name",
        "format": "Format type and purpose",
        "angle": "Specific angle for this client — lines they could literally say"
      }
    ],
    "video_structure": [
      {"element": "Hook (0–3s)", "detail": "Specific hook approach for their delivery style"},
      {"element": "Text hook", "detail": "..."},
      {"element": "Story (3–35s)", "detail": "..."},
      {"element": "Value", "detail": "..."},
      {"element": "CTA (35–45s)", "detail": "..."},
      {"element": "Delivery note", "detail": "..."}
    ]
  },
  "scripts": [
    {
      "title": "Script name",
      "why": "One sentence — why this script is important and what it establishes",
      "order": 1,
      "cornerstone": true,
      "hook": "Exact first words out of their mouth. No intro. No 'hey guys'. Start mid-sentence.",
      "body": "Full script body written as spoken word. Short lines. Natural pauses. Under 50 seconds talking head. Written exactly as they would say it.",
      "cta": "DM me [keyword]"
    }
  ],
  "phases": [
    {
      "phase": 1,
      "subtitle": "Foundation",
      "description": "One sentence describing Phase 1",
      "colour": "3B82F6",
      "tasks": [
        {"task": "Task name", "what": "What it involves", "when": "Day X–Y"},
        ...
      ],
      "targets": ["Specific measurable target by Day 30", "..."]
    },
    {
      "phase": 2,
      "subtitle": "First Clients",
      "description": "One sentence",
      "colour": "7C3AED",
      "prose": "2-3 paragraphs of what happens in Phase 2. Specific to their situation.",
      "targets": ["Specific measurable target by Day 60", "..."]
    },
    {
      "phase": 3,
      "subtitle": "Scale",
      "description": "One sentence",
      "colour": "D97706",
      "prose": "2-3 paragraphs of what happens in Phase 3. Specific to their revenue goal.",
      "targets": ["Specific measurable target by Day 90", "..."]
    }
  ],
  "checkin": [
    {"item": "Check-in item", "report": "What to report — specific to their offer/situation"},
    ...
  ],
  "closing": "Will's personal message to Matt. References 3-4 specific things from the form. Names the most important video to film first. Ends on one direct sentence. Not motivational. Direct. Like something Will would actually say in person."
}

RULES:
- Every string must reference specific details from Matt's profile — his cancer story, the ARC Method, the corporate job, his age, his specific stats.
- Scripts must be written as spoken word — the exact words he would say. Under 50 seconds. Specific to his story.
- The closing must feel personal and direct — not a template.
- Do not write anything that could apply to any client. Every paragraph should have at least one detail that would be wrong if applied to someone else.
- Return ONLY the JSON. Nothing else.`

  let roadmapJson: Record<string, unknown>
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
    // Strip any accidental markdown code fences
    const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
    roadmapJson = JSON.parse(clean)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Generation failed'
    console.error('[roadmap/generate]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // Store in DB
  const { error: saveErr } = await adminClient
    .from('profiles')
    .update({
      roadmap_json: roadmapJson,
      roadmap_generated_at: new Date().toISOString(),
    })
    .eq('id', profileId)

  if (saveErr) return NextResponse.json({ error: saveErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, generated_at: new Date().toISOString() })
}
