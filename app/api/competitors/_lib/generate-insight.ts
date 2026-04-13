import { createClient as createAdmin } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function generateInsightForAccount(handle: string): Promise<string> {
  const { data: reels } = await adminClient
    .from('competitor_reels')
    .select('transcript, views, format_type, date')
    .eq('account', handle)
    .not('transcript', 'is', null)
    .order('views', { ascending: false })
    .limit(15)

  if (!reels?.length) return ''

  const topReels = reels
    .map(r => {
      // Use the actual opening line from transcript — what they say in the first few seconds
      const opening = r.transcript?.slice(0, 200).split(/[.!?]/)[0]?.trim() || ''
      if (!opening) return null
      return `- "${opening}" [${r.format_type ?? 'unknown'}] — ${(r.views ?? 0).toLocaleString()} views`
    })
    .filter(Boolean)
    .join('\n')

  if (!topReels) return ''

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 120,
    messages: [{
      role: 'user',
      content: `You're a content strategist. Analyse these top reels from @${handle} and write exactly 2 sentences:
1. What topics and angles drive their biggest numbers.
2. Which formats and structures they lean on most.

Plain text only — no bullet points, no bold, no asterisks, no markdown. Max 35 words total.

Top reels (transcript openings):
${topReels}`,
    }],
  })

  return msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
}
