import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function getProfileId(userId: string): Promise<string> {
  const { data: realProfile } = await adminClient
    .from('profiles').select('role').eq('id', userId).single()
  const impersonatingAs = realProfile?.role === 'admin' ? await getImpersonatedId() : null
  return effectiveId(userId, realProfile?.role === 'admin', impersonatingAs)
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profileId = await getProfileId(user.id)
  const { data, error } = await adminClient
    .from('dm_sales').select('*').eq('profile_id', profileId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ leads: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profileId = await getProfileId(user.id)
  const body = await req.json()
  const { id, ...fields } = body

  function numOrNull(v: unknown) {
    if (v === '' || v === null || v === undefined) return null
    const n = Number(v); return isNaN(n) ? null : n
  }

  if (id) {
    // Partial update — only update provided fields
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    const stringFields = ['lead_name','source','contact_info','pre_call_notes','live_call_notes',
      'pain_points','objections','outcome_notes','follow_up_date','follow_up_note','notes','stage',
      'call_date','call_time','how_booked']
    stringFields.forEach(f => { if (f in fields) updates[f] = fields[f] || null })
    if ('deal_value' in fields) updates.deal_value = numOrNull(fields.deal_value)
    if ('revenue' in fields) updates.revenue = numOrNull(fields.revenue)
    if ('stage' in fields) {
      updates.call_booked    = fields.stage === 'Call Booked'  || fields.call_booked === true
      updates.call_completed = fields.stage === 'On Call'      || fields.call_completed === true
      updates.closed         = fields.stage === 'Closed Won'   || fields.closed === true
    }

    const { data, error } = await adminClient.from('dm_sales')
      .update(updates).eq('id', id).eq('profile_id', profileId).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, lead: data })
  } else {
    const payload = {
      profile_id:     profileId,
      lead_name:      fields.lead_name || null,
      source:         fields.source || null,
      contact_info:   fields.contact_info || null,
      stage:          fields.stage || 'Call Booked',
      call_booked:    fields.stage === 'Call Booked',
      call_completed: fields.stage === 'On Call',
      closed:         fields.stage === 'Closed Won',
      deal_value:     numOrNull(fields.deal_value),
      call_date:      fields.call_date || null,
      call_time:      fields.call_time || null,
      how_booked:     fields.how_booked || null,
      pre_call_notes: fields.pre_call_notes || null,
      pain_points:    fields.pain_points || null,
      objections:     fields.objections || null,
      notes:          fields.notes || null,
    }
    const { data, error } = await adminClient.from('dm_sales').insert(payload).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, lead: data })
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profileId = await getProfileId(user.id)
  const { id } = await req.json()
  const { error } = await adminClient.from('dm_sales').delete().eq('id', id).eq('profile_id', profileId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
