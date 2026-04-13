/**
 * POST /api/competitors/transcribe
 *
 * Background job: finds competitor reels from the last 7 days that have a
 * video_url but no transcript, downloads each video, sends to OpenAI Whisper,
 * and stores the transcript in competitor_reels.
 *
 * Called fire-and-forget from the frontend after a scrape completes.
 * Processes reels in descending view order (highest value first) with a
 * 240-second time budget so it always returns before Vercel kills it.
 *
 * Requires: OPENAI_API_KEY env var.
 */
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getImpersonatedId, effectiveId } from '@/lib/effective-user'

export const maxDuration = 300

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
}

async function transcribeVideoUrl(videoUrl: string): Promise<string> {
  // Download the video
  const videoRes = await fetch(videoUrl, { signal: AbortSignal.timeout(30_000) })
  if (!videoRes.ok) throw new Error(`Video download failed: ${videoRes.status}`)

  const videoBuffer = await videoRes.arrayBuffer()
  if (videoBuffer.byteLength === 0) throw new Error('Empty video file')

  // Whisper accepts up to 25MB — skip if larger
  if (videoBuffer.byteLength > 25 * 1024 * 1024) {
    throw new Error(`Video too large (${Math.round(videoBuffer.byteLength / 1024 / 1024)}MB > 25MB limit)`)
  }

  // Send to OpenAI Whisper
  const formData = new FormData()
  formData.append('file', new Blob([videoBuffer], { type: 'video/mp4' }), 'reel.mp4')
  formData.append('model', 'whisper-1')
  formData.append('response_format', 'text')

  const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
    body: formData,
    signal: AbortSignal.timeout(60_000),
  })

  if (!whisperRes.ok) {
    const err = await whisperRes.text()
    throw new Error(`Whisper API error ${whisperRes.status}: ${err.slice(0, 200)}`)
  }

  return (await whisperRes.text()).trim()
}

export async function POST() {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 503 })
  }

  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: realProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = realProfile?.role === 'admin'
  const impersonatingAs = isAdmin ? await getImpersonatedId() : null
  const profileId = effectiveId(user.id, isAdmin, impersonatingAs)

  // Get this user's tracked competitor handles
  const { data: competitors } = await adminClient
    .from('client_competitors')
    .select('ig_username')
    .eq('profile_id', profileId)

  if (!competitors?.length) return NextResponse.json({ ok: true, transcribed: 0 })

  const handles = competitors.map(c => c.ig_username)

  // Find reels from last 7 days with video_url but no transcript yet
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7)
  const cutoff = sevenDaysAgo.toISOString().split('T')[0]

  const { data: reels } = await adminClient
    .from('competitor_reels')
    .select('id, account, video_url, views, hook')
    .in('account', handles)
    .gte('date', cutoff)
    .not('video_url', 'is', null)
    .is('transcript', null)
    .order('views', { ascending: false })
    .limit(30) // cap at 30 — enough for a week across all accounts

  if (!reels?.length) return NextResponse.json({ ok: true, transcribed: 0 })

  const START = Date.now()
  const TIME_BUDGET_MS = 240_000 // stop with 60s to spare
  let transcribed = 0
  let skipped = 0

  for (const reel of reels) {
    // Bail if we're running low on time
    if (Date.now() - START > TIME_BUDGET_MS) break

    try {
      const transcript = await transcribeVideoUrl(reel.video_url)
      if (transcript) {
        await adminClient
          .from('competitor_reels')
          .update({ transcript })
          .eq('id', reel.id)
        transcribed++
        console.log(`[transcribe] @${reel.account} — ${transcript.slice(0, 60)}… (${reel.views?.toLocaleString()} views)`)
      }
    } catch (err) {
      skipped++
      console.warn(`[transcribe] Skipped reel ${reel.id} (@${reel.account}): ${String(err).slice(0, 120)}`)
    }
  }

  return NextResponse.json({ ok: true, transcribed, skipped, total: reels.length })
}
