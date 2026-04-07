import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { profileId, month, postsPerWeek = 5 } = body as {
      profileId: string
      month: string
      postsPerWeek?: number
    }

    if (!profileId || !month) {
      return NextResponse.json(
        { error: 'profileId and month are required' },
        { status: 400 }
      )
    }

    // Validate month format YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: 'month must be in YYYY-MM format' },
        { status: 400 }
      )
    }

    const adminClient = getAdminClient()

    // Fetch onboarding data
    const { data: onboarding, error: onboardingError } = await adminClient
      .from('onboarding')
      .select('*')
      .eq('profile_id', profileId)
      .single()

    if (onboardingError && onboardingError.code !== 'PGRST116') {
      console.error('Onboarding fetch error:', onboardingError)
    }

    // Fetch content pillars
    const { data: pillars } = await adminClient
      .from('content_pillars')
      .select('pillar_name, avg_views, sample_hooks')
      .eq('profile_id', profileId)
      .order('avg_views', { ascending: false })
      .limit(5)

    // Build month date range info
    const [year, monthNum] = month.split('-').map(Number)
    const monthName = new Date(year, monthNum - 1, 1).toLocaleString('en-US', {
      month: 'long',
    })

    // Build client context string
    const clientContext = onboarding
      ? `
Client niche: ${onboarding.niche}
Target audience: ${onboarding.target_audience}
Main goal: ${onboarding.main_goal}
Biggest challenge: ${onboarding.biggest_challenge}
Brand voice: ${onboarding.brand_voice}
Content experience: ${onboarding.content_experience}
Monthly revenue: ${onboarding.monthly_revenue}
Unique story/background: ${onboarding.unique_story}
Why they joined CULT: ${onboarding.why_joined_cult}
Accounts they admire: ${onboarding.competitors_they_admire || 'Not specified'}
`.trim()
      : 'No onboarding data available — use general fitness/coaching content strategy.'

    const topPillarsContext =
      pillars && pillars.length > 0
        ? `\nTop performing content pillars:\n${pillars
            .map(
              (p) =>
                `- ${p.pillar_name} (avg ${p.avg_views?.toLocaleString() ?? '?'} views)${p.sample_hooks?.length ? ': e.g. "' + p.sample_hooks[0] + '"' : ''}`
            )
            .join('\n')}`
        : ''

    const systemPrompt = `You are Will Scott's AI content strategist for CULT coaching. Generate a month of Instagram Reel content for this client.
Return ONLY valid JSON array with this structure (one entry per day they should post):
[
  {
    "date": "2026-04-01",
    "day": "Wednesday",
    "format": "RAW STORY",
    "hook": "I made £0 for 6 months straight. Here's what changed.",
    "angle": "Brief description of the content angle",
    "cta": "DM CULT",
    "pillar": "Authenticity"
  }
]
Format types available: RAW STORY, LISTICLE, COMPARISON, TUTORIAL, POV, TRANSFORMATION, MYTH BUST, BEHIND SCENES, TESTIMONIAL, HOT TAKE
CTA options: "DM CULT" (for coaching promotion), "Comment AUDIT" (for lead magnet), "Follow for more"
Content pillars: mix based on what performs in their niche
Posting frequency: ${postsPerWeek} posts per week, spread them evenly.
Generate only the posting days, not every single day of the month.
Be specific with hooks — no generic fluff. Hooks should stop the scroll.`

    const userMessage = `Generate a full content calendar for ${monthName} ${year}.

${clientContext}
${topPillarsContext}

Month: ${month}
Posts per week: ${postsPerWeek}

Return ONLY the JSON array. No explanation, no markdown, no code fences. Pure JSON.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const rawText =
      response.content[0].type === 'text' ? response.content[0].text : ''

    // Strip any accidental markdown fences
    const jsonText = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim()

    let calendar: unknown[]
    try {
      calendar = JSON.parse(jsonText)
    } catch {
      console.error('Failed to parse calendar JSON:', rawText.slice(0, 500))
      return NextResponse.json(
        { error: 'Failed to parse AI response as JSON' },
        { status: 500 }
      )
    }

    if (!Array.isArray(calendar)) {
      return NextResponse.json(
        { error: 'AI returned unexpected format' },
        { status: 500 }
      )
    }

    // Save to content_calendars table
    const { data: saved, error: saveError } = await adminClient
      .from('content_calendars')
      .upsert(
        {
          profile_id: profileId,
          month,
          posts_per_week: postsPerWeek,
          entries: calendar,
          generated_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id,month' }
      )
      .select('id')
      .single()

    if (saveError) {
      console.error('Save error:', saveError)
      // Return the calendar anyway even if save failed
      return NextResponse.json({
        calendar,
        calendarId: null,
        warning: 'Calendar generated but could not be saved: ' + saveError.message,
      })
    }

    return NextResponse.json({
      calendar,
      calendarId: saved?.id ?? null,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('generate-calendar error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const profileId = searchParams.get('profileId')
    const month = searchParams.get('month')

    if (!profileId) {
      return NextResponse.json(
        { error: 'profileId query param is required' },
        { status: 400 }
      )
    }

    const adminClient = getAdminClient()

    let query = adminClient
      .from('content_calendars')
      .select('*')
      .eq('profile_id', profileId)
      .order('generated_at', { ascending: false })
      .limit(1)

    if (month) {
      query = adminClient
        .from('content_calendars')
        .select('*')
        .eq('profile_id', profileId)
        .eq('month', month)
        .order('generated_at', { ascending: false })
        .limit(1)
    }

    const { data, error } = await query.single()

    if (error && error.code === 'PGRST116') {
      // No rows found
      return NextResponse.json({ calendar: null, calendarId: null })
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      calendar: data?.entries ?? [],
      calendarId: data?.id ?? null,
      month: data?.month ?? null,
      postsPerWeek: data?.posts_per_week ?? null,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
