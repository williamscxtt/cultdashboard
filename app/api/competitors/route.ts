import { createServerClient } from '@supabase/ssr'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
}

async function getProfileId(userId: string) {
  const { data: realProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  const isAdmin = realProfile?.role === 'admin'
  const impersonatingAs = isAdmin ? await getImpersonatedId() : null
  return effectiveId(userId, isAdmin, impersonatingAs)
}

export async function GET() {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profileId = await getProfileId(user.id)

  const { data, error } = await adminClient
    .from('client_competitors')
    .select('*')
    .eq('profile_id', profileId)
    .order('added_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ competitors: data || [] })
}

export async function POST(request: Request) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profileId = await getProfileId(user.id)

  const body = await request.json()
  const { ig_username } = body
  if (!ig_username) return NextResponse.json({ error: 'ig_username is required' }, { status: 400 })

  const clean = ig_username.replace(/^@/, '').trim().toLowerCase()

  // Check for duplicate
  const { data: existing } = await adminClient
    .from('client_competitors')
    .select('id')
    .eq('profile_id', profileId)
    .eq('ig_username', clean)
    .single()

  if (existing) return NextResponse.json({ error: 'Already tracking this account' }, { status: 409 })

  const { data, error } = await adminClient
    .from('client_competitors')
    .insert({ profile_id: profileId, ig_username: clean })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ competitor: data })
}

export async function DELETE(request: Request) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profileId = await getProfileId(user.id)

  const body = await request.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { error } = await adminClient
    .from('client_competitors')
    .delete()
    .eq('id', id)
    .eq('profile_id', profileId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
