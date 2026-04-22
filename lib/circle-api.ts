/**
 * Circle REST API wrapper
 * Docs: https://api.circle.so/
 * Auth: Authorization: Token {CIRCLE_API_TOKEN}
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
  name: string           // post title
  body_plain_text: string
  created_at: string
  user_id: number
  user_name: string
  user_email: string
  space_id: number
  comments_count: number
  url: string
}

/** Fetch all community members across all pages */
export async function getAllCircleMembers(): Promise<CircleMember[]> {
  const all: CircleMember[] = []
  let page = 1
  while (true) {
    const url = `${BASE_URL}/community_members?community_id=${COMMUNITY_ID}&per_page=100&page=${page}`
    const res = await fetch(url, { headers: headers() })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Circle API members error ${res.status}: ${body}`)
    }
    const json = await res.json() as { community_members?: CircleMember[]; records?: CircleMember[] }
    // Circle returns either `community_members` or the records directly depending on version
    const batch: CircleMember[] = json.community_members ?? (Array.isArray(json) ? json as CircleMember[] : [])
    if (batch.length === 0) break
    all.push(...batch)
    if (batch.length < 100) break
    page++
  }
  return all
}

/** Fetch recent posts from all spaces, up to `days` days back */
export async function getRecentPosts(days = 14): Promise<CirclePost[]> {
  const all: CirclePost[] = []
  let page = 1
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  while (true) {
    const url = `${BASE_URL}/posts?community_id=${COMMUNITY_ID}&per_page=50&page=${page}&sort=latest`
    const res = await fetch(url, { headers: headers() })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Circle API posts error ${res.status}: ${body}`)
    }
    const json = await res.json() as { posts?: CirclePost[] } | CirclePost[]
    const batch: CirclePost[] = Array.isArray(json) ? json : (json.posts ?? [])
    if (batch.length === 0) break

    // Filter to posts within the cutoff window
    const recent = batch.filter(p => new Date(p.created_at) >= cutoff)
    all.push(...recent)

    // If the oldest post in this batch is before cutoff, we're done
    const oldest = batch[batch.length - 1]
    if (!oldest || new Date(oldest.created_at) < cutoff) break

    if (batch.length < 50) break
    page++
  }
  return all
}

/** Post a comment on a Circle post (used when Will approves a reply_post action) */
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
