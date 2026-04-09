import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'
import CalendarClient from './CalendarClient'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: realProfile } = await adminClient
    .from('profiles').select('role').eq('id', user.id).single()

  const impersonatingAs = realProfile?.role === 'admin' ? await getImpersonatedId() : null
  const profileId = effectiveId(user.id, realProfile?.role === 'admin', impersonatingAs)

  // Fetch all reels so the calendar can show actual posting history
  const { data: reels } = await adminClient
    .from('client_reels')
    .select('reel_id, date, caption, thumbnail_url, views, likes, permalink')
    .eq('profile_id', profileId)
    .not('date', 'is', null)
    .order('date', { ascending: false })
    .limit(300)

  return <CalendarClient profileId={profileId} reels={reels ?? []} />
}
