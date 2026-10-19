import { createHash } from 'node:crypto'
import type { LeaderboardData } from './leaderboard'

export interface LeaderboardInsight { username: string; title: string; text: string; takeaway: string }
export interface LeaderboardInsights { items: LeaderboardInsight[]; generatedAt: string }

export function leaderboardInsightFacts(data: LeaderboardData) {
  return data.entries.filter(entry => entry.rank !== null).slice(0, 3).map(entry => ({
    // Only public Instagram handles and scraped/derived public statistics go
    // to the model. Member names and community rank are not part of its input.
    username: entry.username,
    posts: entry.postCount, previousPosts: entry.previousPostCount,
    postChange: entry.postCount !== null && entry.previousPostCount !== null ? entry.postCount - entry.previousPostCount : null,
    activePostingDays: entry.activeDays, postTypes: entry.postTypes,
    reelViews: entry.views, reels: entry.reelCount, largestReelShareOfViews: entry.topReelShare,
    recordedViewsPerReel: entry.reelCount ? Math.round((entry.views ?? 0) / entry.reelCount) : null,
    postsPerActiveDay: entry.postCount !== null && entry.activeDays ? Math.round(entry.postCount / entry.activeDays * 10) / 10 : null,
    monthlyNetFollowers: entry.followerGrowth,
    followerHistoryComplete: entry.followerGrowth !== null,
  }))
}

export function insightFingerprint(data: LeaderboardData) {
  return createHash('sha256').update(JSON.stringify({ version: 'actionable-v2', date: data.windowEnd, creators: leaderboardInsightFacts(data) })).digest('hex')
}

export function validateLeaderboardInsights(value: unknown, data: LeaderboardData): LeaderboardInsight[] {
  const creators = leaderboardInsightFacts(data)
  if (!Array.isArray(value) || value.length !== creators.length) throw new Error('Incomplete leaderboard insight')
  const takeaways = new Set<string>()
  return creators.map(creator => {
    const matches = value.filter(item => item && item.username === creator.username)
    if (matches.length !== 1) throw new Error('Insight creator mismatch')
    const item = matches[0]
    if (typeof item.title !== 'string' || typeof item.text !== 'string' || typeof item.takeaway !== 'string'
      || !item.title.trim() || !item.text.trim() || item.takeaway.trim().split(/\s+/).length < 10
      || item.title.length > 90 || item.text.length > 600 || item.takeaway.length > 450
      || /[\d£$€%]/.test(item.title + item.text + item.takeaway)
      || /\b(proves?|guarantees?|caused|doubled|tripled)\b/i.test(item.text + ' ' + item.takeaway)) throw new Error('Unsupported insight claim')
    const prose = item.title + ' ' + item.text + ' ' + item.takeaway
    if (/\b(keep publishing|keep posting|keep testing|post consistently|stay consistent)\b/i.test(prose)) throw new Error('Generic leaderboard advice')
    if (!creator.followerHistoryComplete && /\b(followers?|converts?|converting|conversion|audience growth|audience grew)\b/i.test(prose)) throw new Error('Unverified follower conversion claim')
    const takeaway = item.takeaway.trim().toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ')
    if (takeaways.has(takeaway)) throw new Error('Repeated leaderboard takeaway')
    takeaways.add(takeaway)
    return { username: creator.username, title: item.title.trim(), text: item.text.trim(), takeaway: item.takeaway.trim() }
  })
}
