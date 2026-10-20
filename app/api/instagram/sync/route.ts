/**
 * Instagram sync via Apify + OpenAI Whisper.
 *
 * POST { profileId } → scrapes client's IG account via Apify cloud,
 * transcribes new reels via Whisper, classifies formats via Claude,
 * saves to client_reels + follower_snapshots.
 *
 * GET ?profileId=... → returns current sync status (reel count, last synced).
 *
 * Requires Vercel env vars: APIFY_API_TOKEN, OPENAI_API_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { authorizeInstagramSync } from '@/lib/instagram-sync-auth'
import { instagramSyncFeedback } from '@/lib/instagram-sync-feedback'
import { statistic, statisticsWindow } from '@/lib/instagram-statistics'
import { enqueueInstagramStatistics } from '@/lib/instagram-statistics-sync'
import { restoreLinkedInstagramStatistics } from '@/lib/instagram-cached-statistics'

export const maxDuration = 300 // 5 min — Vercel Pro/Fluid

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const APIFY_BASE = 'https://api.apify.com/v2'
const ACTOR_ID = 'apify~instagram-reel-scraper'

// ── Apify helpers ─────────────────────────────────────────────────────────────

/**
 * isInitialSync = true  → first 30 reels (history baseline), with comments
 * isInitialSync = false → past month (200-reel cap), no comments
 *
 * Comments are only fetched on initial sync to power the AI comment overview.
 * Incremental syncs skip comments to save ~70% Apify compute units.
 */
async function apifyStartRun(username: string, isInitialSync: boolean): Promise<string> {
  const token = process.env.APIFY_API_TOKEN
  if (!token) throw new Error('APIFY_API_TOKEN not set')

  const res = await fetch(`${APIFY_BASE}/acts/${ACTOR_ID}/runs?token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: [username],
      // 30 on first sync for analysis; refresh all recent monthly metrics afterwards
      resultsLimit: isInitialSync ? 30 : 200,
      ...(!isInitialSync ? { onlyPostsNewerThan: statisticsWindow(new Date().toISOString().slice(0, 10)) } : {}),
      // Comments only on initial sync — powers the AI overview; skip on incrementals
      includeComments: isInitialSync,
      maxCommentsPerPost: isInitialSync ? 30 : 0,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Apify start failed: ${res.status} ${err.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.data.id as string
}

async function apifyPollRun(runId: string, timeoutMs = 240_000): Promise<string> {
  const token = process.env.APIFY_API_TOKEN!
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 8000)) // poll every 8s
    const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${token}`)
    if (!res.ok) continue
    const run = (await res.json()).data
    const status: string = run.status
    if (status === 'SUCCEEDED') return run.defaultDatasetId as string
    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
      throw new Error(`Apify run ${runId} ended with: ${status}`)
    }
  }
  throw new Error('Apify run timed out after 4 minutes')
}

async function apifyDownload(datasetId: string): Promise<ApifyReel[]> {
  const token = process.env.APIFY_API_TOKEN!
  const res = await fetch(`${APIFY_BASE}/datasets/${datasetId}/items?token=${token}&clean=true`)
  if (!res.ok) throw new Error(`Apify download failed: ${res.status}`)
  const items = await res.json() as Record<string, unknown>[]

  return items
    // Reels only — skip photos (no videoPlayCount) and carousels
    .filter(item => {
      const isVideo = Boolean(
        (item.isVideo ?? item.is_video) ||
        (item.type === 'Video') ||
        (item.mediaType === 'VIDEO') ||
        (Number(item.videoPlayCount ?? item.playCount ?? item.videoViewCount ?? 0) > 0)
      )
      // Filter by publication date later, including recent pinned reels.
      return isVideo
    })
    .map(normalise)
}

interface ApifyReel {
  reel_id: string
  url: string
  video_url: string
  thumbnail_url: string
  username: string
  views: number
  likes: number
  comments: number
  saves: number
  shares: number
  caption: string
  timestamp: string
  duration_sec: number
  follower_count: number
  comments_text: string[]
}

