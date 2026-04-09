import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

// ─── POST — generate a full month ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { profileId, month, postsPerWeek = 5 } = body as {
      profileId: string; month: string; postsPerWeek?: number
    }
    if (!profileId || !month) return NextResponse.json({ error: 'profileId and month required' }, { status: 400 })
    if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: 'month must be YYYY-MM' }, { status: 400 })

    const db = adminClient()

    // ── Pull all context in parallel ────────────────────────────────────────
    const [
      { data: onboarding },
      { data: profile },
      { data: brandVoice },
      { data: pillars },
      { data: topReels },
    ] = await Promise.all([
      db.from('onboarding').select('*').eq('profile_id', profileId).single(),
      db.from('profiles').select('name, niche, target_audience, ninety_day_goal, biggest_challenge, intro_structured, content_pillars, monthly_revenue, why_joined').eq('id', profileId).single(),
      db.from('brand_voice').select('core_voice, hook_frameworks, script_examples, content_pillars_doc, key_phrases').eq('profile_id', profileId).single(),
      db.from('content_pillars').select('pillar_name, avg_views, sample_hooks').eq('profile_id', profileId).order('avg_views', { ascending: false }).limit(6),
      db.from('client_reels').select('hook, views, format_type').eq('profile_id', profileId).not('hook', 'is', null).neq('hook', '').order('views', { ascending: false }).limit(10),
    ])

    const [year, monthNum] = month.split('-').map(Number)
    const monthName = new Date(year, monthNum - 1, 1).toLocaleString('en-US', { month: 'long' })

    // ── Build rich context ──────────────────────────────────────────────────
    const intro = (profile?.intro_structured ?? {}) as Record<string, string>

    // Helper: read a field from intro_structured, trying multiple possible key names
    // Handles both string values and old-system array values (joins with newline)
    function iGet(...keys: string[]): string {
      for (const k of keys) {
        const v = intro[k]
        if (!v) continue
        if (Array.isArray(v) && v.length > 0) return (v as string[]).filter(Boolean).join('\n')
        if (typeof v === 'string' && v.trim()) return v.trim()
      }
      return ''
    }

    // ── Core identity ──────────────────────────────────────────────────────
    const name        = profile?.name || iGet('full_name') || 'Client'
    const niche       = iGet('specific_niche', 'niche') || onboarding?.niche || profile?.niche || ''
    const whatCoach   = iGet('what_you_coach', 'coaching_on') || ''
    const offerDesc   = iGet('offer_description', 'current_offer', 'offer') || ''
    const offerPrice  = iGet('offer_price', 'offer_cost', 'price') || ''
    const idealClient = iGet('ideal_client', 'target_audience') || onboarding?.target_audience || profile?.target_audience || ''
    const clientXform = iGet('client_transformation', 'transformation') || ''
    const mechanism   = iGet('unique_mechanism', 'framework', 'method', 'system') || ''
    const whyDiff     = iGet('why_different', 'what_makes_you_different', 'differentiator') || ''
    const revenue     = iGet('monthly_revenue_current', 'monthly_revenue') || onboarding?.monthly_revenue || profile?.monthly_revenue || ''
    const goal90      = iGet('goal_90_days', 'one_thing_6months') || profile?.ninety_day_goal || onboarding?.main_goal || ''
    const challenge   = iGet('biggest_problem', 'main_problem') || profile?.biggest_challenge || onboarding?.biggest_challenge || ''
    const brandVoiceStr = iGet('brand_voice', 'brand_description') || onboarding?.brand_voice || ''
    const contentStyle  = iGet('content_style', 'brand_description', 'engagement_type') || ''
    const hookStyle     = iGet('hook_style', 'hooks') || ''
    const topics        = iGet('topics_covered', 'content_topics') || profile?.content_pillars?.join(', ') || ''
    const personality   = iGet('personality_type', 'three_words') || ''
    const values        = iGet('values', 'worldview', 'core_values') || ''
    const platforms     = iGet('main_platforms', 'primary_platform', 'platforms') || ''

    // ── Story ──────────────────────────────────────────────────────────────
    // Old system used 'transformation_story' for origin story
    const originStory   = iGet('origin_story', 'transformation_story', 'your_story', 'background_story') || onboarding?.unique_story || ''
    // Old system: 'moments_wanted_to_quit', 'hard_times_personal' (arrays)
    const lowestPoint   = iGet('lowest_point', 'rock_bottom', 'moments_wanted_to_quit', 'hard_times_personal') || ''
    // Old system: 'moments_changed_perspective' (array)
    const turningPoint  = iGet('turning_point', 'breakthrough', 'moments_changed_perspective', 'when_things_changed') || ''
    const contentAngle  = iGet('content_angle', 'character', 'story_angle') || ''
    const funFact       = iGet('fun_fact', 'fun_outside_work', 'something_unknown') || ''
    const occupBefore   = iGet('occupation_before', 'before_coaching', 'previous_job') || ''

    // ── Proof & results ────────────────────────────────────────────────────
    const bestResult    = iGet('best_client_result', 'client_result') || ''
    const proof         = iGet('proof_results', 'proof_points', 'proof', 'results') || ''

    // ── Opinions & beliefs (content goldmines) ─────────────────────────────
    // Old system: 'niche_bullshit', 'take_on_career', 'take_on_social_media'
    const hotTake       = iGet('controversial_opinion', 'niche_bullshit', 'take_on_career', 'take_on_social_media', 'hot_take') || ''
    const whatHates     = iGet('what_you_hate', 'hate_in_industry', 'angry_frustrated_by') || ''
    // Old system: 'contrarian_beliefs' (array), 'worldview'
    const belief        = iGet('contrarian_beliefs', 'what_you_believe', 'worldview', 'unpopular_opinion') || ''
    // Old system: 'relationship_with_failure', 'take_on_money'
    const philosophy    = iGet('philosophy', 'relationship_with_failure', 'take_on_money', 'coaching_philosophy') || ''
    const whyCult       = iGet('why_cult', 'why_creator_cult', 'why_joined') || onboarding?.why_joined_cult || profile?.why_joined || ''

    // ── Assemble client profile section ────────────────────────────────────
    const clientSection = [
      `Name: ${name}`,
      niche         ? `Niche: ${niche}` : null,
      whatCoach     ? `What they coach: ${whatCoach}` : null,
      offerDesc     ? `Offer: ${offerDesc}${offerPrice ? ` (${offerPrice})` : ''}` : null,
      idealClient   ? `Ideal client: ${idealClient}` : null,
      clientXform   ? `#1 client transformation: ${clientXform}` : null,
      mechanism     ? `Unique method/framework: ${mechanism}` : null,
      whyDiff       ? `Why they're different: ${whyDiff}` : null,
      revenue       ? `Current monthly revenue: ${revenue}` : null,
      goal90        ? `90-day goal: ${goal90}` : null,
      challenge     ? `Biggest challenge right now: ${challenge}` : null,
      brandVoiceStr ? `Brand voice: ${brandVoiceStr}` : null,
      contentStyle  ? `Content style: ${contentStyle}` : null,
      hookStyle     ? `Preferred hook style: ${hookStyle}` : null,
      topics        ? `Topics/content pillars: ${topics}` : null,
      personality   ? `Personality: ${personality}` : null,
      values        ? `Personal values: ${values}` : null,
      platforms     ? `Platforms: ${platforms}` : null,
      occupBefore   ? `Background before coaching: ${occupBefore}` : null,
      funFact       ? `Fun fact: ${funFact}` : null,
      whyCult       ? `Why they joined CULT: ${whyCult}` : null,

      // Story section
      originStory  ? `\nTHEIR STORY:\n${originStory}` : null,
      lowestPoint  ? `Lowest point: ${lowestPoint}` : null,
      turningPoint ? `Turning point: ${turningPoint}` : null,
      contentAngle ? `Content angle/character: ${contentAngle}` : null,

      // Proof
      bestResult   ? `\nBEST CLIENT RESULT: ${bestResult}` : null,
      proof        ? `Other proof/results: ${proof}` : null,

      // Opinions — these are goldmines for hooks
      hotTake      ? `\nCONTROVERSIAL OPINION (use for HOT TAKE content): "${hotTake}"` : null,
      whatHates    ? `What they hate in their industry: "${whatHates}"` : null,
      belief       ? `Contrarian belief: "${belief}"` : null,
      philosophy   ? `Coaching philosophy: "${philosophy}"` : null,
    ].filter(Boolean).join('\n')

    const brandVoiceSection = brandVoice ? [
      brandVoice.core_voice ? `\nBRAND VOICE:\n${brandVoice.core_voice}` : null,
      brandVoice.hook_frameworks ? `\nHOOK FRAMEWORKS (use these patterns):\n${brandVoice.hook_frameworks}` : null,
      brandVoice.key_phrases ? `\nKEY PHRASES / LANGUAGE:\n${brandVoice.key_phrases}` : null,
      brandVoice.content_pillars_doc ? `\nCONTENT PILLARS:\n${brandVoice.content_pillars_doc}` : null,
      brandVoice.script_examples ? `\nSCRIPT EXAMPLES (mirror this style):\n${String(brandVoice.script_examples).slice(0, 800)}` : null,
    ].filter(Boolean).join('\n') : ''

    const pillarsSection = pillars?.length
      ? `\nTOP PERFORMING PILLARS:\n${pillars.map(p => `- ${p.pillar_name} (avg ${p.avg_views?.toLocaleString() ?? '?'} views)${p.sample_hooks?.length ? ': e.g. "' + p.sample_hooks[0] + '"' : ''}`).join('\n')}`
      : ''

    const topHooksSection = topReels?.length
      ? `\nTHEIR BEST PERFORMING HOOKS (mirror this style/tone):\n${topReels.map((r, i) => `${i + 1}. [${r.format_type || 'unknown'}] "${r.hook}" — ${r.views?.toLocaleString() ?? '?'} views`).join('\n')}`
      : ''

    // ── Prompt ──────────────────────────────────────────────────────────────
    const systemPrompt = `You are an expert Instagram content strategist for CULT — a high-ticket coaching programme run by Will Scott.

Your job is to generate a personalised month of Instagram Reel ideas for a CULT client.

RULES:
- Every hook must be specific to THIS client's niche, audience, story, and opinions. No generic content.
- Hooks must stop the scroll. Use the client's brand voice, language, and hook frameworks if provided.
- Use their origin story, lowest point, turning point — these are storytelling gold. Reference specific details.
- Use their controversial opinion, contrarian belief, what they hate — these power the best HOT TAKE hooks.
- Reference their unique method/framework by name if provided.
- Mirror the style of their best performing hooks where possible.
- Spread formats across the month. Don't repeat the same format back-to-back.
- CTAs should rotate: push for coaching DMs, lead magnets, or growth.
- Return ONLY a valid JSON array — no markdown, no explanation, no code fences.

JSON structure (one object per posting day):
[{"id":"<uuid>","date":"YYYY-MM-DD","day":"Monday","format":"RAW STORY","hook":"...","angle":"...","cta":"DM CULT","pillar":"...","source":"ai"}]

Format options: RAW STORY, LISTICLE, COMPARISON, TUTORIAL, POV, TRANSFORMATION, MYTH BUST, BEHIND SCENES, TESTIMONIAL, HOT TAKE
CTA options: "DM CULT", "Comment AUDIT", "Follow for more", "Link in bio"
source: always "ai" for generated entries`

    const userMessage = `Generate a full content calendar for ${monthName} ${year}.

CLIENT PROFILE:
${clientSection}
${brandVoiceSection}
${pillarsSection}
${topHooksSection}

Posting frequency: ${postsPerWeek} posts/week, evenly spread (skip some weekdays if needed — do NOT skip weekends).
Month: ${month}
Total posts target: ~${Math.round(postsPerWeek * 4.3)} posts

Generate ONLY posting days (not every day). Each entry needs a fresh uuid for the "id" field.
Return ONLY the JSON array. Pure JSON, nothing else.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    let calendar: Record<string, unknown>[]
    try {
      calendar = JSON.parse(jsonText)
    } catch {
      console.error('[generate-calendar] JSON parse failed:', rawText.slice(0, 400))
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }
    if (!Array.isArray(calendar)) return NextResponse.json({ error: 'AI returned unexpected format' }, { status: 500 })

    // Ensure every entry has a unique id and source
    calendar = calendar.map(e => ({
      ...e,
      id: typeof e.id === 'string' && e.id.length > 8 ? e.id : randomUUID(),
      source: 'ai',
    }))

    // Save — preserve any existing user-added entries
    const { data: existing } = await db.from('content_calendars').select('entries').eq('profile_id', profileId).eq('month', month).single()
    const existingEntries = (Array.isArray(existing?.entries) ? existing.entries : []) as Record<string, unknown>[]
    const userEntries = existingEntries.filter(e => e.source === 'user')

    // Merge: user entries take precedence on their dates; AI fills the rest
    const aiDates = new Set(calendar.map(e => e.date))
    const userOnAiDates = userEntries.filter(e => aiDates.has(e.date as string))
    const userOnOtherDates = userEntries.filter(e => !aiDates.has(e.date as string))
    // Replace AI entry with user entry on same date
    const mergedCalendar = [
      ...calendar.filter(e => !userOnAiDates.some(u => u.date === e.date)),
      ...userOnAiDates,
      ...userOnOtherDates,
    ].sort((a, b) => String(a.date).localeCompare(String(b.date)))

    const { data: saved, error: saveError } = await db
      .from('content_calendars')
      .upsert({ profile_id: profileId, month, posts_per_week: postsPerWeek, entries: mergedCalendar, generated_at: new Date().toISOString() }, { onConflict: 'profile_id,month' })
      .select('id').single()

    if (saveError) {
      console.error('[generate-calendar] save error:', saveError.message)
      return NextResponse.json({ calendar: mergedCalendar, calendarId: null, warning: 'Generated but not saved: ' + saveError.message })
    }

    return NextResponse.json({ calendar: mergedCalendar, calendarId: saved?.id ?? null })

  } catch (err) {
    console.error('[generate-calendar] error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}

// ─── GET — load saved calendar ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const profileId = searchParams.get('profileId')
    const month = searchParams.get('month')
    if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })

    const db = adminClient()
    let query = db.from('content_calendars').select('*').eq('profile_id', profileId).order('generated_at', { ascending: false }).limit(1)
    if (month) query = db.from('content_calendars').select('*').eq('profile_id', profileId).eq('month', month).order('generated_at', { ascending: false }).limit(1)

    const { data, error } = await query.single()
    if (error?.code === 'PGRST116') return NextResponse.json({ calendar: [], calendarId: null })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Backfill IDs for any legacy entries that were saved without them
    const rawEntries = (Array.isArray(data?.entries) ? data.entries : []) as Record<string, unknown>[]
    const needsBackfill = rawEntries.some(e => typeof e.id !== 'string' || e.id.length < 8)
    let calendar = rawEntries
    if (needsBackfill && data?.id) {
      calendar = rawEntries.map(e => ({
        ...e,
        id: typeof e.id === 'string' && e.id.length > 8 ? e.id : randomUUID(),
      }))
      // Persist backfilled IDs silently
      db.from('content_calendars').update({ entries: calendar }).eq('id', data.id).then(() => {})
    }

    return NextResponse.json({ calendar, calendarId: data?.id ?? null, month: data?.month, postsPerWeek: data?.posts_per_week })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}

// ─── PATCH — update or add a single entry ────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const { profileId, month, entry } = await req.json() as {
      profileId: string
      month: string
      entry: Record<string, unknown>
    }
    if (!profileId || !month || !entry) return NextResponse.json({ error: 'profileId, month, entry required' }, { status: 400 })

    const db = adminClient()
    const { data: existing } = await db.from('content_calendars').select('id, entries').eq('profile_id', profileId).eq('month', month).single()

    const entries = (Array.isArray(existing?.entries) ? existing.entries : []) as Record<string, unknown>[]
    const entryId = entry.id as string

    let updated: Record<string, unknown>[]
    if (entryId && entries.some(e => e.id === entryId)) {
      // Update existing
      updated = entries.map(e => e.id === entryId ? { ...e, ...entry } : e)
    } else {
      // Add new — give it an id if missing
      const newEntry: Record<string, unknown> = { ...entry, id: entryId || randomUUID(), source: (entry.source as string) ?? 'user' }
      updated = [...entries, newEntry].sort((a, b) => String(a.date).localeCompare(String(b.date)))
    }

    if (existing?.id) {
      await db.from('content_calendars').update({ entries: updated }).eq('id', existing.id)
    } else {
      await db.from('content_calendars').insert({ profile_id: profileId, month, entries: updated, generated_at: new Date().toISOString() })
    }

    return NextResponse.json({ ok: true, entries: updated })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}

// ─── DELETE — remove a single entry ──────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const { profileId, month, entryId } = await req.json() as { profileId: string; month: string; entryId: string }
    if (!profileId || !month || !entryId) return NextResponse.json({ error: 'profileId, month, entryId required' }, { status: 400 })

    const db = adminClient()
    const { data: existing } = await db.from('content_calendars').select('id, entries').eq('profile_id', profileId).eq('month', month).single()
    if (!existing) return NextResponse.json({ error: 'Calendar not found' }, { status: 404 })

    const entries = (Array.isArray(existing.entries) ? existing.entries : []) as Record<string, unknown>[]
    const updated = entries.filter(e => e.id !== entryId)

    await db.from('content_calendars').update({ entries: updated }).eq('id', existing.id)
    return NextResponse.json({ ok: true, entries: updated })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
