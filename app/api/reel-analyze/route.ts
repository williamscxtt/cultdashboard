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

async function transcribeAudioFile(file: File): Promise<string> {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key') {
    throw new Error('OpenAI API key not configured. Add OPENAI_API_KEY to enable audio transcription.')
  }

  // Lazy import to avoid bundling issues
  const { default: OpenAI } = await import('openai')
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const result = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'en',
  })

  return result.text
}

async function analyzeReel(transcript: string) {
  const system = `You are a world-class short-form video strategist analyzing reels for Will Scott's CULT coaching program.
Analyze the reel transcript and return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "verdict": "Strong",
  "overall_score": 82,
  "performance_score": 85,
  "script_quality_score": 79,
  "hook_analysis": "The hook grabs attention by...",
  "pacing_analysis": "The pacing works because...",
  "cta_analysis": "The CTA is...",
  "key_lessons": ["lesson 1", "lesson 2", "lesson 3"],
  "adaptation_brief": "To adapt this for a coach building a personal brand on Instagram: ...",
  "suggested_hook": "Here's the adapted hook for Will's audience: ..."
}
Verdict scale: Exceptional (90-100), Strong (75-89), Average (55-74), Weak (35-54), Poor (0-34).
Be specific, direct, actionable. Reference exact lines from the transcript.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system,
    messages: [{
      role: 'user',
      content: `Analyze this reel transcript:\n\n${transcript}`,
    }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(json)
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? ''

  let transcript = ''
  let profileId: string | null = null

  if (contentType.includes('multipart/form-data')) {
    // Audio file upload mode
    const formData = await req.formData()
    profileId = formData.get('profileId') as string | null
    const audioFile = formData.get('audio') as File | null
    const pastedTranscript = formData.get('transcript') as string | null

    if (pastedTranscript?.trim()) {
      transcript = pastedTranscript.trim()
    } else if (audioFile) {
      try {
        transcript = await transcribeAudioFile(audioFile)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Transcription failed'
        return NextResponse.json({ error: msg }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: 'Provide a transcript or audio file' }, { status: 400 })
    }
  } else {
    // JSON mode — transcript pasted directly
    const body = await req.json()
    profileId = body.profileId ?? null
    transcript = body.transcript?.trim() ?? ''

    if (!transcript) {
      return NextResponse.json({ error: 'transcript is required' }, { status: 400 })
    }
  }

  try {
    const analysis = await analyzeReel(transcript)

    if (profileId) {
      void getAdminClient().from('reel_analyses').insert({
        profile_id: profileId,
        reel_url: null,
        transcript,
        verdict: analysis.verdict,
        overall_score: analysis.overall_score,
        performance_score: analysis.performance_score,
        script_quality_score: analysis.script_quality_score,
        analysis_json: analysis,
        adaptation_brief: analysis.adaptation_brief,
      })
    }

    return NextResponse.json({ transcript, analysis })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('reel-analyze error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