function getFirst(obj: Record<string, unknown>, keys: string[], def: unknown = null) {
  for (const k of keys) {
    const v = obj[k]
    if (v !== null && v !== undefined) return v
  }
  return def
}

function normalise(item: Record<string, unknown>): ApifyReel {
  const caption = String(getFirst(item, ['caption', 'text', 'accessibility_caption'], '') ?? '')

  // Handle nested owner/author objects for follower count
  const ownerObj = (item.owner ?? item.authorMeta ?? item.ownerProfile) as Record<string, unknown> | null | undefined
  const nestedFollowers = ownerObj
    ? Number(ownerObj.followersCount ?? ownerObj.followerCount ?? ownerObj.followers ?? 0)
    : 0

  // Extract comment text (latestComments array from Apify)
  const rawComments = (item.latestComments ?? item.comments_data ?? []) as Array<Record<string, unknown>>
  const commentsText = rawComments
    .slice(0, 30)
    .map(c => String(c.text ?? c.content ?? '').trim())
    .filter(Boolean)

  return {
    reel_id:        String(getFirst(item, ['shortCode', 'id', 'code'], '')),
    url:            String(getFirst(item, ['url', 'link', 'webVideoUrl'], '')),
    video_url:      String(getFirst(item, ['videoUrl', 'videoSrc', 'video_url', 'downloadUrl'], '')),
    thumbnail_url:  String(getFirst(item, ['thumbnailSrc', 'displayUrl', 'thumbnail_url', 'previewImageUrl'], '')),
    username:       String(getFirst(item, ['ownerUsername', 'username'], '')).toLowerCase(),
    views:          Number(getFirst(item, ['videoPlayCount', 'playCount', 'videoViewCount', 'views', 'playsCount'], 0)),
    likes:          Number(getFirst(item, ['likesCount', 'likes', 'diggCount'], 0)),
    comments:       Number(getFirst(item, ['commentsCount', 'comments', 'commentCount'], 0)),
    saves:          Number(getFirst(item, ['savesCount', 'saved', 'bookmarkCount', 'saveCount'], 0)),
    shares:         Number(getFirst(item, ['sharesCount', 'shares', 'reshareCount', 'repostsCount', 'shareCount'], 0)),
    caption,
    timestamp:      String(getFirst(item, ['timestamp', 'takenAt', 'createTimeISO'], '')),
    duration_sec:   Number(getFirst(item, ['videoDuration', 'duration'], 0)),
    follower_count: Number(getFirst(item, ['ownerFollowersCount', 'followersCount', 'authorFollowersCount'], 0)) || nestedFollowers,
    comments_text:  commentsText,
  }
}

// ── Whisper transcription ─────────────────────────────────────────────────────

async function transcribeReel(videoUrl: string): Promise<string> {
  if (!videoUrl) return ''
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return ''

  try {
    // Download video
    const videoRes = await fetch(videoUrl, { signal: AbortSignal.timeout(30_000) })
    if (!videoRes.ok) return ''
    const buffer = Buffer.from(await videoRes.arrayBuffer())

    // Send to Whisper
    const form = new FormData()
    form.append('file', new Blob([buffer], { type: 'video/mp4' }), 'reel.mp4')
    form.append('model', 'whisper-1')
    form.append('language', 'en')

    const groqKey = process.env.GROQ_API_KEY
    const endpoint = groqKey
      ? 'https://api.groq.com/openai/v1/audio/transcriptions'
      : 'https://api.openai.com/v1/audio/transcriptions'
    const authKey = groqKey ?? apiKey
    if (groqKey) form.set('model', 'whisper-large-v3')

    const whisperRes = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authKey}` },
      body: form,
      signal: AbortSignal.timeout(60_000),
    })
    if (!whisperRes.ok) return ''
    const data = await whisperRes.json() as { text?: string }
    return (data.text ?? '').trim()
  } catch {
    return ''
  }
}

function extractHook(transcript: string): string {
  if (!transcript) return ''
  const match = transcript.match(/^[^.!?]*[.!?]/)
  const first = match ? match[0].trim() : transcript.slice(0, 200)
  return first.slice(0, 200)
}

function parseDate(ts: string | number): string | null {
  if (!ts) return null
  try {
    if (typeof ts === 'number') return new Date(ts * 1000).toISOString().slice(0, 10)
    return new Date(ts).toISOString().slice(0, 10)
  } catch {
    return null
  }
}

// ── Thumbnail persistence to Supabase Storage ────────────────────────────────

const BUCKET = 'reel-thumbnails'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

function isStorageUrl(url: string): boolean {
  return url.includes('.supabase.co/storage')
}

async function persistThumbnail(profileId: string, reelId: string, cdnUrl: string): Promise<string | null> {
  if (!cdnUrl || isStorageUrl(cdnUrl)) return cdnUrl || null
  try {
    const res = await fetch(cdnUrl, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    const ct = res.headers.get('content-type') || 'image/jpeg'
    const ext = ct.includes('png') ? 'png' : 'jpg'
    const path = `${profileId}/${reelId}.${ext}`
    const { error } = await adminClient.storage.from(BUCKET).upload(path, buffer, { contentType: ct, upsert: true })
    if (error) return null
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`
  } catch {
    return null
  }
}

