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

  // Test 1: v1 with "Token" auth (current approach)
  await tryFetch('v1_token', `${baseUrl}/community_members?community_id=${CID}&per_page=3`, `Token ${token}`)

  // Test 2: v1 with "Bearer" auth
  await tryFetch('v1_bearer', `${baseUrl}/community_members?community_id=${CID}&per_page=3`, `Bearer ${token}`)

  // Test 3: v1 members without community_id (maybe it's implicit for admin tokens)
  await tryFetch('v1_no_cid', `${baseUrl}/community_members?per_page=3`, `Token ${token}`)

  // Test 4: try the /me or /community endpoint to validate token
  await tryFetch('v1_community', `${baseUrl}/communities/${CID}`, `Token ${token}`)
  await tryFetch('v1_community_bearer', `${baseUrl}/communities/${CID}`, `Bearer ${token}`)

  return NextResponse.json(results)
}
