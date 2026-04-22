import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { postCircleComment } from '@/lib/circle-api'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params
  const body = await req.json() as {
    status?: 'sent' | 'dismissed'
    dismiss_note?: string
    draft_message?: string
  }

  // Fetch current item to check action_type + circle_post_id
  const { data: item } = await adminClient
    .from('circle_action_items')
    .select('*')
    .eq('id', id)
    .single()

  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

  // If approving a reply_post action, also post the comment to Circle
  if (body.status === 'sent' && item.action_type === 'address_problem' && item.circle_post_id) {
    const messageToSend = body.draft_message ?? item.draft_message
    try {
      await postCircleComment(item.circle_post_id, messageToSend)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Circle comment failed'
      return NextResponse.json({ error: `Failed to post Circle comment: ${msg}` }, { status: 502 })
    }
  }

  const updates: Record<string, unknown> = {}
  if (body.draft_message !== undefined) updates.draft_message = body.draft_message
  if (body.status) {
    updates.status = body.status
    updates.acted_at = new Date().toISOString()
  }
  if (body.dismiss_note !== undefined) updates.dismiss_note = body.dismiss_note

  const { data: updated, error } = await adminClient
    .from('circle_action_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ item: updated })
}
