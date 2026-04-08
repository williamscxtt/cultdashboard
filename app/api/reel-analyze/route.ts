import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

// ── Instagram URL helpers ────────────────────────────────────────────────────

function extractShortcode(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:reel|p|tv)\/([A-Za-z0-9_-]+)/)
  return m ? m[1] : null
}

async function fetchInstagramMeta(url: string): Promise<{
  caption: string; videoUrl: string | null; views: number | null; likes: number | null
}> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'en-US,en;q=0.9',
  }

  const res = await fetch(url, { headers })
  const html = await res.text()

  const captionMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/)
  const rawCaption = captionMatch ? captionMatch[1] : ''
  const caption = rawCaption.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')

  const videoMatch = html.match(/"video_url":"([^"]+)"/) || html.match(/property="og:video"\s+content="([^"]+)"/)
  let videoUrl: string | null = videoMatch ? videoMatch[1].replace(/\\u0026/g, '&') : null

  if (!videoUrl) {
    const embedUrl = url.includes('/embed') ? url : url.replace(/\/$/, '') + '/embed/'
    try {
      const embedRes = await fetch(embedUrl, { headers })
      const embedHtml = await embedRes.text()
      const embedVideoMatch = embedHtml.match(/src="(https:\/\/[^"]+\.mp4[^"]*)"/)
      if (embedVideoMatch) videoUrl = embedVideoMatch[1].replace(/&amp;/g, '&')
    } catch { /* ignore */ }
  }

  return { caption, videoUrl, views: null, likes: null }
}

// ── Transcription ────────────────────────────────────────────────────────────

async function transcribeAudioFile(file: File): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured.')
  }
  const { default: OpenAI } = await import('openai')
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const result = await openai.audio.transcriptions.create({ file, model: 'whisper-1', language: 'en' })
  return result.text
}

async function transcribeFromUrl(videoUrl: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) throw new Error('OpenAI API key not configured.')

  const videoRes = await fetch(videoUrl)
  if (!videoRes.ok) throw new Error('Could not download reel video')
  const buffer = await videoRes.arrayBuffer()
  const blob = new Blob([buffer], { type: 'video/mp4' })
  const file = new File([blob], 'reel.mp4', { type: 'video/mp4' })

  const { default: OpenAI } = await import('openai')
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const result = await openai.audio.transcriptions.create({ file, model: 'whisper-1', language: 'en' })
  return result.text
}

// ── Knowledge base ────────────────────────────────────────────────────────────

interface KnowledgeDoc {
  title: string
  body: string
  category: string
}

async function fetchKnowledgeDocs(): Promise<KnowledgeDoc[]> {
  const { data } = await getAdminClient()
    .from('knowledge_documents')
    .select('title, body, category')
    .in('category', ['Script', 'Content Strategy', 'Hook', 'Hooks', 'hook'])
    .order('created_at', { ascending: false })
    .limit(8)
  return (data ?? []) as KnowledgeDoc[]
}

// ── Analysis ─────────────────────────────────────────────────────────────────

interface ClientProfile {
  name?: string
  niche?: string
  ig_username?: string
  intro_structured?: Record<string, unknown>
}

interface ReelData {
  views: number
  likes: number
  comments: number
  comments_text: string[] | null
}

