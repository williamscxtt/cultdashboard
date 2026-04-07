import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import type { Profile, ClientReel } from '@/lib/types'
import AdminOverview from '@/components/dashboard/AdminOverview'
import ClientHome from '@/components/dashboard/ClientHome'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  if (profile.role === 'admin') {
    const { data: clients, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('role', 'client')
      .order('created_at', { ascending: false })

    const activeCount = clients?.filter(c => c.is_active).length ?? 0

    return (
      <AdminOverview
        clients={(clients ?? []) as Profile[]}
        totalClients={count ?? 0}
        activeClients={activeCount}
      />
    )
  }

  // Client view: fetch all reels for the rich dashboard
  const { data: reels } = await supabase
    .from('client_reels')
    .select('*')
    .eq('profile_id', user.id)
    .order('date', { ascending: false })
    .limit(100)

  return (
    <ClientHome
      profile={profile as Profile}
      initialReels={(reels ?? []) as ClientReel[]}
    />
  )
}
