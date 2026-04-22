import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (adminProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const statusFilter = searchParams.get('status') ?? 'pending'

  // Build query
  let query = adminClient
    .from('circle_action_items')
    .select('*')
    .order('priority', { ascending: false }) // high → medium → low (alphabetical hack: h > m > l)
    .order('generated_at', { ascending: false })

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  } else {
    // History: last 7 days of sent/dismissed
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    query = query
      .in('status', ['sent', 'dismissed'])
      .gte('generated_at', since)
  }

  const { data: items, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Join profile names
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

  const enriched = (items ?? []).map(item => ({
    ...item,
    profile_name: item.profile_id ? profileMap[item.profile_id]?.name ?? null : null,
    profile_ig_username: item.profile_id ? profileMap[item.profile_id]?.ig_username ?? null : null,
  }))

  // Sort: high → medium → low (since alphabetical doesn't work for priority)
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
  enriched.sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3))

  return NextResponse.json({ items: enriched })
}
