import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'
import OutreachView from '@/components/dashboard/OutreachView'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export default async function OutreachPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: realProfile } = await adminClient
    .from('profiles').select('role').eq('id', user.id).single()

  const impersonatingAs = realProfile?.role === 'admin' ? await getImpersonatedId() : null
  const profileId = effectiveId(user.id, realProfile?.role === 'admin', impersonatingAs)

  const [{ data: entries }, { data: replies }] = await Promise.all([
    adminClient.from('daily_outreach').select('*').eq('profile_id', profileId)
      .order('date', { ascending: false }).limit(60),
    adminClient.from('saved_replies').select('*').eq('profile_id', profileId)
      .order('created_at', { ascending: false }),
  ])

  return (
    <OutreachView
      initialEntries={entries ?? []}
      initialReplies={replies ?? []}
    />
  )
}
