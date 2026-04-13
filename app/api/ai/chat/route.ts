import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

function safeStr(v: unknown): string {
  if (!v) return ''
  return String(v).trim()
}

function buildSystemPrompt(
  profile: Record<string, unknown>,
  reels: Array<Record<string, unknown>>,
  competitorReels: Array<Record<string, unknown>>,
  conversationHistory: Array<{ role: string; content: string }>,
  knowledgeDocs: Array<{ title: string; category: string; content: string }>
): string {
  const intro = (profile.intro_structured ?? {}) as Record<string, unknown>

  function iVal(...keys: string[]): string {
    for (const k of keys) {
      const v = intro[k] || profile[k]
      if (v && safeStr(v)) return safeStr(v)
    }
    return ''
  }

  const name = safeStr(profile.name) || 'your client'
  const niche = iVal('specific_niche', 'niche') || safeStr(profile.niche) || ''
  const idealClient = iVal('ideal_client', 'target_audience') || safeStr(profile.target_audience) || ''
  const biggestProblem = iVal('biggest_problem', 'biggest_challenge') || safeStr(profile.biggest_challenge) || ''
  const goal90 = iVal('goal_90_days') || safeStr(profile.ninety_day_goal) || ''
  const whyCult = iVal('why_cult', 'why_joined') || safeStr(profile.why_joined) || ''
  const brandVoice = iVal('brand_voice', 'voice') || ''
  const originStory = iVal('origin_story', 'your_story') || ''
  const transformation = iVal('client_transformation', 'transformation') || ''
  const uniqueMechanism = iVal('unique_mechanism', 'framework') || ''
  const monthlyRevenue = iVal('monthly_revenue') || safeStr(profile.monthly_revenue) || safeStr(profile.starting_revenue) || ''
  const revenueGoal = iVal('revenue_goal') || safeStr(profile.revenue_goal) || safeStr(profile.ninety_day_revenue_goal) || ''
  const hookStyle = iVal('hook_style') || ''
  const contentStyle = iVal('content_style') || ''
  const triedBefore = iVal('what_tried_before') || ''
  const controversialOpinion = iVal('controversial_opinion', 'hot_take') || ''
  const contentAngle = iVal('content_angle') || ''

  // Reel performance analysis
  const formatGroups: Record<string, number[]> = {}
  reels.forEach(r => {
    const fmt = safeStr(r.format_type)
    const views = Number(r.views) || 0
    if (fmt) {
      if (!formatGroups[fmt]) formatGroups[fmt] = []
      formatGroups[fmt].push(views)
    }
  })
  const formatPerf = Object.entries(formatGroups)
    .map(([fmt, vs]) => ({ fmt, avg: Math.round(vs.reduce((a, b) => a + b, 0) / vs.length) }))
    .sort((a, b) => b.avg - a.avg)

  const topReels = reels
    .sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0))
    .slice(0, 5)

  // Competitor insights
  const compAccounts = [...new Set(competitorReels.map(r => safeStr(r.account)).filter(Boolean))]
  const compTopReels = competitorReels
    .sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0))
    .slice(0, 5)

  const startingFollowers = Number(profile.starting_followers) || 0
  const startingAvgViews = Number(profile.starting_avg_views) || 0

  return `You are Will Scott — personal brand coach and founder of CULT. You help online coaches build personal brands on Instagram to get more clients and revenue through organic content.

You are speaking directly with ${name}. Everything you say should be tailored to their exact situation. Never give generic advice.

═══ CLIENT PROFILE ═══
Name: ${name}
${profile.ig_username ? `Instagram: @${safeStr(profile.ig_username)}` : ''}
${niche ? `Niche: ${niche}` : ''}
${idealClient ? `Ideal client: ${idealClient}` : ''}
${transformation ? `Transformation they deliver: ${transformation}` : ''}
${uniqueMechanism ? `Their method/framework: ${uniqueMechanism}` : ''}
${contentAngle ? `Content angle/character: ${contentAngle}` : ''}
${brandVoice ? `Brand voice: ${brandVoice}` : ''}
${hookStyle ? `Hook style: ${hookStyle}` : ''}
${contentStyle ? `Content style: ${contentStyle}` : ''}

═══ BUSINESS & GOALS ═══
${monthlyRevenue ? `Current revenue: ${monthlyRevenue}` : ''}
${revenueGoal ? `Revenue goal: ${revenueGoal}` : ''}
${goal90 ? `90-day goal: ${goal90}` : ''}
${biggestProblem ? `Biggest challenge: ${biggestProblem}` : ''}
${whyCult ? `Why they joined CULT: ${whyCult}` : ''}
${triedBefore ? `What they've tried before: ${triedBefore}` : ''}

${originStory ? `═══ THEIR STORY ═══\n${originStory}` : ''}

${controversialOpinion ? `═══ OPINIONS & TAKES ═══\nControversial opinion: ${controversialOpinion}` : ''}

