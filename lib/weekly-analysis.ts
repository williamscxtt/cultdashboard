export type WeeklyReel = {
  reel_id: string; date: string; views: number | null; likes: number | null; comments: number | null
  saves: number | null; format_type: string | null; hook: string | null; caption: string | null
}
export type WeeklyPost = { post_id: string; posted_at: string; content_type: string }
export type WeeklySync = { status: string; completed_at: string | null; posts_done: boolean; post_history_complete: boolean }
export type WeeklyEvidence = {
  start: string; end: string; previous_start: string; source: 'ready' | 'syncing' | 'partial' | 'unavailable'
  stats_as_of: string | null; posts: WeeklyPost[]; previous_posts: WeeklyPost[]; reels: WeeklyReel[]
  previous_reels: WeeklyReel[]; active_days: number; types: Record<string, number>
}
export type WeeklyAnalysisReport = {
  what_worked: string; what_to_improve: string; this_week: string
  _meta: { version: 3; input_key: string; generated_at: string; period_start: string; period_end: string
    source: WeeklyEvidence['source']; stats_as_of: string | null; post_count: number; reel_count: number; active_days: number; ai: boolean }
}

export function weeklyWindow(now: Date) {
  const end = now.toISOString().slice(0, 10)
  const midnight = Date.parse(`${end}T00:00:00Z`)
  return { start: new Date(midnight - 6 * 86400000).toISOString().slice(0, 10), end,
    previous_start: new Date(midnight - 13 * 86400000).toISOString().slice(0, 10) }
}

/** Published dates drive the week; scrape dates and old pinned posts do not. */
export function weeklyEvidence(input: { now: Date; posts: WeeklyPost[]; reels: WeeklyReel[]; sync: WeeklySync | null; queryFailed?: boolean; truncated?: boolean }): WeeklyEvidence {
  const window = weeklyWindow(input.now)
  const posts = new Map<string, WeeklyPost>()
  const inWindow = (day: string) => day >= window.previous_start && day <= window.end
  const validDay = (value: string) => {
    const time = Date.parse(value)
    return Number.isFinite(time) ? new Date(time).toISOString().slice(0, 10) : ''
  }
  for (const reel of input.reels) {
    const day = validDay(reel.date)
    if (day && inWindow(day)) posts.set(reel.reel_id, { post_id: reel.reel_id, posted_at: day, content_type: 'reel' })
  }
  for (const post of input.posts) {
    const day = validDay(post.posted_at)
    if (day && inWindow(day)) posts.set(post.post_id, { ...post, posted_at: day })
  }
  const all = [...posts.values()].sort((a,b) => a.post_id.localeCompare(b.post_id))
  const current = all.filter(post => post.posted_at >= window.start)
  const currentReels = input.reels.filter(reel => validDay(reel.date) >= window.start && validDay(reel.date) <= window.end).sort((a,b) => a.reel_id.localeCompare(b.reel_id))
  const previousReels = input.reels.filter(reel => validDay(reel.date) >= window.previous_start && validDay(reel.date) < window.start).sort((a,b) => a.reel_id.localeCompare(b.reel_id))
  const syncedAt = input.sync?.completed_at ?? null
  const age = syncedAt ? input.now.getTime() - Date.parse(syncedAt) : Infinity
  const fresh = age >= 0 && age <= 36 * 3600000
  const source = input.queryFailed || input.truncated ? 'unavailable'
    : ['queued','running'].includes(input.sync?.status ?? '') ? 'syncing'
    : input.sync?.status === 'succeeded' && input.sync.posts_done && input.sync.post_history_complete && fresh ? 'ready' : 'partial'
  const types: Record<string,number> = { reel:0, carousel:0, photo:0 }
  for (const post of current) types[post.content_type] = (types[post.content_type] ?? 0) + 1
  return { ...window, source, stats_as_of: syncedAt, posts: current, previous_posts: all.filter(post => post.posted_at < window.start),
    reels: currentReels, previous_reels: previousReels, active_days: new Set(current.map(post => post.posted_at)).size, types }
}

