import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { getAllCircleMembers, getRecentPosts } from '@/lib/circle-api'
import type { Profile } from '@/lib/types'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface GeneratedItem {
  profile_id: string
  circle_member_id: string
  circle_post_id: string | null
  action_type: string
  priority: string
  reason: string
  context_quote: string
  draft_message: string
}

export async function POST() {
  // ── Auth check ────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (adminProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── Step 1: Fetch dashboard clients ───────────────────────────────────────
  const { data: clients } = await adminClient
    .from('profiles')
    .select('id, name, email, coaching_phase, ninety_day_goal, biggest_challenge, ig_username')
    .eq('role', 'client')
    .eq('is_active', true)
    .not('email', 'is', null)

  const dashboardClients = (clients ?? []) as Profile[]
  if (dashboardClients.length === 0) {
    return NextResponse.json({ error: 'No active clients found' }, { status: 400 })
  }

  // ── Step 2: Fetch Circle data in parallel ─────────────────────────────────
  let circleMembers: Awaited<ReturnType<typeof getAllCircleMembers>> = []
  let recentPosts: Awaited<ReturnType<typeof getRecentPosts>> = []

  try {
    ;[circleMembers, recentPosts] = await Promise.all([
      getAllCircleMembers(),
      getRecentPosts(14),
    ])
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Circle API error'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  // ── Step 3: Match Circle members to dashboard clients by email ────────────
  const membersByEmail = new Map(circleMembers.map(m => [m.email?.toLowerCase(), m]))
  const postsByMemberId = new Map<number, typeof recentPosts>()
  for (const post of recentPosts) {
    const existing = postsByMemberId.get(post.user_id) ?? []
    existing.push(post)
    postsByMemberId.set(post.user_id, existing)
  }

  interface ClientContext {
    client: Profile
    member: (typeof circleMembers)[0] | null
    posts: typeof recentPosts
    daysSinceActive: number | null
  }

  const clientContexts: ClientContext[] = dashboardClients.map(client => {
    const member = client.email ? membersByEmail.get(client.email.toLowerCase()) ?? null : null
    const posts = member ? (postsByMemberId.get(member.id) ?? []) : []
    const daysSinceActive = member?.last_seen_at
      ? Math.floor((Date.now() - new Date(member.last_seen_at).getTime()) / 86400000)
      : null
    return { client, member, posts, daysSinceActive }
  })

  // ── Step 4: Upsert circle_activity_cache ──────────────────────────────────
  const cacheRows = clientContexts
    .filter(c => c.member !== null)
    .map(({ client, member, posts }) => ({
      profile_id: client.id,
      circle_member_id: String(member!.id),
      last_seen_at: member!.last_seen_at,
      posts_count: member!.posts_count ?? 0,
      comments_count: member!.comments_count ?? 0,
      gamification_points: member!.gamification_stats?.points ?? 0,
      circle_headline: member!.headline ?? null,
      circle_profile_url: member!.profile_url ?? null,
      recent_post_titles: posts.slice(0, 5).map(p => p.name),
      recent_post_bodies: posts.slice(0, 5).map(p => (p.body_plain_text ?? '').slice(0, 300)),
      synced_at: new Date().toISOString(),
    }))

  if (cacheRows.length > 0) {
    await adminClient
      .from('circle_activity_cache')
      .upsert(cacheRows, { onConflict: 'profile_id' })
  }

  // ── Step 5: Build Claude Sonnet prompt ────────────────────────────────────
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const matchedClients = clientContexts.filter(c => c.member !== null)
  const unmatchedClients = clientContexts.filter(c => c.member === null)

  const clientBlocks = matchedClients.map(({ client, member, posts, daysSinceActive }) => {
    const postLines = posts.slice(0, 5).map(p => {
      const daysAgo = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000)
      const snippet = (p.body_plain_text ?? '').slice(0, 250).replace(/\n/g, ' ')
      return `  - "${p.name}" (${daysAgo}d ago): ${snippet}`
    }).join('\n')

    return `---
Client: ${client.name ?? 'Unknown'} | profile_id: ${client.id} | circle_member_id: ${member!.id}
IG: ${client.ig_username ? '@' + client.ig_username : 'n/a'} | Phase: ${client.coaching_phase ?? 'unknown'}
Goal: ${client.ninety_day_goal ?? 'not set'} | Challenge: ${client.biggest_challenge ?? 'not set'}
Circle: Last seen ${daysSinceActive ?? '?'} days ago | Total posts: ${member!.posts_count ?? 0} | Comments: ${member!.comments_count ?? 0}
${posts.length > 0 ? `Recent posts (last 14 days):\n${postLines}` : 'No posts in last 14 days.'}
---`
  }).join('\n\n')

  const unmatchedBlock = unmatchedClients.length > 0
    ? `\n\n## Clients not found in Circle (no email match)\n${unmatchedClients.map(c => `- ${c.client.name ?? 'Unknown'} (${c.client.email ?? 'no email'})`).join('\n')}`
    : ''

  const systemPrompt = `You are Will Scott's AI client success manager. Will is a high-ticket Instagram growth coach who runs a coaching community on Circle.

Today is ${today}. You have access to data about Will's ${matchedClients.length} active coaching clients and their Circle community activity over the last 14 days.

Generate a prioritised list of action items for Will to work through this morning. Each item should tell Will:
- Who to contact and why
- The full message to send (drafted in Will's voice — direct, real, no fluff, not overly formal)

Will's voice: casual, encouraging, punchy. He speaks like a peer not a boss. Uses short sentences. References specific details. Never says "just checking in" without a reason.`

  const userPrompt = `## Dashboard Clients + Circle Activity

${clientBlocks}${unmatchedBlock}

## Your Task

Generate a prioritised action item list for Will. Rules:
- Dormant (14+ days no activity) = ALWAYS high priority
- Struggling/asking for help = high priority
- Posted a win/milestone = medium priority (always respond, even if active)
- Quiet 7–14 days = medium priority
- Thriving (< 3 days, active) = skip unless they posted something worth responding to
- Max 15 items — be ruthless about priority
- Draft messages must reference the client's ACTUAL goal, challenge, or post content — no generics
- For Circle post replies: write a reply you'd post in the community thread (warm, helpful, specific)
- For DMs: write a casual Instagram DM (3–4 sentences max, conversational)

Return ONLY a valid JSON array. No markdown, no explanation. Schema:
[
  {
    "profile_id": "uuid string",
    "circle_member_id": "number as string",
    "circle_post_id": "post id as string, or null",
    "action_type": "check_in_quiet|check_in_dormant|celebrate_win|address_problem|respond_intro|follow_up_goal",
    "priority": "high|medium|low",
    "reason": "one sentence — why Will needs to act now",
    "context_quote": "relevant post snippet, or 'Last seen X days ago'",
    "draft_message": "full ready-to-send message in Will's voice"
  }
]`

  // ── Step 6: Claude Sonnet call ────────────────────────────────────────────
  let items: GeneratedItem[] = []
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })
    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
    // Strip any accidental markdown fences
    const jsonStr = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
    items = JSON.parse(jsonStr) as GeneratedItem[]
    if (!Array.isArray(items)) throw new Error('Response was not an array')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Claude error'
    return NextResponse.json({ error: `AI generation failed: ${msg}` }, { status: 500 })
  }

  // ── Step 7: Delete old pending items, insert new ──────────────────────────
  await adminClient
    .from('circle_action_items')
    .delete()
    .eq('status', 'pending')

  if (items.length > 0) {
    const insertRows = items.map(item => ({
      profile_id: item.profile_id || null,
      circle_member_id: item.circle_member_id || null,
      circle_post_id: item.circle_post_id || null,
      action_type: item.action_type,
      priority: item.priority,
      reason: item.reason,
      context_quote: item.context_quote || null,
      draft_message: item.draft_message,
      status: 'pending',
      generated_at: new Date().toISOString(),
    }))

    await adminClient
      .from('circle_action_items')
      .insert(insertRows)
  }

  return NextResponse.json({
    items_generated: items.length,
    clients_synced: cacheRows.length,
    clients_unmatched: unmatchedClients.length,
  })
}