${reels.length > 0 ? `═══ THEIR CONTENT PERFORMANCE ═══
Starting followers when they joined: ${startingFollowers.toLocaleString()}
Starting avg views: ${startingAvgViews.toLocaleString()}

Format performance (best to worst):
${formatPerf.map(f => `- ${f.fmt}: ${f.avg.toLocaleString()} avg views`).join('\n')}

Top 5 reels by views:
${topReels.map(r => `- "${safeStr(r.hook)}" [${safeStr(r.format_type)}] — ${Number(r.views).toLocaleString()} views`).join('\n')}` : ''}

${competitorReels.length > 0 ? `═══ COMPETITOR INTELLIGENCE ═══
Competitors being tracked: ${compAccounts.join(', ')}

Top competitor reels this week:
${compTopReels.map(r => `- @${safeStr(r.account)}: "${safeStr(r.hook)}" [${safeStr(r.format_type)}] — ${Number(r.views).toLocaleString()} views`).join('\n')}` : ''}

${knowledgeDocs.length > 0 ? `═══ KNOWLEDGE LIBRARY ═══
These are Will Scott's coaching frameworks, principles, and strategies. When you use any of these, always translate them to fit ${name}'s specific niche, offer, and audience. NEVER use Will Scott's own offer, results, or brand as examples — ${name} has their own offer and story. Adapt every framework to their world.

CRITICAL: Never attribute any knowledge, framework, case study, or example to an external source, author, or person. All of this is Will Scott's own coaching methodology. Never mention other coaches, authors, or brands by name when using this knowledge.

${knowledgeDocs.map(d => `【${d.category}】 ${d.title}\n${d.content}`).join('\n\n---\n\n')}` : ''}

═══ HOW TO RESPOND ═══
- Speak as Will Scott: direct, no fluff, slightly provocative, big brother energy
- Reference their specific data (views, revenue, niche, story) in every response
- If they're doing something wrong, say it straight without sugarcoating
- Give specific, numbered action steps when asked for advice
- Keep responses under 200 words unless they ask for a full script or plan
- Never use corporate language, filler phrases, or "I understand your frustration"
- If you reference their content, use their actual hooks and formats
- When suggesting scripts or hooks, make them fit their exact niche and voice
- NEVER use Will Scott's own offer, clients, results, or brand as examples for ${name} — always substitute their specific situation`
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, sessionId } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  // Support impersonation
  const { data: realProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const impersonatingAs = realProfile?.role === 'admin' ? await getImpersonatedId() : null
  const profileId = effectiveId(user.id, realProfile?.role === 'admin', impersonatingAs)

  // Fetch all client context in parallel
  const [{ data: profile }, { data: reels }, { data: competitorReels }, { data: knowledgeDocs }] = await Promise.all([
    adminClient.from('profiles').select('*').eq('id', profileId).single(),
    adminClient
      .from('client_reels')
      .select('format_type, views, likes, comments, hook, caption, content_pillar')
      .eq('profile_id', profileId)
      .order('views', { ascending: false })
      .limit(50),
    adminClient
      .from('competitor_reels')
      .select('account, views, hook, format_type, caption')
      .order('views', { ascending: false })
      .limit(20),
    adminClient
      .from('knowledge_documents')
      .select('title, category, content')
      .order('category', { ascending: true })
      .limit(40),
  ])

  // Fetch or create session conversation history
  const sid = sessionId || crypto.randomUUID()
  const { data: existingSession } = await adminClient
    .from('ai_conversations')
    .select('messages')
    .eq('session_id', sid)
    .eq('profile_id', profileId)
    .single()

  const previousMessages: Array<{ role: string; content: string }> =
    (existingSession?.messages ?? []) as Array<{ role: string; content: string }>

  // Build system prompt with full client context
  const systemPrompt = buildSystemPrompt(
    profile as Record<string, unknown> ?? {},
    (reels ?? []) as Array<Record<string, unknown>>,
    (competitorReels ?? []) as Array<Record<string, unknown>>,
    previousMessages,
    (knowledgeDocs ?? []) as Array<{ title: string; category: string; content: string }>
  )

  // Build message history for Claude (last 10 messages for context)
  const claudeMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...previousMessages.slice(-10).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ]

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: claudeMessages,
    })

    const assistantMessage = response.content[0].type === 'text' ? response.content[0].text : ''
    const now = new Date().toISOString()

    // Append to conversation history
    const updatedMessages = [
      ...previousMessages,
      { role: 'user', content: message, timestamp: now },
      { role: 'assistant', content: assistantMessage, timestamp: now },
    ]

    // Upsert conversation (keep full history)
    await adminClient.from('ai_conversations').upsert(
      {
        profile_id: profileId,
        session_id: sid,
        messages: updatedMessages,
        insights_extracted: false,
        created_at: now,
      },
      { onConflict: 'session_id' }
    )

    return NextResponse.json({ message: assistantMessage, sessionId: sid })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
