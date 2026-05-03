import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'
import Anthropic from '@anthropic-ai/sdk'
import AnalyticsDashboard from '@/components/dashboard/AnalyticsDashboard'
import type { FollowerSnapshot } from '@/lib/types'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// ─── types ────────────────────────────────────────────────────────────────────
interface ReelSummary {
  count: number
  avgViews: number
  trend: number | null
  bestFormat: string | null
  bestFormatAvgViews: number
}

// ─── AI generators ────────────────────────────────────────────────────────────

async function generateDashboardBio(profile: Record<string, unknown>): Promise<string> {
  const intro = (profile.intro_structured ?? {}) as Record<string, unknown>
  const name = String(profile.name || 'This coach')
  const niche = String(intro.specific_niche || intro.what_you_coach || profile.niche || '')
  const idealClient = String(intro.ideal_client || profile.target_audience || '')
  const transformation = String(intro.transformation_story || intro.client_transformation || '')

  if (!niche || !idealClient) {
    return `Honestly ${name.split(' ')[0]}, I can't write this yet. You haven't filled in enough of your onboarding hub for me to know who you are, who you help, or what you do. Go fill in your Onboarding Hub properly and I'll generate this for you.`
  }

  const monthlyRevenue = String(intro.monthly_revenue || profile.monthly_revenue || profile.starting_revenue || '')
  const revenueGoal = String(intro.revenue_goal || intro.goal_revenue || profile.revenue_goal || '')

  const prompt = `Write a 2-3 sentence personal brand description for a creator named ${name}.
They are in the ${niche} niche. Their ideal client: ${idealClient}.${transformation ? ` Transformation they deliver: ${transformation}.` : ''}${monthlyRevenue ? ` Currently at ${monthlyRevenue}/month.` : ''}${revenueGoal ? ` Goal: ${revenueGoal}/month.` : ''}

Format: "Coaches [specific audience] on [specific topic]. Helps [clients stuck at X] achieve [transformation/result]. [One sentence about their method or approach]."

Be concrete and specific. No fluff. Use present tense. Do not use quotation marks. Do not start with the person's name — begin directly with "Coaches".`

  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 150,
    messages: [{ role: 'user', content: prompt }],
  })
  return res.content[0].type === 'text' ? res.content[0].text.trim() : ''
}

async function generateWeeklyAnalysis(
  profile: Record<string, unknown>,
  last7: Array<{ views: number; likes: number | null; comments: number | null; saves: number | null; format_type: string | null; hook: string | null; caption: string | null }>,
  prev7: Array<{ views: number }>,
  recentChatTopics: string[],
): Promise<string> {
  const intro = (profile.intro_structured ?? {}) as Record<string, unknown>
  const firstName = String(profile.name || '').split(' ')[0] || 'this creator'
  const niche = String(intro.specific_niche || intro.what_you_coach || profile.niche || '')
  const challenge = String(intro.biggest_problem || profile.biggest_challenge || '')
  const goal90 = String(intro.goal_90_days || profile.ninety_day_goal || '')
  const revGoal = String(intro.revenue_goal || intro.goal_revenue || profile.revenue_goal || '')

  const fmt = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(1)}K` : String(n)
  const sorted = [...last7].sort((a, b) => b.views - a.views)
  const avgViews = last7.length ? Math.round(last7.reduce((a, r) => a + r.views, 0) / last7.length) : 0
  const prevAvg = prev7.length ? Math.round(prev7.reduce((a, r) => a + r.views, 0) / prev7.length) : 0
  const trendPct = prevAvg > 0 ? Math.round(((avgViews - prevAvg) / prevAvg) * 100) : null

  if (last7.length === 0 && !niche && !goal90) {
    return JSON.stringify({
      what_worked: "No reels posted this week — no content data to analyse yet.",
      what_to_improve: "Fill in your Onboarding Hub with your niche, goals, and biggest challenge so future analyses are fully personalised.",
      this_week: "Post your first reel and connect Instagram in Settings to start tracking.",
    })
  }

  const reelLines = sorted.slice(0, 10).map((r, i) => {
    const hookText = (r.hook || r.caption || '').slice(0, 70) || '(no hook recorded)'
    const eng = (r.likes ?? 0) + (r.comments ?? 0) + (r.saves ?? 0)
    return `${i + 1}. ${fmt(r.views)} views | ${r.format_type?.replace(/_/g, ' ') || 'unknown format'} | "${hookText}" | ${eng} engagements`
  }).join('\n') || '(no reels this week)'

  const chatContext = recentChatTopics.length
    ? `\nWhat ${firstName} has been working on / asking about recently:\n${recentChatTopics.slice(0, 4).map(t => `- ${t}`).join('\n')}`
    : ''

  const prompt = `You are a sharp, direct content performance coach for ${firstName}${niche ? ` (${niche} creator)` : ''}.

