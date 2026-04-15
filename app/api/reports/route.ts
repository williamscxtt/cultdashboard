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
  const { profileId, weekStart: weekStartIn } = body
  if (!profileId) {
    return NextResponse.json({ error: 'profileId is required' }, { status: 400 })
  }

  // Compute weekStart SERVER-SIDE (Vercel runs UTC — always correct).
  // Rolling 7-day window so recent reels are never missed.
  const weekStart = weekStartIn ?? (() => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - 7)
    return d.toISOString().split('T')[0]
  })()

  // +9 day upper bound so reels posted today are always included
  const weekEnd = new Date(weekStart + 'T00:00:00Z')
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 9)
  const weekEndStr = weekEnd.toISOString().split('T')[0]

  // Fetch 30 days of reels so we have an avg baseline
  const thirtyDaysAgo = new Date(weekStart)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [profileRes, weeklyLogRes, reelsThisWeekRes, reelsBaselineRes, followersRes, dmSalesRes, auditHistoryRes, storyCountRes] = await Promise.all([
    adminClient.from('profiles').select('*').eq('id', profileId).single(),
    adminClient.from('weekly_log').select('*').eq('profile_id', profileId).order('date', { ascending: false }).limit(4),
    // Reels posted THIS week (date column = when they posted)
    adminClient.from('client_reels')
      .select('reel_id, views, likes, comments, hook, format_type, date, caption, transcript')
      .eq('profile_id', profileId)
      .gte('date', weekStart)
      .lte('date', weekEndStr),
    // All recent reels for avg baseline
    adminClient.from('client_reels')
      .select('views, likes, comments')
      .eq('profile_id', profileId)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .limit(60),
    // Follower snapshots for change calc
    adminClient.from('follower_snapshots')
      .select('date, count')
      .eq('profile_id', profileId)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(35),
    adminClient.from('dm_sales')
      .select('lead_name, source, stage, deal_value, revenue, created_at')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(20),
    // Profile audit history — last 5 for trend
    adminClient.from('profile_audits')
      .select('overall_score, verdict, created_at')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(5),
    // Story sequences generated this week
    adminClient.from('story_sequences')
      .select('sequence_type, created_at')
      .eq('profile_id', profileId)
      .gte('created_at', weekStart)
      .order('created_at', { ascending: false }),
  ])

  const profile = profileRes.data
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const intro = (profile.intro_structured ?? {}) as Record<string, string>
  const weeklyLogs = weeklyLogRes.data ?? []
  const reelsThisWeek = reelsThisWeekRes.data ?? []
  const reelsBaseline = reelsBaselineRes.data ?? []
  const followers = followersRes.data ?? []
  const dmSales = dmSalesRes.data ?? []
  const auditHistory = auditHistoryRes.data ?? []
  const storiesThisWeek = storyCountRes.data ?? []

  const thisWeekLog = weeklyLogs[0]

  // ── Content metrics ───────────────────────────────────────────────────────
  const totalViews = reelsThisWeek.reduce((s, r) => s + (r.views ?? 0), 0)
  const avgViews = reelsThisWeek.length ? Math.round(totalViews / reelsThisWeek.length) : 0
  const topReel = [...reelsThisWeek].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))[0]

  // Baseline avg for comparison
  const baselineAvgViews = reelsBaseline.length
    ? Math.round(reelsBaseline.reduce((s, r) => s + (r.views ?? 0), 0) / reelsBaseline.length)
    : 0

  // Engagement rate (likes + comments / views)
  const totalLikes = reelsThisWeek.reduce((s, r) => s + (r.likes ?? 0), 0)
  const totalComments = reelsThisWeek.reduce((s, r) => s + (r.comments ?? 0), 0)
  const engagementRate = totalViews > 0
    ? parseFloat(((totalLikes + totalComments) / totalViews * 100).toFixed(1))
    : 0

  // Follower change
  const followerChange = followers.length >= 2
    ? followers[followers.length - 1].count - followers[0].count
    : null
  const latestFollowers = followers.length ? followers[followers.length - 1].count : null

  // Sales tracker (simplified — all logged sales)
  const allSales = dmSales.filter(d => d.deal_value != null || d.revenue != null)
  const closedRevenue = allSales.reduce((s, d) => s + (Number(d.revenue) || Number(d.deal_value) || 0), 0)
  const salesThisWeek = dmSales.filter(d => d.created_at >= weekStart)

  // Profile audit trend
  const latestAudit = auditHistory[0]
  const prevAudit = auditHistory[1]
  const auditTrend = latestAudit
    ? prevAudit
      ? `Latest audit: ${latestAudit.overall_score?.toFixed(1)}/10 (${latestAudit.verdict}) on ${new Date(latestAudit.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — prev: ${prevAudit.overall_score?.toFixed(1)}/10 (${prevAudit.verdict}) — change: ${latestAudit.overall_score > prevAudit.overall_score ? '+' : ''}${(latestAudit.overall_score - prevAudit.overall_score).toFixed(1)}`
      : `Latest audit: ${latestAudit.overall_score?.toFixed(1)}/10 (${latestAudit.verdict}) on ${new Date(latestAudit.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — first audit`
    : null

  // Format breakdown for this week
  const formatCounts: Record<string, number> = {}
  reelsThisWeek.forEach(r => { if (r.format_type) formatCounts[r.format_type] = (formatCounts[r.format_type] ?? 0) + 1 })
  const topFormat = Object.entries(formatCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const contextSummary = `
CLIENT: ${profile.name} (@${profile.ig_username || 'N/A'})
Niche: ${intro.specific_niche || intro.what_you_coach || profile.niche || 'N/A'}
Ideal client: ${intro.ideal_client || profile.target_audience || 'N/A'}
Current revenue: ${intro.monthly_revenue || profile.monthly_revenue || 'N/A'}
90-day goal: ${intro.goal_90_days || profile.ninety_day_goal || 'N/A'}
Biggest challenge: ${intro.biggest_problem || profile.biggest_challenge || 'N/A'}
Phase: ${profile.phase_number ? `Phase ${profile.phase_number}` : 'N/A'}

WEEK OF ${weekStart}:

Content posted this week: ${reelsThisWeek.length} reels
${reelsThisWeek.length > 0
  ? `Total views: ${totalViews.toLocaleString()}
Avg views: ${avgViews.toLocaleString()} (vs their 30-day baseline of ${baselineAvgViews.toLocaleString()})
Engagement rate: ${engagementRate}%
Top format this week: ${topFormat ?? 'mixed'}
Top reel: "${topReel?.hook ?? topReel?.caption?.slice(0, 60) ?? '(no hook)'}" — ${(topReel?.views ?? 0).toLocaleString()} views [${topReel?.format_type ?? 'unknown'}]`
  : 'No reels tracked this week (may not have posted yet or date range mismatch)'
}

Weekly check-in data:
${thisWeekLog
  ? `Followers: ${thisWeekLog.followers_total?.toLocaleString() ?? latestFollowers?.toLocaleString() ?? 'N/A'}
Follower change this period: ${followerChange !== null ? (followerChange >= 0 ? '+' : '') + followerChange : 'N/A'}
Reels posted (logged): ${thisWeekLog.reels_posted ?? 'N/A'}
Calls booked: ${thisWeekLog.calls_booked ?? 0}
Clients signed: ${thisWeekLog.clients_signed ?? 0}
Revenue: £${thisWeekLog.revenue ?? 0}
Biggest win: ${thisWeekLog.biggest_win || 'None logged'}
Bottleneck: ${thisWeekLog.biggest_bottleneck || 'None logged'}`
  : `No weekly check-in logged. Follower change: ${followerChange !== null ? (followerChange >= 0 ? '+' : '') + followerChange : 'N/A'}`
}

Sales logged: ${allSales.length} total, £${closedRevenue.toLocaleString()} total revenue${salesThisWeek.length > 0 ? `, ${salesThisWeek.length} new sale(s) this week: ${salesThisWeek.map(s => `${s.lead_name || 'Client'} — ${s.source || 'unknown offer'} (£${Number(s.deal_value ?? s.revenue ?? 0).toLocaleString()})`).join(', ')}` : ''}
${auditTrend ? `Profile audit: ${auditTrend}` : 'Profile audit: Not yet run'}
Story sequences generated this week: ${storiesThisWeek.length}${storiesThisWeek.length > 0 ? ` (${[...new Set(storiesThisWeek.map(s => s.sequence_type))].join(', ')})` : ''}
`

  let reportJson: Record<string, unknown>
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: `You are Will Scott — personal brand coach reviewing a client's week. Write a coaching progress report based on their real data.
If they ran a profile audit this week and their score changed, mention it in your coach feedback.
If they generated story sequences, acknowledge they've been working on content.
If they logged any new sales, celebrate it and reference the revenue.
Make the report feel personal — like you actually know what they've been doing, because you do.

Return ONLY valid JSON with no markdown fences:
{
  "week_summary": "One direct sentence summary of their week based on their actual numbers",
  "metrics": {
    "posts_count": 0,
    "avg_views": 0,
    "top_reel_views": 0,
    "engagement_rate": 0,
    "follower_change": 0
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

    // Inject real metrics (override AI-hallucinated numbers)
    reportJson.metrics = {
      posts_count:      reelsThisWeek.length,
      avg_views:        avgViews,
      top_reel_views:   topReel?.views ?? 0,
      engagement_rate:  engagementRate,
      follower_change:  followerChange ?? 0,
    }
  } catch (err) {
    return NextResponse.json({ error: 'Failed to generate report', detail: String(err) }, { status: 500 })
  }

  const { data: savedReport, error: saveError } = await adminClient
    .from('client_progress_reports')
    .insert({
      profile_id: profileId,
      week_start: weekStart,
      report_json: reportJson,
      health_status: reportJson.health_status as string ?? 'green',
      health_reason: reportJson.health_reason as string ?? '',
    })
    .select()
    .single()

  if (saveError) {
    // Return unsaved report rather than failing (map report_json → report_data for frontend)
    return NextResponse.json({
      report: { id: 'unsaved', profile_id: profileId, week_start: weekStart, report_data: reportJson, created_at: new Date().toISOString() },
    })
  }

  // Map report_json → report_data so the frontend type stays consistent
  return NextResponse.json({
    report: { ...savedReport, report_data: savedReport.report_json },
  })
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
  // Map report_json → report_data for frontend consistency
  const reports = (data || []).map(r => ({ ...r, report_data: r.report_json }))
  return NextResponse.json({ reports })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await adminClient
    .from('client_progress_reports')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