// ── Format classification ─────────────────────────────────────────────────────

async function classifyFormats(reels: Array<{ reel_id: string; transcript: string; caption: string; duration_sec?: number }>): Promise<Record<string, string>> {
  if (!reels.length) return {}

  const FORMATS = [
    'Talking Head',    // Direct-to-camera, speaking to audience
    'Story Time',      // Personal narrative / what happened to me
    'Tutorial',        // Step-by-step how-to
    'Listicle',        // "X things / X reasons / X mistakes"
    'Transformation',  // Before/after, progress reveal
    'Rant/Hot Take',   // Contrarian opinion, calling something out
    'Trend/Meme',      // Riding an audio trend or viral format
    'POV',             // Point-of-view scenario
    'Workout/Training',// Exercise demo, training footage
    'Physique/Aesthetic', // Physique check, body transformation reveal
    'Q&A',             // Answering questions from audience
    'Behind Scenes',   // Day in the life, behind the scenes
    'Testimonial',     // Client results, success story
  ]

  // Batch into groups of 20 to avoid token limits
  const BATCH = 20
  const result: Record<string, string> = {}

  for (let i = 0; i < reels.length; i += BATCH) {
    const batch = reels.slice(i, i + BATCH)
    const items = batch.map((r, idx) => {
      const text = (r.transcript || r.caption || '').slice(0, 250)
      const dur = r.duration_sec ? ` [${r.duration_sec}s]` : ''
      return `${idx + 1}. [${r.reel_id}]${dur} ${text}`
    })
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `Classify each Instagram reel into ONE format from this list:
${FORMATS.join(', ')}

Rules:
- Physique/Aesthetic = shirtless body reveal, physique check, before/after body
- Workout/Training = exercise demos, training clips, gym footage
- Transformation = client results, weight loss/gain journey
- Rant/Hot Take = strong opinion, calling BS on something, controversial take
- Listicle = "X things", "X reasons", "X mistakes" structure
- Story Time = personal story with beginning/middle/end
- Talking Head = everything else that's direct-to-camera speaking

${items.join('\n')}

Reply ONLY with JSON array: [{"index":1,"format_type":"Talking Head"},...]`,
        }],
      })
      const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
      const match = text.match(/\[[\s\S]*\]/)
      if (!match) continue
      const arr = JSON.parse(match[0]) as Array<{ index: number; format_type: string }>
      for (const c of arr) {
        const reel = batch[c.index - 1]
        if (reel) result[reel.reel_id] = c.format_type
      }
    } catch { /* continue */ }
  }

  return result
}

// ── Status helper ─────────────────────────────────────────────────────────────

