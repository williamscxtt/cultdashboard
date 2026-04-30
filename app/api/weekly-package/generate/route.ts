/**
 * POST /api/weekly-package/generate
 *
 * Dashboard equivalent of weekly_runner.py — generates the full weekly content
 * package for a client: intel report + 7 reel scripts, personalised to their
 * niche, onboarding data, own reel performance, and competitor intelligence.
 *
 * Uses the exact same prompt structure and Claude Opus model as the Python runner
 * that posts to Slack every Monday. Output is saved to weekly_scripts +
 * weekly_reports tables and returned to the dashboard.
 *
 * GET ?profileId= — returns the latest package for a profile
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 300

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// ── Apify helpers (mirrors /api/competitors/scrape) ───────────────────────────

const APIFY_TOKEN = process.env.APIFY_API_TOKEN
const APIFY_BASE = 'https://api.apify.com/v2'
const APIFY_ACTOR = 'apify~instagram-scraper'

interface ApifyPost {
  ownerUsername?: string; shortCode?: string; url?: string
  videoViewCount?: number; videoPlayCount?: number; playCount?: number; likesCount?: number; commentsCount?: number
  timestamp?: string; caption?: string; videoUrl?: string
  displayUrl?: string; videoDuration?: number
}

async function apifyStartRun(usernames: string[]): Promise<string> {
  const res = await fetch(`${APIFY_BASE}/acts/${APIFY_ACTOR}/runs?token=${APIFY_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      directUrls: usernames.map(u => `https://www.instagram.com/${u}/`),
      resultsType: 'reels',
      resultsLimit: 30,
      addParentData: false,
    }),
  })
  if (!res.ok) throw new Error(`Apify start failed: ${res.status}`)
  const json = await res.json()
  return json.data.id as string
}

async function apifyWaitForRun(runId: string, maxWaitMs = 250_000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 5000))
    const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${APIFY_TOKEN}`)
    if (!res.ok) throw new Error(`Apify poll failed: ${res.status}`)
    const json = await res.json()
    const status = json.data?.status
    if (status === 'SUCCEEDED') return
    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) throw new Error(`Apify run ${status}`)
  }
  throw new Error('Apify run timed out')
}

async function apifyGetResults(runId: string): Promise<ApifyPost[]> {
  const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&format=json&clean=true`)
  if (!res.ok) throw new Error(`Apify results failed: ${res.status}`)
  return res.json()
}

/**
 * Scrape the client's own IG account and upsert into client_reels.
 * Skips silently if APIFY_API_TOKEN not set or ig_username missing.
 */
async function syncClientOwnReels(profileId: string, igHandle: string): Promise<number> {
  if (!APIFY_TOKEN || !igHandle) return 0
  try {
    console.log(`[weekly-package/generate] Syncing own reels for @${igHandle}`)
    const runId = await apifyStartRun([igHandle])
    await apifyWaitForRun(runId)
    const posts = await apifyGetResults(runId)
    console.log(`[weekly-package/generate] Got ${posts.length} posts for @${igHandle}`)
    if (!posts.length) return 0

    const weekStr = new Date().toISOString().slice(0, 7)
    const isoWeek = (() => {
      const d = new Date(); const day = d.getUTCDay() || 7
      d.setUTCDate(d.getUTCDate() + 4 - day)
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
      return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
    })()
    const scraped_week = `${weekStr}-W${isoWeek}`

    // Check which reels already exist — only insert new ones
    const shortCodes = posts.map(p => p.shortCode ?? '').filter(Boolean)
    const { data: existing } = await adminClient
      .from('client_reels')
      .select('reel_id')
      .eq('profile_id', profileId)
      .in('reel_id', shortCodes)
    const existingIds = new Set((existing ?? []).map((r: { reel_id: string }) => r.reel_id))

    const newPosts = posts.filter(p => p.shortCode && !existingIds.has(p.shortCode))
    const existingPosts = posts.filter(p => p.shortCode && existingIds.has(p.shortCode))

    console.log(`[weekly-package/generate] ${newPosts.length} new reels, ${existingPosts.length} existing (stats update only)`)

    // Hook and format_type come from transcripts — not from captions.
    // Leave them empty/pending; the transcription step populates them.
    const newRows = newPosts.map((p) => {
      const caption = p.caption ?? ''
      return {
        profile_id: profileId,
        reel_id: p.shortCode ?? '',
        scraped_week,
        date: p.timestamp ? p.timestamp.split('T')[0] : new Date().toISOString().split('T')[0],
        views: p.videoPlayCount ?? p.playCount ?? p.videoViewCount ?? 0,
        likes: p.likesCount ?? 0,
        comments: p.commentsCount ?? 0,
        caption: caption.slice(0, 2000),
        hook: '', // Populated from Whisper transcript, not caption
        hashtags: (caption.match(/#\w+/g) ?? []).map((h: string) => h.slice(1)),
        format_type: 'other', // Updated when transcript is available
        duration_sec: p.videoDuration ?? null,
        thumbnail_url: p.displayUrl ?? null,
        permalink: p.url ?? null,
      }
    }).filter(r => r.reel_id)

    // Insert new reels with full data
    if (newRows.length > 0) {
      const { error } = await adminClient.from('client_reels').insert(newRows)
      if (error) console.error('[weekly-package/generate] insert error:', error.message)
    }

    // Update stats only for existing reels (preserves transcript, format_type, hook, caption, etc.)
    if (existingPosts.length > 0) {
      await Promise.all(existingPosts.map(p =>
        adminClient
          .from('client_reels')
          .update({
            views: p.videoPlayCount ?? p.playCount ?? p.videoViewCount ?? 0,
            likes: p.likesCount ?? 0,
            comments: p.commentsCount ?? 0,
            scraped_week,
          })
          .eq('profile_id', profileId)
          .eq('reel_id', p.shortCode!)
      ))
    }

    return newRows.length + existingPosts.length
  } catch (err) {
    console.warn('[weekly-package/generate] Own reel sync failed (non-fatal):', String(err))
    return 0
  }
}

// ── GET: latest package for a profile ────────────────────────────────────────

export async function GET(req: NextRequest) {
  const profileId = new URL(req.url).searchParams.get('profileId')
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })

  const { data: scripts } = await adminClient
    .from('weekly_scripts')
    .select('*')
    .eq('profile_id', profileId)
    .order('week_start', { ascending: false })
    .limit(10)

  return NextResponse.json({ packages: scripts ?? [] })
}

// ── Context builders (mirrors knowledge_base.py build_prompt_context()) ───────

