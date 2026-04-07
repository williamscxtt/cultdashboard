export interface ClientReel {
  id: string
  profile_id: string
  reel_id: string
  date: string
  scraped_week: string
  views: number | null
  reach: number | null
  likes: number | null
  comments: number | null
  saves: number | null
  shares: number | null
  duration_sec: number | null
  transcript: string | null
  hook: string | null
  caption: string | null
  hashtags: string[] | null
  format_type: string | null
  content_pillar: string | null
  thumbnail_url: string | null
  permalink: string | null
}

export interface FollowerSnapshot {
  date: string
  count: number
}

export interface Profile {
  id: string
  role: 'admin' | 'client'
  name: string | null
  email: string | null
  is_active: boolean
  ig_username: string | null
  ig_user_id: string | null
  ig_access_token: string | null
  followers_count: number | null
  onboarding_completed: boolean
  created_at: string
  yt_channel_id?: string | null
  tiktok_handle?: string | null
}

export interface WeeklyReport {
  id: string
  week_start: string
  report_md: string | null
  trending_topics: Record<string, unknown> | null
  top_hooks: Record<string, unknown> | null
}

export interface TrendingTopic {
  topic: string
  views: number
  accounts: string[]
}

export interface TopHook {
  account: string
  hook: string
  views: number
  format_type: string | null
  url?: string | null
}