export function analysisSections(value: unknown): { what_worked: string; what_to_improve: string; this_week: string } | null {
  if (!value || typeof value !== 'object') return null
  const report = value as Record<string,unknown>
  const keys = ['what_worked','what_to_improve','this_week'] as const
  if (keys.some(key => typeof report[key] !== 'string' || !(report[key] as string).trim() || (report[key] as string).length > 1000)) return null
  // Empty caches must never become a judgement about the creator's effort.
  const text = keys.map(key => report[key]).join(' ')
  if (/you (?:posted (?:zero|no|0)|haven['’]t posted|didn['’]t post)|no data to analy[sz]e|zero (?:reels|posts) means|production failure|non.negotiable/i.test(text)) return null
  return Object.fromEntries(keys.map(key => [key, report[key]])) as { what_worked: string; what_to_improve: string; this_week: string }
}

export function cachedWeeklyAnalysis(raw: unknown, key: string): WeeklyAnalysisReport | null {
  if (typeof raw !== 'string') return null
  try {
    const report = JSON.parse(raw) as WeeklyAnalysisReport
    if (report._meta?.version !== 3 || report._meta.input_key !== key || !analysisSections(report)) return null
    return report
  } catch { return null }
}

/** Numbers and ranks come from code. The model supplies a qualitative test,
 * never fabricated calculations or age-confounded performance claims. */
export function weeklyCommentary(value: unknown) {
  const sections = analysisSections(value)
  if (!sections) return null
  const text = Object.values(sections).join(' ')
  if (/\d|declin|dropped|plummet|outperform|highest|lowest|averaged|conversion intent|drove engagement|generated (?:leads|sales)|caused/i.test(text)) return null
  return sections
}

export function weeklyFactLead(evidence: WeeklyEvidence) {
  const top = [...evidence.reels].filter(reel => reel.views !== null).sort((a,b) => (b.views ?? 0)-(a.views ?? 0))[0]
  return `${evidence.posts.length} posts are tracked across ${evidence.active_days} of the last 7 days.${top ? ` Your leading recorded Reel${top.format_type ? ` is labelled ${top.format_type.replace(/_/g,' ')} and` : ''} has ${top.views!.toLocaleString('en-GB')} plays.` : ''}`
}

/** Deterministic waiting/fallback text never interprets absent data as absent posting. */
export function weeklyFallback(evidence: WeeklyEvidence) {
  if (evidence.source === 'unavailable') return {
    what_worked: 'Your saved weekly statistics could not be verified, so a performance assessment is temporarily unavailable.',
    what_to_improve: 'There is not enough verified data to judge your posting or content performance.',
    this_week: 'Refresh this page to reload your saved statistics. Your existing content remains available.',
  }
  if (!evidence.posts.length) return {
    what_worked: 'No recent posts are showing in the saved data yet. This does not mean you have not been posting.',
    what_to_improve: evidence.source === 'syncing' ? 'Your Instagram statistics are still syncing. The analysis will update when they arrive.'
      : 'Your recent posting activity needs to be verified before it can be assessed.',
    this_week: 'Check the connected Instagram username and refresh your statistics if you have posted recently.',
  }
  const count = evidence.posts.length
  const top = [...evidence.reels].filter(reel => reel.views !== null).sort((a,b) => (b.views ?? 0)-(a.views ?? 0))[0]
  return {
    what_worked: `${count} posts are tracked across ${evidence.active_days} of the last 7 days, including ${evidence.types.reel} Reels and ${evidence.types.carousel} carousels.${top ? ` Your leading recorded Reel has ${top.views!.toLocaleString('en-GB')} plays.` : ''}`,
    what_to_improve: evidence.source === 'syncing' ? 'Your statistics are still updating. A specific content assessment will replace this summary once the sync completes.'
      : evidence.source === 'partial' ? 'These are the posts captured in your saved statistics. A current complete sync is needed before comparing this week with the previous week.'
      : 'Review the strongest Reel alongside a lower-performing one and compare their opening, topic and call to action. The numbers alone do not establish why one performed better.',
    this_week: top ? 'Use Analyse on your leading Reel to inspect its hook, then test one change to that approach in a new post.' : 'Review the opening and message of a recent post before choosing your next content test.',
  }
}
