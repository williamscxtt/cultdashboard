import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import OnboardingHub from '@/components/dashboard/OnboardingHub'
import type { Profile } from '@/lib/types'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: realProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!realProfile) redirect('/login')

  // Support impersonation for admin
  const impersonatingAs = realProfile.role === 'admin' ? await getImpersonatedId() : null
  const profileId = effectiveId(user.id, realProfile.role === 'admin', impersonatingAs)

  const { data: profile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single()

  if (!profile) redirect('/dashboard')

  return <OnboardingHub profile={profile as Profile} />
}
