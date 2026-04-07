import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: realProfile } = await adminClient
      .from('profiles').select('role').eq('id', user.id).single()
    const impersonatingAs = realProfile?.role === 'admin' ? await getImpersonatedId() : null
    const profileId = effectiveId(user.id, realProfile?.role === 'admin', impersonatingAs)

    const { data, error } = await adminClient
      .from('weekly_log')
      .select('*')
      .eq('profile_id', profileId)
      .order('date', { ascending: false })
      .limit(52)

    if (error) throw error
    return NextResponse.json({ logs: data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: realProfile } = await adminClient
      .from('profiles').select('role').eq('id', user.id).single()
    const impersonatingAs = realProfile?.role === 'admin' ? await getImpersonatedId() : null
    const profileId = effectiveId(user.id, realProfile?.role === 'admin', impersonatingAs)

    const body = await req.json()
    const { date, ...fields } = body

    if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })

    function numOrNull(v: unknown) {
      if (v === '' || v === null || v === undefined) return null
      const n = Number(v)
      return isNaN(n) ? null : n
    }

    const entry = {
      profile_id: profileId,
      date,
      reels_posted:       numOrNull(fields.reels_posted),
      followers_total:    numOrNull(fields.followers_total),
      avg_reel_views:     numOrNull(fields.avg_reel_views),
      avg_shares:         numOrNull(fields.avg_shares),
      avg_saves:          numOrNull(fields.avg_saves),
      profile_visits:     numOrNull(fields.profile_visits),
      outreach_sent:      numOrNull(fields.outreach_sent),
      dms_received:       numOrNull(fields.dms_received),
      calls_booked:       numOrNull(fields.calls_booked),
      clients_signed:     numOrNull(fields.clients_signed),
      revenue:            numOrNull(fields.revenue),
      biggest_win:        fields.biggest_win || null,
      biggest_bottleneck: fields.biggest_bottleneck || null,
      message_for_will:   fields.message_for_will || null,
    }

    const { data, error } = await adminClient
      .from('weekly_log')
      .upsert(entry, { onConflict: 'profile_id,date' })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true, entry: data })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
