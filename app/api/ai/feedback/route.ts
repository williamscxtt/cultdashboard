import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { effectiveId, getImpersonatedId } from '@/lib/effective-user'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

const ISSUE_TYPES = new Set(['missed_point', 'wrong_or_outdated', 'generic', 'voice', 'unsafe', 'other'])

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: realProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  const impersonatingAs = realProfile?.role === 'admin' ? await getImpersonatedId() : null
  const profileId = effectiveId(user.id, realProfile?.role === 'admin', impersonatingAs)

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const answerRunId = typeof body.answerRunId === 'string' ? body.answerRunId : ''
  if (!answerRunId) return NextResponse.json({ error: 'answerRunId is required' }, { status: 400 })

  const { data: answerRun } = await adminClient
    .from('ask_will_answer_runs')
    .select('id')
    .eq('id', answerRunId)
    .eq('profile_id', profileId)
    .maybeSingle()
  if (!answerRun) return NextResponse.json({ error: 'Answer not found' }, { status: 404 })

  const useful = typeof body.useful === 'boolean' ? body.useful : null
  const soundsLikeWill = typeof body.soundsLikeWill === 'boolean' ? body.soundsLikeWill : null
  const issueType = typeof body.issueType === 'string' && ISSUE_TYPES.has(body.issueType) ? body.issueType : null
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 2000) : null
  if (useful === null && soundsLikeWill === null && !issueType && !note) {
    return NextResponse.json({ error: 'Feedback is empty' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const { error } = await adminClient.from('ask_will_feedback').upsert({
    answer_run_id: answerRunId,
    profile_id: profileId,
    useful,
    sounds_like_will: soundsLikeWill,
    issue_type: issueType,
    note,
    updated_at: now,
  }, { onConflict: 'answer_run_id,profile_id' })
  if (error) return NextResponse.json({ error: 'Could not save feedback' }, { status: 500 })

  return NextResponse.json({ success: true })
}
