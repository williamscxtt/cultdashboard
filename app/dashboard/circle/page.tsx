import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import type { CircleActionItem } from '@/lib/types'
import CircleBriefing from '@/components/dashboard/CircleBriefing'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export default async function CirclePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  // Fetch pending action items
  const { data: rawItems } = await adminClient
    .from('circle_action_items')
    .select('*')
    .eq('status', 'pending')
    .order('generated_at', { ascending: false })

  const items = rawItems ?? []

  // Join profile names
  const profileIds = [...new Set(items.map((i: Record<string, unknown>) => i.profile_id as string).filter(Boolean))]
  let profileMap: Record<string, { name: string | null; ig_username: string | null }> = {}

  if (profileIds.length > 0) {
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, name, ig_username')
      .in('id', profileIds)

    profileMap = Object.fromEntries(
      (profiles ?? []).map((p: { id: string; name: string | null; ig_username: string | null }) => [
        p.id,
        { name: p.name, ig_username: p.ig_username },
      ])
    )
  }

  // Sort: high → medium → low
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
  const enriched: CircleActionItem[] = (items as CircleActionItem[])
    .map(item => ({
      ...item,
      profile_name: item.profile_id ? profileMap[item.profile_id]?.name ?? null : null,
      profile_ig_username: item.profile_id ? profileMap[item.profile_id]?.ig_username ?? null : null,
    }))
    .sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3))

  return <CircleBriefing initialItems={enriched} />
}
