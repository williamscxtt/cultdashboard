import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import AiChat from '@/components/dashboard/AiChat'

export default async function AiPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('id', user.id)
    .single()

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AiChat profileId={profile?.id ?? user.id} profileName={profile?.name ?? ''} />
    </div>
  )
}
