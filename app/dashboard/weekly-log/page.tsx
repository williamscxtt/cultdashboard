import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'
import WeeklyLogView from '@/components/dashboard/WeeklyLogView'
import type { WeeklyLog } from '@/lib/types'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export default async function WeeklyLogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: realProfile } = await adminClient
    .from('profiles').select('role, name').eq('id', user.id).single()

  const impersonatingAs = realProfile?.role === 'admin' ? await getImpersonatedId() : null
  const profileId = effectiveId(user.id, realProfile?.role === 'admin', impersonatingAs)

  const [{ data: effectiveProfile }, { data: logs }] = await Promise.all([
    adminClient.from('profiles').select('name').eq('id', profileId).single(),
    adminClient
      .from('weekly_log')
      .select('*')
      .eq('profile_id', profileId)
      .order('date', { ascending: false })
      .limit(52),
  ])

  return (
    <WeeklyLogView
      profileName={(effectiveProfile?.name ?? realProfile?.name) || 'You'}
      logs={(logs ?? []) as WeeklyLog[]}
    />
  )
}
