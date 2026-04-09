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

export const maxDuration = 300 // 5 min — Vercel Pro/Fluid

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const APIFY_BASE = 'https://api.apify.com/v2'
const ACTOR_ID = 'apify~instagram-reel-scraper'

// ── Apify helpers ─────────────────────────────────────────────────────────────

async function apifyStartRun(username: string): Promise<string> {
  const token = process.env.APIFY_API_TOKEN
  if (!token) throw new Error('APIFY_API_TOKEN not set')

  const res = await fetch(`${APIFY_BASE}/acts/${ACTOR_ID}/runs?token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: [username],
      resultsLimit: 150,        // Capture ~5 months of posting history
      includeComments: true,
      maxCommentsPerPost: 30,
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
  return items.map(normalise)
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

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
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

async function classifyFormats(reels: Array<{ reel_id: string; transcript: string; caption: string }>): Promise<Record<string, string>> {
  if (!reels.length) return {}
  const FORMATS = ['talking_head','story_time','tutorial','list','transformation','rant','trend','pov','other']
  const items = reels.map((r, i) => `${i + 1}. [${r.reel_id}] ${(r.transcript || r.caption).slice(0, 200)}`)
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Classify each reel into ONE format: ${FORMATS.join(', ')}.\n\n${items.join('\n')}\n\nReply ONLY with JSON: [{"index":1,"format_type":"tutorial"},...]`,
      }],
    })
    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return {}
    const arr = JSON.parse(match[0]) as Array<{ index: number; format_type: string }>
    return Object.fromEntries(arr.map(c => [reels[c.index - 1]?.reel_id ?? '', c.format_type]))
  } catch {
    return {}
  }
}

// ── Status helper ─────────────────────────────────────────────────────────────

async function getStatus(profileId: string) {
  const [{ data: latest }, { count }] = await Promise.all([
    adminClient.from('client_reels').select('created_at').eq('profile_id', profileId)
      .order('created_at', { ascending: false }).limit(1).single(),
    adminClient.from('client_reels').select('*', { count: 'exact', head: true }).eq('profile_id', profileId),
  ])
  return { synced: 0, total: count ?? 0, last_synced: latest?.created_at ?? null }
}

// ── GET — status only ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const profileId = new URL(req.url).searchParams.get('profileId')
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })
  return NextResponse.json(await getStatus(profileId))
}

// ── POST — full Apify sync ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { profileId?: string }
  const { profileId } = body
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })

  // Get profile
  const { data: profile } = await adminClient
    .from('profiles').select('ig_username').eq('id', profileId).single()

  if (!profile?.ig_username) {
    return NextResponse.json({ error: 'No Instagram username set for this profile.' }, { status: 400 })
  }

  const igUsername = profile.ig_username.toLowerCase().replace('@', '')

  // Ensure storage bucket exists (no-op if already created)
  await adminClient.storage.createBucket(BUCKET, { public: true }).catch(() => {})

  // ── 1. Apify scrape ──────────────────────────────────────────────────────
  let reels: ApifyReel[]
  try {
    const runId = await apifyStartRun(igUsername)
    const datasetId = await apifyPollRun(runId)
    reels = await apifyDownload(datasetId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Apify error'
    console.error('[sync] Apify failed:', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  if (!reels.length) {
    return NextResponse.json({ synced: 0, total: 0, message: 'No reels found on this account.' })
  }

  // ── 2. Save follower snapshot ────────────────────────────────────────────
  let followerCount = reels.reduce((max, r) => Math.max(max, r.follower_count), 0)

  // Fallback: if reel scraper didn't include follower count, hit the profile scraper directly
  if (followerCount === 0) {
    try {
      const token = process.env.APIFY_API_TOKEN!
      const profileRes = await fetch(
        `${APIFY_BASE}/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${token}&timeout=30`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernames: [igUsername], resultsLimit: 1 }),
          signal: AbortSignal.timeout(35_000),
        }
      )
      if (profileRes.ok) {
        const profiles = await profileRes.json() as Array<Record<string, unknown>>
        if (profiles[0]) {
          followerCount = Number(
            profiles[0].followersCount ?? profiles[0].followerCount ?? profiles[0].followers ?? 0
          )
        }
      }
    } catch { /* silent — don't block sync */ }
  }

  if (followerCount > 0) {
    const today = new Date().toISOString().slice(0, 10)
    await adminClient.from('follower_snapshots').upsert(
      { profile_id: profileId, date: today, count: followerCount },
      { onConflict: 'profile_id,date' }
    )
    await adminClient.from('profiles').update({ followers_count: followerCount }).eq('id', profileId)
  }

  // ── 3. Find new reels ────────────────────────────────────────────────────
  const reelIds = reels.map(r => r.reel_id).filter(Boolean)
  const { data: existing } = await adminClient
    .from('client_reels').select('reel_id').eq('profile_id', profileId).in('reel_id', reelIds)

  const existingSet = new Set((existing ?? []).map((r: { reel_id: string }) => r.reel_id))
  const newReels = reels.filter(r => r.reel_id && !existingSet.has(r.reel_id))

  // Refresh metrics on existing reels + persist any non-storage thumbnails
  const updatedReels = reels.filter(r => existingSet.has(r.reel_id))
  await Promise.allSettled(updatedReels.map(async r => {
    const storedThumb = r.thumbnail_url ? await persistThumbnail(profileId, r.reel_id, r.thumbnail_url) : null
    return adminClient.from('client_reels').update({
      views: r.views, likes: r.likes, comments: r.comments,
      ...(storedThumb ? { thumbnail_url: storedThumb } : {}),
      // Refresh comments_text if Apify returned them
      ...(r.comments_text?.length ? { comments_text: r.comments_text } : {}),
    }).eq('reel_id', r.reel_id).eq('profile_id', profileId)
  }))

  if (!newReels.length) {
    return NextResponse.json({ synced: 0, total: reels.length, message: 'All reels already synced.' })
  }

  // ── 4. Transcribe + persist thumbnails for new reels (max 5 at a time) ─
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

  // ── 5. Classify format types ─────────────────────────────────────────────
  const toClassify = newReels.map(r => ({
    reel_id: r.reel_id,
    transcript: (r as ApifyReel & { transcript?: string }).transcript ?? '',
    caption: r.caption,
  }))
  const formatMap = await classifyFormats(toClassify)

  // ── 6. Insert new reels ──────────────────────────────────────────────────
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

  const { error: insertErr } = await adminClient.from('client_reels').insert(rows)
  if (insertErr) {
    console.error('[sync] Insert error:', insertErr.message)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
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
    const runId = await apifyStartRun(igUsername)
    const datasetId = await apifyPollRun(runId)
    reels = await apifyDownload(datasetId)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Apify error' }, { status: 502 })
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
