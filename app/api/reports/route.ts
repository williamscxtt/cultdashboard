import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(request: Request) {
  const body = await request.json()
  const { profileId, weekStart } = body
  if (!profileId || !weekStart) {
    return NextResponse.json({ error: 'profileId and weekStart are required' }, { status: 400 })
  }

  // Fetch profile, onboarding, and recent reels
  const [profileRes, onboardingRes, reelsRes] = await Promise.all([
    adminClient.from('profiles').select('*').eq('id', profileId).single(),
    adminClient.from('onboarding').select('*').eq('profile_id', profileId).single(),
    adminClient
      .from('client_reels')
      .select('*')
      .eq('profile_id', profileId)
      .gte('date', weekStart)
      .order('date', { ascending: false })
      .limit(20),
  ])

  const profile = profileRes.data
  const onboarding = onboardingRes.data
  const reels = reelsRes.data || []

  const reelsSummary = reels.length > 0
    ? reels.map((r: Record<string, unknown>) =>
        `- ${r.date}: ${r.views} views, ${r.likes} likes, ${r.comments} comments, hook: "${r.hook || 'N/A'}"`
      ).join('\n')
    : 'No reels data for this week.'

  const userPrompt = `
Client: ${profile?.name || 'Unknown'} (@${profile?.ig_username || 'N/A'})
Niche: ${onboarding?.niche || 'N/A'}
Goal: ${onboarding?.main_goal || 'N/A'}
Week starting: ${weekStart}

Reels this week:
${reelsSummary}

Total reels: ${reels.length}
`

  let reportJson: Record<string, unknown>
  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: `You are Will Scott reviewing a client's week. Generate a coaching progress report.
Return ONLY valid JSON:
{
  "week_summary": "One sentence summary of their week",
  "metrics": {
    "posts_count": 5,
    "avg_views": 12400,
    "top_reel_views": 45000,
    "engagement_rate": 4.2,
    "follower_change": 234
  },
  "what_worked": ["Point 1", "Point 2", "Point 3"],
  "what_needs_work": ["Point 1", "Point 2"],
  "coach_feedback": "Direct, personalised paragraph from Will's voice about this client's week. Reference their specific numbers. Be direct, no fluff.",
  "next_week_focus": ["Priority 1", "Priority 2", "Priority 3"],
  "health_status": "green",
  "health_reason": "On track — posting consistently, views trending up"
}
health_status: "green" (on track), "amber" (slipping — missed posts or declining views), "red" (at risk — hasn't posted in 5+ days or very low engagement)`,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
    // Strip markdown code fences if present
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    reportJson = JSON.parse(jsonText)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to generate report from AI', detail: String(err) }, { status: 500 })
  }

  // Save report to Supabase
  const { data: savedReport, error: saveError } = await adminClient
    .from('client_progress_reports')
    .insert({
      profile_id: profileId,
      week_start: weekStart,
      report_data: reportJson,
    })
    .select()
    .single()

  if (saveError) {
    // Return the report even if saving fails
    return NextResponse.json({ report: { ...reportJson, week_start: weekStart, profile_id: profileId } })
  }

  return NextResponse.json({ report: savedReport })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const profileId = searchParams.get('profileId')

  let query = adminClient
    .from('client_progress_reports')
    .select('*')
    .order('week_start', { ascending: false })

  if (profileId) {
    query = query.eq('profile_id', profileId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reports: data || [] })
}
