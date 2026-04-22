import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { getAllCircleMembers, getPostsSince } from '@/lib/circle-api'
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

    const [newPosts, circleMembers] = await Promise.all([
      getPostsSince(since),
      getAllCircleMembers(),
    ])

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

    // Build per-client blocks
    const postsByEmail = new Map<string, typeof recentPostRows>()
    for (const post of recentPostRows ?? []) {
      const email = post.member_email?.toLowerCase()
      if (!email) continue
      const existing = postsByEmail.get(email) ?? []
      existing.push(post)
      postsByEmail.set(email, existing)
    }

    const clientBlocks = clientData.map(({ client, member, matchMethod, daysSinceActive }) => {
      // Look up posts by Circle member email (if matched) OR dashboard email
      const lookupEmail = member?.email?.toLowerCase() ?? client.email?.toLowerCase() ?? ''
      const posts = lookupEmail ? postsByEmail.get(lookupEmail) ?? [] : []
      const postLines = posts.slice(0, 6).map(p => {
        const daysAgo = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000)
        const snippet = (p.body ?? '').slice(0, 300).replace(/\n+/g, ' ')
        return `  • [${daysAgo}d ago] "${p.title}": ${snippet}`
      }).join('\n')

      const circleStatus = member
        ? `Matched (${matchMethod}) | Last seen ${daysSinceActive ?? '?'} days ago | ${member.posts_count ?? 0} total posts | ${member.comments_count ?? 0} comments`
        : 'NOT MATCHED IN CIRCLE'

      const bioContext = toText(client.dashboard_bio ?? client.intro_insights ?? '')
      const callContext = client.call_transcripts ? `\nCall notes: ${toText(client.call_transcripts).slice(0, 400)}` : ''

      return `---
CLIENT: ${client.name ?? 'Unknown'} | ID: ${client.id}
Instagram: ${client.ig_username ? '@' + client.ig_username : 'n/a'} | Niche: ${client.niche ?? 'unknown'}
Phase: ${client.coaching_phase ?? 'unknown'} | 90-day goal: ${client.ninety_day_goal ?? 'not set'}
Challenge: ${client.biggest_challenge ?? 'not set'}${bioContext ? `\nBackground: ${bioContext.slice(0, 300)}` : ''}${callContext}
Circle: ${circleStatus}
Recent Circle posts (last 30d):
${postLines || '  (none)'}
---`
    }).join('\n\n')

    // Knowledge base context
    const kbContext = (knowledgeDocs ?? []).map(d =>
      `[${d.category} — ${d.source}] ${d.title}:\n${d.content.slice(0, 600)}`
    ).join('\n\n---\n\n')

    // Historical themes (just titles + snippets to save tokens)
    const historicalContext = (historicalPosts ?? []).slice(0, 100).map(p => {
      const daysAgo = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000)
      return `[${daysAgo}d ago, ${p.member_email}] "${p.title}": ${(p.body ?? '').slice(0, 150)}`
    }).join('\n')

    const systemPrompt = `You are Will Scott's AI client success coach. Will runs a high-ticket Instagram growth coaching programme. He has a Circle community where his clients post, ask questions, share wins, and work through challenges together.

Your job: every morning, give Will a precise, expert briefing on what his clients need — who to reach out to, why, and exactly what to say. Your advice must be expert-level, drawing on Will's coaching frameworks, specific client situations, and patterns from the community. Never write generic advice.

## Will's Coaching Knowledge Base

${kbContext}

## Historical Community Patterns (older Circle posts)

${historicalContext}`

    const userPrompt = `Today is ${today}.

## Current Client Data + Recent Circle Activity

${clientBlocks}

## New posts since last briefing (for context)
${(newPosts ?? []).slice(0, 20).map(p => `- [${p.user_name}] "${p.name}" (${p.space_name}): ${p.body_plain_text.slice(0, 200)}`).join('\n')}

## Your Task

Generate a morning briefing for Will. Produce up to 12 action items — be ruthlessly specific, not generic.

For each item:
- Reference the client's ACTUAL goal, challenge, niche, and what they've been posting about
- Draw on the knowledge base to give expert, specific advice or talking points in the draft message
- If a client mentioned a specific struggle, address it directly — quote what they said, then give a concrete answer
- For Circle post replies: write the actual reply Will should post (expert coaching voice, warm, direct)
- For DM check-ins: write the Instagram DM (casual, 3-4 sentences, reference something specific, never generic)
- Cross-reference: if a similar question was answered before in the community, reference that pattern

Priority rules:
- DORMANT 14+ days = high (especially if they were struggling before they went quiet)
- NEEDS HELP (posted a question/problem) = high
- WIN to celebrate = medium (always respond, builds culture)
- QUIET 7-14 days = medium
- THRIVING (< 3 days, posting regularly, no problems) = skip

Return ONLY a JSON array. No markdown, no preamble:
[
  {
    "profile_id": "uuid",
    "circle_member_id": "number as string or null",
    "circle_post_id": "post id as string for replies, or null for DMs",
    "action_type": "check_in_quiet|check_in_dormant|celebrate_win|address_problem|respond_intro|follow_up_goal",
    "priority": "high|medium|low",
    "reason": "one sentence — specific reason this needs action today",
    "context_quote": "the relevant post snippet, or 'Last seen X days ago'",
    "draft_message": "complete ready-to-use message — expert, specific, no placeholders"
  }
]`

    // ── 6. Claude Sonnet call ──────────────────────────────────────────────
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 6000,
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
      // Sample for debugging — first 5 Circle member emails vs first 5 dashboard client emails
      sample_circle_emails: circleMembers.slice(0, 5).map(m => m.email),
      sample_client_emails: dashboardClients.slice(0, 5).map(c => c.email),
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Circle briefing cron error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