async function getStatus(profileId: string) {
  const { data: profile } = await adminClient.from('profiles').select('ig_username,followers_count').eq('id', profileId).single()
  const username = String(profile?.ig_username ?? '').trim().replace(/^@/, '').toLowerCase()
  const [{ data: latest }, { count }, { data: statisticsSync }, { data: attempt }] = await Promise.all([
    adminClient.from('client_reels').select('created_at').eq('profile_id', profileId)
      .order('created_at', { ascending: false }).limit(1).single(),
    adminClient.from('client_reels').select('*', { count: 'exact', head: true }).eq('profile_id', profileId),
    adminClient.from('instagram_sync_jobs').select('completed_at').eq('username', username)
      .eq('status', 'succeeded').order('completed_at', { ascending: false }).limit(1).maybeSingle(),
    adminClient.from('instagram_sync_jobs').select('status,last_error,updated_at')
      .eq('username', username).order('sync_date', { ascending: false }).limit(1).maybeSingle(),
  ])
  const issue = attempt?.status === 'failed' && attempt.last_error ? instagramSyncFeedback(attempt.last_error) : null
  const timestamps = [latest?.created_at, statisticsSync?.completed_at].filter(Boolean).sort()
  return { synced: 0, total: count ?? 0, last_synced: timestamps.at(-1) ?? null,
    has_synced: Boolean(statisticsSync || count), followers: profile?.followers_count ?? null,
    sync_issue: issue?.code ?? null, sync_status: attempt?.status ?? null }
}

// ── GET — status only ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const profileId = new URL(req.url).searchParams.get('profileId')
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })
  const denied = await authorizeInstagramSync(profileId)
  if (denied) return denied
  return NextResponse.json(await getStatus(profileId))
}

// Statistics refreshes share the durable daily job, including requests from
// multiple Dashboard profiles linked to the same Instagram handle.
async function handleDailySync(profileId: string, igUsername: string): Promise<NextResponse> {
  await enqueueInstagramStatistics(profileId)
  await restoreLinkedInstagramStatistics(adminClient, profileId)
  const today = new Date().toISOString().slice(0, 10)
  const { data: job, error } = await adminClient.from('instagram_sync_jobs').select('status,last_error')
    .eq('username', igUsername).eq('sync_date', today).maybeSingle()
  if (error || !job) return NextResponse.json({ error: 'Statistics refresh is unavailable. Please try again later.' }, { status: 503 })
  if (job.status === 'failed') return NextResponse.json({ error: instagramSyncFeedback(job.last_error).message }, { status: 503 })
  const status = await getStatus(profileId)
  const pending = job.status !== 'succeeded'
  return NextResponse.json({ ...status, pending, cached: !pending,
    message: pending ? 'Your daily statistics refresh is queued. Saved statistics remain available while it finishes.'
      : 'Your statistics are already up to date for today.' }, { status: pending ? 202 : 200 })
}

// ── Quick sync — reuse today's saved followers or daily job ──────────────────

async function handleQuickSync(profileId: string, igUsername: string): Promise<NextResponse> {
  const today = new Date().toISOString().slice(0, 10)
  const { data: cached } = await adminClient.from('follower_snapshots').select('count')
    .eq('profile_id', profileId).eq('date', today).maybeSingle()
  if (cached && Number.isInteger(cached.count) && cached.count >= 0) {
    return NextResponse.json({ quick: true, followers: cached.count, cached: true })
  }
  return handleDailySync(profileId, igUsername)
}

