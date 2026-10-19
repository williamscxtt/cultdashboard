export function instagramUsername(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const username = value.trim().replace(/^@/, '').toLowerCase()
  return /^[a-z0-9._]{1,30}$/.test(username) ? username : null
}

export function statistic(item: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = item[key]
    if (value === null || value === undefined || value === '') continue
    if (typeof value !== 'number' && typeof value !== 'string') continue
    const number = Number(value)
    if (Number.isSafeInteger(number) && number >= 0 && number <= 2147483647) return number
  }
}

export function statisticsWindow(date: string, days = 30): string {
  const start = new Date(`${date}T00:00:00.000Z`)
  start.setUTCDate(start.getUTCDate() - (days - 1))
  return start.toISOString()
}

/** Preserve the complete stored history and recheck an overlap when adding daily posts. */
export function statisticsPostRefreshStart(date: string, previousCompleteDate?: string | null): string {
  if (!hasRecentCompleteHistory(date, previousCompleteDate)) return statisticsWindow(date, 60)
  return statisticsWindow(previousCompleteDate!, 3)
}

/** New accounts still need Reel-tab history that is absent from the profile grid. */
export function statisticsReelRefreshStart(date: string, previousCompleteDate?: string | null): string {
  return statisticsWindow(date, hasRecentCompleteHistory(date, previousCompleteDate) ? 30 : 60)
}

function hasRecentCompleteHistory(date: string, previousCompleteDate?: string | null): boolean {
  const previous = previousCompleteDate && new Date(`${previousCompleteDate}T00:00:00.000Z`).getTime()
  const current = new Date(`${date}T00:00:00.000Z`).getTime()
  return Boolean(previous && Number.isFinite(previous) && previous <= current && current - previous <= 7 * 86400000)
}

/** The profile read includes up to 12 feed posts. Reuse them only when the
 * trailing chronological page reaches the requested boundary, or includes
 * every published feed post. Old pinned posts at the front are not proof. */
export function profilePostCache(items: Record<string, unknown>[], username: string, start: string, end: string): Record<string, unknown>[] | null {
  const profile = items.find(item => instagramUsername(item.username) === username)
  if (!profile || !Array.isArray(profile.latestPosts)) return null
  const posts = profile.latestPosts as Record<string, unknown>[]
  const count = statistic(profile, ['postsCount'])
  if (!posts.length) return count === 0 ? [] : null
  if (posts.some(post => !post || typeof post !== 'object' || !post.shortCode || !Number.isFinite(Date.parse(String(post.timestamp))))) return null
  if (new Set(posts.map(post => post.shortCode)).size !== posts.length) return null
  const allPosts = count === posts.length
  // Instagram places pinned posts at the front. Require a full page and a
  // chronological tail so an old pin cannot hide a truncated recent page.
  const tail = posts.slice(3).map(post => Date.parse(String(post.timestamp)))
  const reachesBoundary = posts.length >= 12 && tail.length > 1
    && tail.every((date, index) => index === 0 || date <= tail[index - 1])
    && tail.at(-1)! <= Date.parse(start)
  if (!allPosts && !reachesBoundary) return null
  const cached = posts.map(post => ({ ...post, inputUrl: `https://www.instagram.com/${username}/` }))
  statisticsPosts(cached, username, start, end)
  return cached
}

/** Repeating a paid scan cannot unlock a private/restricted or missing profile.
 * Recheck it on the next daily job; transient or partial errors still retry. */
export function terminalInstagramData(items: Record<string, unknown>[]): boolean {
  return items.length > 0 && items.every(item => item.error === 'not_found'
    || item.error === 'Restricted profile' || item.isRestrictedProfile === true
    || item.error === 'private_profile')
}

