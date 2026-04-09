import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(req: NextRequest) {
  // Verify auth via cookie-based client
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const profileId = searchParams.get('profileId')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 500)
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)

  if (!profileId) {
    return NextResponse.json({ error: 'profileId is required' }, { status: 400 })
  }

  // Users can only access their own reels unless they're an admin
  // (admin check via profiles.role if needed — for now enforce own data)
  if (profileId !== user.id) {
    // Allow admins to view any profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Fetch total count
  const { count } = await adminClient
    .from('client_reels')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)

  // Fetch paginated reels
  const { data: reels, error } = await adminClient
    .from('client_reels')
    .select('*')
    .eq('profile_id', profileId)
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    reels: reels ?? [],
    total: count ?? 0,
  })
}
