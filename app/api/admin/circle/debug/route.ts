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

  const CID = 370927
  const baseUrl = `https://app.circle.so/api/v1`

  async function tryFetch(label: string, url: string, authHeader: string) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' }
      })
      const text = await res.text()
      results[`${label}_status`] = res.status
      results[`${label}_raw`] = text.slice(0, 400)
      try { results[`${label}_parsed`] = JSON.parse(text) } catch { /* not json */ }
    } catch (e) { results[`${label}_error`] = String(e) }
  }

  // Test 1: v1 Token header
  await tryFetch('v1_token', `${baseUrl}/community_members?community_id=${CID}&per_page=3`, `Token ${token}`)

  // Test 2: v1 Bearer header
  await tryFetch('v1_bearer', `${baseUrl}/community_members?community_id=${CID}&per_page=3`, `Bearer ${token}`)

  // Test 3: token as query param
  try {
    const res = await fetch(`${baseUrl}/community_members?community_id=${CID}&per_page=3&api_key=${token}`)
    const text = await res.text()
    results.v1_queryparam_status = res.status
    results.v1_queryparam_raw = text.slice(0, 400)
    try { results.v1_queryparam_parsed = JSON.parse(text) } catch { /* not json */ }
  } catch (e) { results.v1_queryparam_error = String(e) }

  // Test 4: Circle headless API (newer endpoint pattern)
  await tryFetch('headless_members', `https://app.circle.so/api/headless/v1/community_members?community_id=${CID}&per_page=3`, `Token ${token}`)
  await tryFetch('headless_members_bearer', `https://app.circle.so/api/headless/v1/community_members?community_id=${CID}&per_page=3`, `Bearer ${token}`)

  // Test 5: try without content-type (some APIs reject it on GET)
  try {
    const res = await fetch(`${baseUrl}/community_members?community_id=${CID}&per_page=3`, {
      headers: { Authorization: `Token ${token}` }
    })
    const text = await res.text()
    results.v1_no_ct_status = res.status
    results.v1_no_ct_raw = text.slice(0, 400)
    try { results.v1_no_ct_parsed = JSON.parse(text) } catch { /* not json */ }
  } catch (e) { results.v1_no_ct_error = String(e) }

  return NextResponse.json(results)
}
