const DAY = 86_400_000

export interface LeaderboardProfile {
  id: string
  name: string | null
  ig_username: string | null
}

export interface LeaderboardSnapshot {
  profile_id: string
  date: string
  count: number | null
}

export interface LeaderboardReel {
  profile_id: string
  reel_id: string
  date: string
  views: number | null
}

export interface LeaderboardEntry {
  username: string
  name: string
  isYou: boolean
  rank: number | null
  score: number | null
  postingPoints: number | null
  growthPoints: number | null
  viewPoints: number | null
  followerGrowth: number | null
  growthPercent: number | null
  observedFollowerGrowth: number | null
  postCount: number | null
  previousPostCount: number | null
  activeDays: number | null
  postTypes: Record<string, number>
  topReelShare: number | null
  views: number | null
  reelCount: number
  trackedDays: number
  firstTracked: string | null
  lastSynced: string | null
  status: 'ranked' | 'building_history' | 'needs_sync' | 'waiting_for_reels' | 'syncing' | 'sync_failed'
  syncIssue: 'account_unavailable' | 'account_restricted' | 'retry_needed' | null
}

export interface LeaderboardSync {
  username: string
  sync_date: string
  status: string
  reels_done: boolean
  reel_count: number | null
  last_error: string | null
  posts_done?: boolean
  post_history_complete?: boolean
}

export interface LeaderboardPost {
  profile_id: string
  post_id: string
  posted_at: string
  content_type: string
}

export interface LeaderboardData {
  entries: LeaderboardEntry[]
  viewerExcluded: boolean
  windowStart: string
  windowEnd: string
  rankedCount: number
  connectedCount: number
  totalViews: number
  totalFollowerGrowth: number
  growthReadyCount: number
  totalPosts: number
  postsReadyCount: number
}

/** Public rankings show measured, active creators without changing their accounts. */
export function visibleLeaderboard(data: LeaderboardData): LeaderboardData {
  const visible = data.entries.filter(entry => entry.rank !== null && entry.status === 'ranked'
    && entry.syncIssue === null && (entry.views ?? 0) > 0 && (entry.postCount ?? 0) > 0)
  const visibleUsernames = new Set(visible.map(entry => entry.username))
  const removed = data.entries.filter(entry => entry.rank !== null && !visibleUsernames.has(entry.username))
  // The aggregate also contains the unranked founder accounts. Subtract only
  // removed competitors so both founder pages retain their summary contribution.
  return {
    ...data,
    entries: visible.map((entry, index) => ({ ...entry, rank: index + 1 })),
    rankedCount: visible.length,
    connectedCount: visible.length,
    totalViews: data.totalViews - removed.reduce((sum, entry) => sum + (entry.views ?? 0), 0),
    totalPosts: data.totalPosts - removed.reduce((sum, entry) => sum + (entry.postCount ?? 0), 0),
    postsReadyCount: data.postsReadyCount - removed.filter(entry => entry.postCount !== null).length,
    totalFollowerGrowth: visible.reduce((sum, entry) => sum + (entry.followerGrowth ?? 0), 0),
    growthReadyCount: visible.filter(entry => entry.followerGrowth !== null).length,
    viewerExcluded: data.viewerExcluded || (data.entries.some(entry => entry.isYou) && !visible.some(entry => entry.isYou)),
  }
}