interface Reel {
  views?: number | null
  likes?: number | null
  comments?: number | null
  hook?: string | null
  caption?: string | null
  format_type?: string | null
  date?: string | null
  comments_text?: string[] | null
  transcript?: string | null
}

interface CompReel {
  account: string
  views?: number | null
  likes?: number | null
  comments?: number | null
  transcript?: string | null
  format_type?: string | null
  date?: string | null
  scraped_week?: string | null
  hook?: string | null
}

function buildKnowledgeContext(
  ownReels: Reel[],
  compReels: CompReel[],
  weekStart: string,
): string {
  const lines: string[] = []
  const sevenDaysAgo = new Date(weekStart)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

  // Own top performing reels (last 8 weeks)
  const topOwn = [...ownReels]
    .filter(r => r.views && r.views > 0)
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 10)

  if (topOwn.length > 0) {
    lines.push('=== OWN TOP PERFORMING REELS (recent) ===')
    for (const r of topOwn) {
      const fmt = r.format_type ? ` [${r.format_type}]` : ''
      const opening = r.transcript ? r.transcript.slice(0, 80).split(/[.!?]/)[0]?.trim() : (r.hook || '(no transcript yet)')
      lines.push(`• ${r.date ?? '?'} | ${(r.views ?? 0).toLocaleString()} views${fmt} — "${opening}"`)
    }
    lines.push('')
  }

  // Own format performance
  const fmtGroups: Record<string, number[]> = {}
  for (const r of ownReels) {
    if (!r.format_type || !r.views) continue
    if (!fmtGroups[r.format_type]) fmtGroups[r.format_type] = []
    fmtGroups[r.format_type].push(r.views)
  }
  const fmtStats = Object.entries(fmtGroups)
    .map(([fmt, views]) => ({
      fmt,
      avg: Math.round(views.reduce((a, b) => a + b, 0) / views.length),
      max: Math.max(...views),
      count: views.length,
    }))
    .sort((a, b) => b.avg - a.avg)

  if (fmtStats.length > 0) {
    lines.push('=== OWN FORMAT PERFORMANCE ===')
    for (const f of fmtStats) {
      lines.push(`• ${f.fmt}: avg ${f.avg.toLocaleString()} views, max ${f.max.toLocaleString()} (${f.count} reels)`)
    }
    lines.push('')
  }

  // Formats used in last 2 weeks (avoid repeating)
  const recentOwn = ownReels.filter(r => r.date && r.date >= sevenDaysAgoStr)
  const recentFmts: Record<string, number> = {}
  for (const r of recentOwn) {
    if (!r.format_type) continue
    recentFmts[r.format_type] = (recentFmts[r.format_type] ?? 0) + 1
  }
  if (Object.keys(recentFmts).length > 0) {
    lines.push('=== FORMATS USED LAST 2 WEEKS (avoid repeating too much) ===')
    for (const [fmt, count] of Object.entries(recentFmts)) {
      lines.push(`• ${fmt}: ${count}x`)
    }
    lines.push('')
  }

  // Top competitor formats
  const compFmtGroups: Record<string, number[]> = {}
  for (const r of compReels) {
    if (!r.format_type || !r.views) continue
    if (!compFmtGroups[r.format_type]) compFmtGroups[r.format_type] = []
    compFmtGroups[r.format_type].push(r.views)
  }
  const compFmtStats = Object.entries(compFmtGroups)
    .map(([fmt, views]) => ({
      fmt,
      avg: Math.round(views.reduce((a, b) => a + b, 0) / views.length),
      max: Math.max(...views),
      count: views.length,
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 8)

  if (compFmtStats.length > 0) {
    lines.push('=== TOP COMPETITOR FORMATS BY AVG VIEWS ===')
    for (const f of compFmtStats) {
      lines.push(`• ${f.fmt}: avg ${f.avg.toLocaleString()} views, max ${f.max.toLocaleString()} (${f.count} reels)`)
    }
    lines.push('')
  }

  // Account highlights
  const acctGroups: Record<string, number[]> = {}
  const thisWeekAllComp = compReels.filter(r => r.date && r.date >= sevenDaysAgoStr)
  for (const r of thisWeekAllComp) {
    if (!r.account || !r.views) continue
    if (!acctGroups[r.account]) acctGroups[r.account] = []
    acctGroups[r.account].push(r.views)
  }
  const acctStats = Object.entries(acctGroups)
    .map(([acc, views]) => ({
      acc,
      count: views.length,
      avg: Math.round(views.reduce((a, b) => a + b, 0) / views.length),
      top: Math.max(...views),
    }))
    .sort((a, b) => b.avg - a.avg)

  if (acctStats.length > 0) {
    lines.push('=== ACCOUNT HIGHLIGHTS THIS WEEK ===')
    for (const a of acctStats) {
      lines.push(`• @${a.acc}: ${a.count} reels, avg ${a.avg.toLocaleString()} views, top ${a.top.toLocaleString()}`)
    }
    lines.push('')
  }

  return lines.join('\n') || 'No historical data yet.'
}

// ── Per-account outlier detection ────────────────────────────────────────────

function buildOutlierContext(compReels: CompReel[]): string {
  if (!compReels.length) return ''

  // Group by account
  const byAccount: Record<string, CompReel[]> = {}
  for (const r of compReels) {
    if (!byAccount[r.account]) byAccount[r.account] = []
    byAccount[r.account].push(r)
  }

  const outliers: Array<{ reel: CompReel; multiplier: number; accountAvg: number }> = []

  for (const reels of Object.values(byAccount)) {
    const reelsWithViews = reels.filter(r => r.views && r.views > 0)
    if (!reelsWithViews.length) continue

    const totalViews = reelsWithViews.reduce((sum, r) => sum + (r.views ?? 0), 0)
    const accountAvg = totalViews / reelsWithViews.length

    for (const reel of reelsWithViews) {
      // Single-reel accounts show at 1.0x so they're always represented
      const multiplier = reelsWithViews.length === 1
        ? 1.0
        : (reel.views ?? 0) / accountAvg
      if (multiplier >= 1.2 || reelsWithViews.length === 1) {
        outliers.push({ reel, multiplier, accountAvg })
      }
    }
  }

  if (!outliers.length) return ''

  // Sort by multiplier descending
  outliers.sort((a, b) => b.multiplier - a.multiplier)

  const lines = [
    '=== OUTLIER REELS — significantly above each account\'s own average ===',
    'These outperformed vs. the creator\'s own baseline. Prioritise these specific angles when choosing topics for scripts.',
    '',
  ]

  for (const { reel, multiplier, accountAvg } of outliers.slice(0, 15)) {
    const multStr = multiplier === 1.0
      ? '(only reel this week)'
      : `${multiplier.toFixed(1)}× above account avg (avg: ${Math.round(accountAvg).toLocaleString()})`
    const hook = reel.transcript
      ? reel.transcript.slice(0, 120).split(/[.!?]/)[0]?.trim() ?? ''
      : (reel.hook ?? '')
    lines.push(`• @${reel.account} — ${(reel.views ?? 0).toLocaleString()} views ${multStr}`)
    if (hook) lines.push(`  Opening: "${hook}"`)
  }

  return lines.join('\n')
}

// Detect if a reel is conversion-focused based on transcript content
function isConversionReel(transcript: string): boolean {
  const lower = transcript.toLowerCase()
  return /\b(dm me|message me|link in bio|apply|apply now|programme|program|coaching|1[-–]on[-–]1|one.on.one|work with me|free call|discovery call|book a call|spots|limited spots|comment below|comment .{0,20} below|drop .{0,10} below)\b/.test(lower)
}

function buildCompetitorReport(compReels: CompReel[]): string {
  if (!compReels.length) return 'No competitor data available yet. Add competitor accounts in the Content page.'

  const lines: string[] = []

  // Format breakdown overview
  const fmtCount: Record<string, number> = {}
  for (const r of compReels) {
    if (r.format_type) fmtCount[r.format_type] = (fmtCount[r.format_type] ?? 0) + 1
  }
  lines.push('## Format Breakdown This Week')
  for (const [fmt, n] of Object.entries(fmtCount).sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    lines.push(`- ${fmt}: ${n} reels`)
  }
  lines.push('')

  // Group all reels by account
  const byAccount: Record<string, CompReel[]> = {}
  for (const r of compReels) {
    if (!byAccount[r.account]) byAccount[r.account] = []
    byAccount[r.account].push(r)
  }

  // Sort accounts by their top reel views (most active/performing accounts first)
  const sortedAccounts = Object.entries(byAccount).sort((a, b) => {
    const aTop = Math.max(...a[1].map(r => r.views ?? 0))
    const bTop = Math.max(...b[1].map(r => r.views ?? 0))
    return bTop - aTop
  })

  lines.push('## All Competitor Reels This Week (grouped by account)')
  lines.push('Note: Includes both high-reach content AND conversion-focused content. Study both — the viral reels show what topics/formats get traction; the conversion reels show how they sell.')
  lines.push('')

  const hasAnyTranscript = compReels.some(r => r.transcript && r.transcript.trim().length > 50)
  if (!hasAnyTranscript) {
    lines.push('Transcripts pending — run a scrape to fetch video URLs, then transcription will run automatically.')
    return lines.join('\n')
  }

  for (const [account, reels] of sortedAccounts) {
    const reelsWithTranscript = reels
      .filter(r => r.transcript && r.transcript.trim().length > 50)
      .sort((a, b) => (b.views ?? 0) - (a.views ?? 0)) // highest views first within each account

    if (!reelsWithTranscript.length) continue

    const topViews = Math.max(...reelsWithTranscript.map(r => r.views ?? 0))
    lines.push(`### @${account} — ${reelsWithTranscript.length} reels this week (top: ${topViews.toLocaleString()} views)`)
    lines.push('')

    for (const r of reelsWithTranscript) {
      const isConversion = r.transcript ? isConversionReel(r.transcript) : false
      const label = isConversion ? '[CONVERSION REEL]' : `[${r.format_type ?? 'unknown'}]`
      lines.push(`**${(r.views ?? 0).toLocaleString()} views ${label} | ${r.date ?? ''}**`)
      lines.push(r.transcript!.trim())
      lines.push('')
    }
  }

  return lines.join('\n')
}

function buildBrandContext(
  intro: Record<string, unknown>,
  profile: Record<string, unknown>,
  isCreator = false,
  creatorStyle: string | null = null,
): string {
  const lines: string[] = ['# Client Brand Knowledge']

  if (isCreator) {
    const fields: Array<[string, string]> = [
      ['content_niche', 'Content niche'],
      ['content_description', 'What they create'],
      ['target_audience', 'Target audience'],
      ['what_your_content_gives_them', 'What their content gives viewers'],
      ['creator_goal', 'Creator goal'],
      ['brand_voice', 'Brand voice'],
      ['hook_style', 'Preferred hook style'],
      ['unique_story', 'Their story'],
      ['creator_biggest_challenge', 'Biggest challenge'],
      ['specific_niche', 'Niche'],
    ]
    for (const [key, label] of fields) {
      const val = (intro[key] ?? profile[key] ?? '') as string
      if (val?.trim()) lines.push(`${label}: ${val.trim()}`)
    }
    // Monetization model (may be an array)
    const mono = intro.monetization_model
    if (Array.isArray(mono) && mono.length > 0) {
      lines.push(`Monetization: ${mono.join(', ')}`)
    } else if (mono && typeof mono === 'string') {
      lines.push(`Monetization: ${mono}`)
    }
    if (creatorStyle) {
      lines.push(`Creator style: ${creatorStyle}`)
    }
  } else {
    const fields: Array<[string, string]> = [
      ['specific_niche', 'Niche'],
      ['what_you_coach', 'What they coach'],
      ['ideal_client', 'Ideal client'],
      ['client_transformation', 'Transformation delivered'],
      ['dream_outcome', 'Dream outcome for clients'],
      ['brand_voice', 'Brand voice'],
      ['hook_style', 'Hook style'],
      ['unique_story', 'Their story'],
      ['goal_90_days', '90-day goal'],
      ['biggest_problem', 'Biggest challenge they solve'],
      ['why_joined', 'Why they joined Creator Cult'],
      ['dm_goal', 'DM / sales goal'],
    ]
    for (const [key, label] of fields) {
      const val = (intro[key] ?? profile[key] ?? '') as string
      if (val?.trim()) lines.push(`${label}: ${val.trim()}`)
    }
    const contentPillars = intro.content_pillars ?? profile.content_pillars
    if (Array.isArray(contentPillars) && contentPillars.length > 0) {
      lines.push(`Content pillars: ${contentPillars.join(', ')}`)
    }
  }

  return lines.join('\n')
}

function buildCommentContext(reels: Reel[]): string {
  const withComments = reels.filter(r =>
    r.comments_text && Array.isArray(r.comments_text) && r.comments_text.length > 0
  )
  if (!withComments.length) return ''

  const lines = ['=== COMMENT INTELLIGENCE (what audience is saying) ===']
  for (const r of withComments.slice(0, 8)) {
    const hook = r.hook || r.caption?.slice(0, 60) || '(no hook)'
    const comments = (r.comments_text as string[]).slice(0, 10)
    lines.push(`Reel: "${hook}" (${(r.views ?? 0).toLocaleString()} views)`)
    lines.push(`Comments:\n  - ${comments.join('\n  - ')}`)
    lines.push('')
  }

  return lines.join('\n')
}

// ── Transcript context — how the client actually speaks ──────────────────────

function buildTranscriptContext(reels: Reel[]): string {
  const withTranscripts = reels.filter(r => r.transcript && r.transcript.trim().length > 80)
  if (!withTranscripts.length) return ''

  // Top 6 by views — understand what's worked and their best voice moments
  const topByViews = [...withTranscripts]
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 6)

  // 6 most recent — understand what they're currently talking about and how they're selling
  const mostRecent = [...withTranscripts]
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .slice(0, 6)

  // Combine, deduplicate by transcript content
  const seen = new Set<string>()
  const combined = [...topByViews, ...mostRecent].filter(r => {
    const key = r.transcript!.slice(0, 50)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const lines = [
    '=== HOW THIS CREATOR ACTUALLY SPEAKS (full reel transcripts) ===',
    'Includes their top performers (voice/style) and most recent posts (current topics, conversion content).',
    '',
  ]
  for (const r of combined) {
    const recency = mostRecent.includes(r) && !topByViews.includes(r) ? 'recent' : `${(r.views ?? 0).toLocaleString()} views`
    const hook = r.hook || r.caption?.slice(0, 60) || '(no hook)'
    lines.push(`--- ${recency} | ${r.date ?? ''} | "${hook}" ---`)
    lines.push(r.transcript!.trim())
    lines.push('')
  }

  return lines.join('\n')
}

// ── Voice calibration ─────────────────────────────────────────────────────────

interface VoiceCalibration {
  distilled_rules: string
  weekly_observations: string
}

async function loadVoiceCalibration(profileId: string): Promise<VoiceCalibration | null> {
  const { data, error } = await adminClient
    .from('voice_calibrations')
    .select('distilled_rules, weekly_observations')
    .eq('profile_id', profileId)
    .single()
  if (error || !data) return null
  return data as VoiceCalibration
}

async function runVoiceCalibration(
  profileId: string,
  weekStart: string,
  ownReels: Reel[],
): Promise<void> {
  // Get last week's generated scripts
  const lastWeek = new Date(weekStart)
  lastWeek.setDate(lastWeek.getDate() - 7)
  const lastWeekStart = lastWeek.toISOString().split('T')[0]

  const { data: lastPackage } = await adminClient
    .from('weekly_scripts')
    .select('scripts_md')
    .eq('profile_id', profileId)
    .eq('week_start', lastWeekStart)
    .single()

  if (!lastPackage?.scripts_md) return

  // Filmed reels this week with real transcripts (evidence of what was actually posted)
  const filmedReels = ownReels.filter(r =>
    r.transcript && r.transcript.trim().length > 80 &&
    r.date && r.date >= lastWeekStart
  )
  if (!filmedReels.length) return

  const existing = await loadVoiceCalibration(profileId)

  const filmedContext = filmedReels.slice(0, 5).map(r =>
    `--- ${r.date} | ${(r.views ?? 0).toLocaleString()} views ---\n${r.transcript!.trim()}`
  ).join('\n\n')

  const prompt = `Compare these generated scripts (what Claude wrote last week) against what was actually filmed and posted.

GENERATED SCRIPTS LAST WEEK:
${lastPackage.scripts_md.slice(0, 8000)}

ACTUALLY FILMED THIS WEEK (real transcripts from posted reels):
${filmedContext}

EXISTING DISTILLED RULES (patterns already confirmed from previous weeks):
${existing?.distilled_rules || '(none yet)'}

Your task:
1. Compare how Claude writes vs how this creator actually speaks. Note specific differences in vocabulary, pacing, structure, or style.
2. Identify 2–3 NEW patterns not already in the distilled rules.
3. Suggest 0–2 rules to PROMOTE to the permanent distilled rules — only patterns confirmed across multiple reels.

Respond in this exact JSON format:
{
  "observation": "1-2 sentence summary of key differences between scripted and filmed",
  "new_patterns": ["pattern 1", "pattern 2"],
  "promote_to_rules": ["permanent rule 1"]
}

Return ONLY valid JSON. No extra text.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    // Strip markdown code blocks if Claude wrapped the JSON
    const jsonText = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    const parsed = JSON.parse(jsonText) as {
      observation: string
      new_patterns: string[]
      promote_to_rules: string[]
    }

    // Keep last 8 weekly observations
    const obsLines = (existing?.weekly_observations || '').split('\n\n').filter(Boolean)
    const newObs = `[${weekStart}] ${parsed.observation}${parsed.new_patterns.length ? '\nPatterns: ' + parsed.new_patterns.join('; ') : ''}`
    obsLines.unshift(newObs)
    const newObservations = obsLines.slice(0, 8).join('\n\n')

    // Promote confirmed rules
    const existingRules = (existing?.distilled_rules || '').split('\n').map(s => s.trim()).filter(Boolean)
    const newRules = parsed.promote_to_rules.map(s => s.trim()).filter(Boolean)
    const allRules = [...new Set([...existingRules, ...newRules])]
    const newDistilled = allRules.join('\n')

    await adminClient
      .from('voice_calibrations')
      .upsert({
        profile_id: profileId,
        distilled_rules: newDistilled,
        weekly_observations: newObservations,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'profile_id' })

    console.log(`[weekly-package/generate] Voice calibration updated for ${profileId} — ${newRules.length} rules promoted`)
  } catch (err) {
    console.warn('[weekly-package/generate] Voice calibration failed (non-fatal):', String(err))
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────

interface CreatorStyleGuide {
  description: string
  split: string
  contentStyle: string
  ctas: string
}

function getCreatorStyleGuide(style: string): CreatorStyleGuide {
  const guides: Record<string, CreatorStyleGuide> = {
    educational: {
      description: 'They teach. Every reel must leave the viewer with something actionable — a tip, a framework, a perspective shift. Save-worthy and share-worthy.',
      split: `- 4 educational/value scripts: teach one clear thing per reel, lead with the payoff, use the "insight → proof → apply" structure
- 2 personal story/journey scripts: what they've learned, mistakes they made, results they got — told from experience, not theory
- 1 engagement script: ask the audience a question, challenge a belief, or spark a debate in the comments`,
      contentStyle: `- Lead with the payoff — don't build up to the value, open with it
- Specific numbers, timelines, and results outperform vague advice every time
- "Here's what most people get wrong about X" and "The reason you're not getting Y" are strong openers
- End with a clear takeaway the viewer can screenshot or save`,
      ctas: `- "Save this for later"
- "Follow for more [topic] tips"
- "Comment your biggest takeaway"
- "Part 2 coming if this gets [X] saves"`,
    },
    entertainment: {
      description: 'They entertain. Relatable, funny, unexpected — entertainment first, information second. Virality comes from the feeling the viewer gets, not the facts they learn.',
      split: `- 4 entertainment/viral scripts: funny moments, relatable scenarios, unexpected twists, POV formats, trending structures
- 1 confessional/story script: something embarrassing, vulnerable, or surprising that actually happened
- 1 rant/hot take: a strong opinion delivered with energy and specificity
- 1 educational with entertainment packaging: genuinely useful info wrapped in a format that makes people laugh or share`,
      contentStyle: `- Hook must trigger immediate emotional reaction — laugh, cringe, "omg same", or surprise
- Punchlines, callbacks, and timing matter more than information density
- "POV:", "Tell me why", "the audacity of", reaction formats tend to travel
- Relatable > informative for this style — the viewer needs to feel seen, not taught
- Study what's trending in competitor reels — entertainment is the most trend-dependent style`,
      ctas: `- "Follow for more [chaos / content / this type of thing]"
- "Share this with someone who needs to see it"
- "Comment [emoji] if this is you"
- "Part 2 if this gets [X] shares"`,
    },
    motivational: {
      description: 'They inspire. Every reel should shift someone\'s belief about what\'s possible. Transformation stories, mindset reframes, and real encouragement — never generic.',
      split: `- 3 mindset/belief shift scripts: challenge a limiting belief, flip a perspective, or show a new way of thinking
- 2 personal transformation scripts: their real journey — the actual struggle, the turning point, the outcome (with specifics)
- 1 challenge/accountability script: give the viewer one thing to do TODAY
- 1 audience mirror script: describe exactly how the viewer is feeling or thinking right now, then offer the reframe`,
      contentStyle: `- Lead with the belief you're challenging or the truth you're about to share
- Speak directly to the person who is exactly where you were at your lowest
- Real, raw, specific — not generic "you've got this" platitudes; those don't perform
- Emotional resonance over information density — the feeling should linger after the video ends
- End with a clear belief statement or one action the viewer can take today`,
      ctas: `- "Follow if this resonated"
- "Save this for when you need it"
- "Tag someone who needs to hear this"
- "Tell me in the comments: what's holding you back right now"`,
    },
    lifestyle: {
      description: 'They invite viewers into their world. Aesthetic, aspirational, and real. People follow for the vibe, the perspective, and the glimpse into a life they want.',
      split: `- 3 day-in-the-life/behind-the-scenes scripts: real moments, morning routines, how they work, travel, decisions
- 2 opinion/hot take scripts: strong takes on something in their world — relationships, work, aesthetics, choices
- 1 product/place/experience reveal: honest take on something they've tried, visited, or bought
- 1 personal story: a real thing that happened, a decision they made, a turning point`,
      contentStyle: `- Invite them in — "come with me", "let me show you", "here's what I actually do"
- Mix aspirational (the highlight) with real (the reality behind it) — authenticity builds loyalty
- Opinions and specificity matter — "I hate minimalist kitchens and here's why" beats "today's aesthetic"
- Suggest visual approaches where relevant — these scripts are often more visual than talking-head`,
      ctas: `- "Follow to come along"
- "Save for inspo"
- "Tell me — would you try this?"
- "Link in bio for [product / place / booking]"`,
    },
    fitness: {
      description: 'They educate and inspire in the fitness and wellness space — a mix of teaching technique, sharing real results, and making fitness feel achievable.',
      split: `- 3 workout/exercise/technique scripts: teach a move, programme, or protocol — specific, filmable, immediately useful
- 2 transformation/results scripts: their journey or results they've seen — real numbers, honest timelines
- 1 nutrition/recovery/lifestyle script: the non-training side of fitness that most people ignore
- 1 myth-busting script: challenge a common misconception in their niche with evidence or experience`,
      contentStyle: `- Specific beats generic — "3 sets of 8 at RPE 8" beats "do more volume"
- Lead with the outcome, then teach how to get there — "here's why your [muscle group] isn't growing"
- Challenge myths and common mistakes — these drive saves because viewers want to be sure they're not making the error
- Mix beginner-accessible with more advanced content in the same week`,
      ctas: `- "Save this workout"
- "Follow for more fitness content"
- "Try this and tell me in the comments"
- "Programme linked in bio"`,
    },
    finance: {
      description: 'They make money concepts accessible and inspire financial action — practical tips, personal finance stories, and demystifying wealth building for regular people.',
      split: `- 3 money tip/strategy scripts: one actionable thing per reel, clear and specific
- 2 personal finance journey scripts: what they did, what changed, real numbers where possible
- 1 myth-busting/hot take: challenge mainstream financial advice with a contrarian take
- 1 beginner guide: make one intimidating concept feel achievable in under 60 seconds`,
      contentStyle: `- Use real numbers wherever possible — "I saved £500 in 30 days by doing X" beats vague advice
- Simplify jargon — explain it to the viewer like you're talking to a friend who doesn't care about finance
- Aspirational but grounded — the viewer needs to believe it's achievable for someone like them
- "Everyone says X, but actually Y" is a high-performing opener in this niche`,
      ctas: `- "Save this"
- "Follow for more money tips"
- "Comment your income goal"
- "Free guide linked in bio"`,
    },
    beauty: {
      description: 'They create in the beauty, makeup, or skincare space — tutorials, honest reviews, transformations, and strong opinions on products and trends.',
      split: `- 3 tutorial/how-to scripts: teach a technique, routine, or look — step-by-step, filmable
- 2 product reveal/review scripts: honest take on something they've tried — what worked, what didn't
- 1 transformation script: before/after, glow-up, or routine change with visible results
- 1 hot take/opinion: challenge a beauty myth or trend with a confident point of view`,
      contentStyle: `- Suggest what the viewer will see on screen — beauty content is more visual than most niches
- "Get ready with me" and "I tried X so you don't have to" formats travel well
- Be honest about products — trust is the currency in beauty; overselling kills credibility
- Trending sounds, aesthetics, and formats matter more in this niche than most`,
      ctas: `- "Save this tutorial"
- "Follow for beauty tips"
- "Comment what you want to see next"
- "Products linked in bio"`,
    },
    gaming: {
      description: 'They create gaming content — strategies, reactions, highlights, and community moments. Speak the language; energy and specificity are everything.',
      split: `- 3 tips/strategies/secrets scripts: something that will make the viewer better or give them an advantage
- 2 gameplay highlight/reaction scripts: a wild moment, clutch play, or genuine reaction to something in the community
- 1 hot take: strong opinion about a game, mechanic, update, or the gaming community at large
- 1 tutorial/breakdown: deep dive into a specific skill, character, build, or strategy`,
      contentStyle: `- Speak the language of the gaming community — don't over-explain slang or water down the specificity
- Energy and enthusiasm matter — flat delivery kills gaming content regardless of how good the tip is
- "Nobody's talking about this" and "I tested this so you don't have to" are reliable openers
- Be specific about the game, mode, platform, and patch version where relevant`,
      ctas: `- "Follow for more [game] content"
- "Share this with your squad"
- "Comment your rank"
- "Turn on notifications — posting daily"`,
    },
    other: {
      description: 'They create content with a unique or cross-niche perspective. Their distinct point of view is the differentiator — lean into what makes their take unlike everyone else\'s.',
      split: `- 4 value/educational scripts: one clear takeaway or insight per reel
- 2 personal story scripts: their real journey, real lessons, honest perspective
- 1 engagement/opinion script: a strong take that invites conversation`,
      contentStyle: `- Lead with the most interesting or unexpected thing first
- Specificity is the antidote to generic content — real details, real numbers, real moments
- Their unique perspective is the differentiator — write from that angle every time`,
      ctas: `- "Follow for more"
- "Save this"
- "Comment your take"`,
    },
  }

  return guides[style] ?? guides['other']
}

