import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email, name, ig_username } = await req.json()

  if (!email || !name) {
    return NextResponse.json({ error: 'email and name are required' }, { status: 400 })
  }

  // Use service key to create user (bypasses RLS)
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  // Generate a secure temp password
  const tempPassword =
    Math.random().toString(36).slice(-8) +
    Math.random().toString(36).slice(-8).toUpperCase() +
    '1!'

  const { data: newUser, error } = await adminClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Update profile with name and ig_username
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ name, ig_username: ig_username || null })
    .eq('id', newUser.user!.id)

  if (profileError) {
    console.error('Failed to update profile:', profileError)
  }

  return NextResponse.json({ userId: newUser.user!.id, tempPassword })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const body = await req.json()
  const { id, is_active, dm_keyword } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Build update object — only include fields that were explicitly sent
  const updates: Record<string, unknown> = {}
  if (is_active !== undefined) updates.is_active = is_active
  if (dm_keyword !== undefined) updates.dm_keyword = dm_keyword || null

  const { error } = await adminClient.from('profiles').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Delete auth user (cascades to profile via FK trigger)
  const { error } = await adminClient.auth.admin.deleteUser(id)
  if (error) {
    // If auth delete fails try to at least deactivate
    await adminClient.from('profiles').update({ is_active: false }).eq('id', id)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Also delete profile row (in case no cascade)
  await adminClient.from('profiles').delete().eq('id', id)

  return NextResponse.json({ ok: true })
}
