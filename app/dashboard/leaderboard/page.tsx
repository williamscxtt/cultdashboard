import { redirect } from 'next/navigation'
import { dashboardSession } from '@/lib/dashboard-session'
import { canUseDashboard } from '@/lib/dashboard-access'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'
import { loadLeaderboard } from '@/lib/leaderboard-data'
import { readLeaderboardInsights } from '@/lib/leaderboard-insights'
import CreatorLeaderboard from '@/components/dashboard/CreatorLeaderboard'

export const dynamic = 'force-dynamic'

export default async function LeaderboardPage() {
  const { user, profile: viewer } = await dashboardSession()
  if (!user) redirect('/login')
  if (!viewer) redirect('/login')
  if (!canUseDashboard(viewer)) redirect('/subscribe')
  const impersonated = viewer.role === 'admin' ? await getImpersonatedId() : null
  const viewerId = effectiveId(user.id, viewer.role === 'admin', impersonated)

  // Only display identity and aggregate public Instagram metrics. No profile,
  // account credentials, billing fields, intake answers or revenue leave here.
  const leaderboard = await loadLeaderboard(viewerId)
  const insights = await readLeaderboardInsights(leaderboard)
  return <CreatorLeaderboard data={leaderboard} insights={insights} />
}
