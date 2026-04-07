import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import type { Profile } from '@/lib/types'
import AdminOverview from '@/components/dashboard/AdminOverview'

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

  // Clients go straight to their Onboarding Hub
  if (profile.role === 'client') {
    redirect('/dashboard/onboarding')
  }

  // Admin: show client overview grid
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
