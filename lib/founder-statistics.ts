// Exact owner identities keep another member's chosen handle from granting
// access to the founder's combined statistics.
export const FOUNDER_ACCOUNTS = [
  { id: '251e7513-60dc-4a17-82cd-77e59c886b00', username: 'willscottbiz' },
  { id: 'f82d3515-203d-493a-8894-7b5683d36536', username: 'williamscxtt' },
] as const

export interface FounderStatistics {
  reels: { reel_id: string; date: string; views: number | null }[]
  posts: { post_id: string; posted_at: string }[]
  viewsReady: boolean
  postsReady: boolean
  measuredAt: string
}

export function founderProfileIds(profileId: string, profiles: { id: string; ig_username: string | null }[]) {
  if (!FOUNDER_ACCOUNTS.some(account => account.id === profileId)) return []
  return FOUNDER_ACCOUNTS.filter(account => profiles.some(profile => profile.id === account.id
    && profile.ig_username?.trim().replace(/^@/, '').toLowerCase() === account.username)).map(account => account.id)
}

export function founderOverview(statistics: FounderStatistics, days: number) {
  const end = Date.parse(statistics.measuredAt)
  const start = end - days * 86_400_000
  const previousStart = start - days * 86_400_000
  const reels = new Map<string, FounderStatistics['reels'][number]>()
  for (const reel of statistics.reels) {
    if (!reel.reel_id || reel.views === null || !Number.isFinite(reel.views) || reel.views < 0) continue
    const previous = reels.get(reel.reel_id)
    if (!previous || reel.views > previous.views!) reels.set(reel.reel_id, reel)
  }
  const current = [...reels.values()].filter(reel => Date.parse(reel.date) >= start && Date.parse(reel.date) < end)
  const previous = [...reels.values()].filter(reel => Date.parse(reel.date) >= previousStart && Date.parse(reel.date) < start)
  const sum = (items: typeof current) => items.reduce((total, reel) => total + reel.views!, 0)
  const views = statistics.viewsReady ? sum(current) : null
  const previousViews = statistics.viewsReady ? sum(previous) : null
  const posts = new Map(statistics.posts.filter(post => post.post_id).map(post => [post.post_id, post]))
  const count = (from: number, to: number) => [...posts.values()].filter(post => Date.parse(post.posted_at) >= from && Date.parse(post.posted_at) < to).length
  // Daily feed coverage is 60 days; never present a partial year as complete.
  const postsReady = statistics.postsReady && days <= 30
  return { views, previousViews, posts: postsReady ? count(start, end) : null,
    previousPosts: postsReady ? count(previousStart, start) : null,
    spark: current.sort((a, b) => a.date.localeCompare(b.date)).map(reel => reel.views!) }
}
