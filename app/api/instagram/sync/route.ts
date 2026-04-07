import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// Get ISO week string: YYYY-WW
function isoWeek(dateStr: string): string {
  const d = new Date(dateStr)
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000)
  const weekNum = Math.ceil((dayOfYear + jan4.getDay()) / 7)
  return `${d.getFullYear()}-${String(weekNum).padStart(2, '0')}`
}

// Extract hook: first sentence, max 200 chars
function extractHook(transcript: string): string {
  const match = transcript.match(/^[^.!?]*[.!?]/)
  const first = match ? match[0].trim() : transcript.slice(0, 200).trim()
  return first.length > 200 ? first.slice(0, 200) : first
}

interface IGMedia {
  id: string
  caption?: string
  media_type: string
  media_url?: string
  thumbnail_url?: string
  timestamp: string
  permalink?: string
  like_count?: number
  comments_count?: number
}

interface IGInsight {
  name: string
  values?: Array<{ value: number }>
  value?: number
}

interface ReelSummary {
  reel_id: string
  hook: string
  views: number
  likes: number
  date: string
  format_type: string | null
  is_new: boolean
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { profileId } = body

  if (!profileId) {
    return NextResponse.json({ error: 'profileId is required' }, { status: 400 })
  }

  // 1. Fetch profile
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('ig_access_token, ig_user_id, ig_username')
    .eq('id', profileId)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (!profile.ig_access_token || !profile.ig_user_id) {
    return NextResponse.json({ error: 'Instagram not connected' })
  }

  const { ig_access_token, ig_user_id } = profile

  // 2. Fetch recent media from Instagram Graph API
  const mediaUrl = new URL(`https://graph.instagram.com/v21.0/me/media`)
  mediaUrl.searchParams.set('fields', 'id,caption,media_type,media_url,thumbnail_url,timestamp,permalink,like_count,comments_count')
  mediaUrl.searchParams.set('limit', '50')
  mediaUrl.searchParams.set('access_token', ig_access_token)

  let mediaData: IGMedia[] = []

  const mediaRes = await fetch(mediaUrl.toString())

  if (mediaRes.status === 401) {
    // Token expired — clear it
    await adminClient
      .from('profiles')
      .update({ ig_access_token: null })
      .eq('id', profileId)
    return NextResponse.json({ error: 'token_expired' })
  }

  if (mediaRes.status === 429) {
    return NextResponse.json({ error: 'rate_limited', warning: 'Instagram API rate limit hit. Try again later.', synced: 0, total: 0, reels: [] })
  }

  if (!mediaRes.ok) {
    const errBody = await mediaRes.text()
    console.error('Instagram media fetch failed:', mediaRes.status, errBody)
    return NextResponse.json({ error: `Instagram API error: ${mediaRes.status}`, detail: errBody }, { status: 502 })
  }

  const mediaJson = await mediaRes.json()
  mediaData = (mediaJson.data ?? []) as IGMedia[]

  // 3. Filter to VIDEO (reels) only
  const reels = mediaData.filter(m => m.media_type === 'VIDEO')
  const total = reels.length

  // 4. Fetch insights for each reel
  const reelsWithInsights: Array<{
    media: IGMedia
    plays: number
    reach: number
    shares: number
    saved: number
  }> = await Promise.all(
    reels.map(async (media) => {
      let plays = 0, reach = 0, shares = 0, saved = 0
      try {
        const insightUrl = new URL(`https://graph.instagram.com/v21.0/${media.id}/insights`)
        insightUrl.searchParams.set('metric', 'ig_reels_video_view_total_time,ig_reels_avg_watch_time,reach,saved,shares')
        insightUrl.searchParams.set('access_token', ig_access_token)

        const insightRes = await fetch(insightUrl.toString())
        if (insightRes.ok) {
          const insightJson = await insightRes.json()
          const insights: IGInsight[] = insightJson.data ?? []
          let totalTime = 0, avgTime = 0
          for (const item of insights) {
            const val = item.value ?? item.values?.[0]?.value ?? 0
            if (item.name === 'ig_reels_video_view_total_time') totalTime = val
            else if (item.name === 'ig_reels_avg_watch_time') avgTime = val
            else if (item.name === 'reach') reach = val
            else if (item.name === 'shares') shares = val
            else if (item.name === 'saved') saved = val
          }
          // Estimate plays from total/avg watch time; fall back to reach
          if (totalTime > 0 && avgTime > 0) {
            plays = Math.round(totalTime / avgTime)
          } else if (reach > 0) {
            plays = reach
          }
        }
      } catch {
        // Insights unavailable — continue with zeros
      }
      return { media, plays, reach, shares, saved }
    })
  )

  // 5. Check which reel_ids already exist in client_reels
  const reelIds = reelsWithInsights.map(r => r.media.id)
  const { data: existingRows } = await adminClient
    .from('client_reels')
    .select('reel_id')
    .eq('profile_id', profileId)
    .in('reel_id', reelIds)

  const existingIds = new Set((existingRows ?? []).map((r: { reel_id: string }) => r.reel_id))

