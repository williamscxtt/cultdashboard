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

export const maxDuration = 120

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
        resultsType: 'posts',
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

async function waitForApifyRun(runId: string, maxWaitMs = 90_000): Promise<void> {
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

async function classifyFormats(reels: { caption: string; hook: string }[]): Promise<string[]> {
  if (reels.length === 0) return []
  const prompt = `Classify each of these Instagram reels into ONE format type. Options: Tutorial, Listicle, Storytime, Contrarian, Tool Discovery, Viewer Callout, Framework, Comparison, Fear/Warning, POV/Meme, Testimonial, Behind the Scenes, Q&A, Rant, Transformation.

Return ONLY a JSON array of strings, one per reel, in the same order. Example: ["Tutorial", "Listicle", "Rant"]

Reels:
${reels.map((r, i) => `${i + 1}. Hook: "${r.hook}" | Caption: "${r.caption?.slice(0, 120)}"`).join('\n')}`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  })
  const raw = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) return reels.map(() => 'Unknown')
  try {
    const parsed = JSON.parse(match[0])
    return Array.isArray(parsed) ? parsed : reels.map(() => 'Unknown')
  } catch {
    return reels.map(() => 'Unknown')
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
  for (const batch of batches) {
    try {
      const runId = await startApifyRun(batch)
      await waitForApifyRun(runId)
      const posts = await fetchApifyResults(runId)
      allPosts.push(...posts)
    } catch (err) {
      console.error('[competitors/scrape] Apify batch error:', err)
      // Continue with other batches
    }
  }

  // Filter to video posts only
  const videoPosts = allPosts.filter(p =>
    p.type === 'Video' || p.type === 'video' || (p.videoUrl && p.videoUrl.length > 0)
  )

  if (videoPosts.length === 0) {
    return NextResponse.json({ ok: true, added: 0, message: 'No video posts found in scrape results.' })
  }

  // Build reel records
  const weekStr = new Date().toISOString().split('T')[0].slice(0, 7) // YYYY-MM

  const reelInputs = videoPosts.map(p => {
    const caption = p.caption ?? ''
    const hook = caption.split(/[.!?\n]/)[0]?.trim().slice(0, 200) ?? ''
    return { caption, hook }
  })

  // Classify in batches of 20 to avoid huge prompts
  const formats: string[] = []
  for (let i = 0; i < reelInputs.length; i += 20) {
    const batch = reelInputs.slice(i, i + 20)
    const batchFormats = await classifyFormats(batch)
    formats.push(...batchFormats)
  }

  const scraped_week = `${weekStr}-W${getISOWeek(new Date())}`

  const rows = videoPosts.map((p, i) => {
    const caption = p.caption ?? ''
    const hook = caption.split(/[.!?\n]/)[0]?.trim().slice(0, 200) ?? ''
    const hashtags = (caption.match(/#\w+/g) ?? []).map(h => h.slice(1))

    return {
      account: (p.ownerUsername ?? '').toLowerCase(),
      reel_id: p.shortCode ?? '',
      scraped_week,
      date: p.timestamp ? p.timestamp.split('T')[0] : new Date().toISOString().split('T')[0],
      views: p.videoViewCount ?? 0,
      likes: p.likesCount ?? 0,
      comments: p.commentsCount ?? 0,
      caption: caption.slice(0, 2000),
      hook,
      hashtags,
      format_type: formats[i] ?? 'Unknown',
      duration_sec: p.videoDuration ?? null,
      reel_url: p.url ?? null,
      thumbnail_url: p.displayUrl ?? null,
    }
  }).filter(r => r.account && r.reel_id)

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, added: 0, message: 'No valid reels to store.' })
  }

  // Upsert into competitor_reels
  const { error: upsertError, data: upserted } = await adminClient
    .from('competitor_reels')
    .upsert(rows, { onConflict: 'reel_id', ignoreDuplicates: false })
    .select('id')

  if (upsertError) {
    console.error('[competitors/scrape] Upsert error:', upsertError)
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    added: upserted?.length ?? rows.length,
    accounts_scraped: handles.length,
    reels_found: videoPosts.length,
  })
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}
