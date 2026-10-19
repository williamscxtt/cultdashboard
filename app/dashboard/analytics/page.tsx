import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'
import Anthropic from '@anthropic-ai/sdk'
import AnalyticsDashboard from '@/components/dashboard/AnalyticsDashboard'
import type { FollowerSnapshot } from '@/lib/types'
import { restoreLinkedInstagramStatistics } from '@/lib/instagram-cached-statistics'
import { loadWeeklyAnalysis } from '@/lib/weekly-analysis-server'

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

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: realProfile } = await adminClient
    .from('profiles').select('role').eq('id', user.id).single()

  const impersonatingAs = realProfile?.role === 'admin' ? await getImpersonatedId() : null
  const profileId = effectiveId(user.id, realProfile?.role === 'admin', impersonatingAs)
  await restoreLinkedInstagramStatistics(adminClient, profileId).catch(() => {
    console.error('[analytics] Could not restore linked public statistics')
  })

  const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0]


  const [{ data: profile }, { data: snapshots }, { data: recentReels }] = await Promise.all([
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
  ])

  if (!profile) redirect('/login')

  // Compute reel windows for weekly analysis + legacy ReelSummary (still used for admin benchmarks)
  const now = Date.now()
  const thirtyDaysMs = 30 * 86400000
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

  const profileData = profile as Record<string, unknown>
  let dashboardBio = String(profile.dashboard_bio || '')

  const onboarded = Boolean(profile.onboarding_completed)
  const firstName = String(profile.name || '').split(' ')[0].toLowerCase()

  // Bio: regenerate if missing, starts with a markdown heading (#), or name appears twice (DB artifact)
  const bioHasMarkdown = dashboardBio.startsWith('#')
  const bioHasDoubleName = firstName
    ? (dashboardBio.toLowerCase().match(new RegExp(firstName, 'g')) || []).length >= 2
    : false
  const needsBio = onboarded && (!dashboardBio || bioHasMarkdown || bioHasDoubleName)

  if (needsBio) {
    try {
      const bio = await generateDashboardBio(profileData)
      if (bio && !bio.startsWith('Honestly ')) {
        dashboardBio = bio
        await adminClient.from('profiles').update({ dashboard_bio: bio }).eq('id', profileId)
      }
    } catch { console.error('[analytics] Could not update Dashboard bio', profileId) }
  }

  // Serve only a report tied to the current evidence. The client refreshes the
  // analysis after data arrives; rendering must never cache an empty judgement.
  const weeklyReport = await loadWeeklyAnalysis(adminClient, profileId, profileData, false)

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
      focusThisWeek={JSON.stringify(weeklyReport)}
      willFollowerViewRatio={willFollowerViewRatio}
    />
  )
}
