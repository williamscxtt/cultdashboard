import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { getAllCircleMembers, getPostsSince, getRecentComments } from '@/lib/circle-api'
import type { Profile } from '@/lib/types'

export const maxDuration = 300 // 5 min Vercel function timeout

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/** Safely convert any value (string, JSONB object, array) to a plain string */
function toText(val: unknown): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val
  return JSON.stringify(val)
}

// ── Slack helpers ─────────────────────────────────────────────────────────────

async function sendSlackMessage(blocks: unknown[], text: string) {
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: process.env.SLACK_CHANNEL_ID,
      text,
      blocks,
    }),
  })
  const json = await res.json() as { ok: boolean; error?: string; ts?: string; channel?: string }
  if (!json.ok) throw new Error(`Slack error: ${json.error}`)
  return json
}

function priorityEmoji(priority: string) {
  if (priority === 'high') return '🔴'
  if (priority === 'medium') return '🟡'
  return '🟢'
}

const ACTION_LABELS: Record<string, string> = {
  check_in_quiet:   'QUIET',
  check_in_dormant: 'DORMANT',
  celebrate_win:    'WIN 🎉',
  address_problem:  'NEEDS HELP',
  respond_intro:    'NEW MEMBER',
  follow_up_goal:   'FOLLOW UP',
}

function buildItemBlocks(item: {
  id: string
  profile_name: string | null
  profile_ig_username: string | null
  action_type: string
  priority: string
  reason: string
  context_quote: string | null
  draft_message: string
  circle_post_id: string | null
}) {
  const name = item.profile_name ?? 'Unknown'
  const handle = item.profile_ig_username ? ` · @${item.profile_ig_username}` : ''
  const label = ACTION_LABELS[item.action_type] ?? item.action_type.toUpperCase()
  const emoji = priorityEmoji(item.priority)

  const blocks: unknown[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${emoji} *${name}*${handle} · \`${label}\`\n${item.reason}`,
      },
    },
  ]

  if (item.context_quote) {
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `_"${item.context_quote}"_` }],
    })
  }

  // Draft message in a code-friendly block (easy to select and copy)
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `\`\`\`${item.draft_message}\`\`\``,
    },
  })

  // Action buttons
  const buttons: unknown[] = []

  if (item.circle_post_id) {
    buttons.push({
      type: 'button',
      text: { type: 'plain_text', text: '✅ Post Reply to Circle' },
      style: 'primary',
      action_id: 'circle_post_reply',
      value: item.id,
    })
  } else {
    buttons.push({
      type: 'button',
      text: { type: 'plain_text', text: '✅ Mark as Sent' },
      style: 'primary',
      action_id: 'circle_mark_sent',
      value: item.id,
    })
  }

  buttons.push({
    type: 'button',
    text: { type: 'plain_text', text: '✏️ Edit Draft' },
    action_id: 'circle_edit_draft',
    value: item.id,
  })

  buttons.push({
    type: 'button',
    text: { type: 'plain_text', text: '✖ Dismiss' },
    action_id: 'circle_dismiss',
    value: item.id,
  })

  blocks.push({ type: 'actions', elements: buttons })
  blocks.push({ type: 'divider' })

  return blocks
}

// ── Main cron handler ─────────────────────────────────────────────────────────

