/**
 * GET  — returns top competitor reels for the current user's tracked accounts
 * POST — generates a per-client weekly intel report via Claude
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import Anthropic from '@anthropic-ai/sdk'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
}

export async function GET() {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: realProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  const impersonatingAs = realProfile?.role === 'admin' ? await getImpersonatedId() : null
  const profileId = effectiveId(user.id, realProfile?.role === 'admin', impersonatingAs)

  // Get this client's tracked competitors
  const { data: competitors } = await adminClient
    .from('client_competitors')
    .select('ig_username')
    .eq('profile_id', profileId)

  if (!competitors?.length) return NextResponse.json({ reels: [], competitors: [] })

  const handles = competitors.map(c => c.ig_username)

  // Get their reels from the competitor_reels table
  const { data: reels } = await adminClient
    .from('competitor_reels')
    .select('account, views, likes, comments, hook, caption, format_type, date, duration_sec, reel_url')
    .in('account', handles)
    .order('views', { ascending: false })
    .limit(50)

  return NextResponse.json({ reels: reels ?? [], competitors: handles })
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: realProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  const impersonatingAs = realProfile?.role === 'admin' ? await getImpersonatedId() : null
  const profileId = effectiveId(user.id, realProfile?.role === 'admin', impersonatingAs)

  const [{ data: profile }, { data: competitors }] = await Promise.all([
    adminClient.from('profiles').select('name, niche, intro_structured, ig_username').eq('id', profileId).single(),
    adminClient.from('client_competitors').select('ig_username').eq('profile_id', profileId),
  ])

  if (!competitors?.length) {
    return NextResponse.json({ error: 'no_competitors' }, { status: 422 })
  }

  const handles = competitors.map(c => c.ig_username)
  const { data: reels } = await adminClient
    .from('competitor_reels')
    .select('account, views, likes, comments, hook, caption, format_type, date, duration_sec')
    .in('account', handles)
    .order('views', { ascending: false })
    .limit(60)

  if (!reels?.length) {
    return NextResponse.json({ error: 'no_data' }, { status: 422 })
  }

  const intro = (profile?.intro_structured ?? {}) as Record<string, unknown>
  const clientNiche = (intro.specific_niche as string) || (profile?.niche as string) || 'fitness coaching'
  const clientName = (profile?.name as string) || 'your client'

  // Group reels by account for analysis
  const byAccount: Record<string, typeof reels> = {}
  for (const r of reels) {
    if (!byAccount[r.account]) byAccount[r.account] = []
    byAccount[r.account].push(r)
  }

  const accountSummaries = Object.entries(byAccount).map(([acc, rls]) => {
    const sorted = rls.sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    return `@${acc} (${rls.length} reels, top: ${(sorted[0]?.views ?? 0).toLocaleString()} views):\n` +
      sorted.slice(0, 3).map(r => `  - "${r.hook || r.caption?.slice(0, 80) || '(no hook)'}" [${r.format_type || 'unknown'}] — ${(r.views ?? 0).toLocaleString()} views, ${(r.likes ?? 0).toLocaleString()} likes`).join('\n')
  }).join('\n\n')

  const topReels = [...reels].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 10)

  const prompt = `You are Will Scott, personal brand coach. Analyse this competitor intelligence data for ${clientName}, who is a ${clientNiche} coach on Instagram.

TRACKED COMPETITORS (${handles.length} accounts):
${accountSummaries}

TOP 10 REELS BY VIEWS ACROSS ALL COMPETITORS:
${topReels.map((r, i) => `${i + 1}. @${r.account} — "${r.hook || r.caption?.slice(0, 80)}" [${r.format_type}] — ${(r.views ?? 0).toLocaleString()} views`).join('\n')}

Generate a weekly content intelligence report for ${clientName}. This should be punchy, direct, and actionable — like a message from Will Scott, not a corporate report.

Return ONLY valid JSON:
{
  "headline": "One-line punchy summary of what's happening in their niche this week",
  "top_format": "The best performing content format across all competitors",
  "format_insight": "1-2 sentences on why this format is winning right now",
  "top_hooks": ["Top 3 actual hook lines from competitor content worth studying"],
  "what_is_working": ["3-4 specific things working well in this niche right now"],
  "content_gaps": ["2-3 content territories competitors are NOT covering that ${clientName} could own"],
  "post_ideas": ["3 specific reel ideas for ${clientName} based on what's trending, adapted to their niche"],
  "weekly_verdict": "2-3 sentences of direct coaching — what should ${clientName} focus on this week based on this data?"
}`

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'Failed to parse response' }, { status: 500 })

    const report = JSON.parse(match[0])
    return NextResponse.json({ report, reels_analysed: reels.length, competitors: handles })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Analysis failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