// ── POST — full Apify sync (or quick=true for follower count only) ────────────

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { profileId?: string; quick?: boolean; statisticsOnly?: boolean }
  const { profileId, quick, statisticsOnly } = body
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })
  const denied = await authorizeInstagramSync(profileId)
  if (denied) return denied

  // Get profile
  const { data: profile } = await adminClient
    .from('profiles').select('ig_username').eq('id', profileId).single()

  if (!profile?.ig_username) {
    return NextResponse.json({ error: 'No Instagram username set for this profile.' }, { status: 400 })
  }

  const igUsername = profile.ig_username.toLowerCase().replace('@', '')

  // Quick mode: just refresh follower count, skip all reel scraping
  if (quick) return handleQuickSync(profileId, igUsername)
  if (statisticsOnly) return handleDailySync(profileId, igUsername)

  // Ensure storage bucket exists (no-op if already created)
  await adminClient.storage.createBucket(BUCKET, { public: true }).catch(() => {})

  // ── 1. Determine sync mode BEFORE hitting Apify ──────────────────────────
  // Initial sync: no reels in DB → pull full history (150 reels, with comments)
  // Incremental:  existing reels present → pull last ~2 weeks only (15 reels, no comments)
  //               This saves ~90% of Apify compute unit cost per sync.
  const { count: existingCount } = await adminClient
    .from('client_reels')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileId)
  const isInitialSync = (existingCount ?? 0) === 0

  // ── 2. Apify scrape ──────────────────────────────────────────────────────
  let reels: ApifyReel[]
  try {
    const runId = await apifyStartRun(igUsername, isInitialSync)
    const datasetId = await apifyPollRun(runId)
    reels = await apifyDownload(datasetId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Apify error'
    console.error('[sync] Apify failed:', msg)
    const feedback = instagramSyncFeedback(msg)
    return NextResponse.json({ error: feedback.code, message: feedback.message }, { status: feedback.status })
  }

  if (!reels.length) {
    return NextResponse.json({ synced: 0, total: 0, message: 'No reels found on this account.' })
  }

  // ── 3. Save follower snapshot ────────────────────────────────────────────
  // Extract follower count from the FULL unfiltered reel set — must happen before
  // the date filter below, because incremental syncs only keep last 7 days and if
  // the client hasn't posted recently the filtered array will be empty (count = 0).
  let followerCount = reels.reduce((max, r) => Math.max(max, r.follower_count), 0)

  // Fallback: reel scraper often omits follower data — use async profile scraper
  if (followerCount === 0) {
    try {
      const token = process.env.APIFY_API_TOKEN!
      // Start an async run (more reliable than run-sync which times out at 30s)
      const startRes = await fetch(
        `${APIFY_BASE}/acts/apify~instagram-profile-scraper/runs?token=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernames: [igUsername], resultsLimit: 1 }),
        }
      )
      if (startRes.ok) {
        const startData = await startRes.json() as { data?: { id?: string } }
        const profileRunId = startData.data?.id
        if (profileRunId) {
          // Poll for up to 60s
          const deadline = Date.now() + 60_000
          let profileDatasetId: string | null = null
          while (Date.now() < deadline) {
            await new Promise(r => setTimeout(r, 5000))
            const pollRes = await fetch(`${APIFY_BASE}/actor-runs/${profileRunId}?token=${token}`)
            if (pollRes.ok) {
              const run = (await pollRes.json()).data
              if (run.status === 'SUCCEEDED') { profileDatasetId = run.defaultDatasetId; break }
              if (['FAILED','ABORTED','TIMED-OUT'].includes(run.status)) break
            }
          }
          if (profileDatasetId) {
            const dlRes = await fetch(`${APIFY_BASE}/datasets/${profileDatasetId}/items?token=${token}&clean=true`)
            if (dlRes.ok) {
              const profiles = await dlRes.json() as Array<Record<string, unknown>>
              if (profiles[0]) {
                followerCount = Number(
                  profiles[0].followersCount ?? profiles[0].followerCount ??
                  profiles[0].followers ?? 0
                )
              }
            }
          }
        }
      }
    } catch { /* silent — don't block sync */ }
  }

  // For incremental syncs, discard anything older than the monthly window — we only want new content
  // (date filter happens AFTER follower extraction above)
  if (!isInitialSync) {
    const cutoff = new Date(statisticsWindow(new Date().toISOString().slice(0, 10)))
    reels = reels.filter(r => {
      if (!r.timestamp) return true // keep if no date (safer than dropping)
      const posted = new Date(r.timestamp)
      return isNaN(posted.getTime()) || posted >= cutoff
    })
  }

  if (followerCount > 0) {
    const today = new Date().toISOString().slice(0, 10)
    await adminClient.from('follower_snapshots').upsert(
      { profile_id: profileId, date: today, count: followerCount },
      { onConflict: 'profile_id,date' }
    )
    await adminClient.from('profiles').update({ followers_count: followerCount }).eq('id', profileId)
  }

  // ── 4. Find new reels ────────────────────────────────────────────────────
  const reelIds = reels.map(r => r.reel_id).filter(Boolean)
  const { data: existing } = await adminClient
    .from('client_reels').select('reel_id, transcript').eq('profile_id', profileId).in('reel_id', reelIds)

  const existingSet = new Set((existing ?? []).map((r: { reel_id: string }) => r.reel_id))
  const analysedSet = new Set((existing ?? []).filter(r => r.transcript?.trim()).map(r => r.reel_id))
  const newReels = reels.filter(r => r.reel_id && !analysedSet.has(r.reel_id))

  // Refresh metrics on existing reels + persist any non-storage thumbnails
  const updatedReels = reels.filter(r => existingSet.has(r.reel_id))
  await Promise.allSettled(updatedReels.map(async r => {
    const storedThumb = r.thumbnail_url ? await persistThumbnail(profileId, r.reel_id, r.thumbnail_url) : null
    return adminClient.from('client_reels').update({
      views: r.views, likes: r.likes, comments: r.comments,
      ...(r.saves > 0 ? { saves: r.saves } : {}),
      ...(r.shares > 0 ? { shares: r.shares } : {}),
      ...(storedThumb ? { thumbnail_url: storedThumb } : {}),
      ...(r.comments_text?.length ? { comments_text: r.comments_text } : {}),
    }).eq('reel_id', r.reel_id).eq('profile_id', profileId)
  }))

  if (!newReels.length) {
    return NextResponse.json({ synced: 0, total: reels.length, message: 'All reels already synced.' })
  }

  // ── 5. Transcribe + persist thumbnails for new reels (max 5 at a time) ─
  // Only transcribe the 20 most recent new reels to avoid Vercel timeout
  const MAX_TRANSCRIBE = 20
  const reelsToTranscribe = newReels
    .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
    .slice(0, MAX_TRANSCRIBE)
  const noTranscribeIds = new Set(newReels.filter(r => !reelsToTranscribe.includes(r)).map(r => r.reel_id))

  const BATCH = 5
  for (let i = 0; i < newReels.length; i += BATCH) {
    await Promise.all(
      newReels.slice(i, i + BATCH).map(async (r) => {
        if (noTranscribeIds.has(r.reel_id)) {
          // Skip transcription for older reels — just persist thumbnail
          if (r.thumbnail_url) {
            const storedThumb = await persistThumbnail(profileId, r.reel_id, r.thumbnail_url)
            if (storedThumb) r.thumbnail_url = storedThumb
          }
          return
        }
        r.caption = r.caption || '' // ensure string
        const [transcript, storedThumb] = await Promise.all([
          transcribeReel(r.video_url),
          r.thumbnail_url ? persistThumbnail(profileId, r.reel_id, r.thumbnail_url) : Promise.resolve(null),
        ])
        ;(r as ApifyReel & { transcript?: string; hook?: string }).transcript = transcript
        ;(r as ApifyReel & { hook?: string }).hook = extractHook(transcript)
        if (storedThumb) r.thumbnail_url = storedThumb
      })
    )
  }

  // ── 6. Classify format types (new reels + existing with NULL format) ────
  const toClassifyNew = newReels.map(r => ({
    reel_id: r.reel_id,
    transcript: (r as ApifyReel & { transcript?: string }).transcript ?? '',
    caption: r.caption,
    duration_sec: r.duration_sec,
  }))

  // Also re-classify existing reels that have no format_type
  const { data: unclassified } = await adminClient
    .from('client_reels')
    .select('reel_id, transcript, caption, duration_sec')
    .eq('profile_id', profileId)
    .is('format_type', null)
    .limit(50)

  const toClassifyExisting = (unclassified ?? []).map(r => ({
    reel_id: r.reel_id as string,
    transcript: (r.transcript as string) ?? '',
    caption: (r.caption as string) ?? '',
    duration_sec: r.duration_sec as number | undefined,
  }))

  const [formatMapNew, formatMapExisting] = await Promise.all([
    classifyFormats(toClassifyNew),
    classifyFormats(toClassifyExisting),
  ])
  const formatMap = { ...formatMapNew }

  // Update existing reels with newly classified format_type
  if (Object.keys(formatMapExisting).length > 0) {
    await Promise.allSettled(
      Object.entries(formatMapExisting).map(([reelId, fmt]) =>
        adminClient.from('client_reels')
          .update({ format_type: fmt })
          .eq('reel_id', reelId)
          .eq('profile_id', profileId)
      )
    )
  }

  // ── 7. Insert new reels ──────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10)
  const rows = newReels.map(r => {
    const ext = r as ApifyReel & { transcript?: string; hook?: string; comments_text?: string[] }
    return {
      profile_id:    profileId,
      reel_id:       r.reel_id,
      scraped_week:  today,
      date:          parseDate(r.timestamp),
      views:         r.views,
      likes:         r.likes,
      comments:      r.comments,
      saves:         r.saves || null,
      shares:        r.shares || null,
      caption:       r.caption,
      duration_sec:  r.duration_sec || null,
      transcript:    ext.transcript ?? '',
      hook:          ext.hook ?? '',
      format_type:   formatMap[r.reel_id] ?? null,
      thumbnail_url: r.thumbnail_url || null,
      permalink:     r.url || null,
      comments_text: ext.comments_text?.length ? ext.comments_text : null,
    }
  })

  const { error: insertErr } = await adminClient
    .from('client_reels')
    .upsert(rows, { onConflict: 'profile_id,reel_id', ignoreDuplicates: false })
  if (insertErr) {
    console.error('[sync] Upsert error:', insertErr.message)
    return NextResponse.json({ error: 'sync_unavailable', message: 'Could not save the refreshed statistics. Please try again later.' }, { status: 500 })
  }

  return NextResponse.json({
    synced: rows.length,
    total: reels.length,
    followers: followerCount || null,
  })
}

// ── PATCH — refresh thumbnails for all existing reels ─────────────────────────
// Re-scrapes Apify for fresh CDN URLs then persists them to Supabase Storage.
// Call this once to fix all expired thumbnails.

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { profileId?: string }
  const { profileId } = body
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })
  const denied = await authorizeInstagramSync(profileId)
  if (denied) return denied

  const { data: profile } = await adminClient
    .from('profiles').select('ig_username').eq('id', profileId).single()

  if (!profile?.ig_username) {
    return NextResponse.json({ error: 'No Instagram username set' }, { status: 400 })
  }

  await adminClient.storage.createBucket(BUCKET, { public: true }).catch(() => {})

  const igUsername = profile.ig_username.toLowerCase().replace('@', '')

  // Fetch fresh reel data from Apify
  let reels: ApifyReel[]
  try {
    const runId = await apifyStartRun(igUsername, true)
    const datasetId = await apifyPollRun(runId)
    reels = await apifyDownload(datasetId)
  } catch (err) {
    const feedback = instagramSyncFeedback(err)
    return NextResponse.json({ error: feedback.code, message: feedback.message }, { status: feedback.status })
  }

  // Persist thumbnails for all reels with non-storage URLs
  let updated = 0
  await Promise.allSettled(reels.map(async r => {
    if (!r.thumbnail_url || isStorageUrl(r.thumbnail_url)) return
    const storedUrl = await persistThumbnail(profileId, r.reel_id, r.thumbnail_url)
    if (storedUrl) {
      await adminClient.from('client_reels')
        .update({ thumbnail_url: storedUrl })
        .eq('reel_id', r.reel_id)
        .eq('profile_id', profileId)
      updated++
    }
  }))

  return NextResponse.json({ updated, total: reels.length })
}
