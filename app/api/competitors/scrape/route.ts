/**
 * POST /api/competitors/scrape
 *
 * Triggers an Apify Instagram scrape for the current user's tracked competitor
 * accounts and stores results in `competitor_reels`.
 *
 * Returns { ok: true, added: N } or an error.
 *
 * Requires APIFY_API_TOKEN env var.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'
import Anthropic from '@anthropic-ai/sdk'
import { generateInsightForAccount } from '../insight/route'

export const maxDuration = 300

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

// ─── Apify helpers ────────────────────────────────────────────────────────────

const APIFY_TOKEN = process.env.APIFY_API_TOKEN
const APIFY_ACTOR = 'apify~instagram-scraper'
const APIFY_BASE = 'https://api.apify.com/v2'

async function startApifyRun(usernames: string[]): Promise<string> {
  const res = await fetch(
    `${APIFY_BASE}/acts/${APIFY_ACTOR}/runs?token=${APIFY_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        directUrls: usernames.map(u => `https://www.instagram.com/${u}/`),
        resultsType: 'reels',
        resultsLimit: 30,
        addParentData: false,
      }),
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Apify start failed: ${res.status} — ${text}`)
  }
  const json = await res.json()
  return json.data.id as string
}

async function waitForApifyRun(runId: string, maxWaitMs = 250_000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 4000))
    const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${APIFY_TOKEN}`)
    if (!res.ok) throw new Error(`Apify poll failed: ${res.status}`)
    const json = await res.json()
    const status = json.data?.status
    if (status === 'SUCCEEDED') return
    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      throw new Error(`Apify run ${status}`)
    }
  }
  throw new Error('Apify run timed out waiting for results')
}

async function fetchApifyResults(runId: string): Promise<ApifyPost[]> {
  const res = await fetch(
    `${APIFY_BASE}/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&format=json&clean=true`
  )
  if (!res.ok) throw new Error(`Apify results fetch failed: ${res.status}`)
  return res.json()
}

interface ApifyPost {
  ownerUsername?: string
  shortCode?: string
  url?: string
  videoViewCount?: number
  likesCount?: number
  commentsCount?: number
  timestamp?: string
  caption?: string
  type?: string
  videoUrl?: string
  displayUrl?: string
  videoDuration?: number
}

// ─── Format classification via Claude ─────────────────────────────────────────

// Format names match the Python runner's classification scheme exactly
const FORMAT_OPTIONS = 'talking_head, rant, list, tutorial, story_time, trend, pov, transformation, q_and_a, behind_the_scenes, other'

async function classifyFormats(reels: { caption: string; hook: string }[]): Promise<string[]> {
  if (reels.length === 0) return []
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
  if (!match) return reels.map(() => 'other')
  try {
    const parsed = JSON.parse(match[0])
    return Array.isArray(parsed) ? parsed : reels.map(() => 'other')
  } catch {
    return reels.map(() => 'other')
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!APIFY_TOKEN) {
    return NextResponse.json(
      { error: 'APIFY_API_TOKEN is not configured. Ask Will to add it to Vercel environment variables.' },
      { status: 503 }
    )
  }

  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: realProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = realProfile?.role === 'admin'
  const impersonatingAs = isAdmin ? await getImpersonatedId() : null
  const profileId = effectiveId(user.id, isAdmin, impersonatingAs)

  // Optionally accept specific handles to scrape (admin use) or scrape all tracked
  let handles: string[] = []
  try {
    const body = await req.json().catch(() => ({}))
    if (body.handles && Array.isArray(body.handles)) {
      handles = body.handles.map((h: string) => h.replace(/^@/, '').trim().toLowerCase())
    }
  } catch { /* ignore */ }

  if (handles.length === 0) {
    const { data: competitors } = await adminClient
      .from('client_competitors')
      .select('ig_username')
      .eq('profile_id', profileId)
      .eq('is_active', true)

    if (!competitors?.length) {
      return NextResponse.json({ error: 'no_competitors', message: 'No competitor accounts tracked yet.' }, { status: 422 })
    }
    handles = competitors.map(c => c.ig_username)
  }

  // Batch into groups of 10 for Apify
  const BATCH_SIZE = 10
  const batches: string[][] = []
  for (let i = 0; i < handles.length; i += BATCH_SIZE) {
    batches.push(handles.slice(i, i + BATCH_SIZE))
  }

  const allPosts: ApifyPost[] = []
  console.log(`[competitors/scrape] Starting scrape for handles: ${handles.join(', ')}`)
  for (const batch of batches) {
    try {
      console.log(`[competitors/scrape] Starting Apify run for batch: ${batch.join(', ')}`)
      const runId = await startApifyRun(batch)
      console.log(`[competitors/scrape] Apify run started: ${runId}`)
      await waitForApifyRun(runId)
      const posts = await fetchApifyResults(runId)
      console.log(`[competitors/scrape] Batch returned ${posts.length} posts. Sample fields: ${JSON.stringify(posts[0] ? Object.keys(posts[0]) : [])}`)
      allPosts.push(...posts)
    } catch (err) {
      console.error('[competitors/scrape] Apify batch error:', String(err))
      // Continue with other batches
    }
  }

  // Drop posts with no shortCode (can't deduplicate without it)
  const validPosts = allPosts.filter(p => p.shortCode)

  if (validPosts.length === 0) {
    return NextResponse.json({ ok: true, added: 0, updated: 0, accounts_scraped: handles.length, message: 'No posts found in scrape results.' })
  }

  // ── Deduplication: find which reel_ids already exist ──────────────────────
  const scrapedIds = validPosts.map(p => p.shortCode as string)
  const { data: existingRows } = await adminClient
    .from('competitor_reels')
    .select('reel_id')
    .in('reel_id', scrapedIds)

  const existingSet = new Set((existingRows ?? []).map((r: { reel_id: string }) => r.reel_id))
  const newPosts    = validPosts.filter(p => !existingSet.has(p.shortCode as string))
  const oldPosts    = validPosts.filter(p =>  existingSet.has(p.shortCode as string))

  const scraped_week = `${new Date().toISOString().slice(0, 7)}-W${getISOWeek(new Date())}`
  const today        = new Date().toISOString().split('T')[0]

  function buildRow(p: ApifyPost, format_type: string) {
    const caption   = p.caption ?? ''
    const hook      = caption.split(/[.!?\n]/)[0]?.trim().slice(0, 200) ?? ''
    const hashtags  = (caption.match(/#\w+/g) ?? []).map(h => h.slice(1))
    return {
      account:      (p.ownerUsername ?? '').toLowerCase(),
      reel_id:      p.shortCode ?? '',
      scraped_week,
      date:         p.timestamp ? p.timestamp.split('T')[0] : today,
      views:        p.videoViewCount ?? 0,
      likes:        p.likesCount ?? 0,
      comments:     p.commentsCount ?? 0,
      caption:      caption.slice(0, 2000),
      hook,
      hashtags,
      format_type,
      // FIX: videoDuration is a float (e.g. 30.066) — round to int for DB column
      duration_sec: p.videoDuration != null ? Math.round(p.videoDuration) : null,
      reel_url:     p.url ?? null,
      thumbnail_url: p.displayUrl ?? null,
    }
  }

  // ── Classify only NEW reels (skip re-classification of existing ones) ──────
  const newFormats: string[] = []
  if (newPosts.length > 0) {
    const reelInputs = newPosts.map(p => ({
      caption: p.caption ?? '',
      hook: (p.caption ?? '').split(/[.!?\n]/)[0]?.trim().slice(0, 200) ?? '',
    }))
    try {
      for (let i = 0; i < reelInputs.length; i += 20) {
        const batch = reelInputs.slice(i, i + 20)
        const batchFormats = await classifyFormats(batch)
        newFormats.push(...batchFormats)
      }
    } catch (classifyErr) {
      console.error('[competitors/scrape] classifyFormats error:', String(classifyErr))
      while (newFormats.length < newPosts.length) newFormats.push('other')
    }
  }

  const newRows  = newPosts.map((p, i) => buildRow(p, newFormats[i] ?? 'other'))
  // Existing rows — update metrics only, keep existing format_type (pass placeholder, overridden below)
  const metricUpdates = oldPosts.map(p => buildRow(p, 'KEEP_EXISTING'))

  try {
    // Insert new reels
    let added = 0
    if (newRows.length > 0) {
      const { error: insertErr } = await adminClient
        .from('competitor_reels')
        .insert(newRows)
      if (insertErr) {
        console.error('[competitors/scrape] Insert error:', insertErr.message)
        // Don't abort — proceed to metric updates
      } else {
        added = newRows.length
      }
    }

    // Refresh metrics on existing reels (views/likes/comments may have changed)
    let updated = 0
    if (metricUpdates.length > 0) {
      await Promise.allSettled(metricUpdates.map(r =>
        adminClient
          .from('competitor_reels')
          .update({ views: r.views, likes: r.likes, comments: r.comments, scraped_week })
          .eq('reel_id', r.reel_id)
      ))
      updated = metricUpdates.length
    }

    // ── Generate / refresh insights for all scraped accounts ─────────────────
    try {
      await Promise.allSettled(handles.map(async handle => {
        const insight = await generateInsightForAccount(handle)
        if (insight) {
          await adminClient
            .from('client_competitors')
            .update({ insight, insight_updated_at: new Date().toISOString() })
            .eq('ig_username', handle)
            .eq('profile_id', profileId)
        }
      }))
    } catch (insightErr) {
      console.error('[competitors/scrape] Insight generation error:', String(insightErr))
    }

    return NextResponse.json({
      ok: true,
      added,
      updated,
      accounts_scraped: handles.length,
      reels_found: validPosts.length,
    })
  } catch (err) {
    console.error('[competitors/scrape] Unexpected error:', String(err))
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}
