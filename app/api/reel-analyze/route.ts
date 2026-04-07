import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { unlink, readFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 120

const execFileAsync = promisify(execFile)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

const YTDLP_PATHS = [
  '/opt/homebrew/bin/yt-dlp',
  '/usr/local/bin/yt-dlp',
  '/usr/bin/yt-dlp',
  'yt-dlp',
]

async function findYtdlp(): Promise<string> {
  for (const p of YTDLP_PATHS) {
    try {
      await execFileAsync(p, ['--version'], { timeout: 3000 })
      return p
    } catch {}
  }
  throw new Error('yt-dlp not found. Install with: brew install yt-dlp')
}

async function downloadAudio(url: string): Promise<string> {
  const id = randomUUID()
  const outputTemplate = join('/tmp', `reel-${id}.%(ext)s`)
  const audioPath = join('/tmp', `reel-${id}.mp3`)
  const ytdlp = await findYtdlp()

  await execFileAsync(ytdlp, [
    '--extract-audio',
    '--audio-format', 'mp3',
    '--audio-quality', '5',
    '--no-playlist',
    '--no-warnings',
    '--output', outputTemplate,
    url,
  ], { timeout: 60000 })

  return audioPath
}

async function transcribeAudio(audioPath: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key') {
    throw new Error('OpenAI API key not set. Add OPENAI_API_KEY to .env.local to enable auto-transcription.')
  }

  const audioBuffer = await readFile(audioPath)
  const file = new File([audioBuffer], 'reel.mp3', { type: 'audio/mpeg' })

  const result = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'en',
  })

  return result.text
}

async function analyzeReel(transcript: string, url: string) {
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
      content: `Analyze this reel transcript:\n\n${transcript}\n\nReel URL: ${url}`,
    }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(json)
}

export async function POST(req: NextRequest) {
  const tmpFiles: string[] = []

  try {
    const { url, profileId } = await req.json()
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 })

    // Step 1: Download audio from the reel
    const audioPath = await downloadAudio(url)
    tmpFiles.push(audioPath)

    // Step 2: Transcribe with OpenAI Whisper
    const transcript = await transcribeAudio(audioPath)

    // Step 3: Analyze with Claude
    const analysis = await analyzeReel(transcript, url)

    // Step 4: Save to DB (fire and forget)
    if (profileId) {
      void getAdminClient().from('reel_analyses').insert({
        profile_id: profileId,
        reel_url: url,
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
  } finally {
    for (const f of tmpFiles) {
      await unlink(f).catch(() => {})
    }
  }
}
