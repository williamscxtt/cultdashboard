import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { profileId, weekStart } = body
  if (!profileId || !weekStart) {
    return NextResponse.json({ error: 'profileId and weekStart are required' }, { status: 400 })
  }

  // Fetch all client data in parallel — profile + real activity data
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const weekEndStr = weekEnd.toISOString().split('T')[0]

  const [profileRes, weeklyLogRes, contentLogRes, outreachRes, dmSalesRes, knowledgeRes] = await Promise.all([
    adminClient.from('profiles').select('*').eq('id', profileId).single(),
    adminClient.from('weekly_log').select('*').eq('profile_id', profileId).order('date', { ascending: false }).limit(4),
    adminClient.from('content_log_entries').select('*').eq('profile_id', profileId)
      .gte('date_posted', weekStart).lte('date_posted', weekEndStr),
    adminClient.from('daily_outreach').select('*').eq('profile_id', profileId)
      .gte('date', weekStart).lte('date', weekEndStr),
    adminClient.from('dm_sales').select('lead_name, stage, deal_value, revenue, follow_up_date, pain_points').eq('profile_id', profileId)
      .order('created_at', { ascending: false }).limit(20),
    adminClient.from('knowledge_documents').select('title, content').limit(5),
  ])

  const profile = profileRes.data
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const intro = (profile.intro_structured ?? {}) as Record<string, string>
  const weeklyLogs = weeklyLogRes.data ?? []
  const contentLogs = contentLogRes.data ?? []
  const outreachLogs = outreachRes.data ?? []
  const dmSales = dmSalesRes.data ?? []

  // This week's log (most recent entry in range)
  const thisWeekLog = weeklyLogs[0]

  // Content stats
  const totalViews = contentLogs.reduce((s, r) => s + (r.views ?? 0), 0)
  const avgViews = contentLogs.length ? Math.round(totalViews / contentLogs.length) : 0
  const topReel = [...contentLogs].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))[0]
  const totalDmsFromContent = contentLogs.reduce((s, r) => s + (r.dms_from_post ?? 0), 0)

  // Outreach stats
  const totalDmsSent = outreachLogs.reduce((s, r) => s + (r.dms_sent ?? 0), 0)
  const totalResponses = outreachLogs.reduce((s, r) => s + (r.responses ?? 0), 0)
  const totalLeads = outreachLogs.reduce((s, r) => s + (r.qualified_leads ?? 0), 0)

  // DM Sales active pipeline
  const openDeals = dmSales.filter(d => !['Closed Won', 'Closed Lost'].includes(d.stage ?? ''))
  const closedWon = dmSales.filter(d => d.stage === 'Closed Won')
  const closedRevenue = closedWon.reduce((s, d) => s + (Number(d.revenue) || Number(d.deal_value) || 0), 0)

  const contextSummary = `
CLIENT: ${profile.name} (@${profile.ig_username || 'N/A'})
Niche: ${intro.specific_niche || intro.what_you_coach || profile.niche || 'N/A'}
Ideal client: ${intro.ideal_client || profile.target_audience || 'N/A'}
Current revenue: ${intro.monthly_revenue || profile.monthly_revenue || 'N/A'}
90-day goal: ${intro.goal_90_days || profile.ninety_day_goal || 'N/A'}
Biggest challenge: ${intro.biggest_problem || profile.biggest_challenge || 'N/A'}
Phase: ${profile.phase_number ? `Phase ${profile.phase_number}` : 'N/A'}

WEEK OF ${weekStart}:

Content posted: ${contentLogs.length} reels
${contentLogs.length > 0 ? `Total views: ${totalViews.toLocaleString()}, Avg: ${avgViews.toLocaleString()}, DMs from content: ${totalDmsFromContent}` : 'No content logged this week.'}
${topReel ? `Best reel: "${topReel.hook}" — ${(topReel.views ?? 0).toLocaleString()} views [${topReel.format}]` : ''}

Weekly check-in data:
${thisWeekLog ? `Followers: ${thisWeekLog.followers_total?.toLocaleString() ?? 'N/A'}, Reels: ${thisWeekLog.reels_posted ?? 'N/A'}, Calls booked: ${thisWeekLog.calls_booked ?? 'N/A'}, Clients signed: ${thisWeekLog.clients_signed ?? 'N/A'}, Revenue: £${thisWeekLog.revenue ?? 'N/A'}
Biggest win: ${thisWeekLog.biggest_win || 'None logged'}
Bottleneck: ${thisWeekLog.biggest_bottleneck || 'None logged'}` : 'No weekly check-in logged.'}

Outreach this week: ${totalDmsSent} DMs sent, ${totalResponses} responses, ${totalLeads} qualified leads

Sales pipeline: ${openDeals.length} open deals, ${closedWon.length} closed this month, £${closedRevenue.toLocaleString()} closed revenue
`

  let reportJson: Record<string, unknown>
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: `You are Will Scott — personal brand coach reviewing a client's week. Write a coaching progress report based on their real data.

Return ONLY valid JSON with no markdown fences:
{
  "week_summary": "One direct sentence summary of their week based on their actual numbers",
  "metrics": {
    "posts_count": 0,
    "avg_views": 0,
    "top_reel_views": 0,
    "dms_from_content": 0,
    "calls_booked": 0,
    "clients_signed": 0,
    "outreach_sent": 0,
    "open_deals": 0
  },
  "what_worked": ["Specific point referencing their data", "..."],
  "what_needs_work": ["Specific point referencing their data", "..."],
  "coach_feedback": "2-3 paragraph direct, personalised coaching note from Will. Reference their exact numbers. Call out what's good and what's not. No fluff. Sound like a coach who knows them.",
  "next_week_focus": ["Specific action 1", "Specific action 2", "Specific action 3"],
  "health_status": "green",
  "health_reason": "Short reason — e.g. posting consistently, views up"
}
health_status: "green" (on track), "amber" (slipping), "red" (at risk — hasn't posted or very low activity)`,
      messages: [{ role: 'user', content: contextSummary }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    reportJson = JSON.parse(jsonText)

    // Inject real metrics
    reportJson.metrics = {
      posts_count: contentLogs.length,
      avg_views: avgViews,
      top_reel_views: topReel?.views ?? 0,
      dms_from_content: totalDmsFromContent,
      calls_booked: thisWeekLog?.calls_booked ?? 0,
      clients_signed: thisWeekLog?.clients_signed ?? 0,
      outreach_sent: totalDmsSent,
      open_deals: openDeals.length,
      ...(typeof reportJson.metrics === 'object' ? reportJson.metrics as object : {}),
    }
  } catch (err) {
    return NextResponse.json({ error: 'Failed to generate report', detail: String(err) }, { status: 500 })
  }

  const { data: savedReport, error: saveError } = await adminClient
    .from('client_progress_reports')
    .insert({ profile_id: profileId, week_start: weekStart, report_data: reportJson })
    .select()
    .single()

  if (saveError) {
    return NextResponse.json({ report: { id: 'unsaved', profile_id: profileId, week_start: weekStart, report_data: reportJson, created_at: new Date().toISOString() } })
  }

  return NextResponse.json({ report: savedReport })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const profileId = searchParams.get('profileId')

  let query = adminClient
    .from('client_progress_reports')
    .select('*')
    .order('week_start', { ascending: false })

  if (profileId) query = query.eq('profile_id', profileId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reports: data || [] })
}
