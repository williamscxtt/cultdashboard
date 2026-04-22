/**
 * Call transcripts — per-client, admin-only.
 * POST { profileId, label, content } → appends a transcript
 * DELETE { profileId, id }           → removes one by id
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

export async function POST(req: NextRequest) {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { profileId, label, content } = await req.json()
  if (!profileId || !content) return NextResponse.json({ error: 'profileId and content required' }, { status: 400 })

  const { data: current } = await adminClient
    .from('profiles').select('call_transcripts').eq('id', profileId).single()

  const existing = (current?.call_transcripts as TranscriptEntry[]) ?? []
  const newEntry: TranscriptEntry = {
    id: crypto.randomUUID(),
    label: label || `Call — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    content,
    added_at: new Date().toISOString(),
  }

  const updated = [...existing, newEntry]
  const { error } = await adminClient
    .from('profiles').update({ call_transcripts: updated }).eq('id', profileId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, entry: newEntry })
}

export async function DELETE(req: NextRequest) {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { profileId, id } = await req.json()
  if (!profileId || !id) return NextResponse.json({ error: 'profileId and id required' }, { status: 400 })

  const { data: current } = await adminClient
    .from('profiles').select('call_transcripts').eq('id', profileId).single()

  const existing = (current?.call_transcripts as TranscriptEntry[]) ?? []
  const updated = existing.filter(t => t.id !== id)

  const { error } = await adminClient
    .from('profiles').update({ call_transcripts: updated }).eq('id', profileId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

interface TranscriptEntry {
  id: string
  label: string
  content: string
  added_at: string
}