export function statisticsPosts(items: Record<string, unknown>[], username: string, start: string, end: string) {
  if (items.some(item => item.error && item.error !== 'no_items')) throw new Error(`Instagram post data is unavailable${providerError(items)}`)
  const posts = new Map<string, { post_id: string; posted_at: string; content_type: string }>()
  for (const item of items) {
    if (item.error === 'no_items') continue
    const owner = instagramUsername(item.ownerUsername ?? item.username)
    const collaborators = Array.isArray(item.coauthorProducers) ? item.coauthorProducers : []
    let suppliedProfile: string | null = null
    try { suppliedProfile = instagramUsername(new URL(String(item.inputUrl ?? '')).pathname.split('/')[1]) } catch { /* No profile URL supplied. */ }
    if (owner && owner !== username && suppliedProfile !== username && !collaborators.some(person => person && typeof person === 'object' && instagramUsername((person as Record<string, unknown>).username) === username)) continue
    const id = String(item.shortCode ?? item.code ?? item.id ?? '')
    const timestamp = new Date(String(item.timestamp ?? item.takenAt ?? item.createTimeISO ?? ''))
    if (!id || !Number.isFinite(timestamp.getTime())) throw new Error('Instagram post is missing its ID or publication date')
    if (timestamp.getTime() < Date.parse(start) || timestamp.getTime() > Date.parse(end)) continue
    const type = item.type ?? item.mediaType
    const content_type = type === 'Sidecar' || type === 'CAROUSEL_ALBUM' ? 'carousel'
      : type === 'Video' || type === 'VIDEO' || item.isVideo === true || item.is_video === true || statistic(item,['videoPlayCount','playCount','videoViewCount']) !== undefined ? 'reel' : 'photo'
    // A carousel is one published piece, regardless of its number of slides.
    posts.set(id, { post_id: id, posted_at: timestamp.toISOString(), content_type })
  }
  return [...posts.values()]
}

export type StatisticsReel = {
  reel_id: string
  date: string
  caption: string
  permalink: string
  thumbnail_url: string | null
  duration_sec: number | null
  views?: number
  likes?: number
  comments?: number
  shares?: number
  saves?: number
}

export function profileFollowers(items: Record<string, unknown>[], username: string): number {
  const profile = items.find(item => instagramUsername(item.username ?? item.ownerUsername) === username)
  const count = profile && statistic(profile, ['followersCount', 'followerCount', 'followers'])
  if (count === undefined) throw new Error(`Instagram profile did not return a valid follower count${providerError(items)}`)
  return count
}

export function statisticsReels(items: Record<string, unknown>[], username: string, start: string, end: string): StatisticsReel[] {
  if (items.some(item => item.error && item.error !== 'no_items')) {
    throw new Error(`Instagram reel data is unavailable${providerError(items)}`)
  }
  const reels = new Map<string, StatisticsReel>()
  for (const item of items) {
    if (item.error === 'no_items') continue
    const owner = instagramUsername(item.ownerUsername ?? item.username)
    if (owner && owner !== username) continue
    const id = String(item.shortCode ?? item.code ?? item.id ?? '')
    const timestamp = new Date(String(item.timestamp ?? item.takenAt ?? item.createTimeISO ?? ''))
    const views = statistic(item, ['videoPlayCount', 'playCount', 'videoViewCount', 'views', 'playsCount'])
    const video = item.type === 'Video' || item.mediaType === 'VIDEO' || item.isVideo === true || item.is_video === true || views !== undefined
    if (!video) continue
    if (!id || !Number.isFinite(timestamp.getTime())) throw new Error('Instagram reel is missing its ID or publication date')
    if (timestamp.getTime() < Date.parse(start) || timestamp.getTime() > Date.parse(end)) continue
    const duration = Number(item.videoDuration ?? item.duration ?? item.duration_sec)
    // Pinned reels belong in the window when their publication date is recent.
    reels.set(id, {
      reel_id: id, date: timestamp.toISOString().slice(0, 10),
      caption: String(item.caption ?? item.text ?? ''),
      permalink: String(item.url ?? item.link ?? `https://www.instagram.com/reel/${id}/`),
      thumbnail_url: typeof (item.displayUrl ?? item.thumbnailSrc) === 'string' ? String(item.displayUrl ?? item.thumbnailSrc) : null,
      duration_sec: Number.isFinite(duration) && duration > 0 ? duration : null,
      ...(views !== undefined ? { views } : {}),
      ...metric(item, 'likes', ['likesCount', 'likes', 'likeCount']),
      ...metric(item, 'comments', ['commentsCount', 'comments', 'commentCount']),
      ...metric(item, 'shares', ['sharesCount', 'shares']),
      ...metric(item, 'saves', ['savesCount', 'saves']),
    })
  }
  return [...reels.values()]
}

function providerError(items: Record<string, unknown>[]): string {
  if (items.some(item => item.isRestrictedProfile === true || item.error === 'Restricted profile')) return ' (restricted)'
  const code = items.find(item => item.error)?.error
  return typeof code === 'string' && /^[a-z0-9_-]{1,80}$/i.test(code) ? ` (${code})` : ''
}

function metric(item: Record<string, unknown>, name: string, keys: string[]) {
  const value = statistic(item, keys)
  return value === undefined ? {} : { [name]: value }
}

