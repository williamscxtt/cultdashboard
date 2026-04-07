import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function getProfileId(userId: string): Promise<string> {
  const { data } = await adminClient.from('profiles').select('role').eq('id', userId).single()
  const impersonatingAs = data?.role === 'admin' ? await getImpersonatedId() : null
  return effectiveId(userId, data?.role === 'admin', impersonatingAs)
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profileId = await getProfileId(user.id)
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get('limit') ?? 30)

  const { data, error } = await adminClient
    .from('daily_outreach')
    .select('*')
    .eq('profile_id', profileId)
    .order('date', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entries: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profileId = await getProfileId(user.id)
  const body = await req.json()
  const { id, ...fields } = body

  if (id) {
    // Update existing
    const updates: Record<string, unknown> = {}
    const numFields = ['dms_sent', 'responses', 'qualified_leads', 'week_number']
    const strFields = ['platform', 'date', 'notes']
    numFields.forEach(f => { if (f in fields) updates[f] = fields[f] == null ? null : Number(fields[f]) || 0 })
    strFields.forEach(f => { if (f in fields) updates[f] = fields[f] || null })

    const { data, error } = await adminClient.from('daily_outreach')
      .update(updates).eq('id', id).eq('profile_id', profileId).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, entry: data })
  } else {
    // Insert new
    const payload = {
      profile_id: profileId,
      date: fields.date || new Date().toISOString().split('T')[0],
      platform: fields.platform || 'Instagram',
      dms_sent: Number(fields.dms_sent) || 0,
      responses: Number(fields.responses) || 0,
      qualified_leads: Number(fields.qualified_leads) || 0,
      week_number: fields.week_number ? Number(fields.week_number) : null,
      notes: fields.notes || null,
    }
    const { data, error } = await adminClient.from('daily_outreach').insert(payload).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, entry: data })
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profileId = await getProfileId(user.id)
  const { id } = await req.json()
  const { error } = await adminClient.from('daily_outreach').delete().eq('id', id).eq('profile_id', profileId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
