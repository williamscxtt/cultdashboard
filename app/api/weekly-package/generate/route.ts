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

  // Top hooks this week (by views)
  const thisWeekComp = compReels
    .filter(r => r.date && r.date >= sevenDaysAgoStr)
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 15)

  // Only show openings from real transcripts — not captions
  const thisWeekWithTranscript = thisWeekComp.filter(r => r.transcript && r.transcript.trim().length > 50)
  if (thisWeekWithTranscript.length > 0) {
    lines.push('=== TOP TRANSCRIPT OPENINGS THIS WEEK — what high-performing creators say ===')
    for (const r of thisWeekWithTranscript) {
      const opening = r.transcript!.slice(0, 300).trim()
      lines.push(`• [@${r.account} | ${(r.views ?? 0).toLocaleString()} views] "${opening}"`)
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

function buildBrandContext(intro: Record<string, unknown>, profile: Record<string, unknown>): string {
  const lines: string[] = ['# Client Brand Knowledge']

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

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(
  name: string,
  igHandle: string,
  intro: Record<string, unknown>,
  profile: Record<string, unknown>,
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
- Use a natural variation each time — don't repeat the same wording across all 7 scripts`
}

// ── User prompt ───────────────────────────────────────────────────────────────

function buildUserPrompt(
  competitorReport: string,
  kbContext: string,
  brandContext: string,
  transcriptContext: string,
  commentContext: string,
  weekStart: string,
  name: string,
): string {
  const formattedWeek = new Date(weekStart + 'T00:00:00Z').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  })

  return `Write ${name}'s content plan for the week of ${formattedWeek}.

===================================================================
STEP 1 — WHAT'S WORKING IN THE NICHE RIGHT NOW (your primary source for ideas)
===================================================================
Study these competitor reels. These are the angles, hooks, and structures that are actually getting views this week. This is where the ideas come from.

${competitorReport.slice(0, 60000)}

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
- Ideas must come from what competitors are actually posting — both their viral content AND their conversion content. Do not invent topics from scratch.
- Draw inspiration from ALL competitors, not just the highest-view accounts. A competitor with lower views may be posting content that's more niche-relevant or closer to the type of content ${name} should make.
- Spread ideas across competitors — aim for at least one script inspired by each tracked account.
- For conversion scripts: look at how competitors pitch their offer, what objections they handle, what results they showcase, what CTAs they use — then write ${name}'s version
- Voice must match ${name}'s transcripts — not generic coaching language
- Do NOT copy competitor scripts — take the angle/structure/topic and rewrite it completely in ${name}'s voice with their own story, proof, or perspective
- If ${name} has performance data, weight towards formats that work for them
- Do not repeat any format more than twice across the 7 scripts
- Each script must be a different angle — no two scripts on the same topic
- Across the 7 scripts, include at least 2 that are explicitly designed to drive DMs/enquiries
- You MUST write exactly 7 scripts. Count them before you finish. Do not stop at 6.

OUTPUT FORMAT (follow exactly):

## 📊 Weekly Intel — w/c ${formattedWeek}

### What's Popping This Week
Write one bullet for EACH competitor account that has reels this week. Every tracked account must be mentioned. For each:
- [What's working for this account and why it resonates — specific angle, topic, or format]
  Source: @account_handle — "[exact quote from their reel transcript]" (N,NNN views)

### ${name}'s Performance Last Week
[What hit, what didn't — based on their reel data. Skip section if no data.]

---

### 🎬 Reel 1 — Monday | [FORMAT / STYLE]

**Hook:** [Opening line]

**Visual:** [Straight to camera / Split screen with X / React to: describe the type of video to find / etc.]

**Script:**
[Full script. Written as natural speech — how ${name} actually talks. 120–250 words.]

**Caption:** [2–3 lines. No hashtag spam.]

**CTA:** [Their specific CTA — varied wording each reel]

---

### 🎬 Reel 2 — Tuesday | [FORMAT / STYLE]

**Hook:** [Opening line]

**Visual:** [Visual direction]

**Script:**
[Full script. 120–250 words.]

**Caption:** [2–3 lines.]

**CTA:** [Varied wording]

---

### 🎬 Reel 3 — Wednesday | [FORMAT / STYLE]

**Hook:** [Opening line]

**Visual:** [Visual direction]

**Script:**
[Full script. 120–250 words.]

**Caption:** [2–3 lines.]

**CTA:** [Varied wording]

---

### 🎬 Reel 4 — Thursday | [FORMAT / STYLE]

**Hook:** [Opening line]

**Visual:** [Visual direction]

**Script:**
[Full script. 120–250 words.]

**Caption:** [2–3 lines.]

**CTA:** [Varied wording]

---

### 🎬 Reel 5 — Friday | [FORMAT / STYLE]

**Hook:** [Opening line]

**Visual:** [Visual direction]

**Script:**
[Full script. 120–250 words.]

**Caption:** [2–3 lines.]

**CTA:** [Varied wording]

---

### 🎬 Reel 6 — Saturday | [FORMAT / STYLE]

**Hook:** [Opening line]

**Visual:** [Visual direction]

**Script:**
[Full script. 120–250 words.]

**Caption:** [2–3 lines.]

**CTA:** [Varied wording]

---

### 🎬 Reel 7 — Sunday | [FORMAT / STYLE]

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

  // Sync own reels from Instagram first (fresh data for generation)
  if (igHandle) {
    await syncClientOwnReels(profileId, igHandle)
  }

  // Fetch competitor reels — last 7 days only (matches scrape window)
  const handles = (competitors ?? []).map((c: { ig_username: string }) => c.ig_username)
  const { data: compReels } = handles.length > 0
    ? await adminClient
        .from('competitor_reels')
        .select('account, views, likes, comments, transcript, format_type, date, scraped_week')
        .in('account', handles)
        .gte('date', sevenDaysAgoStr)
        .order('views', { ascending: false })
        .limit(100)
    : { data: [] }

  const ownReelsList = (ownReels ?? []) as Reel[]
  const compReelsList = (compReels ?? []) as CompReel[]

  // Build all context sections
  const competitorReport = buildCompetitorReport(compReelsList)
  const kbContext = buildKnowledgeContext(ownReelsList, compReelsList, weekStart)
  const brandContext = buildBrandContext(intro, profileRow as Record<string, unknown>)
  const transcriptContext = buildTranscriptContext(ownReelsList)
  const commentContext = buildCommentContext(ownReelsList)

  // Generate with Claude Opus
  let scriptsMarkdown: string
  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 16000,
      system: buildSystemPrompt(name, igHandle || 'creator', intro, profileRow as Record<string, unknown>),
      messages: [{
        role: 'user',
        content: buildUserPrompt(competitorReport, kbContext, brandContext, transcriptContext, commentContext, weekStart, name),
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