/** Only measured fields are updated; existing analysis and private metrics survive. */
export function reelStatisticsUpdate(reel: StatisticsReel) {
  return Object.fromEntries(['views', 'likes', 'comments', 'shares', 'saves']
    .filter(key => reel[key as keyof StatisticsReel] !== undefined)
    .map(key => [key, reel[key as keyof StatisticsReel]]))
}

export function statisticsJobState(job: {
  profile_done: boolean; reels_done: boolean; posts_done?: boolean
  metrics_done?: boolean; gaps_done?: boolean
  profile_run_id: string | null; reels_run_id: string | null
  profile_attempts: number; reels_attempts: number
}): 'succeeded' | 'failed' | 'running' | 'queued' {
  const contentDone = job.reels_done && job.posts_done !== false && job.metrics_done !== false && job.gaps_done !== false
  if (job.profile_done && contentDone) return 'succeeded'
  const profileEnded = job.profile_done || (!job.profile_run_id && job.profile_attempts >= 3)
  const reelsEnded = contentDone || (!job.reels_run_id && job.reels_attempts >= 3)
  if (profileEnded && reelsEnded) return 'failed'
  // Retries waiting for backoff must not occupy the active Actor capacity.
  return (!job.profile_done && job.profile_run_id) || (!contentDone && job.reels_run_id) ? 'running' : 'queued'
}

/** Backoff releases capacity only after all started runs have been collected. */
export function statisticsRetryDelay(status: string, hasError: boolean): number {
  return status === 'queued' && hasError ? 5 * 60_000 : 1000
}


export type StatisticsPlan = {
  mode: 'hybrid' | 'fallback'
  metrics_done: boolean
  gap_reel_ids: string[]
  posts_start: string
  fresh_reel_ids?: string[]
}

/** The cheaper Actor requires at least ten visible posts per profile query.
 * Fresh profile-grid data proves this before we send a paid request. */
export function canUseHybridStatistics(items: Record<string, unknown>[], username: string, date: string, previousCompleteDate?: string | null): boolean {
  const previous = previousCompleteDate && Date.parse(`${previousCompleteDate}T00:00:00Z`)
  const current = Date.parse(`${date}T00:00:00Z`)
  if (!previous || !Number.isFinite(previous) || current < previous || current - previous > 7 * 86400000) return false
  const profile = items.find(item => instagramUsername(item.username) === username)
  if (!Array.isArray(profile?.latestPosts)) return false
  const start = Date.parse(statisticsWindow(date))
  const ids = new Set((profile.latestPosts as Record<string, unknown>[])
    .filter(post => post && typeof post === 'object' && post.type === 'Video' && Date.parse(String(post.timestamp)) >= start && Date.parse(String(post.timestamp)) <= Date.now())
    .map(post => String(post.shortCode ?? '')).filter(Boolean))
  return ids.size >= 10
}

/** Only a complete, correctly attributed public Reel with a measured play
 * count may enter the same normaliser used by the official scraper. */
export function normaliseCheapStatistics(items: Record<string, unknown>[], username: string): Record<string, unknown>[] {
  if (!items.length) throw new Error('Monthly statistics dataset was empty')
  return items.map(item => {
    const owner = item.owner as Record<string, unknown> | undefined
    const video = item.video as Record<string, unknown> | undefined
    const image = item.image as Record<string, unknown> | undefined
    const id = String(item.code ?? '')
    const plays = video && statistic(video, ['playCount'])
    if (item.noResults || item.error || instagramUsername(owner?.username) !== username
      || item.isVideo !== true || item.isCarousel === true || !/^[a-z0-9_-]{1,80}$/i.test(id)
      || !Number.isFinite(Date.parse(String(item.createdAt))) || plays === undefined) {
      throw new Error('Monthly statistics dataset did not contain valid Reel play counts')
    }
    return { shortCode: id, ownerUsername: username, timestamp: item.createdAt, type: 'Video',
      videoPlayCount: plays, caption: item.caption ?? '', url: `https://www.instagram.com/reel/${id}/`,
      displayUrl: image?.url, videoDuration: video?.duration,
      ...(statistic(item, ['likeCount']) !== undefined ? { likesCount: statistic(item, ['likeCount']) } : {}),
      ...(statistic(item, ['commentCount']) !== undefined ? { commentsCount: statistic(item, ['commentCount']) } : {}),
    }
  })
}

export function statisticsGaps(knownIds: string[], fresh: Record<string, unknown>[]): string[] {
  const refreshed = new Set(fresh.map(item => String(item.shortCode)))
  return [...new Set(knownIds)].filter(id => /^[a-z0-9_-]{1,80}$/i.test(id) && !refreshed.has(id))
}