function buildCreatorSystemPrompt(
  name: string,
  igHandle: string,
  intro: Record<string, unknown>,
  profile: Record<string, unknown>,
  creatorStyle: string | null,
  calibration: VoiceCalibration | null = null,
): string {
  const niche = (intro.content_niche as string) || (intro.specific_niche as string) || (profile.niche as string) || 'their niche'
  const audience = (intro.target_audience as string) || (profile.target_audience as string) || ''
  const style = creatorStyle || 'educational'
  const guide = getCreatorStyleGuide(style)

  return `You are a content strategist and ghostwriter for ${name} (@${igHandle}), a ${style} creator in the ${niche} space${audience ? ` for ${audience}` : ''}.

YOUR JOB:
Write 7 reel scripts each week that grow their audience, maximise engagement, and feel completely native to their voice and style. These are real scripts that will be filmed — they must be specific, authentic, and immediately filmable.

CREATOR STYLE: ${style.toUpperCase()}
${guide.description}

THE 7 SCRIPTS:
${guide.split}

HOW TO DO IT:
1. Study every competitor reel — what topics, angles, formats, and hooks are getting views right now in this niche. This is where the ideas come from.
2. Study ${name}'s own transcripts — this is their real voice. Match their rhythm, vocabulary, energy, and natural speech patterns exactly. Note what they've already covered so you don't repeat it.
3. Use their brand context to personalise — their story, their experiences, their specific perspective.
4. Combine: competitor's winning angle/format + ${name}'s voice + their unique take on it.

CONTENT STYLE:
${guide.contentStyle}
- Most scripts are straight-to-camera — the creator speaks directly, no props needed
- Some scripts can suggest a visual format where it genuinely fits (split screen, reaction content, side-by-side — the creator will find the specific clip; just describe the type)
- Every script must be filmable as described
- 45–90 seconds when spoken aloud (120–250 words)
- ONE clear idea per reel
- Vary energy across the 7 scripts — some fast and punchy, some slower and more personal
- No filler openers: no "so today", "in this video", "hey guys"

CTAs — audience growth (NOT coaching/sales):
${guide.ctas}
- Vary the wording — don't repeat the same CTA across multiple scripts
- Never write "DM me" or coaching/programme CTAs for this account${calibration?.distilled_rules ? `

VOICE CALIBRATION (confirmed patterns from comparing scripted vs filmed — follow these strictly):
${calibration.distilled_rules}` : ''}`
}

