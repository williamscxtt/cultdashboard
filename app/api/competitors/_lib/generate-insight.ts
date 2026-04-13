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
