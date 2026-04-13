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

// ─── AI generators ────────────────────────────────────────────────────────────

async function generateDashboardBio(profile: Record<string, unknown>): Promise<string> {
  const intro = (profile.intro_structured ?? {}) as Record<string, unknown>
  const name = String(profile.name || 'This coach')
  const niche = String(intro.specific_niche || intro.what_you_coach || profile.niche || '')
  const idealClient = String(intro.ideal_client || profile.target_audience || '')
  const transformation = String(intro.transformation_story || intro.client_transformation || '')

  // Require at least niche + ideal client to generate something meaningful
  if (!niche || !idealClient) {
    return `Honestly ${name.split(' ')[0]}, I can't write this yet. You haven't filled in enough of your onboarding hub for me to know who you are, who you help, or what you do. Go fill in your Onboarding Hub properly and I'll generate this for you.`
  }

  const monthlyRevenue = String(intro.monthly_revenue || profile.monthly_revenue || profile.starting_revenue || '')
  const revenueGoal = String(intro.revenue_goal || intro.goal_revenue || profile.revenue_goal || '')

  const prompt = `Write a 2-3 sentence personal brand description for ${name}.
They are in the ${niche} niche. Their ideal client: ${idealClient}.${transformation ? ` Transformation they deliver: ${transformation}.` : ''}${monthlyRevenue ? ` Currently at ${monthlyRevenue}/month.` : ''}${revenueGoal ? ` Goal: ${revenueGoal}/month.` : ''}

Format: "[Name] coaches [specific audience] on [specific topic]. They help [clients stuck at X] achieve [transformation/result]. [One sentence about their method or approach]."

Be concrete and specific. No fluff. Use present tense. Do not use quotation marks.`

  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 150,
    messages: [{ role: 'user', content: prompt }],
  })
  return res.content[0].type === 'text' ? res.content[0].text.trim() : ''
}

async function generateWeeklyFocus(profile: Record<string, unknown>): Promise<string> {
  const intro = (profile.intro_structured ?? {}) as Record<string, unknown>
  const name = String(profile.name || 'this coach')
  const niche = String(intro.specific_niche || intro.what_you_coach || profile.niche || '')
  const challenge = String(intro.biggest_problem || profile.biggest_challenge || '')
  const goal90 = String(intro.goal_90_days || profile.ninety_day_goal || '')
  const monthlyRevenue = String(intro.monthly_revenue || profile.monthly_revenue || '')

  // Require at least a niche and either a challenge or a goal
  if (!niche || (!challenge && !goal90)) {
    return `I can't set a focus for you this week because you haven't told me what you're working on or what your goals are. Fill in your Onboarding Hub — specifically your biggest challenge and 90-day goal — and I'll give you something actually useful.`
  }

  const prompt = `Write a single, punchy 1-2 sentence weekly focus for ${name}, a ${niche} coach.
${challenge ? `Their biggest challenge right now: ${challenge}.` : ''}
${goal90 ? `Their 90-day goal: ${goal90}.` : ''}
${monthlyRevenue ? `Currently at ${monthlyRevenue}/month.` : ''}

Write it as a direct instruction or focus statement for this week. Be specific, actionable, no waffle. No bullet points. No "This week:" prefix. Just the focus itself. Max 30 words.`

  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 80,
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

  const [{ data: profile }, { data: snapshots }] = await Promise.all([
    adminClient.from('profiles').select('*').eq('id', profileId).single(),
    adminClient
      .from('follower_snapshots')
      .select('date, count')
      .eq('profile_id', profileId)
      .order('date', { ascending: true })
      .limit(90),
  ])

  if (!profile) redirect('/login')

  const profileData = profile as Record<string, unknown>
  let dashboardBio = String(profile.dashboard_bio || '')
  let focusThisWeek = String(profile.focus_this_week || '')

  // Only generate AI fields for clients who have completed onboarding
  const onboarded = Boolean(profile.onboarding_completed)
  const intro = (profile.intro_structured ?? {}) as Record<string, unknown>
  const firstName = String(profile.name || '').split(' ')[0].toLowerCase()
  const niche = String(intro.specific_niche || intro.what_you_coach || profile.niche || '').toLowerCase()

  // Bio: regenerate if missing, OR if it looks generic (doesn't mention the person's name or niche)
  const bioIsGeneric = dashboardBio && firstName && !dashboardBio.toLowerCase().includes(firstName)
  const needsBio = onboarded && (!dashboardBio || !!bioIsGeneric)

  // Focus: regenerate if missing, OR if it was last updated more than 6 days ago (it's a weekly thing)
  const focusUpdatedAt = profile.focus_updated_at ? new Date(String(profile.focus_updated_at)) : null
  const focusAgeMs = focusUpdatedAt ? Date.now() - focusUpdatedAt.getTime() : Infinity
  const focusIsStale = focusAgeMs > 6 * 24 * 60 * 60 * 1000
  const needsFocus = onboarded && (!focusThisWeek || focusIsStale)

  if (needsBio || needsFocus) {
    const [bio, focus] = await Promise.all([
      needsBio ? generateDashboardBio(profileData) : Promise.resolve(dashboardBio),
      needsFocus ? generateWeeklyFocus(profileData) : Promise.resolve(focusThisWeek),
    ])

    dashboardBio = bio
    focusThisWeek = focus

    // Store back to DB (fire and forget) — skip caching fallback "insufficient data" messages
    const updates: Record<string, string> = {}
    if (needsBio && bio && !bio.startsWith('Honestly ')) updates.dashboard_bio = bio
    if (needsFocus && focus && !focus.startsWith("I can't set a focus")) {
      updates.focus_this_week = focus
      updates.focus_updated_at = new Date().toISOString()
    }
    if (Object.keys(updates).length > 0) {
      adminClient.from('profiles').update(updates).eq('id', profileId).then(() => {})
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
    />
  )
}
