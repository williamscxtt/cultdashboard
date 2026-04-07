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

// 105-field intro_structured JSONB from Lovable onboarding
export interface IntroStructured {
  // Identity
  name?: string | null
  age?: string | null
  location?: string | null
  // Business
  what_you_coach?: string | null
  specific_niche?: string | null
  niche?: string | null
  ideal_client?: string | null
  target_audience?: string | null
  monthly_revenue?: string | null
  current_revenue?: string | null
  revenue_goal?: string | null
  goal_revenue?: string | null
  active_clients?: string | null
  // Content
  posts_per_week?: string | null
  posting_frequency?: string | null
  avg_views?: string | null
  top_format?: string | null
  content_style?: string | null
  hook_style?: string | null
  brand_voice?: string | null
  // Goals
  goal_90_days?: string | null
  goal_12_months?: string | null
  ninety_day_goal?: string | null
  // Challenges
  biggest_problem?: string | null
  biggest_challenge?: string | null
  what_tried_before?: string | null
  // Motivation
  why_cult?: string | null
  why_joined?: string | null
  what_you_want?: string | null
  // Story
  origin_story?: string | null
  transformation_story?: string | null
  unique_mechanism?: string | null
  proof?: string | null
  testimonials?: string | null
  // Additional dynamic fields
  [key: string]: string | null | undefined
}

export interface IntroInsights {
  strengths?: string[]
  weaknesses?: string[]
  opportunities?: string[]
  key_themes?: string[]
  recommended_pillars?: string[]
  hook_style?: string
  brand_voice?: string
  [key: string]: unknown
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
  // Core onboarding fields
  niche: string | null
  bio: string | null
  coaching_phase: string | null
  monthly_revenue: string | null
  revenue_goal: string | null
  target_audience: string | null
  posts_per_week: number | null
  content_pillars: string[] | null
  ninety_day_goal: string | null
  focus_this_week: string | null
  biggest_challenge: string | null
  why_joined: string | null
  dm_goal: string | null
  // Lovable import fields
  phase_number: number | null
  date_joined: string | null
  starting_followers: number | null
  starting_avg_views: number | null
  starting_revenue: string | null
  ninety_day_follower_goal: number | null
  ninety_day_revenue_goal: string | null
  starting_active_clients: number | null
  intro_structured: IntroStructured | null
  intro_freeform: string | null
  intro_insights: IntroInsights | null
  dashboard_bio: string | null
  weekly_checklist: unknown | null
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

// Weekly log — client accountability check-ins (actual DB schema)
export interface WeeklyLog {
  id: string
  profile_id: string
  week_number: number | null
  date: string                      // YYYY-MM-DD, the Monday of the week
  reels_posted: number | null
  followers_total: number | null    // current follower count
  avg_reel_views: number | null     // average views on reels this week
  avg_shares: number | null
  avg_saves: number | null
  profile_visits: number | null
  outreach_sent: number | null
  dms_received: number | null
  calls_booked: number | null
  clients_signed: number | null
  revenue: number | null
  current_phase: string | null
  biggest_win: string | null
  biggest_bottleneck: string | null
  message_for_will: string | null
  message_read: boolean | null
  created_at: string
  updated_at: string
}

// DM sales pipeline (actual DB schema)
export interface DmSale {
  id: string
  profile_id: string
  week_number: number | null
  date: string | null
  lead_name: string | null
  source: string | null
  stage: string | null              // 'new' | 'conversation' | 'call_booked' | 'call_taken' | 'closed' | 'lost'
  call_booked: boolean | null
  call_completed: boolean | null
  closed: boolean | null
  revenue: number | null
  deal_value: number | null
  call_date: string | null
  call_time: string | null
  contact_info: string | null
  pre_call_notes: string | null
  live_call_notes: string | null
  pain_points: string | null
  objections: string | null
  outcome_notes: string | null
  how_booked: string | null
  follow_up_date: string | null
  follow_up_note: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// Content log entries
export interface ContentLogEntry {
  id: string
  profile_id: string
  date: string
  reel_id: string | null
  hook: string | null
  format_type: string | null
  views: number | null
  likes: number | null
  comments: number | null
  saves: number | null
  notes: string | null
  created_at: string
}

// Brand voice
export interface BrandVoice {
  id: string
  profile_id: string
  tone: string | null
  style: string | null
  phrases: string[] | null
  avoid: string[] | null
  examples: string[] | null
  updated_at: string
}

// Admin notes
export interface AdminNote {
  id: string
  profile_id: string
  admin_id: string
  note: string
  created_at: string
}

// Saved hooks
export interface SavedHook {
  id: string
  profile_id: string
  hook: string
  source_reel_id: string | null
  format_type: string | null
  views: number | null
  saved_at: string
}

// Saved replies
export interface SavedReply {
  id: string
  profile_id: string
  label: string
  body: string
  created_at: string
}

// Competitor reel
export interface CompetitorReel {
  id: string
  account: string
  reel_id: string
  scraped_week: string
  date: string | null
  views: number | null
  likes: number | null
  comments: number | null
  transcript: string | null
  format_type: string | null
  hook: string | null
  caption: string | null
  hashtags: string[] | null
}

// Idea bank (saved_hooks repurposed or separate idea_bank table)
export interface IdeaBank {
  id: string
  profile_id: string
  idea: string
  format_type: string | null
  hook: string | null
  notes: string | null
  status: 'idea' | 'scripted' | 'filmed' | 'posted' | null
  created_at: string
}