function buildCoachSystemPrompt(
  name: string,
  igHandle: string,
  intro: Record<string, unknown>,
  profile: Record<string, unknown>,
  calibration: VoiceCalibration | null = null,
): string {
  const niche = (intro.specific_niche as string) || (intro.what_you_coach as string) || (profile.niche as string) || 'their niche'
  const idealClient = (intro.ideal_client as string) || (profile.target_audience as string) || ''
  const ctaKeyword = (intro.dm_keyword as string) || (intro.cta_keyword as string) || (profile.dm_keyword as string) || '[YOUR_KEYWORD]'

  return `You are a content strategist and ghostwriter for ${name} (@${igHandle}), who creates short-form video content in the ${niche} space${idealClient ? ` for ${idealClient}` : ''}.

YOUR JOB:
Write 7 reel scripts each week — a balanced mix of reach content AND conversion content. These are real scripts that will be filmed, so they must be specific, authentic, and immediately filmable.

The 7 scripts should roughly follow this split:
- 4 reach/awareness reels: hooks, topics, formats that are currently getting views in the niche
- 2 conversion reels: DM-driving content (offer, results, client stories, objection handling, urgency) — based on how competitors are selling, adapted to ${name}'s offer
- 1 wild card: a format or angle that stands out from what competitors are doing

HOW TO DO IT:
1. Study every competitor reel — not just the viral ones. The conversion reels (even low views) show HOW creators in this niche sell. That's as valuable as the high-view content.
2. Study ${name}'s own transcripts — this is their real voice. Match their rhythm, vocabulary, energy, and natural speech patterns exactly. Also note what topics they already cover so you don't repeat them.
3. Use the onboarding context only to fill gaps — their story, their audience's pain points, their specific proof points
4. Combine them: competitor's angle/format + ${name}'s voice + their own story/results/perspective

CONTENT STYLE:
- Most scripts will be straight-to-camera talking — the creator speaks directly, no props needed
- Some scripts can suggest a visual format if it genuinely fits: split screen with a chart/screen recording, green screen behind them, side-by-side comparison, reacting to content (note: the creator will need to find the specific video themselves — just describe the type of content to react to)
- Every script must be filmable — if it needs a visual element, say what it is
- 45–90 seconds when spoken aloud (120–250 words)
- ONE clear message per reel
- Vary energy: some punchy and fast, some slower and more personal
- No corporate language. No "in today's video". No filler openers.
- Hooks must create tension or curiosity immediately

CTAs — ${name}'s own:
- Coaching/program CTA: "DM me ${ctaKeyword}"
- Use a natural variation each time — don't repeat the same wording across all 7 scripts${calibration?.distilled_rules ? `

VOICE CALIBRATION (confirmed patterns from comparing scripted vs filmed — follow these strictly):
${calibration.distilled_rules}` : ''}`
}

