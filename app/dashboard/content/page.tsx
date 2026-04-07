import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'
import ContentDashboard from '@/components/dashboard/ContentDashboard'
import type { WeeklyReport, ClientReel } from '@/lib/types'

const adminClient = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export default async function ContentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: realProfile } = await adminClient
    .from('profiles').select('role').eq('id', user.id).single()

  const impersonatingAs = realProfile?.role === 'admin' ? await getImpersonatedId() : null
  const profileId = effectiveId(user.id, realProfile?.role === 'admin', impersonatingAs)

  const [{ data: report }, { data: reels }] = await Promise.all([
    // Latest weekly intel report — global, same for all users
    adminClient
      .from('weekly_reports')
      .select('*')
      .order('week_start', { ascending: false })
      .limit(1)
      .single(),

    // Client's own reels for pillar analysis
    adminClient
      .from('client_reels')
      .select('id, reel_id, date, views, likes, hook, format_type, caption, permalink')
      .eq('profile_id', profileId)
      .order('date', { ascending: false })
      .limit(200),
  ])

  return (
    <ContentDashboard
      report={(report ?? null) as WeeklyReport | null}
      reels={(reels ?? []) as ClientReel[]}
    />
  )
}
