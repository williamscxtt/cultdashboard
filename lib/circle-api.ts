/**
 * Circle REST API wrapper
 * Docs: https://api.circle.so/
 * Auth: Authorization: Token {CIRCLE_API_TOKEN} — requires an Admin v1 token
 * Community ID: 370927 (Creator Cult)
 */

const BASE_URL = 'https://app.circle.so/api/v1'
const COMMUNITY_ID = 370927

function token() {
  const t = process.env.CIRCLE_API_TOKEN
  if (!t) throw new Error('CIRCLE_API_TOKEN is not set')
  return t
}

function headers() {
  return {
    Authorization: `Token ${token()}`,
    'Content-Type': 'application/json',
  }
}

/** Strip HTML tags to get readable plain text */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n---\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export interface CircleMember {
  id: number
  name: string
  email: string
  last_seen_at: string | null
  posts_count: number
  comments_count: number
  headline: string | null
  profile_url: string | null
  public_uid: string
  gamification_stats?: { points?: number }
}

export interface CirclePost {
  id: number
  name: string            // post title
  body_plain_text: string // HTML stripped to plain text
  created_at: string
  user_id: number
  user_name: string
  user_email: string
  space_id: number
  space_name: string
  comments_count: number
  url: string
}

/** Raw shape returned by the Circle API v1 /posts endpoint */
interface RawCirclePost {
  id: number
  name: string
  body?: { body?: string } | null
  body_plain_text?: string
  created_at: string
  user_id: number
  user_name: string
  user_email: string
  space_id: number
  space_name?: string
  comments_count: number
  url: string
}

function normalisePost(raw: RawCirclePost): CirclePost {
  // API returns body as an object { body: "<html>..." }
  const htmlBody =
    (typeof raw.body === 'object' && raw.body !== null ? raw.body.body : null) ??
    raw.body_plain_text ??
    ''
  return {
    id: raw.id,
    name: raw.name ?? '',
    body_plain_text: stripHtml(htmlBody),
    created_at: raw.created_at,
    user_id: raw.user_id,
    user_name: raw.user_name ?? '',
    user_email: raw.user_email ?? '',
    space_id: raw.space_id,
    space_name: raw.space_name ?? '',
    comments_count: raw.comments_count ?? 0,
    url: raw.url ?? '',
  }
}

/** Fetch all community members across all pages */
export async function getAllCircleMembers(): Promise<CircleMember[]> {
  const PER_PAGE = 10 // conservative — Circle v1 /community_members has a low per_page limit
  const all: CircleMember[] = []
  let page = 1
  while (true) {
    const url = `${BASE_URL}/community_members?community_id=${COMMUNITY_ID}&per_page=${PER_PAGE}&page=${page}`
    const res = await fetch(url, { headers: headers() })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Circle API members error ${res.status}: ${body}`)
    }
    // Circle returns HTTP 200 even for errors — detect JSON error responses
    const json = await res.json() as CircleMember[] | { status?: string; message?: string; community_members?: CircleMember[] }
    if (!Array.isArray(json) && json.status && json.status !== 'ok') {
      throw new Error(`Circle API members error: ${json.message ?? json.status}`)
    }
    const batch: CircleMember[] = Array.isArray(json)
      ? json
      : (json.community_members ?? [])
    if (batch.length === 0) break
    all.push(...batch)
    if (batch.length < PER_PAGE) break
    page++
  }
  return all
}

/**
 * Fetch posts since a given date (incremental sync).
 * Pass no `since` to fetch ALL posts ever (first run / full backfill).
 */
export async function getPostsSince(since?: Date): Promise<CirclePost[]> {
  const all: CirclePost[] = []
  let page = 1

  while (true) {
    const url = `${BASE_URL}/posts?community_id=${COMMUNITY_ID}&per_page=50&page=${page}&sort=latest`
    const res = await fetch(url, { headers: headers() })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Circle API posts error ${res.status}: ${body}`)
    }
    // API returns a plain array
    const json = await res.json() as RawCirclePost[] | { posts?: RawCirclePost[] }
    const rawBatch: RawCirclePost[] = Array.isArray(json) ? json : (json.posts ?? [])
    const batch = rawBatch.map(normalisePost)

    if (batch.length === 0) break

    if (since) {
      const recent = batch.filter(p => new Date(p.created_at) >= since)
      all.push(...recent)
      const oldest = batch[batch.length - 1]
      if (!oldest || new Date(oldest.created_at) < since) break
    } else {
      all.push(...batch)
    }

    if (batch.length < 50) break
    page++
  }
  return all
}

/** Convenience: last N days */
export async function getRecentPosts(days = 14): Promise<CirclePost[]> {
  return getPostsSince(new Date(Date.now() - days * 24 * 60 * 60 * 1000))
}

/** Post a comment on a Circle post */
export async function postCircleComment(postId: string, body: string): Promise<void> {
  const url = `${BASE_URL}/comments`
  const res = await fetch(url, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      community_id: COMMUNITY_ID,
      post_id: Number(postId),
      body,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Circle post comment failed ${res.status}: ${text}`)
  }
}