function buildSystemPrompt(
  name: string,
  igHandle: string,
  intro: Record<string, unknown>,
  profile: Record<string, unknown>,
  isCreator = false,
  creatorStyle: string | null = null,
  calibration: VoiceCalibration | null = null,
): string {
  if (isCreator) {
    return buildCreatorSystemPrompt(name, igHandle, intro, profile, creatorStyle, calibration)
  }
  return buildCoachSystemPrompt(name, igHandle, intro, profile, calibration)
}

// ── User prompt ───────────────────────────────────────────────────────────────

function buildUserPrompt(
  competitorReport: string,
  outlierContext: string,
  kbContext: string,
  brandContext: string,
  transcriptContext: string,
  commentContext: string,
  weekStart: string,
  name: string,
  isCreator = false,
  creatorStyle: string | null = null,
): string {
  const formattedWeek = new Date(weekStart + 'T00:00:00Z').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  })

  return `Write ${name}'s content plan for the week of ${formattedWeek}.

===================================================================
STEP 1 — WHAT'S WORKING IN THE NICHE RIGHT NOW (your primary source for ideas)
===================================================================
Study these competitor reels carefully. These are the angles, hooks, and structures that are actually getting views this week. This is where all ideas come from.

${competitorReport.slice(0, 55000)}
${outlierContext ? `
===================================================================
STEP 1B — OUTLIER REELS (prioritise these specific angles)
===================================================================
These specific reels significantly outperformed compared to the creator's own historical average — not just high in absolute views, but unusually strong relative to their baseline. The topic/angle resonated in a way their normal content doesn't. These are the highest-signal ideas this week.