function validNumber(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

// Fixed scoring units preserve the magnitude of a creator's results.
// Publishing gets direct credit; follower bonuses require a full month.
export const LEADERBOARD_POINTS = { perPost: 250, perThousandViews: 1, perFollower: 1.5 } as const

// Both founder accounts contribute to posts/views totals without competing.
const EXCLUDED_ACCOUNTS = new Set(['williamscxtt', 'willscottbiz'])
const SUMMARY_ACCOUNTS = new Set(['williamscxtt', 'willscottbiz'])

export function buildLeaderboard(
  profiles: LeaderboardProfile[],
  snapshots: LeaderboardSnapshot[],
  reels: LeaderboardReel[],
  viewerId: string,
  now = new Date(),
  syncs: LeaderboardSync[] = [],
  posts: LeaderboardPost[] = [],
): LeaderboardData {
  const windowEnd = now.toISOString().slice(0, 10)
  const today = Date.parse(windowEnd)
  const start = today - 29 * DAY
  const windowStart = new Date(start).toISOString().slice(0, 10)
  const growthStart = today - 30 * DAY
  const growthDate = new Date(growthStart).toISOString().slice(0, 10)
  const previousStart = start - 30 * DAY
  const accounts = new Map<string, { profile: LeaderboardProfile; ids: Set<string> }>()
  const usernames = new Map<string, string>()
  let viewerExcluded = false
  for (const profile of profiles) {
    const username = profile.ig_username?.trim().replace(/^@/, '').toLowerCase()
    if (!username || !/^[a-z0-9._]{1,30}$/.test(username)) continue
    if (EXCLUDED_ACCOUNTS.has(username)) {
      if (profile.id === viewerId) viewerExcluded = true
      if (!SUMMARY_ACCOUNTS.has(username)) continue
    }
    const account = accounts.get(username)
    if (account) account.ids.add(profile.id)
    else accounts.set(username, { profile, ids: new Set([profile.id]) })
    usernames.set(profile.id, username)
  }

  const histories = new Map<string, Map<string, number>>()
  for (const snapshot of snapshots) {
    const username = usernames.get(snapshot.profile_id)
    const date = Date.parse(snapshot.date)
    if (!username || !validNumber(snapshot.count) || !Number.isFinite(date) || date > today || date < growthStart) continue
    const history = histories.get(username) ?? new Map<string, number>()
    history.set(snapshot.date.slice(0, 10), snapshot.count)
    histories.set(username, history)
  }

  const accountReels = new Map<string, Map<string, number>>()
  for (const reel of reels) {
    const username = usernames.get(reel.profile_id)
    const date = Date.parse(reel.date)
    if (!username || !reel.reel_id || !validNumber(reel.views) || !Number.isFinite(date) || date < start || date > now.getTime()) continue
    const metrics = accountReels.get(username) ?? new Map<string, number>()
    // The same linked account/reel can exist under an imported and a new profile.
    metrics.set(reel.reel_id, Math.max(metrics.get(reel.reel_id) ?? 0, reel.views))
    accountReels.set(username, metrics)
  }

  const entries: LeaderboardEntry[] = []
  const accountPosts = new Map<string, Map<string, LeaderboardPost>>()
  for (const post of posts) {
    const username = usernames.get(post.profile_id)
    const published = Date.parse(post.posted_at)
    if (!username || !post.post_id || !Number.isFinite(published) || published < previousStart || published > now.getTime()) continue
    const items = accountPosts.get(username) ?? new Map<string, LeaderboardPost>()
    items.set(post.post_id, post)
    accountPosts.set(username, items)
  }
  for (const [username, { profile, ids }] of accounts) {
    const jobs = syncs.filter(job => job.username === username && Date.parse(job.sync_date) <= today)
      .sort((a, b) => b.sync_date.localeCompare(a.sync_date))
    const job = jobs[0]
    const reelSync = jobs.find(item => item.reels_done && Date.parse(item.sync_date) >= today - 7 * DAY)
    const history = [...(histories.get(username)?.entries() ?? [])].sort(([a], [b]) => a.localeCompare(b))
    const baseline = history[0]
    const latest = history.at(-1)
    const observedFollowerGrowth = baseline && latest && latest[0] > baseline[0] ? latest[1] - baseline[1] : null
    const monthlyBaseline = history.find(([date]) => date === growthDate)
    const monthlyLatest = history.find(([date]) => date === windowEnd)
    const followerGrowth = monthlyBaseline && monthlyLatest ? monthlyLatest[1] - monthlyBaseline[1] : null
    const growthPercent = followerGrowth !== null && monthlyBaseline
      ? monthlyBaseline[1] > 0 ? (followerGrowth / monthlyBaseline[1]) * 100 : followerGrowth === 0 ? 0 : null : null
    const metrics = accountReels.get(username)
    // A completed scrape with no recent reels is a measured zero, not missing data.
    const views = metrics?.size ? [...metrics.values()].reduce((sum, value) => sum + value, 0)
      : reelSync?.reel_count === 0 ? 0 : null
    const fresh = !!latest && Date.parse(latest[0]) >= today - 7 * DAY
    const complete = fresh && views !== null
    const postSync = jobs.find(item => item.posts_done && item.post_history_complete && Date.parse(item.sync_date) >= today - 7 * DAY)
    const content = [...(accountPosts.get(username)?.values() ?? [])]
    const currentPosts = content.filter(post => Date.parse(post.posted_at) >= start)
    const postCount = postSync ? currentPosts.length : null
    const previousPostCount = postSync ? content.length - currentPosts.length : null
    const postTypes: Record<string, number> = {}
    if (postSync) for (const post of currentPosts) postTypes[post.content_type] = (postTypes[post.content_type] ?? 0) + 1
    const syncIssue = job?.status === 'failed' ? /\(restricted\)/.test(job.last_error ?? '') ? 'account_restricted'
      : /\(not_found\)/.test(job.last_error ?? '') ? 'account_unavailable' : 'retry_needed' : null
    const status = complete ? 'ranked' : syncIssue ? 'sync_failed'
      : job && ['queued', 'running'].includes(job.status) ? 'syncing'
      : !fresh ? 'needs_sync' : 'waiting_for_reels'
    entries.push({
      username, name: profile.name?.trim() || username, isYou: ids.has(viewerId),
      rank: null, score: null, postingPoints: null, growthPoints: null, viewPoints: null,
      followerGrowth, growthPercent, views, reelCount: metrics?.size ?? 0,
      observedFollowerGrowth, postCount, previousPostCount, postTypes,
      activeDays: postSync ? new Set(currentPosts.map(post => post.posted_at.slice(0, 10))).size : null,
      topReelShare: views && metrics?.size ? Math.max(...metrics.values()) / views : null,
      trackedDays: baseline && latest ? Math.min(30, Math.round((Date.parse(latest[0]) - Date.parse(baseline[0])) / DAY)) : 0,
      firstTracked: baseline?.[0] ?? null, lastSynced: latest?.[0] ?? null, status, syncIssue,
    })
  }

  const ranked = entries.filter(entry => !EXCLUDED_ACCOUNTS.has(entry.username) && entry.status === 'ranked')
  for (const entry of ranked) {
    entry.postingPoints = (entry.postCount ?? 0) * LEADERBOARD_POINTS.perPost
    entry.growthPoints = Math.max(0, entry.followerGrowth ?? 0) * LEADERBOARD_POINTS.perFollower
    entry.viewPoints = entry.views! / 1000 * LEADERBOARD_POINTS.perThousandViews
    entry.score = entry.postingPoints + entry.growthPoints + entry.viewPoints
  }
  ranked.sort((a, b) => b.score! - a.score! || b.views! - a.views! || (b.postCount ?? 0) - (a.postCount ?? 0) || a.username.localeCompare(b.username))
  ranked.forEach((entry, index) => { entry.rank = index + 1 })
  const pending = entries.filter(entry => !EXCLUDED_ACCOUNTS.has(entry.username) && entry.status !== 'ranked').sort((a, b) => a.name.localeCompare(b.name))
  const summary = [...ranked, ...entries.filter(entry => SUMMARY_ACCOUNTS.has(entry.username))]
  return {
    entries: [...ranked, ...pending], viewerExcluded, windowStart, windowEnd,
    rankedCount: ranked.length, connectedCount: ranked.length + pending.length,
    totalViews: summary.reduce((sum, entry) => sum + (entry.views ?? 0), 0),
    totalFollowerGrowth: ranked.reduce((sum, entry) => sum + (entry.followerGrowth ?? 0), 0),
    growthReadyCount: ranked.filter(entry => entry.followerGrowth !== null).length,
    totalPosts: summary.reduce((sum, entry) => sum + (entry.postCount ?? 0), 0),
    postsReadyCount: summary.filter(entry => entry.postCount !== null).length,
  }
}