  // 5b. Refresh metrics on existing reels (plays, likes, comments, saves, shares)
  const existingReels = reelsWithInsights.filter(r => existingIds.has(r.media.id))
  await Promise.all(
    existingReels.map(({ media, plays, shares, saved }) =>
      adminClient
        .from('client_reels')
        .update({
          views: plays,
          likes: media.like_count ?? 0,
          comments: media.comments_count ?? 0,
          saves: saved,
          shares,
        })
        .eq('reel_id', media.id)
        .eq('profile_id', profileId)
    )
  )

  // 6. Process new reels: transcribe + save
  const newReels = reelsWithInsights.filter(r => !existingIds.has(r.media.id))
  const savedSummaries: ReelSummary[] = []

  for (const { media, plays, shares, saved } of newReels) {
    let transcript = ''
    let hook = ''

    // Transcribe via Whisper
    const videoSrc = media.media_url
    if (videoSrc) {
      try {
        const videoRes = await fetch(videoSrc)
        if (videoRes.ok) {
          const arrayBuffer = await videoRes.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          const transcription = await openai.audio.transcriptions.create({
            file: new File([buffer], 'reel.mp4', { type: 'video/mp4' }),
            model: 'whisper-1',
          })
          transcript = transcription.text ?? ''
          hook = transcript ? extractHook(transcript) : ''
        }
      } catch {
        // Transcription failed — continue with empty strings
      }
    }

    const scraped_week = isoWeek(media.timestamp)

    const { error: insertError } = await adminClient.from('client_reels').insert({
      profile_id: profileId,
      reel_id: media.id,
      date: media.timestamp,
      scraped_week,
      views: plays,
      likes: media.like_count ?? 0,
      comments: media.comments_count ?? 0,
      saves: saved,
      shares,
      transcript,
      hook,
      caption: media.caption ?? '',
      format_type: null,
    })

    if (!insertError) {
      savedSummaries.push({
        reel_id: media.id,
        hook: hook || media.caption?.slice(0, 100) || '(no hook)',
        views: plays,
        likes: media.like_count ?? 0,
        date: media.timestamp,
        format_type: null,
        is_new: true,
      })
    }
  }

  // 7. Classify format types for newly saved reels using Claude
  const reelsToClassify = savedSummaries.filter(r => r.is_new)

  if (reelsToClassify.length > 0) {
    const transcriptMap: Record<string, string> = {}
    for (const r of reelsToClassify) {
      // Retrieve transcript from the reel we just saved (or fall back to caption)
      const { data: saved_reel } = await adminClient
        .from('client_reels')
        .select('transcript')
        .eq('reel_id', r.reel_id)
        .eq('profile_id', profileId)
        .single()
      const fallbackCaption = newReels.find(n => n.media.id === r.reel_id)?.media.caption ?? ''
      transcriptMap[r.reel_id] = saved_reel?.transcript || fallbackCaption
    }

    const classifyInput = reelsToClassify.map(r => ({
      reel_id: r.reel_id,
      transcript: (transcriptMap[r.reel_id] ?? '').slice(0, 600),
      hook: r.hook,
    }))

    try {
      const classifyPrompt = `You are classifying Instagram Reels into content format types.

Given these reels (reel_id, transcript snippet, hook), classify each into ONE of these format types:
- "talking_head" — person speaking directly to camera, no b-roll
- "story_time" — narrative arc, personal story or experience
- "tutorial" — step-by-step how-to or educational
- "list" — numbered tips, "X ways to..." format
- "transformation" — before/after reveal
- "rant" — emotional/opinionated monologue
- "trend" — uses trending audio or format
- "pov" — point-of-view style framing
- "documentary" — cinematic, b-roll heavy
- "other" — doesn't fit above

Return ONLY a JSON object mapping reel_id to format_type, like:
{"reel_id_1": "tutorial", "reel_id_2": "story_time"}

Reels to classify:
${JSON.stringify(classifyInput, null, 2)}`

      const classifyRes = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [{ role: 'user', content: classifyPrompt }],
      })

      const rawText = classifyRes.content[0].type === 'text' ? classifyRes.content[0].text : '{}'
      const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      const formatMap: Record<string, string> = JSON.parse(jsonText)

      // 8. Update format_type in client_reels
      await Promise.all(
        Object.entries(formatMap).map(([reel_id, format_type]) =>
          adminClient
            .from('client_reels')
            .update({ format_type })
            .eq('reel_id', reel_id)
            .eq('profile_id', profileId)
        )
      )

      // Reflect classifications in our summary
      for (const summary of savedSummaries) {
        if (formatMap[summary.reel_id]) {
          summary.format_type = formatMap[summary.reel_id]
        }
      }
    } catch {
      // Classification failed — format_type stays null, not a blocking error
    }
  }

  // Also include existing reels in summary (not is_new)
  const existingSummaries: ReelSummary[] = reelsWithInsights
    .filter(r => existingIds.has(r.media.id))
    .map(r => ({
      reel_id: r.media.id,
      hook: r.media.caption?.slice(0, 100) || '(existing)',
      views: r.plays,
      likes: r.media.like_count ?? 0,
      date: r.media.timestamp,
      format_type: null,
      is_new: false,
    }))

  return NextResponse.json({
    synced: savedSummaries.length,
    total,
    reels: [...savedSummaries, ...existingSummaries],
  })
}
