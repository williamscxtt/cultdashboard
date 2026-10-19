import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'
import SettingsClient from './SettingsClient'
import { instagramConnectionMetadata } from '@/lib/instagram-connection'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ig_result?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: realProfile } = await adminClient
    .from('profiles').select('role').eq('id', user.id).single()

  const impersonatingAs = realProfile?.role === 'admin' ? await getImpersonatedId() : null
  const profileId = effectiveId(user.id, realProfile?.role === 'admin', impersonatingAs)
  const isImpersonating = impersonatingAs !== null

  const { data: profile } = await adminClient
    .from('profiles').select('*').eq('id', profileId).single()

  if (!profile) redirect('/login')

  // Credentials must never become Client Component props.
  const safeProfile = { ...profile, ig_access_token: null }
  const officialPilot = realProfile?.role === 'admin' && !isImpersonating
  const connection = officialPilot ? await instagramConnectionMetadata(user.id, profile.ig_username) : null
  const { ig_result } = await searchParams
  return <SettingsClient profile={safeProfile} isImpersonating={isImpersonating} officialPilot={officialPilot} instagramConnection={connection} instagramResult={ig_result} />
}
