import { redirect } from 'next/navigation'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { canUseDashboard } from '@/lib/dashboard-access'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'
import { loadLeaderboard } from '@/lib/leaderboard-data'
import { readLeaderboardInsights } from '@/lib/leaderboard-insights'
import CreatorLeaderboard from '@/components/dashboard/CreatorLeaderboard'

export const dynamic = 'force-dynamic'

const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: viewer, error } = await admin.from('profiles')
    .select('role,is_active,billing_exempt,billing_provider,access_type,membership_tier,subscription_status,subscription_period_end,skool_access_review_due_at')
    .eq('id', user.id).single()
  if (error || !viewer) redirect('/login')
  if (!canUseDashboard(viewer)) redirect('/subscribe')
  const impersonated = viewer.role === 'admin' ? await getImpersonatedId() : null
  const viewerId = effectiveId(user.id, viewer.role === 'admin', impersonated)

  // Only display identity and aggregate public Instagram metrics. No profile,
  // account credentials, billing fields, intake answers or revenue leave here.
  const leaderboard = await loadLeaderboard(viewerId)
  const insights = await readLeaderboardInsights(leaderboard)
  return <CreatorLeaderboard data={leaderboard} insights={insights} />
}
