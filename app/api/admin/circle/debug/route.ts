import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const token = process.env.CIRCLE_API_TOKEN
  if (!token) return NextResponse.json({ error: 'CIRCLE_API_TOKEN not set' })

  const results: Record<string, unknown> = {
    token_prefix: token.slice(0, 8) + '...',
    token_length: token.length,
  }

  // Test 1: members endpoint
  try {
    const res = await fetch(
      'https://app.circle.so/api/v1/community_members?community_id=370927&per_page=5&page=1',
      { headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' } }
    )
    const text = await res.text()
    results.members_status = res.status
    results.members_raw = text.slice(0, 1000)
    try { results.members_parsed = JSON.parse(text) } catch { results.members_parse_error = 'not JSON' }
  } catch (e) {
    results.members_error = String(e)
  }

  // Test 2: posts endpoint
  try {
    const res = await fetch(
      'https://app.circle.so/api/v1/posts?community_id=370927&per_page=5&page=1&sort=latest',
      { headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' } }
    )
    const text = await res.text()
    results.posts_status = res.status
    results.posts_raw = text.slice(0, 1000)
    try { results.posts_parsed = JSON.parse(text) } catch { results.posts_parse_error = 'not JSON' }
  } catch (e) {
    results.posts_error = String(e)
  }

  return NextResponse.json(results)
}
