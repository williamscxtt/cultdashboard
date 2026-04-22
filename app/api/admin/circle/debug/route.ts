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

  // Primary test: v1 with Token auth (Admin v1 tokens work here)
  await tryFetch('members', `${baseUrl}/community_members?community_id=${CID}&per_page=3`, `Token ${token}`)
  await tryFetch('posts', `${baseUrl}/posts?community_id=${CID}&per_page=3&sort=latest`, `Token ${token}`)

  return NextResponse.json(results)
}
