/**
 * POST /api/competitors/insight
 * Generates (or regenerates) a 2-sentence AI insight for a competitor account
 * based on their top reels and saves it to client_competitors.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import Anthropic from '@anthropic-ai/sdk'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
}

export async function generateInsightForAccount(handle: string): Promise<string> {
  const { data: reels } = await adminClient
    .from('competitor_reels')
    .select('hook, caption, views, format_type')
    .eq('account', handle)
    .order('views', { ascending: false })
    .limit(15)

  if (!reels?.length) return ''

  const topReels = reels
    .map(r => `- "${r.hook || (r.caption ?? '').slice(0, 80)}" [${r.format_type ?? 'unknown'}] — ${(r.views ?? 0).toLocaleString()} views`)
    .join('\n')

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 120,
    messages: [{
      role: 'user',
      content: `You're a content strategist. Analyse these top reels from @${handle} and write exactly 2 sentences:
1. What content topics/themes drive their biggest numbers.
2. Which formats they lean on most.

Be specific, direct, no fluff. Max 35 words total.

Top reels:
${topReels}`,
    }],
  })

  return msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: realProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = realProfile?.role === 'admin'
  const impersonatingAs = isAdmin ? await getImpersonatedId() : null
  const profileId = effectiveId(user.id, isAdmin, impersonatingAs)

  const body = await req.json().catch(() => ({}))
  const { ig_username } = body as { ig_username?: string }
  if (!ig_username) return NextResponse.json({ error: 'ig_username required' }, { status: 400 })

  const handle = ig_username.replace(/^@/, '').trim().toLowerCase()

  const insight = await generateInsightForAccount(handle)
  if (!insight) return NextResponse.json({ error: 'No reels found for this account' }, { status: 404 })

  await adminClient
    .from('client_competitors')
    .update({ insight, insight_updated_at: new Date().toISOString() })
    .eq('ig_username', handle)
    .eq('profile_id', profileId)

  return NextResponse.json({ insight })
}