${outlierContext}
` : ''}
===================================================================
STEP 2 — HOW ${name.toUpperCase()} ACTUALLY SOUNDS (your primary source for voice)
===================================================================
${transcriptContext || `No transcripts available yet — use their captions and performance data below to infer their style.`}

===================================================================
STEP 3 — WHAT HAS WORKED FOR ${name.toUpperCase()} PREVIOUSLY (double down on winners)
===================================================================
${kbContext}

===================================================================
STEP 4 — CONTEXT ABOUT ${name.toUpperCase()} (use to fill gaps and personalise)
===================================================================
${brandContext}
${commentContext ? `\n--- AUDIENCE COMMENTS (what their viewers are saying) ---\n${commentContext}` : ''}

===================================================================
NOW WRITE THE SCRIPTS
===================================================================

RULES:
- Ideas MUST come from what competitors are actually posting — especially the outlier reels flagged in Step 1B. Do not invent topics from scratch.
- Draw inspiration from ALL competitors, not just the highest-view accounts.
- Spread ideas across competitors — aim for at least one script inspired by each tracked account.
- Each script MUST include a SOURCE line citing the exact competitor reel it was inspired by. Format: @account — "[opening line from their reel]" (N,NNN views). No script without a source.
${isCreator ? `- For each script: lead with what's working in the niche (competitor intelligence), written in ${name}'s voice, from their unique perspective
- CTAs must drive follows, saves, shares, or engagement — NEVER coaching DMs or "work with me" language
- The content should build ${name}'s audience and brand, not convert to a service` : `- For conversion scripts: look at how competitors pitch their offer, what objections they handle, what results they showcase — then write ${name}'s version
- Voice must match ${name}'s transcripts — not generic coaching language
- Across the scripts, include at least 2 explicitly designed to drive DMs/enquiries`}
- Do NOT copy competitor scripts — take the angle/structure/topic and rewrite it completely in ${name}'s voice with their own story, proof, or perspective
- If ${name} has performance data, weight towards formats that work for them
- Do not repeat any format more than twice
- Each script must be a different angle — no two scripts on the same topic
- Write between 5–8 scripts depending on how many distinct quality angles the competitor data shows this week. Aim for 7. Write more when the data is rich with varied ideas, fewer when it's sparse.

OUTPUT FORMAT (follow exactly):

## 📊 Weekly Intel — w/c ${formattedWeek}

### What's Popping This Week
Write one bullet for EACH competitor account that has reels this week. Every tracked account must be mentioned. For each:
- [What's working for this account and why it resonates — specific angle, topic, or format]
  Source: @account_handle — "[exact quote from their reel transcript]" (N,NNN views)

### ${name}'s Performance Last Week
[What hit, what didn't — based on their reel data. Skip section if no data.]

---

### 🎬 Reel 1 | [FORMAT / STYLE]

**Source:** @account — "[opening line from the competitor reel that inspired this]" (N,NNN views)

**Hook:** [Opening line]

**Visual:** [Straight to camera / Split screen with X / React to: describe the type of video to find / etc.]

**Script:**
[Full script. Written as natural speech — how ${name} actually talks. 120–250 words.]

**Caption:** [2–3 lines. No hashtag spam.]

**CTA:** [${isCreator ? 'Audience growth CTA: follow / save / share / engage — varied each reel' : 'Their specific CTA — varied wording each reel'}]

---

### 🎬 Reel 2 | [FORMAT / STYLE]

**Source:** @account — "[opening line]" (N,NNN views)

**Hook:** [Opening line]

**Visual:** [Visual direction]

**Script:**
[Full script. 120–250 words.]

**Caption:** [2–3 lines.]

**CTA:** [Varied wording]

---

### 🎬 Reel 3 | [FORMAT / STYLE]

**Source:** @account — "[opening line]" (N,NNN views)

**Hook:** [Opening line]

**Visual:** [Visual direction]

**Script:**
[Full script. 120–250 words.]

**Caption:** [2–3 lines.]

**CTA:** [Varied wording]

---

### 🎬 Reel 4 | [FORMAT / STYLE]

**Source:** @account — "[opening line]" (N,NNN views)

**Hook:** [Opening line]

**Visual:** [Visual direction]

**Script:**
[Full script. 120–250 words.]

**Caption:** [2–3 lines.]

**CTA:** [Varied wording]

---

### 🎬 Reel 5 | [FORMAT / STYLE]

**Source:** @account — "[opening line]" (N,NNN views)

**Hook:** [Opening line]

**Visual:** [Visual direction]

**Script:**
[Full script. 120–250 words.]

**Caption:** [2–3 lines.]

**CTA:** [Varied wording]

---

### 🎬 Reel 6 | [FORMAT / STYLE]

**Source:** @account — "[opening line]" (N,NNN views)

**Hook:** [Opening line]

**Visual:** [Visual direction]

**Script:**
[Full script. 120–250 words.]

**Caption:** [2–3 lines.]

**CTA:** [Varied wording]

---

### 🎬 Reel 7 | [FORMAT / STYLE]

**Source:** @account — "[opening line]" (N,NNN views)

**Hook:** [Opening line]

**Visual:** [Visual direction]

**Script:**
[Full script. 120–250 words.]

**Caption:** [2–3 lines.]

**CTA:** [Varied wording]

---

### Accounts to Watch This Week
[The 1–2 accounts that had the most interesting or unexpected content this week — what specifically to take note of]`
}