export async function GET(req: Request) {
  // Verify this is a legitimate Vercel cron call (or a manual admin trigger)
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // ── 1. Fetch dashboard clients ──────────────────────────────────────────
    const { data: clients, error: clientsError } = await adminClient
      .from('profiles')
      .select('id, name, email, coaching_phase, ninety_day_goal, biggest_challenge, ig_username, niche, intro_insights, call_transcripts, dashboard_bio')
      .eq('role', 'client')
      .eq('is_active', true)
      .not('email', 'is', null)

    if (clientsError) {
      console.error('Profiles query error:', clientsError)
      return NextResponse.json({ error: `Profiles query failed: ${clientsError.message}` }, { status: 500 })
    }

    const dashboardClients = (clients ?? []) as (Profile & { intro_insights?: string; call_transcripts?: string; dashboard_bio?: string })[]

    // ── 2. Sync Circle posts incrementally ─────────────────────────────────
    // Find the most recently cached post date
    const { data: latestCached } = await adminClient
      .from('circle_posts_cache')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const since = latestCached?.created_at
      ? new Date(new Date(latestCached.created_at).getTime() - 60 * 60 * 1000) // overlap by 1h
      : undefined // first run: fetch all

    // Will's email — used to find his Circle member ID so we can detect his replies
    const WILL_EMAIL = 'will@scottvip.com'
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000)

    const [newPosts, circleMembers, recentComments] = await Promise.all([
      getPostsSince(since),
      getAllCircleMembers(),
      getRecentComments(fourteenDaysAgo).catch(() => []), // graceful fallback if comments API fails
    ])

    // Find Will's Circle member ID
    const willMember = circleMembers.find(m => m.email?.toLowerCase() === WILL_EMAIL.toLowerCase())
    const willMemberId = willMember?.id ?? null

    // Build map: post_id → most recent date Will replied (only his comments)
    const willRepliedMap = new Map<number, Date>()
    for (const comment of recentComments) {
      if (willMemberId && comment.user_id === willMemberId) {
        const existing = willRepliedMap.get(comment.post_id)
        const commentDate = new Date(comment.created_at)
        if (!existing || commentDate > existing) {
          willRepliedMap.set(comment.post_id, commentDate)
        }
      }
    }

    // Upsert new posts into cache
    if (newPosts.length > 0) {
      const cacheRows = newPosts.map(p => ({
        circle_post_id: String(p.id),
        title: p.name ?? '',
        body: (p.body_plain_text ?? '').slice(0, 2000),
        created_at: p.created_at,
        member_id: String(p.user_id),
        member_name: p.user_name ?? '',
        member_email: p.user_email ?? '',
        space_id: String(p.space_id),
        comments_count: p.comments_count ?? 0,
        url: p.url ?? '',
        cached_at: new Date().toISOString(),
      }))

      await adminClient
        .from('circle_posts_cache')
        .upsert(cacheRows, { onConflict: 'circle_post_id' })
    }

    // ── 3. Build member lookup and match to dashboard clients ───────────────
    // Match by email first, fall back to name (normalised)
    const membersByEmail = new Map(circleMembers.map(m => [m.email?.toLowerCase(), m]))
    const memberNameByCircleId = new Map(circleMembers.map(m => [String(m.id), m.name]))

    function normaliseName(n: string) {
      return n.toLowerCase().replace(/[^a-z0-9]/g, '')
    }
    const membersByName = new Map(circleMembers.map(m => [normaliseName(m.name ?? ''), m]))

    interface ClientData {
      client: typeof dashboardClients[0]
      member: typeof circleMembers[0] | null
      matchMethod: 'email' | 'name' | null
      daysSinceActive: number | null
    }

    const clientData: ClientData[] = dashboardClients.map(client => {
      // Try email match first
      let member = client.email ? membersByEmail.get(client.email.toLowerCase()) ?? null : null
      let matchMethod: 'email' | 'name' | null = member ? 'email' : null

      // Fall back to name match
      if (!member && client.name) {
        member = membersByName.get(normaliseName(client.name)) ?? null
        if (member) matchMethod = 'name'
      }

      const daysSinceActive = member?.last_seen_at
        ? Math.floor((Date.now() - new Date(member.last_seen_at).getTime()) / 86400000)
        : null
      return { client, member, matchMethod, daysSinceActive }
    })

    // Upsert activity cache
    const cacheRows = clientData.filter(c => c.member).map(({ client, member, daysSinceActive }) => ({
      profile_id: client.id,
      circle_member_id: String(member!.id),
      last_seen_at: member!.last_seen_at,
      posts_count: member!.posts_count ?? 0,
      comments_count: member!.comments_count ?? 0,
      gamification_points: member!.gamification_stats?.points ?? 0,
      circle_headline: member!.headline ?? null,
      circle_profile_url: member!.profile_url ?? null,
      synced_at: new Date().toISOString(),
    }))

    if (cacheRows.length > 0) {
      await adminClient.from('circle_activity_cache').upsert(cacheRows, { onConflict: 'profile_id' })
    }

    // ── 4. Fetch context for Claude ────────────────────────────────────────

    // Recent posts per client (last 30 days from cache)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentPostRows } = await adminClient
      .from('circle_posts_cache')
      .select('*')
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(300)

    // Knowledge base documents
    const { data: knowledgeDocs } = await adminClient
      .from('knowledge_documents')
      .select('title, content, category, source')
      .order('created_at', { ascending: false })
      .limit(60)

    // Historical Circle themes (posts older than 30 days — summarised as themes)
    const { data: historicalPosts } = await adminClient
      .from('circle_posts_cache')
      .select('title, body, member_email, created_at')
      .lt('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(200)

    // ── 5. Build Claude prompt ─────────────────────────────────────────────
    const today = new Date().toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })

    // ── Query: DMs Will has already sent in last 14 days (to detect follow-up needs) ──
    const { data: recentSentDMs } = await adminClient
      .from('circle_action_items')
      .select('profile_id, action_type, acted_at, draft_message')
      .in('action_type', ['check_in_quiet', 'check_in_dormant'])
      .eq('status', 'sent')
      .gte('acted_at', fourteenDaysAgo.toISOString())
      .order('acted_at', { ascending: false })

    // Build lookup maps
    const clientByEmail = new Map(dashboardClients.map(c => [c.email?.toLowerCase() ?? '', c]))
    const clientById = new Map(dashboardClients.map(c => [c.id, c]))

    // Helper: get Will's reply status for a post
    function replyStatus(circlePostIdStr: string): { label: string; daysAgo: number | null; skip: boolean } {
      const postId = parseInt(circlePostIdStr)
      const replyDate = willRepliedMap.get(postId)
      if (!replyDate) return { label: '❌ NOT REPLIED', daysAgo: null, skip: false }
      const daysAgo = Math.floor((Date.now() - replyDate.getTime()) / 86400000)
      if (daysAgo < 3) return { label: `✅ replied ${daysAgo}d ago`, daysAgo, skip: true }
      return { label: `⚠️ replied ${daysAgo}d ago`, daysAgo, skip: false }
    }

    // ── SECTION 1: Unanswered Circle posts (sorted by space priority then recency) ──
    // Audits posts first, then all others — only posts Will hasn't replied to in last 3 days
    const allPostsNeedingReply = (recentPostRows ?? [])
      .filter(p => {
        const email = p.member_email?.toLowerCase() ?? ''
        if (email === WILL_EMAIL.toLowerCase()) return false
        return !replyStatus(p.circle_post_id).skip
      })
      .sort((a, b) => {
        // Audits space first
        const aAudit = (a.space_name ?? '').toLowerCase().includes('audit') ? 0 : 1
        const bAudit = (b.space_name ?? '').toLowerCase().includes('audit') ? 0 : 1
        if (aAudit !== bAudit) return aAudit - bAudit
        // Then most recent
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

    const unansweredPostsSection = allPostsNeedingReply.map(p => {
      const daysAgo = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000)
      const snippet = (p.body ?? '').slice(0, 400).replace(/\n+/g, ' ')
      const rs = replyStatus(p.circle_post_id)
      const client = clientByEmail.get(p.member_email?.toLowerCase() ?? '')
      const clientTag = client
        ? ` | CLIENT: ${client.name} (ID: ${client.id}, niche: ${client.niche ?? 'unknown'}, goal: ${client.ninety_day_goal ?? 'not set'})`
        : ` | COMMUNITY MEMBER (not on dashboard)`
      return `POST ID: ${p.circle_post_id}
Space: ${p.space_name ?? 'Unknown'} | [${rs.label}] | ${daysAgo} days ago
From: ${p.member_name} (${p.member_email})${clientTag}
Title: "${p.title}"
Content: ${snippet}
---`
    }).join('\n')

    // ── SECTION 2: Inactive clients (haven't been seen in Circle for 7+ days, no unanswered posts) ──
    const postingMemberEmails = new Set(allPostsNeedingReply.map(p => p.member_email?.toLowerCase() ?? ''))
    const inactiveSection = clientData
      .filter(({ member, daysSinceActive }) => {
        if (!member) return false // not in Circle at all
        if (daysSinceActive === null || daysSinceActive < 7) return false // active recently
        const clientEmail = member.email?.toLowerCase() ?? ''
        if (postingMemberEmails.has(clientEmail)) return false // already covered in posts section
        return true
      })
      .sort((a, b) => (b.daysSinceActive ?? 0) - (a.daysSinceActive ?? 0))
      .map(({ client, member, daysSinceActive }) => {
        const bioContext = toText(client.dashboard_bio ?? client.intro_insights ?? '').slice(0, 200)
        return `${client.name} | ID: ${client.id} | Last seen in Circle: ${daysSinceActive} days ago
Niche: ${client.niche ?? 'unknown'} | Goal: ${client.ninety_day_goal ?? 'not set'} | Challenge: ${client.biggest_challenge ?? 'not set'}${bioContext ? `\nBackground: ${bioContext}` : ''}
Circle stats: ${member!.posts_count ?? 0} total posts | ${member!.comments_count ?? 0} comments`
      }).join('\n---\n')

    // ── SECTION 3: DM follow-ups (Will sent a DM, client still hasn't shown up) ──
    const sentDMProfileIds = new Set((recentSentDMs ?? []).map(d => d.profile_id))
    const dmFollowUpSection = [...sentDMProfileIds]
      .map(profileId => {
        const client = clientById.get(profileId)
        if (!client) return null
        const clientInfo = clientData.find(c => c.client.id === profileId)
        const dm = (recentSentDMs ?? []).find(d => d.profile_id === profileId)
        if (!dm) return null
        const sentDaysAgo = Math.floor((Date.now() - new Date(dm.acted_at).getTime()) / 86400000)
        const stillInactive = (clientInfo?.daysSinceActive ?? 0) >= sentDaysAgo
        if (!stillInactive) return null // they came back after the DM, skip
        return `${client.name} | ID: ${profileId}
DM sent ${sentDaysAgo}d ago, still last seen ${clientInfo?.daysSinceActive ?? '?'}d ago — no response
Previous DM: "${toText(dm.draft_message).slice(0, 150)}"`
      })
      .filter(Boolean)
      .join('\n---\n')

    // Knowledge base context
    const kbContext = (knowledgeDocs ?? []).map(d =>
      `[${d.category} — ${d.source}] ${d.title}:\n${d.content.slice(0, 600)}`
    ).join('\n\n---\n\n')

    // Historical themes (just titles + snippets to save tokens)
    const historicalContext = (historicalPosts ?? []).slice(0, 100).map(p => {
      const daysAgo = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000)
      return `[${daysAgo}d ago, ${p.member_email}] "${p.title}": ${(p.body ?? '').slice(0, 150)}`
    }).join('\n')

    const systemPrompt = `You are Will Scott's AI client success coach. Will runs a high-ticket Instagram growth coaching programme with a Circle community.

Your job: produce Will's morning action queue — sorted by urgency. Three types of actions, in this order of priority:

1. CIRCLE POST REPLIES — someone posted something Will hasn't replied to yet. He needs to reply in the community.
2. CHECK-IN DMs — clients who've gone quiet (not active in Circle). Will sends them an Instagram DM.
3. DM FOLLOW-UPS — Will already sent a DM but the person is still inactive. Needs a nudge.

## DATA RULES — NON-NEGOTIABLE
- Only reference information explicitly in the data. Never invent details.
- "Last seen X days ago" = last Circle login, not join date. Never say "joined yesterday" or similar.
- If niche/goal/challenge shows "unknown" or "not set", do not fill it in yourself.
- If a post shows (none), don't say "I saw you posted". They haven't.

## DRAFT MESSAGE RULES
- Post replies: write the actual reply Will should post IN CIRCLE (expert coaching voice, direct, warm, specific to their post content)
- DM check-ins: Instagram DM style (casual, 3–4 sentences, reference their actual goal or challenge — NEVER "just checking in")
- DM follow-ups: shorter, more direct. Acknowledge the silence, give them an easy yes/no to respond to.
- Always use the client's actual name. Never use placeholders.

## Will's Coaching Knowledge Base
${kbContext}

## Historical Community Patterns
${historicalContext}`

    const userPrompt = `Today is ${today}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 1: CIRCLE POSTS NEEDING WILL'S REPLY
(Audits space first, then all others — sorted by priority)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${unansweredPostsSection || 'No unanswered posts found.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 2: CLIENTS GONE QUIET (7+ days inactive, no unanswered posts)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${inactiveSection || 'No inactive clients.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 3: DM FOLLOW-UPS (Will sent a DM but client still inactive)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${dmFollowUpSection || 'No pending DM follow-ups.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate one action item for EVERY post in Section 1, every person in Section 2, and every person in Section 3.
Do not merge or skip anyone.

For Section 1 posts: set circle_post_id to the POST ID shown in the data.
For Section 2 & 3: set circle_post_id to null (these are DMs not post replies).
For community members (not dashboard clients): set profile_id to null.

Return ONLY a JSON array:
[
  {
    "profile_id": "uuid or null",
    "circle_member_id": "number as string or null",
    "circle_post_id": "post id string or null",
    "action_type": "check_in_quiet|check_in_dormant|celebrate_win|address_problem|respond_intro|follow_up_goal",
    "priority": "high|medium|low",
    "reason": "one sentence — specific, reference actual post content or actual days-since-active",
    "context_quote": "exact quote from post, or 'Last seen X days ago' with real number",
    "draft_message": "complete message — no placeholders, only reference info shown above"
  }
]`

    // ── 6. Claude Sonnet call ──────────────────────────────────────────────
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 16000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
    const jsonStr = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
    const items = JSON.parse(jsonStr) as Array<{
      profile_id: string
      circle_member_id: string | null
      circle_post_id: string | null
      action_type: string
      priority: string
      reason: string
      context_quote: string | null
      draft_message: string
    }>

    // ── 7. Save to DB ──────────────────────────────────────────────────────
    const profileMap = Object.fromEntries(dashboardClients.map(c => [c.id, c]))
    const validProfileIds = new Set(dashboardClients.map(c => c.id))

    await adminClient.from('circle_action_items').delete().eq('status', 'pending')

    // Separate items into dashboard-client items (valid profile_id) and community-member items (no match)
    const validItems = items.filter(item => item.profile_id && validProfileIds.has(item.profile_id))
    const nonClientItems = items.filter(item => !item.profile_id || !validProfileIds.has(item.profile_id))

    let dbInsertError: string | null = null
    const allInsertItems = [
      ...validItems.map(item => ({
        ...item,
        status: 'pending',
        generated_at: new Date().toISOString(),
      })),
      // Non-client members get null profile_id but store the member name for display
      ...nonClientItems.map(item => ({
        ...item,
        profile_id: null,
        member_name: item.circle_member_id ? memberNameByCircleId.get(item.circle_member_id) ?? item.profile_id : item.profile_id,
        status: 'pending',
        generated_at: new Date().toISOString(),
      })),
    ]

    if (allInsertItems.length > 0) {
      const { error: insertError } = await adminClient.from('circle_action_items').insert(allInsertItems)
      if (insertError) {
        dbInsertError = insertError.message
        console.error('DB insert error:', insertError)
      }
    }

    // ── 8. Send Slack message ──────────────────────────────────────────────
    // Build Slack blocks directly from Claude's output — don't re-fetch from DB
    // This way Slack always fires even if the DB insert had issues
    if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_CHANNEL_ID) {
      return NextResponse.json({
        ok: true,
        items_generated: items.length,
        db_insert_error: dbInsertError,
        slack: 'skipped — SLACK_BOT_TOKEN or SLACK_CHANNEL_ID not set',
      })
    }

    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
    // Use ALL Claude items for Slack (even ones with unmatched profile_ids — show them as unknown)
    const sortedItems = [...items].sort(
      (a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)
    )

    const highCount = sortedItems.filter(i => i.priority === 'high').length
    const totalCount = sortedItems.length

    const headerBlocks: unknown[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: `🔔 Circle Morning Briefing — ${today}` },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${totalCount} client${totalCount !== 1 ? 's' : ''} need your attention* · ${highCount} high priority\n_${newPosts.length} new Circle post${newPosts.length !== 1 ? 's' : ''} since yesterday_`,
        },
      },
      { type: 'divider' },
    ]

    // Group by priority
    const grouped = ['high', 'medium', 'low'].map(priority => ({
      priority,
      items: sortedItems.filter(i => i.priority === priority),
    })).filter(g => g.items.length > 0)

    // Fetch saved item IDs so Slack buttons have a real DB id to reference
    const { data: savedItems } = await adminClient
      .from('circle_action_items')
      .select('id, profile_id, action_type')
      .eq('status', 'pending')

    // Map profile_id+action_type → db id for button values
    const savedIdMap = new Map(
      (savedItems ?? []).map(s => [`${s.profile_id}:${s.action_type}`, s.id])
    )

    const itemBlocks: unknown[] = []
    for (const group of grouped) {
      const label = group.priority === 'high' ? '🔴 HIGH PRIORITY' : group.priority === 'medium' ? '🟡 MEDIUM PRIORITY' : '🟢 LOW PRIORITY'
      itemBlocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `*${label}*` },
      })
      for (const item of group.items) {
        const profile = item.profile_id ? profileMap[item.profile_id] : null
        const dbId = savedIdMap.get(`${item.profile_id}:${item.action_type}`) ?? item.profile_id ?? item.circle_member_id ?? 'unknown'
        // For non-client members, use the member_name or circle_member_id as display name
        const displayName = profile?.name
          ?? (item as { member_name?: string }).member_name
          ?? (item.circle_member_id ? memberNameByCircleId.get(item.circle_member_id) : null)
          ?? 'Circle Member'
        const enriched = {
          ...item,
          id: dbId,
          profile_name: displayName,
          profile_ig_username: profile?.ig_username ?? null,
        }
        itemBlocks.push(...buildItemBlocks(enriched))
      }
    }

    // Slack has a 50-block limit per message — send in chunks if needed
    const allBlocks = [...headerBlocks, ...itemBlocks]
    const SLACK_BLOCK_LIMIT = 50

    if (allBlocks.length <= SLACK_BLOCK_LIMIT) {
      await sendSlackMessage(allBlocks, `Circle briefing: ${totalCount} items`)
    } else {
      // Send header first, then items in chunks
      await sendSlackMessage(headerBlocks, `Circle briefing: ${totalCount} items`)
      for (let i = 0; i < itemBlocks.length; i += SLACK_BLOCK_LIMIT) {
        await sendSlackMessage(itemBlocks.slice(i, i + SLACK_BLOCK_LIMIT), '(continued)')
      }
    }

    return NextResponse.json({
      ok: true,
      items_generated: items.length,
      client_items: validItems.length,
      community_member_items: nonClientItems.length,
      db_insert_error: dbInsertError,
      posts_synced: newPosts.length,
      circle_members_fetched: circleMembers.length,
      dashboard_clients: dashboardClients.length,
      clients_matched: clientData.filter(c => c.member).length,
      matched_by_email: clientData.filter(c => c.matchMethod === 'email').length,
      matched_by_name: clientData.filter(c => c.matchMethod === 'name').length,
      comments_fetched: recentComments.length,
      will_member_id: willMemberId,
      will_replied_to_posts: willRepliedMap.size,
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Circle briefing cron error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
