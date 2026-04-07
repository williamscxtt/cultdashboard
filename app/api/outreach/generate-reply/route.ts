import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'

export const maxDuration = 30

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: realProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  const impersonatingAs = realProfile?.role === 'admin' ? await getImpersonatedId() : null
  const profileId = effectiveId(user.id, realProfile?.role === 'admin', impersonatingAs)

  const { incomingMessage, stage, context } = await req.json()
  if (!incomingMessage?.trim()) return NextResponse.json({ error: 'incomingMessage is required' }, { status: 400 })

  // Fetch profile context
  const { data: profile } = await adminClient.from('profiles').select('name,intro_structured,niche,target_audience,ninety_day_goal').eq('id', profileId).single()
  const intro = (profile?.intro_structured ?? {}) as Record<string, string>

  const niche = intro.specific_niche || intro.what_you_coach || profile?.niche || ''
  const audience = intro.ideal_client || intro.target_audience || profile?.target_audience || ''
  const goal = intro.goal_90_days || profile?.ninety_day_goal || ''

  const system = `You are Will Scott — personal brand coach. You help coaches write DM replies that are direct, warm, and move conversations toward a discovery call.

Your client's context:
${niche ? `- Niche: ${niche}` : ''}
${audience ? `- Target audience: ${audience}` : ''}
${goal ? `- 90-day goal: ${goal}` : ''}
${context?.trim() ? `- Extra context: ${context}` : ''}

Conversation stage: ${stage || 'Initial contact'}

Write a DM reply that:
- Sounds human and natural (not salesy or corporate)
- Addresses their message directly
- Moves toward understanding their situation or booking a call
- Is 2–5 sentences max
- Ends with a soft CTA or question if appropriate

Return ONLY the reply text, nothing else.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system,
      messages: [{ role: 'user', content: `They said: "${incomingMessage.trim()}"` }],
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    if (!reply) return NextResponse.json({ error: 'No reply generated' }, { status: 500 })

    return NextResponse.json({ reply })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Generation failed' }, { status: 500 })
  }
}
