/**
 * POST /api/client-reels/fix-formats
 *
 * Backfills format_type for any client_reels rows where it is NULL.
 * Classifies in batches of 20 using Claude Haiku.
 * Called silently from ContentStudio on mount.
 */
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const maxDuration = 300

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const FORMAT_OPTIONS = 'talking_head, rant, list, tutorial, story_time, trend, pov, transformation, q_and_a, behind_the_scenes, other'

async function classifyBatch(reels: { id: string; hook: string; caption: string }[]): Promise<void> {
  if (!reels.length) return

  const prompt = `Classify each Instagram reel into ONE format type.

Options (use exactly as written): ${FORMAT_OPTIONS}

Format definitions:
- talking_head: creator talking directly to camera with an opinion or point
- rant: strong take, calling something out, hot opinion
- list: numbered tips, mistakes, things nobody tells you, reasons why
- tutorial: step-by-step how-to, teach something specific
- story_time: personal story or client story with a lesson/punchline
- trend: trending audio, challenge, or meme format
- pov: "POV: you..." style, viewer imagines themselves in a scenario
- transformation: before/after, journey, results reveal
- q_and_a: answering a question (real or rhetorical)
- behind_the_scenes: showing process, day-in-life, what happens behind camera
- other: doesn't fit any of the above

Return ONLY a JSON array of strings, one per reel, same order. Example: ["tutorial","rant","list"]

Reels:
${reels.map((r, i) => `${i + 1}. Hook: "${r.hook}" | Caption: "${r.caption?.slice(0, 150)}"`).join('\n')}`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) return

  let formats: string[]
  try {
    formats = JSON.parse(match[0])
    if (!Array.isArray(formats)) return
  } catch {
    return
  }

  // Update each reel
  await Promise.all(reels.map(async (reel, i) => {
    const fmt = formats[i]
    if (!fmt || typeof fmt !== 'string') return
    await adminClient
      .from('client_reels')
      .update({ format_type: fmt.toLowerCase().trim() })
      .eq('id', reel.id)
  }))
}

export async function POST() {
  // Fetch all client_reels with null format_type that have content to classify
  const { data: reels, error } = await adminClient
    .from('client_reels')
    .select('id, hook, caption')
    .is('format_type', null)
    .not('hook', 'is', null)
    .limit(300)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!reels?.length) return NextResponse.json({ ok: true, fixed: 0 })

  // Process in batches of 20
  const BATCH = 20
  let fixed = 0
  for (let i = 0; i < reels.length; i += BATCH) {
    const batch = reels.slice(i, i + BATCH).map(r => ({
      id: r.id as string,
      hook: (r.hook as string) || '',
      caption: (r.caption as string) || '',
    }))
    try {
      await classifyBatch(batch)
      fixed += batch.length
    } catch (err) {
      console.error('[fix-formats] batch error:', String(err))
    }
  }

  console.log(`[fix-formats] Classified ${fixed} reels`)
  return NextResponse.json({ ok: true, fixed })
}
