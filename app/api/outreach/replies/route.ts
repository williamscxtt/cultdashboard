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

  const { data, error } = await adminClient
    .from('saved_replies')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ replies: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profileId = await getProfileId(user.id)
  const body = await req.json()

  if (body.id) {
    // Update
    const { data, error } = await adminClient.from('saved_replies')
      .update({
        reply_text: body.reply_text,
        label: body.label || null,
        conversation_stage: body.conversation_stage || null,
      })
      .eq('id', body.id).eq('profile_id', profileId).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, reply: data })
  }

  const payload = {
    profile_id: profileId,
    reply_text: body.reply_text,
    label: body.label || null,
    original_message: body.original_message || null,
    conversation_stage: body.conversation_stage || null,
  }
  const { data, error } = await adminClient.from('saved_replies').insert(payload).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, reply: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profileId = await getProfileId(user.id)
  const { id } = await req.json()
  const { error } = await adminClient.from('saved_replies').delete().eq('id', id).eq('profile_id', profileId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
