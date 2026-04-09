/**
 * GET  — returns top competitor reels for the current user's tracked accounts
 * POST — generates per-client weekly intel report + 7 daily scripts via Claude
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

  const { data: competitors } = await adminClient
    .from('client_competitors')
    .select('ig_username')
    .eq('profile_id', profileId)

  if (!competitors?.length) return NextResponse.json({ reels: [], competitors: [] })

  const handles = competitors.map(c => c.ig_username)

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

  // Fetch everything in parallel
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [{ data: profile }, { data: competitors }, { data: ownReelsRecent }, { data: ownReelsBaseline }] = await Promise.all([
    adminClient.from('profiles').select('name, niche, intro_structured, ig_username').eq('id', profileId).single(),
    adminClient.from('client_competitors').select('ig_username').eq('profile_id', profileId),
    // Own reels from last 7 days
    adminClient.from('client_reels')
      .select('views, likes, comments, hook, caption, format_type, date, transcript')
      .eq('profile_id', profileId)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('views', { ascending: false })
      .limit(20),
    // Own reels baseline (30 days) for avg
    adminClient.from('client_reels')
      .select('views, likes, comments, format_type')
      .eq('profile_id', profileId)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .limit(60),
  ])

  if (!competitors?.length) {
    return NextResponse.json({ error: 'no_competitors' }, { status: 422 })
  }

  const handles = competitors.map(c => c.ig_username)
  const { data: compReels } = await adminClient
    .from('competitor_reels')
    .select('account, views, likes, comments, hook, caption, format_type, date, duration_sec')
    .in('account', handles)
    .order('views', { ascending: false })
    .limit(60)

  if (!compReels?.length) {
    return NextResponse.json({ error: 'no_data' }, { status: 422 })
  }

  const intro = (profile?.intro_structured ?? {}) as Record<string, unknown>
  const clientNiche = (intro.specific_niche as string) || (intro.what_you_coach as string) || (profile?.niche as string) || 'fitness coaching'
  const clientName = (profile?.name as string) || 'your client'
  const idealClient = (intro.ideal_client as string) || (intro.target_audience as string) || ''
  const transformation = (intro.client_transformation as string) || ''
  const brandVoice = (intro.brand_voice as string) || ''
  const hookStyle = (intro.hook_style as string) || ''
  const goal90 = (intro.goal_90_days as string) || ''
  const biggestChallenge = (intro.biggest_problem as string) || ''

  // Own reels summary
  const ownReels = ownReelsRecent ?? []
  const baselineReels = ownReelsBaseline ?? []
  const baselineAvg = baselineReels.length
    ? Math.round(baselineReels.reduce((s, r) => s + (r.views ?? 0), 0) / baselineReels.length)
    : 0

  const ownReelsSummary = ownReels.length > 0
    ? `${clientName}'s OWN REELS this week (${ownReels.length} posted, ${baselineAvg.toLocaleString()} views avg baseline):
${ownReels.map((r, i) => `${i + 1}. "${r.hook || r.caption?.slice(0, 80) || '(no hook)'}" [${r.format_type || 'unknown'}] — ${(r.views ?? 0).toLocaleString()} views, ${(r.likes ?? 0).toLocaleString()} likes, ${(r.comments ?? 0)} comments`).join('\n')}`
    : `${clientName} posted NO reels this past week (or data not yet synced).`

  // Competitor summary
  const byAccount: Record<string, typeof compReels> = {}
  for (const r of compReels) {
    if (!byAccount[r.account]) byAccount[r.account] = []
    byAccount[r.account].push(r)
  }

  const accountSummaries = Object.entries(byAccount).map(([acc, rls]) => {
    const sorted = rls.sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    return `@${acc} (${rls.length} reels this week, top: ${(sorted[0]?.views ?? 0).toLocaleString()} views):\n` +
      sorted.slice(0, 3).map(r => `  - "${r.hook || r.caption?.slice(0, 80) || '(no hook)'}" [${r.format_type || 'unknown'}] — ${(r.views ?? 0).toLocaleString()} views`).join('\n')
  }).join('\n\n')

  const topReels = [...compReels].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 10)

  const prompt = `You are Will Scott, personal brand coach. Generate a weekly intel report AND 7 daily reel scripts for ${clientName}.

CLIENT PROFILE:
- Name: ${clientName}
- Niche: ${clientNiche}
${idealClient ? `- Ideal client: ${idealClient}` : ''}
${transformation ? `- Transformation they deliver: ${transformation}` : ''}
${brandVoice ? `- Brand voice: ${brandVoice}` : ''}
${hookStyle ? `- Hook style: ${hookStyle}` : ''}
${goal90 ? `- 90-day goal: ${goal90}` : ''}
${biggestChallenge ? `- Biggest challenge: ${biggestChallenge}` : ''}

${ownReelsSummary}

TRACKED COMPETITORS (${handles.length} accounts):
${accountSummaries}

TOP 10 COMPETITOR REELS BY VIEWS:
${topReels.map((r, i) => `${i + 1}. @${r.account} — "${r.hook || r.caption?.slice(0, 80)}" [${r.format_type}] — ${(r.views ?? 0).toLocaleString()} views`).join('\n')}

Generate the full weekly intelligence package. Be direct, punchy, and actionable — sound like Will Scott coaching them personally.

Return ONLY valid JSON:
{
  "headline": "One-line punchy summary of what's happening in their niche this week",
  "own_performance": "1-2 sentence honest assessment of ${clientName}'s content performance this week vs their baseline",
  "top_format": "The best performing content format across all competitors",
  "format_insight": "1-2 sentences on why this format is winning right now",
  "top_hooks": ["Top 3 actual hook lines from competitor content worth studying"],
  "what_is_working": ["3-4 specific things working well in this niche right now"],
  "big_hits": [
    {
      "account": "@handle",
      "hook": "exact hook line from the reel",
      "views": 0,
      "why_it_worked": "1-2 sentence psychological reason this hook/premise grabbed attention",
      "premise": "What the video is actually about — the core idea or argument in one sentence",
      "niche_adaptation": "How ${clientName} could adapt this exact premise for their niche (${clientNiche}) — be specific, not generic",
      "replication_angle": "The exact script angle ${clientName} should take — a concrete one-liner they could use as their hook today"
    }
  ],
  "content_gaps": ["2-3 content territories competitors are NOT covering that ${clientName} could own"],
  "weekly_verdict": "2-3 sentences of direct coaching — what should ${clientName} focus on this week?",
  "scripts": [
    {
      "day": "Monday",
      "format": "format type",
      "hook": "The exact opening line — punchy, specific, scroll-stopping",
      "script": "Full reel script — 60-90 seconds spoken. Direct, no filler. Adapted to ${clientName}'s niche and voice.",
      "caption": "Instagram caption with a clear CTA. 2-3 sentences max.",
      "cta": "DM me the word CULT / Link in bio / etc"
    }
  ]
}

The scripts array MUST have exactly 7 items (Mon–Sun). Each script must be written specifically for ${clientName}'s niche (${clientNiche}), informed by what's working in the competitor data above. Mix formats — don't use the same format twice in a row. Make the hooks punchy and specific to their ideal client.`

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'Failed to parse response' }, { status: 500 })

    const report = JSON.parse(match[0])
    return NextResponse.json({ report, reels_analysed: compReels.length, competitors: handles })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Analysis failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