function buildAnalysisPrompt(
  profile: ClientProfile | null,
  knowledgeDocs: KnowledgeDoc[],
): string {
  const intro = (profile?.intro_structured ?? {}) as Record<string, unknown>
  const name = profile?.name || 'the client'
  const niche = (intro.specific_niche as string) || profile?.niche || 'fitness coaching'
  const idealClient = (intro.ideal_client as string) || (intro.target_audience as string) || ''
  const transformation = (intro.client_transformation as string) || ''
  const brandVoice = (intro.brand_voice as string) || ''
  const hookStyle = (intro.hook_style as string) || ''

  const kbSection = knowledgeDocs.length > 0
    ? `\n\nWILL SCOTT'S COACHING PRINCIPLES (apply these when judging this reel):\n` +
      knowledgeDocs.map(d => `[${d.category}] ${d.title}:\n${d.body.slice(0, 400)}`).join('\n\n')
    : ''

  return `You are Will Scott — personal brand coach for CULT. You're analysing a reel for ${name}, who is a ${niche} coach.

${idealClient ? `Their ideal client: ${idealClient}` : ''}
${transformation ? `Transformation they deliver: ${transformation}` : ''}
${brandVoice ? `Their brand voice: ${brandVoice}` : ''}
${hookStyle ? `Their hook style: ${hookStyle}` : ''}
${kbSection}

Analyse the FULL script/transcript of the reel — not just the hook. Judge the whole arc: hook → body → CTA.

Return ONLY valid JSON with this exact structure:
{
  "verdict": "Strong",
  "overall_score": 82,
  "performance_score": 85,
  "script_quality_score": 79,
  "hook_analysis": "Direct commentary on the hook — does it stop the scroll, what makes it work or not work",
  "body_analysis": "How the middle of the reel lands — structure, pacing, value delivery, retention",
  "pacing_analysis": "Overall structure and flow from hook to CTA",
  "cta_analysis": "How effective the call-to-action is",
  "is_controversial": false,
  "controversy_type": null,
  "key_lessons": ["3 specific transferable lessons from this reel"],
  "adaptation_brief": "Brutally honest — is this worth adapting for ${name}'s ${niche} niche? Why or why not. Specific guidance if yes.",
  "suggested_hook": "A rewritten hook adapted to ${name}'s voice, audience and niche. Sound like Will writing it — no corporate fluff."
}

For is_controversial: set true if the script takes a strong opinion, challenges mainstream advice, calls out something/someone, or could trigger disagreement. Set controversy_type to a short label like "hot take", "calls out bad advice", "polarising claim", "vulnerable/personal", etc.

Verdict: Exceptional (90-100), Strong (75-89), Average (55-74), Weak (35-54), Poor (0-34).
Be specific, direct, reference exact lines. Sound like Will Scott — no corporate language, no hedging.`
}

