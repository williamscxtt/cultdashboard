import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import AnalyticsDashboard from '@/components/dashboard/AnalyticsDashboard'

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('followers_count, ig_username').eq('id', user.id).single()

  return <AnalyticsDashboard profileId={user.id} followersCount={profile?.followers_count ?? null} igUsername={profile?.ig_username ?? null} />
}
