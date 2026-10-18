import type { ActivityContext, AskWillIntent } from './types'

const MAX_FIELD = 700

function clean(value: unknown, max = MAX_FIELD): string {
  if (value === null || value === undefined) return ''
  const text = String(value).replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function number(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function structured(profile: Record<string, unknown>): Record<string, unknown> {
  const value = profile.intro_structured
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function first(profile: Record<string, unknown>, ...keys: string[]): string {
  const intro = structured(profile)
  for (const key of keys) {
    const value = clean(intro[key] ?? profile[key])
    if (value) return value
  }
  return ''
}

function push(lines: string[], label: string, value: unknown) {
  const text = clean(value)
  if (text) lines.push(`${label}: ${text}`)
}

function formatReels(reels: Array<Record<string, unknown>>, limit = 6): string[] {
  return reels.slice(0, limit).map(reel => {
    const hook = clean(reel.hook, 220) || 'Untitled reel'
    const format = clean(reel.format_type, 80)
    const views = number(reel.views)
    const pillar = clean(reel.content_pillar, 80)
    return `- ${hook}${format ? ` [${format}]` : ''}${views !== null ? `, ${views.toLocaleString('en-GB')} views` : ''}${pillar ? `, pillar: ${pillar}` : ''}`
  })
}

export function buildMemberContext(
  profile: Record<string, unknown>,
  activity: ActivityContext,
  intent: AskWillIntent,
  memories: Array<Record<string, unknown>> = [],
  conversationSummary = '',
): string {
  const lines: string[] = ['MEMBER CONTEXT', `Relevant intent: ${intent}`]
  push(lines, 'Name', profile.name)
  push(lines, 'Instagram', profile.ig_username)
  push(lines, 'Niche', first(profile, 'specific_niche', 'niche'))
  push(lines, 'Ideal client', first(profile, 'ideal_client', 'target_audience'))
  push(lines, 'Transformation', first(profile, 'client_transformation', 'transformation'))
  push(lines, 'Offer or method', first(profile, 'unique_mechanism', 'framework', 'offer'))
  push(lines, 'Current challenge', first(profile, 'biggest_problem', 'biggest_challenge'))
  push(lines, '90-day goal', first(profile, 'goal_90_days', 'ninety_day_goal'))

  if (intent === 'sales' || intent === 'offer') {
    push(lines, 'Current revenue', first(profile, 'monthly_revenue', 'starting_revenue'))
    push(lines, 'Revenue goal', first(profile, 'revenue_goal', 'ninety_day_revenue_goal'))
    push(lines, 'What they tried', first(profile, 'what_tried_before'))
  }

  if (intent === 'content' || intent === 'positioning' || intent === 'stories') {
    push(lines, 'Content angle', first(profile, 'content_angle'))
    push(lines, 'Member voice', first(profile, 'brand_voice', 'voice'))
    push(lines, 'Content style', first(profile, 'content_style'))
    push(lines, 'Hook style', first(profile, 'hook_style'))
  }

  if (activity.reels.length && (intent === 'content' || intent === 'positioning')) {
    lines.push('', 'Relevant recent or high-performing reels:', ...formatReels(activity.reels))
  }

  if (activity.competitorReels.length && intent === 'content') {
    lines.push('', 'Tracked reference reels:')
    lines.push(...activity.competitorReels.slice(0, 4).map(reel => {
      const account = clean(reel.account, 80)
      const hook = clean(reel.hook, 220)
      const views = number(reel.views)
      return `- ${account ? `@${account}: ` : ''}${hook}${views !== null ? `, ${views.toLocaleString('en-GB')} views` : ''}`
    }))
  }

  if (activity.audits.length && (intent === 'content' || intent === 'positioning')) {
    lines.push('', 'Recent profile audit evidence:')
    lines.push(...activity.audits.slice(0, 3).map(audit => `- ${clean(audit.verdict, 260)}${number(audit.overall_score) !== null ? `, score ${number(audit.overall_score)}/10` : ''}`))
  }

  if (activity.stories.length && intent === 'stories') {
    lines.push('', 'Recent Story work:')
    lines.push(...activity.stories.slice(0, 5).map(story => `- ${clean(story.sequence_type, 100)}${clean(story.day_of_week, 40) ? ` on ${clean(story.day_of_week, 40)}` : ''}`))
  }

  if (activity.sales.length && (intent === 'sales' || intent === 'offer')) {
    lines.push('', 'Relevant sales activity:')
    lines.push(...activity.sales.slice(0, 6).map(sale => {
      const stage = clean(sale.stage, 80) || 'stage unknown'
      const source = clean(sale.source, 100)
      const deal = number(sale.deal_value)
      return `- ${stage}${source ? ` from ${source}` : ''}${deal !== null ? `, £${deal.toLocaleString('en-GB')}` : ''}`
    }))
  }

  const activeMemories = memories
    .filter(memory => memory.status === 'active')
    .slice(0, 12)
    .map(memory => `- ${clean(memory.kind, 50)}: ${clean(memory.value, 300)}`)
  if (activeMemories.length) lines.push('', 'Confirmed long-term memory:', ...activeMemories)
  if (conversationSummary.trim()) lines.push('', `Conversation summary: ${clean(conversationSummary, 1200)}`)

  lines.push('', 'Use only the context that materially improves this answer. Do not force irrelevant facts into the reply.')
  return lines.join('\n')
}
