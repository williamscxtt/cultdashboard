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
  videoViewCount?: number; likesCount?: number; commentsCount?: number
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

const FORMAT_OPTIONS = 'talking_head, rant, list, tutorial, story_time, trend, pov, transformation, q_and_a, behind_the_scenes, other'

async function classifyFormats(reels: { caption: string; hook: string }[]): Promise<string[]> {
  if (!reels.length) return []
  const prompt = `Classify each Instagram reel into ONE format type.

Options (use exactly as written): ${FORMAT_OPTIONS}

Format definitions:
- talking_head: creator talking directly to camera with an opinion or point
- rant: strong take, calling something out, hot opinion
- list: numbered tips, mistakes, things nobody tells you, reasons why
- tutorial: step-by-step how-to, teach something specific
- story_time: personal story or client story with a lesson/punchline
- trend: trending audio, challenge, or meme format
- pov: "POV: you..." style, viewer imagines themselves in a scenario
- transformation: before/after, journey, results reveal
- q_and_a: answering a question (real or rhetorical)
- behind_the_scenes: showing process, day-in-life, what happens behind camera
- other: doesn't fit any of the above

Return ONLY a JSON array of strings, one per reel, same order. Example: ["tutorial","rant","list"]

Reels:
${reels.map((r, i) => `${i + 1}. Hook: "${r.hook}" | Caption: "${r.caption?.slice(0, 150)}"`).join('\n')}`
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001', max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  })
  const raw = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) return reels.map(() => 'other')
  try {
    const parsed = JSON.parse(match[0])
    return Array.isArray(parsed) ? parsed : reels.map(() => 'other')
  } catch { return reels.map(() => 'other') }
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

    // Check which reels already exist BEFORE classifying — only new ones need it
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

    // Classify format only for NEW reels
    const newInputs = newPosts.map(p => ({
      caption: p.caption ?? '',
      hook: (p.caption ?? '').split(/[.!?\n]/)[0]?.trim().slice(0, 200) ?? '',
    }))
    const formats = await classifyFormats(newInputs)

    const newRows = newPosts.map((p, i) => {
      const caption = p.caption ?? ''
      const hook = caption.split(/[.!?\n]/)[0]?.trim().slice(0, 200) ?? ''
      return {
        profile_id: profileId,
        reel_id: p.shortCode ?? '',
        scraped_week,
        date: p.timestamp ? p.timestamp.split('T')[0] : new Date().toISOString().split('T')[0],
        views: p.videoViewCount ?? 0,
        likes: p.likesCount ?? 0,
        comments: p.commentsCount ?? 0,
        caption: caption.slice(0, 2000),
        hook,
        hashtags: (caption.match(/#\w+/g) ?? []).map((h: string) => h.slice(1)),
        format_type: formats[i] ?? 'other',
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
            views: p.videoViewCount ?? 0,
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
  hook?: string | null
  caption?: string | null
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
      const hook = r.hook || r.caption?.slice(0, 80) || '(no hook)'
      lines.push(`• ${r.date ?? '?'} | ${(r.views ?? 0).toLocaleString()} views${fmt} — "${hook}"`)
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

  if (thisWeekComp.length > 0) {
    lines.push('=== TOP HOOKS THIS WEEK (by views) ===')
    for (const r of thisWeekComp) {
      const hook = r.hook || r.caption?.slice(0, 100) || '(no hook)'
      lines.push(`• [@${r.account} | ${(r.views ?? 0).toLocaleString()} views] "${hook}"`)
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

function buildCompetitorReport(compReels: CompReel[], weekStart: string): string {
  if (!compReels.length) return 'No competitor data available yet. Add competitor accounts in the Content page.'

  const sevenDaysAgo = new Date(weekStart)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

  const lines: string[] = []
  const thisWeek = compReels
    .filter(r => r.date && r.date >= sevenDaysAgoStr)
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))

  const allSorted = [...compReels].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))

  lines.push('## Trending Topics This Week')
  const fmtCount: Record<string, number> = {}
  for (const r of thisWeek) {
    if (r.format_type) fmtCount[r.format_type] = (fmtCount[r.format_type] ?? 0) + 1
  }
  for (const [fmt, n] of Object.entries(fmtCount).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
    lines.push(`- ${fmt} format dominating (${n} reels this week)`)
  }
  lines.push('')

  lines.push('## Top Performing Reels This Week')
  for (const r of thisWeek.slice(0, 20)) {
    const hook = r.hook || r.caption?.slice(0, 100) || '(no hook)'
    lines.push(`### @${r.account} — ${(r.views ?? 0).toLocaleString()} views [${r.format_type ?? 'unknown'}]`)
    lines.push(`Hook: "${hook}"`)
    if (r.caption && r.caption !== hook) lines.push(`Caption: ${r.caption.slice(0, 200)}`)
    lines.push('')
  }

  lines.push('## All-Time Top Reels (30 days)')
  for (const r of allSorted.slice(0, 15)) {
    const hook = r.hook || r.caption?.slice(0, 80) || '(no hook)'
    lines.push(`- @${r.account}: "${hook}" — ${(r.views ?? 0).toLocaleString()} views [${r.format_type ?? '?'}]`)
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

// ── System prompt — mirrors build_system_prompt() ────────────────────────────

function buildSystemPrompt(
  name: string,
  igHandle: string,
  intro: Record<string, unknown>,
  profile: Record<string, unknown>,
): string {
  const niche = (intro.specific_niche as string) || (intro.what_you_coach as string) || (profile.niche as string) || 'coaching'
  const idealClient = (intro.ideal_client as string) || (profile.target_audience as string) || 'their ideal client'
  const transformation = (intro.client_transformation as string) || ''
  const voice = (intro.brand_voice as string) || 'direct, zero fluff, slightly provocative, uses real numbers and client results'
  const hookStyle = (intro.hook_style as string) || 'Hooks must create immediate tension or curiosity in the first 3 words'

  return `You are a content strategist and ghostwriter for ${name} (@${igHandle}).

BRAND:
- Niche: ${niche}
- Ideal client: ${idealClient}
${transformation ? `- Transformation delivered: ${transformation}` : ''}
- Voice: ${voice}
- Hook style: ${hookStyle}
- Posting: talking head reels only (no carousels, no stories)
- CTAs:
  • "DM me CULT" → coaching/program CTA
  • comment "AUDIT" → free profile audit lead magnet

CONTENT FORMATS:
- comparison: red flag vs green flag, bad vs good advice, contrasting two approaches
- list: top reasons, common mistakes, things nobody tells you
- raw_story: personal story or client story with a lesson
- client_proof: client result + what specifically changed
- reaction: reacting to viral/bad advice in their space
- tutorial: specific tactical breakdown
- controversy: calls out popular bad advice directly
- question_hook: opens with a provocative question
- lead_magnet: hooks with a problem → positions the audit as the fix → "comment AUDIT"

RULES:
- Every script must be filmable as a talking head reel (speak direct to camera)
- Scripts should feel like ${name} talking, not like a LinkedIn post
- No corporate language, no "in today's video", no filler openers
- Hooks must create immediate tension or curiosity in the first 3 words
- Each reel should have ONE clear message
- Vary the energy: some punchy/fast, some slower and more real
- Use specific numbers, client results, and language from their niche
- CTAs: use "DM me CULT" for coaching CTAs, "comment AUDIT below" for lead magnet CTAs`
}

// ── User prompt — mirrors build_user_prompt() ─────────────────────────────────

function buildUserPrompt(
  competitorReport: string,
  kbContext: string,
  brandContext: string,
  commentContext: string,
  weekStart: string,
  name: string,
): string {
  const formattedWeek = new Date(weekStart + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return `Here is this week's competitor research data and performance context:

--- COMPETITOR RESEARCH ---
${competitorReport.slice(0, 20000)}

--- KNOWLEDGE BASE CONTEXT (accumulated performance data) ---
${kbContext}

--- BRAND KNOWLEDGE BASE ---
${brandContext}
${commentContext ? `\n--- COMMENT INTELLIGENCE ---\n${commentContext}` : ''}

---

Based on all of the above, write ${name}'s content plan for the week of ${formattedWeek}.

REQUIREMENTS:
- Write exactly 7 reel scripts (one per day, Mon–Sun)
- Include exactly 1 lead magnet reel (comment AUDIT) — can be any day
- Remaining 6 reels: mix of formats — NO more than 2 of the same format
- Learn from what competitors are doing that's getting views and adapt it to ${name}'s voice and niche
- If ${name} has performance data, double down on best formats and avoid what flopped
- Scripts should be 45–90 seconds when spoken aloud (roughly 120–250 words)
- Reference specific pain points and language relevant to ${name}'s ideal client
- Make hooks that would stop their specific audience mid-scroll

OUTPUT FORMAT (follow exactly — do not deviate):

## 📊 Weekly Intel — w/c ${formattedWeek}

### What's Popping This Week
[3–4 bullets. For each trend, describe what's working AND include the specific source video from the competitor data. Use EXACTLY this format — do not deviate:]
- [Describe the trend/angle/format that's working and why it resonates]
  Source: @account_handle — "[exact hook or opening line from the reel]" (N,NNN views)

### Performance Last Week
[What hit, what didn't — based on their actual reel data above. Skip if no data.]

---

### 🎬 Reel 1 — Monday | [FORMAT TYPE]

**Hook:** [Opening line — punchy, first 3 words create tension]

**Script:**
[Full talking-head script. Natural speech. 120–250 words.]

**Caption:** [2–3 lines. Hook + value + CTA. No hashtag spam.]

**CTA:** [DM CULT / comment AUDIT]

---

[Repeat exact format for Reels 2–7, each with their own ### 🎬 Reel N header]

---

### Accounts to Watch This Week
[1–2 accounts that had a breakout week and what to steal from them]`
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

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

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

  // Fetch competitor reels
  const handles = (competitors ?? []).map((c: { ig_username: string }) => c.ig_username)
  const { data: compReels } = handles.length > 0
    ? await adminClient
        .from('competitor_reels')
        .select('account, views, likes, comments, hook, caption, format_type, date, scraped_week')
        .in('account', handles)
        .gte('date', thirtyDaysAgoStr)
        .order('views', { ascending: false })
        .limit(200)
    : { data: [] }

  const ownReelsList = (ownReels ?? []) as Reel[]
  const compReelsList = (compReels ?? []) as CompReel[]

  // Build all context sections
  const competitorReport = buildCompetitorReport(compReelsList, weekStart)
  const kbContext = buildKnowledgeContext(ownReelsList, compReelsList, weekStart)
  const brandContext = buildBrandContext(intro, profileRow as Record<string, unknown>)
  const commentContext = buildCommentContext(ownReelsList)

  // Generate with Claude Opus (same model as weekly_runner.py)
  let scriptsMarkdown: string
  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 8192,
      system: buildSystemPrompt(name, igHandle || 'creator', intro, profileRow as Record<string, unknown>),
      messages: [{
        role: 'user',
        content: buildUserPrompt(competitorReport, kbContext, brandContext, commentContext, weekStart, name),
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

  // Top hooks for structured data
  const topHooks = compReelsList
    .filter(r => r.hook && r.views && r.views > 0)
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 15)
    .map(r => ({
      account: r.account,
      hook: r.hook!,
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
