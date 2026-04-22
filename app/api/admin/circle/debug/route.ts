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

  const h = { Authorization: `Token ${token}`, 'Content-Type': 'application/json' }
  const CID = 370927

  // Test v2 members
  try {
    const res = await fetch(
      `https://app.circle.so/api/v2/community_members?community_id=${CID}&per_page=5&page=1`,
      { headers: h }
    )
    const text = await res.text()
    results.v2_members_status = res.status
    results.v2_members_raw = text.slice(0, 1000)
    try { results.v2_members_parsed = JSON.parse(text) } catch { results.v2_members_parse_error = 'not JSON' }
  } catch (e) { results.v2_members_error = String(e) }

  // Test v2 posts
  try {
    const res = await fetch(
      `https://app.circle.so/api/v2/posts?community_id=${CID}&per_page=5&page=1&sort=latest`,
      { headers: h }
    )
    const text = await res.text()
    results.v2_posts_status = res.status
    results.v2_posts_raw = text.slice(0, 1000)
    try { results.v2_posts_parsed = JSON.parse(text) } catch { results.v2_posts_parse_error = 'not JSON' }
  } catch (e) { results.v2_posts_error = String(e) }

  // Also test v1 for comparison
  try {
    const res = await fetch(
      `https://app.circle.so/api/v1/community_members?community_id=${CID}&per_page=5&page=1`,
      { headers: h }
    )
    results.v1_members_status = res.status
    results.v1_members_raw = (await res.text()).slice(0, 300)
  } catch (e) { results.v1_members_error = String(e) }

  return NextResponse.json(results)
}
