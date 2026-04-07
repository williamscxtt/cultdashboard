import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import type { Profile } from '@/lib/types'
import ClientsManager from '@/components/dashboard/ClientsManager'

export default async function ClientsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: clients } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'client')
    .order('created_at', { ascending: false })

  return <ClientsManager initialClients={(clients ?? []) as Profile[]} />
}
