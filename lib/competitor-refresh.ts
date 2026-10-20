import { instagramUsername } from './instagram-statistics'

/** Accept a handle or an Instagram profile URL, never arbitrary provider input. */
export function competitorUsername(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const input = value.trim()
  if (!/^(https?:\/\/)?(www\.)?instagram\.com\//i.test(input)) return instagramUsername(input)
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : 'https://' + input)
    if (!['instagram.com', 'www.instagram.com'].includes(url.hostname.toLowerCase())) return null
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts.length !== 1 || ['p', 'reel', 'reels', 'stories', 'explore'].includes(parts[0].toLowerCase())) return null
    return instagramUsername(parts[0])
  } catch { return null }
}

export interface CompetitorPost {
  ownerUsername?: string
  shortCode?: string
  url?: string
  videoViewCount?: number
  videoPlayCount?: number
  playCount?: number
  likesCount?: number
  commentsCount?: number
  timestamp?: string
  caption?: string
  videoUrl?: string
  displayUrl?: string
  videoDuration?: number
}

/** Collab/provider duplicates must not cause one failed insert for the whole batch. */
export function uniqueCompetitorPosts(posts: CompetitorPost[], handles: string[], cutoff: string): CompetitorPost[] {
  const requested = new Set(handles)
  const unique = new Map<string, CompetitorPost>()
  for (const post of posts) {
    const owner = instagramUsername(post.ownerUsername)
    if (!post.shortCode || !owner || !requested.has(owner)) continue
    if (post.timestamp && (!Number.isFinite(Date.parse(post.timestamp)) || post.timestamp.slice(0, 10) < cutoff)) continue
    const previous = unique.get(post.shortCode)
    unique.set(post.shortCode, { ...previous, ...post, ownerUsername: owner })
  }
  return [...unique.values()]
}

export function competitorReelRow(post: CompetitorPost, format: string, week: string, today: string) {
  // Omit transcript, hook, caption, id and created_at so conflict updates retain
  // already transcribed source material and all existing row references.
  return {
    account: post.ownerUsername!, reel_id: post.shortCode!, scraped_week: week,
    date: post.timestamp ? post.timestamp.slice(0, 10) : today,
    views: post.videoPlayCount ?? post.playCount ?? post.videoViewCount ?? 0,
    likes: post.likesCount ?? 0, comments: post.commentsCount ?? 0,
    format_type: format, duration_sec: post.videoDuration == null ? null : Math.round(post.videoDuration),
    reel_url: post.url ?? null, video_url: post.videoUrl ?? null, thumbnail_url: post.displayUrl ?? null,
  }
}
