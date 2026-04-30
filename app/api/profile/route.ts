/**
 * GET  /api/profile?id=uuid  — fetch a profile (admin: any; user: own only)
 * PATCH /api/profile          — update user_type + creator_style for effective user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Admin can fetch any profile; users can only fetch their own
  const { data: caller } = await adminClient
    .from('profiles').select('role').eq('id', user.id).single()

  if (caller?.role !== 'admin' && user.id !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, name, niche, target_audience, user_type, creator_style, intro_structured, ig_username')
    .eq('id', id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ profile })
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await adminClient
    .from('profiles').select('role').eq('id', user.id).single()

  const impersonatingAs = caller?.role === 'admin' ? await getImpersonatedId() : null
  const profileId = effectiveId(user.id, caller?.role === 'admin', impersonatingAs)

  const body = await req.json().catch(() => ({}))
  const updates: Record<string, unknown> = {}
  if ('user_type' in body) updates.user_type = body.user_type ?? null
  if ('creator_style' in body) updates.creator_style = body.creator_style ?? null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await adminClient
    .from('profiles')
    .update(updates)
    .eq('id', profileId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