// ── POST: generate a weekly package ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { profileId?: string }
  const { profileId } = body
  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 })

  // Monday of current week
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  const weekStart = monday.toISOString().split('T')[0]

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0]

  // Fetch everything in parallel
  const [
    { data: profileRow },
    { data: competitors },
    { data: ownReels },
  ] = await Promise.all([
    adminClient.from('profiles').select('*').eq('id', profileId).single(),
    adminClient.from('client_competitors').select('ig_username').eq('profile_id', profileId),
    adminClient.from('client_reels')
      .select('views, likes, comments, hook, caption, format_type, date, comments_text, transcript')
      .eq('profile_id', profileId)
      .gte('date', ninetyDaysAgoStr)
      .order('date', { ascending: false })
      .limit(100),
  ])

  if (!profileRow) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const intro = (profileRow.intro_structured ?? {}) as Record<string, unknown>
  const name = (profileRow.name as string) || 'Creator'
  const igHandle = (profileRow.ig_username as string) || ''
  const isCreator = (profileRow.user_type as string) === 'creator'
  const creatorStyle = (profileRow.creator_style as string | null) ?? null

  // Sync own reels from Instagram first (fresh data for generation)
  if (igHandle) {
    await syncClientOwnReels(profileId, igHandle)
  }

  // Fetch competitor reels — last 7 days only (matches scrape window)
  const handles = (competitors ?? []).map((c: { ig_username: string }) => c.ig_username)
  const { data: compReels } = handles.length > 0
    ? await adminClient
        .from('competitor_reels')
        .select('account, views, likes, comments, transcript, format_type, date, scraped_week, hook')
        .in('account', handles)
        .gte('date', sevenDaysAgoStr)
        .order('views', { ascending: false })
        .limit(100)
    : { data: [] }

  const ownReelsList = (ownReels ?? []) as Reel[]
  const compReelsList = (compReels ?? []) as CompReel[]

  // Load voice calibration (non-blocking on failure)
  const calibration = await loadVoiceCalibration(profileId).catch(() => null)

  // Build all context sections
  const competitorReport = buildCompetitorReport(compReelsList)
  const outlierContext = buildOutlierContext(compReelsList)
  const kbContext = buildKnowledgeContext(ownReelsList, compReelsList, weekStart)
  const brandContext = buildBrandContext(intro, profileRow as Record<string, unknown>, isCreator, creatorStyle)
  const transcriptContext = buildTranscriptContext(ownReelsList)
  const commentContext = buildCommentContext(ownReelsList)

  // Generate with Claude Opus
  let scriptsMarkdown: string
  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 16000,
      system: buildSystemPrompt(name, igHandle || 'creator', intro, profileRow as Record<string, unknown>, isCreator, creatorStyle, calibration),
      messages: [{
        role: 'user',
        content: buildUserPrompt(competitorReport, outlierContext, kbContext, brandContext, transcriptContext, commentContext, weekStart, name, isCreator, creatorStyle),
      }],
    })
    scriptsMarkdown = message.content[0].type === 'text' ? message.content[0].text : ''
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Generation failed'
    console.error('[weekly-package/generate] Claude error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // Extract intel section (everything before the first Reel script)
  let intelMd = scriptsMarkdown
  const reelStart = scriptsMarkdown.search(/\n###\s*🎬\s*Reel\s*1/)
  if (reelStart > 0) intelMd = scriptsMarkdown.slice(0, reelStart).trim()

  // Append "Accounts to Watch" section if present
  const accountsMarker = scriptsMarkdown.search(/\n###\s*Accounts to Watch/)
  if (accountsMarker > reelStart) {
    intelMd = intelMd + '\n\n' + scriptsMarkdown.slice(accountsMarker).trim()
  }

  // Parse trending topics from "What's Popping" section
  const trendingTopics: Array<{ topic: string; views: number; accounts: string[] }> = []
  const poppingMatch = intelMd.match(/###\s*What['']s Popping[^\n]*\n([\s\S]*?)(\n###|$)/)
  if (poppingMatch) {
    for (const line of poppingMatch[1].split('\n')) {
      const stripped = line.replace(/^[-•*]\s*/, '').trim()
      if (stripped.length > 8) trendingTopics.push({ topic: stripped, views: 0, accounts: [] })
    }
  }

  // Top openings for structured data (from transcript)
  const topHooks = compReelsList
    .filter(r => r.transcript && r.views && r.views > 0)
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 15)
    .map(r => ({
      account: r.account,
      hook: r.transcript!.slice(0, 100).split(/[.!?]/)[0]?.trim() ?? '',
      views: r.views ?? 0,
      format_type: r.format_type ?? null,
      url: null,
    }))

  const scriptCount = (scriptsMarkdown.match(/🎬\s*Reel/g) ?? []).length

  // Save to weekly_scripts
  const { error: scriptsErr } = await adminClient
    .from('weekly_scripts')
    .upsert({
      profile_id: profileId,
      week_start: weekStart,
      scripts_md: scriptsMarkdown,
      script_count: Math.max(scriptCount, 1),
    }, { onConflict: 'profile_id,week_start' })

  if (scriptsErr) {
    console.error('[weekly-package/generate] weekly_scripts save error:', scriptsErr.message)
  }

  // Save to weekly_reports (per-profile — use profile_id as key too if table supports it)
  // weekly_reports is global (keyed on week_start) so we store this client's intel
  // as a profile-specific report via a separate table approach: re-use weekly_scripts intel_md field
  // For now, upsert the global weekly_reports with this client's intel (last write wins per week)
  await adminClient
    .from('weekly_reports')
    .upsert({
      week_start: weekStart,
      report_md: intelMd,
      trending_topics: trendingTopics.slice(0, 10),
      top_hooks: topHooks,
    }, { onConflict: 'week_start' })
    .then(() => {}, () => {})

  // Fire voice calibration asynchronously — compare this week's filmed reels
  // against last week's generated scripts. Non-blocking; errors are swallowed.
  runVoiceCalibration(profileId, weekStart, ownReelsList).catch(() => {})

  return NextResponse.json({
    ok: true,
    week_start: weekStart,
    script_count: scriptCount,
    scripts_md: scriptsMarkdown,
    intel_md: intelMd,
    competitor_count: handles.length,
    own_reels_analysed: ownReelsList.length,
  })
}
