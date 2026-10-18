import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { effectiveId, getImpersonatedId } from '@/lib/effective-user'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

async function currentProfileId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  const impersonatingAs = profile?.role === 'admin' ? await getImpersonatedId() : null
  return effectiveId(user.id, profile?.role === 'admin', impersonatingAs)
}

export async function GET() {
  const profileId = await currentProfileId()
  if (!profileId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await adminClient
    .from('ask_will_memories')
    .select('id,kind,key,value,status,confidence,created_at,updated_at')
    .eq('profile_id', profileId)
    .in('status', ['pending', 'active'])
    .order('status', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(100)
  if (error) return NextResponse.json({ error: 'Could not load memory' }, { status: 500 })
  return NextResponse.json({ memories: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const profileId = await currentProfileId()
  if (!profileId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const id = typeof body.id === 'string' ? body.id : ''
  const status = body.status === 'active' || body.status === 'rejected' || body.status === 'expired' ? body.status : ''
  if (!id || !status) return NextResponse.json({ error: 'Valid id and status are required' }, { status: 400 })

  const { data, error } = await adminClient
    .from('ask_will_memories')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('profile_id', profileId)
    .select('id,status')
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'Could not update memory' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
  return NextResponse.json({ memory: data })
}
