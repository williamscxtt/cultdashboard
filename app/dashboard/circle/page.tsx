import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import CircleBriefing from '@/components/dashboard/CircleBriefing'
import type { CircleActionItem } from '@/lib/types'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export default async function CircleBriefingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  // Fetch pending action items with profile names
  const { data: items } = await adminClient
    .from('circle_action_items')
    .select('*')
    .eq('status', 'pending')
    .order('generated_at', { ascending: false })

  const profileIds = [...new Set((items ?? []).map(i => i.profile_id).filter(Boolean))]
  let profileMap: Record<string, { name: string | null; ig_username: string | null }> = {}

  if (profileIds.length > 0) {
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, name, ig_username')
      .in('id', profileIds)

    profileMap = Object.fromEntries(
      (profiles ?? []).map(p => [p.id, { name: p.name, ig_username: p.ig_username }])
    )
  }

  const enrichedItems: CircleActionItem[] = (items ?? []).map(item => ({
    ...item,
    profile_name: item.profile_id ? profileMap[item.profile_id]?.name ?? null : null,
    profile_ig_username: item.profile_id ? profileMap[item.profile_id]?.ig_username ?? null : null,
  } as CircleActionItem))

  // Sort by priority
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
  enrichedItems.sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3))

  // Find most recent generated_at
  const lastGenerated = items && items.length > 0
    ? items.reduce((latest, item) => {
        return item.generated_at > latest ? item.generated_at : latest
      }, items[0].generated_at)
    : null

  return <CircleBriefing initialItems={enrichedItems} lastGenerated={lastGenerated} />
}