async function analyzeReel(
  transcript: string,
  profile: ClientProfile | null,
  knowledgeDocs: KnowledgeDoc[],
  reelData: ReelData | null,
  extraContext?: string,
) {
  const systemPrompt = buildAnalysisPrompt(profile, knowledgeDocs)

  // Build controversy context if we have real reel data
  let controversyContext = ''
  if (reelData && reelData.views > 0) {
    const commentSample = (reelData.comments_text ?? []).slice(0, 20).join('\n- ')
    controversyContext = `\n\nACTUAL PERFORMANCE DATA FOR THIS REEL:
Views: ${reelData.views.toLocaleString()}
Likes: ${reelData.likes.toLocaleString()}
Comment count: ${reelData.comments.toLocaleString()}
${commentSample ? `Sample comments:\n- ${commentSample}` : ''}

If this reel is controversial, use the above data to assess whether the controversy helped or hurt performance.`
  }

  const content = [
    extraContext ? `Context from Instagram: ${extraContext}` : '',
    controversyContext,
    `\nFull transcript:\n${transcript}`,
  ].filter(Boolean).join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  const analysis = JSON.parse(json)

  // If controversial and we have real data, add controversy impact
  if (analysis.is_controversial && reelData && reelData.views > 0) {
    const commentSample = (reelData.comments_text ?? []).slice(0, 25)
    const controversyPrompt = `This reel was flagged as controversial (type: "${analysis.controversy_type}").

Real performance data:
- Views: ${reelData.views.toLocaleString()}
- Likes: ${reelData.likes.toLocaleString()}
- Comments: ${reelData.comments.toLocaleString()} (${reelData.comments > 50 ? 'HIGH' : reelData.comments > 15 ? 'MEDIUM' : 'LOW'})
${commentSample.length > 0 ? `- Sample comments:\n  ${commentSample.join('\n  ')}` : ''}

Based on this data, answer in JSON:
{
  "views_assessment": "High/Average/Low and what it means for this controversial reel",
  "comments_assessment": "Are comments elevated? What does the volume suggest?",
  "sentiment_summary": "Based on the sample comments: what's the overall reaction — positive, negative, mixed?",
  "controversy_verdict": "Was the controversy good or bad for this reel? Why? Be direct."
}`

    const impactMsg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content: controversyPrompt }],
    })
    const impactRaw = impactMsg.content[0].type === 'text' ? impactMsg.content[0].text : ''
    const impactMatch = impactRaw.match(/\{[\s\S]*\}/)
    if (impactMatch) {
      try {
        analysis.controversy_impact = JSON.parse(impactMatch[0])
      } catch { /* skip if parse fails */ }
    }
  }

  return analysis
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let transcript = ''
  let profileId: string | null = null
  let igUrl: string | null = null
  let igMeta: { caption: string; videoUrl: string | null; views: number | null; likes: number | null } | null = null

  let parsedAsForm = false
  try {
    const form = await req.formData()
    parsedAsForm = true
    profileId = form.get('profileId') as string | null
    igUrl = form.get('ig_url') as string | null
    const pastedTranscript = form.get('transcript') as string | null
    const audioFile = form.get('audio') as File | null

    if (pastedTranscript?.trim()) {
      transcript = pastedTranscript.trim()
    } else if (audioFile) {
      try { transcript = await transcribeAudioFile(audioFile) }
      catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : 'Transcription failed' }, { status: 500 }) }
    }
  } catch { /* not FormData */ }

  if (!parsedAsForm) {
    const body = await req.json().catch(() => ({})) as { transcript?: string; profileId?: string; ig_url?: string }
    profileId = body.profileId ?? null
    igUrl = body.ig_url ?? null
    transcript = body.transcript?.trim() ?? ''
  }

  // Handle Instagram URL mode
  if (igUrl && !transcript) {
    const shortcode = extractShortcode(igUrl)
    if (!shortcode) {
      return NextResponse.json({ error: 'Invalid Instagram URL — paste a reel link like instagram.com/reel/...' }, { status: 400 })
    }

    try {
      igMeta = await fetchInstagramMeta(igUrl)
    } catch { /* ignore fetch errors */ }

    if (igMeta?.videoUrl) {
      try {
        transcript = await transcribeFromUrl(igMeta.videoUrl)
      } catch {
        if (igMeta.caption) transcript = igMeta.caption
      }
    } else if (igMeta?.caption) {
      transcript = igMeta.caption
    } else {
      return NextResponse.json({
        error: 'Could not extract content from this reel. Instagram may be blocking automated access. Paste the transcript manually instead.',
      }, { status: 422 })
    }
  }

  if (!transcript) {
    return NextResponse.json({ error: 'Provide a transcript, audio file, or Instagram URL' }, { status: 400 })
  }

  // Fetch client profile + knowledge docs in parallel
  let profile: ClientProfile | null = null
  let reelData: ReelData | null = null
  let knowledgeDocs: KnowledgeDoc[] = []

  const [profileResult, kbResult] = await Promise.all([
    profileId
      ? getAdminClient()
          .from('profiles')
          .select('name, niche, ig_username, intro_structured')
          .eq('id', profileId)
          .single()
      : Promise.resolve({ data: null }),
    fetchKnowledgeDocs(),
  ])

  profile = profileResult.data
  knowledgeDocs = kbResult

  // Try to find matching reel in client_reels (for controversy impact)
  if (profileId && igUrl) {
    const shortcode = extractShortcode(igUrl)
    if (shortcode) {
      const { data: reelRow } = await getAdminClient()
        .from('client_reels')
        .select('views, likes, comments, comments_text')
        .eq('profile_id', profileId)
        .eq('reel_id', shortcode)
        .single()
      if (reelRow) reelData = reelRow as ReelData
    }
  }

  try {
    const extraContext = igMeta?.caption ? `Caption: ${igMeta.caption}` : undefined
    const analysis = await analyzeReel(transcript, profile, knowledgeDocs, reelData, extraContext)

    // Persist to reel_analyses
    if (profileId) {
      void getAdminClient().from('reel_analyses').insert({
        profile_id: profileId,
        reel_url: igUrl ?? null,
        transcript,
        verdict: analysis.verdict,
        overall_score: analysis.overall_score,
        performance_score: analysis.performance_score,
        script_quality_score: analysis.script_quality_score,
        analysis_json: analysis,
        adaptation_brief: analysis.adaptation_brief,
      })
    }

    return NextResponse.json({ transcript, analysis, source: igUrl ? (igMeta?.videoUrl ? 'url_video' : 'url_caption') : 'manual' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('reel-analyze error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
