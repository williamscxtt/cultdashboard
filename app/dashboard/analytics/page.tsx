import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import AnalyticsDashboard from '@/components/dashboard/AnalyticsDashboard'
import type { FollowerSnapshot } from '@/lib/types'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

  const [{ data: profile }, { data: snapshots }] = await Promise.all([
    admin.from('profiles').select('followers_count, ig_username').eq('id', user.id).single(),
    admin.from('follower_snapshots')
      .select('date, count')
      .eq('profile_id', user.id)
      .order('date', { ascending: true })
      .limit(90),
  ])

  return (
    <AnalyticsDashboard
      profileId={user.id}
      followersCount={profile?.followers_count ?? null}
      igUsername={profile?.ig_username ?? null}
      followerHistory={(snapshots ?? []) as FollowerSnapshot[]}
    />
  )
}
