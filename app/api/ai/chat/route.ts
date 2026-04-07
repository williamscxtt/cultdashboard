import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase-server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, sessionId } = await req.json()

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  // Fetch profile + onboarding
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, onboarding(*)')
    .eq('id', user.id)
    .single()

  // Fetch recent reel performance (top 10 by views)
  const { data: reels } = await supabase
    .from('client_reels')
    .select('format_type, views, likes, hook')
    .eq('profile_id', user.id)
    .order('views', { ascending: false })
    .limit(10)

  // Build format performance summary
  const formatGroups: Record<string, number[]> = {}
  reels?.forEach(r => {
    if (r.format_type) {
      if (!formatGroups[r.format_type]) formatGroups[r.format_type] = []
      formatGroups[r.format_type].push(r.views)
    }
  })
  const topFormat = Object.entries(formatGroups)
    .map(([fmt, views]) => ({ fmt, avg: views.reduce((a, b) => a + b, 0) / views.length }))
    .sort((a, b) => b.avg - a.avg)[0]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onboarding = (profile as any)?.onboarding?.[0]

  const systemPrompt = `You are Will Scott — personal brand coach and founder of CULT. You help coaches build personal brands that get more clients, followers, and views on Instagram.

Your client right now: ${profile?.name || 'your client'}
${onboarding ? `
Their niche: ${onboarding.niche}
Who they help: ${onboarding.target_audience}
Biggest challenge: ${onboarding.biggest_challenge}
Main goal: ${onboarding.main_goal}
Current followers: ${onboarding.current_followers?.toLocaleString()}
Brand voice: ${onboarding.brand_voice}
Why they joined CULT: ${onboarding.why_joined_cult}
` : '(No onboarding data yet — give general but direct advice)'}
${topFormat ? `Their top performing content format: ${topFormat.fmt} (avg ${Math.round(topFormat.avg).toLocaleString()} views)` : ''}

Speak exactly as Will Scott would: direct, no fluff, slightly provocative, uses real numbers and specifics. Never say "I understand your frustration" or use corporate language. Give specific, actionable advice. If they're doing something wrong, say it directly. Keep responses concise — 150 words max unless they ask for a full script.`

  // TODO Phase 3: Add pgvector RAG here — embed message, retrieve relevant knowledge_chunks from
  // the knowledge_chunks table using the match_knowledge() function, then inject them into context
  // before the user message. This will allow the AI to reference Will's actual scripts,
  // coaching frameworks, and competitor analysis.

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    })

    const assistantMessage = response.content[0].type === 'text' ? response.content[0].text : ''

    // Store conversation
    const sid = sessionId || crypto.randomUUID()
    await supabase.from('ai_conversations').upsert({
      profile_id: user.id,
      session_id: sid,
      messages: [
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: assistantMessage, timestamp: new Date().toISOString() }
      ]
    }, { onConflict: 'session_id' })

    return NextResponse.json({ message: assistantMessage, sessionId: sid })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
