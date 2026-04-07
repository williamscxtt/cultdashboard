import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { IMPERSONATE_COOKIE } from '@/lib/effective-user'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

// POST /api/admin/impersonate — start impersonation
export async function POST(req: NextRequest) {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { profileId } = await req.json()
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })

  // Verify the target profile exists and is a client
  const { data: target } = await adminClient
    .from('profiles')
    .select('id, role, name')
    .eq('id', profileId)
    .single()

  if (!target) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (target.role === 'admin') return NextResponse.json({ error: 'Cannot impersonate admin' }, { status: 400 })

  const res = NextResponse.json({ ok: true, name: target.name })
  res.cookies.set(IMPERSONATE_COOKIE, profileId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  })
  return res
}

// DELETE /api/admin/impersonate — stop impersonation
export async function DELETE() {
  const user = await assertAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const res = NextResponse.json({ ok: true })
  res.cookies.delete(IMPERSONATE_COOKIE)
  return res
}