WEEK IN NUMBERS:
${last7.length} reels posted | avg ${fmt(avgViews)} views per reel${trendPct !== null ? ` | ${trendPct > 0 ? `↑ ${trendPct}%` : `↓ ${Math.abs(trendPct)}%`} vs prior week` : ''}

REELS THIS WEEK (ranked by views):
${reelLines}
${challenge ? `\nBiggest challenge: ${challenge}` : ''}
${goal90 ? `90-day goal: ${goal90}${revGoal ? ` (${revGoal})` : ''}` : ''}${chatContext}

Write a weekly analysis in this exact JSON format. Reference actual hooks, formats, and numbers from their data. No generic advice — everything tied to what they actually posted.

{
  "what_worked": "1-2 sentences. What specifically performed best and why. Name the hook text or format, give the number.",
  "what_to_improve": "1-2 sentences. The single biggest weakness this week — specific to what they posted, not vague.",
  "this_week": "One clear action to prioritise in the next 7 days — tied to their goal and the gap you identified."
}

Max 45 words per section. Return only valid JSON.`

  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 450,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = res.content[0].type === 'text' ? res.content[0].text.trim() : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (match) {
    try { const p = JSON.parse(match[0]); if (p.what_worked) return match[0] } catch {}
  }
  return JSON.stringify({ what_worked: text, what_to_improve: '', this_week: '' })
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: realProfile } = await adminClient
    .from('profiles').select('role').eq('id', user.id).single()

  const impersonatingAs = realProfile?.role === 'admin' ? await getImpersonatedId() : null
  const profileId = effectiveId(user.id, realProfile?.role === 'admin', impersonatingAs)

  const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0]

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0]

  const [{ data: profile }, { data: snapshots }, { data: recentReels }, { data: recentConversations }] = await Promise.all([
    adminClient.from('profiles').select('*').eq('id', profileId).single(),
    adminClient
      .from('follower_snapshots')
      .select('date, count')
      .eq('profile_id', profileId)
      .order('date', { ascending: true })
      .limit(90),
    adminClient
      .from('client_reels')
      .select('views, likes, comments, saves, format_type, date, hook, caption')
      .eq('profile_id', profileId)
      .gte('date', sixtyDaysAgo)
      .order('date', { ascending: false })
      .limit(120),
    adminClient
      .from('ai_conversations')
      .select('messages, created_at')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  if (!profile) redirect('/login')

  // Compute reel windows for weekly analysis + legacy ReelSummary (still used for admin benchmarks)
  const now = Date.now()
  const sevenDaysMs = 7 * 86400000
  const thirtyDaysMs = 30 * 86400000
  const last7 = (recentReels ?? []).filter(r => now - new Date(r.date).getTime() <= sevenDaysMs)
  const prev7 = (recentReels ?? []).filter(r => {
    const age = now - new Date(r.date).getTime()
    return age > sevenDaysMs && age <= 2 * sevenDaysMs
  })
  const last30 = (recentReels ?? []).filter(r => now - new Date(r.date).getTime() <= thirtyDaysMs)
  const prev30 = (recentReels ?? []).filter(r => {
    const age = now - new Date(r.date).getTime()
    return age > thirtyDaysMs && age <= 2 * thirtyDaysMs
  })
  const avgViews30 = last30.length
    ? Math.round(last30.reduce((a, r) => a + (r.views ?? 0), 0) / last30.length)
    : 0
  const avgViewsPrev = prev30.length
    ? Math.round(prev30.reduce((a, r) => a + (r.views ?? 0), 0) / prev30.length)
    : 0
  const fmtGroups: Record<string, number[]> = {}
  last30.forEach(r => {
    const f = r.format_type ?? 'Unknown'
    fmtGroups[f] = fmtGroups[f] ?? []
    fmtGroups[f].push(r.views ?? 0)
  })
  const fmtRanked = Object.entries(fmtGroups)
    .map(([f, vs]) => ({ f, avg: Math.round(vs.reduce((a, b) => a + b, 0) / vs.length) }))
    .sort((a, b) => b.avg - a.avg)

  const reelSummary: ReelSummary = {
    count: last30.length,
    avgViews: avgViews30,
    trend: avgViewsPrev > 0 ? Math.round(((avgViews30 - avgViewsPrev) / avgViewsPrev) * 100) : null,
    bestFormat: fmtRanked[0]?.f.replace(/_/g, ' ') ?? null,
    bestFormatAvgViews: fmtRanked[0]?.avg ?? 0,
  }

  // Extract recent user chat topics to personalise the weekly analysis
  const recentChatTopics: string[] = []
  if (recentConversations) {
    for (const conv of recentConversations) {
      const msgs = (conv.messages ?? []) as Array<{ role: string; content: string; timestamp?: string }>
      for (const m of msgs) {
        if (m.role === 'user' && m.content.length > 25) {
          recentChatTopics.push(m.content.slice(0, 100))
          if (recentChatTopics.length >= 5) break
        }
      }
      if (recentChatTopics.length >= 5) break
    }
  }

  // sevenDaysAgo / fourteenDaysAgo used above for filtering; reelSummary used in Will benchmark section


  const profileData = profile as Record<string, unknown>
  let dashboardBio = String(profile.dashboard_bio || '')
  let focusThisWeek = String(profile.focus_this_week || '')

  const onboarded = Boolean(profile.onboarding_completed)
  const firstName = String(profile.name || '').split(' ')[0].toLowerCase()

  // Bio: regenerate if missing, starts with a markdown heading (#), or name appears twice (DB artifact)
  const bioHasMarkdown = dashboardBio.startsWith('#')
  const bioHasDoubleName = firstName
    ? (dashboardBio.toLowerCase().match(new RegExp(firstName, 'g')) || []).length >= 2
    : false
  const needsBio = onboarded && (!dashboardBio || bioHasMarkdown || bioHasDoubleName)

  // Weekly analysis: regenerate if missing, or older than 6 days
  const focusUpdatedAt = profile.focus_updated_at ? new Date(String(profile.focus_updated_at)) : null
  const focusAgeMs = focusUpdatedAt ? Date.now() - focusUpdatedAt.getTime() : Infinity
  const focusIsStale = focusAgeMs > 6 * 24 * 60 * 60 * 1000
  // Also regenerate if stored value is plain text (not JSON) — that's the old format
  const isLegacyFocus = focusThisWeek && !focusThisWeek.trim().startsWith('{')
  const needsFocus = onboarded && (!focusThisWeek || focusIsStale || isLegacyFocus)

  if (needsBio || needsFocus) {
    const [bio, focus] = await Promise.all([
      needsBio ? generateDashboardBio(profileData) : Promise.resolve(dashboardBio),
      needsFocus ? generateWeeklyAnalysis(
        profileData,
        last7 as Array<{ views: number; likes: number | null; comments: number | null; saves: number | null; format_type: string | null; hook: string | null; caption: string | null }>,
        prev7 as Array<{ views: number }>,
        recentChatTopics,
      ) : Promise.resolve(focusThisWeek),
    ])

    dashboardBio = bio
    focusThisWeek = focus

    const updates: Record<string, string> = {}
    if (needsBio && bio && !bio.startsWith('Honestly ')) updates.dashboard_bio = bio
    if (needsFocus && focus) {
      updates.focus_this_week = focus
      updates.focus_updated_at = new Date().toISOString()
    }
    if (Object.keys(updates).length > 0) {
      adminClient.from('profiles').update(updates).eq('id', profileId).then(() => {})
    }
  }

  // Will's benchmark follower-to-view ratio (views per follower gained, 30 days)
  // Skip if Will is viewing his own dashboard (no point comparing to yourself)
  let willFollowerViewRatio: number | null = null
  const isViewingOwnAdminDash = realProfile?.role === 'admin' && !impersonatingAs
  if (!isViewingOwnAdminDash) {
    const { data: adminProfs } = await adminClient
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .neq('id', profileId)
      .limit(1)

    const adminProf = adminProfs?.[0] ?? null
    if (adminProf) {
      const thirtyDaysAgoStr = new Date(Date.now() - thirtyDaysMs).toISOString().split('T')[0]
      const [{ data: willSnaps }, { data: willReels }] = await Promise.all([
        adminClient
          .from('follower_snapshots')
          .select('date, count')
          .eq('profile_id', adminProf.id)
          .gte('date', thirtyDaysAgoStr)
          .order('date', { ascending: true }),
        adminClient
          .from('client_reels')
          .select('views')
          .eq('profile_id', adminProf.id)
          .gte('date', thirtyDaysAgoStr),
      ])

      if (willSnaps && willSnaps.length >= 2 && willReels && willReels.length > 0) {
        const gain = willSnaps[willSnaps.length - 1].count - willSnaps[0].count
        const totalV = (willReels as { views: number | null }[]).reduce((a, r) => a + (r.views ?? 0), 0)
        if (gain > 0 && totalV > 0) {
          willFollowerViewRatio = totalV / gain
        }
      }
    }
  }

  return (
    <AnalyticsDashboard
      profileId={profileId}
      followersCount={profile?.followers_count ?? null}
      igUsername={profile?.ig_username ?? null}
      followerHistory={(snapshots ?? []) as FollowerSnapshot[]}
      profileName={String(profile?.name || '')}
      dashboardBio={dashboardBio}
      focusThisWeek={focusThisWeek}
      willFollowerViewRatio={willFollowerViewRatio}
    />
  )
}
