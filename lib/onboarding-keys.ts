/**
 * All field keys in the OnboardingHub, in the same order as the SECTIONS definition.
 * Used by both the hub component and the API to calculate completion progress.
 *
 * Total: 59 fields. Unlock threshold: 75% = 45 fields filled.
 */
export const ONBOARDING_HUB_KEYS = [
  // Section 1 – Who You Are (13)
  'full_name', 'age', 'location', 'occupation_before', 'how_long_coaching',
  'active_clients', 'monthly_revenue_current', 'highest_revenue', 'offer_price',
  'offer_description', 'personality_type', 'fun_fact', 'values',

  // Section 2 – Your Business (10)
  'specific_niche', 'what_you_coach', 'ideal_client', 'client_transformation',
  'unique_mechanism', 'why_different', 'main_platforms', 'revenue_goal_90',
  'revenue_goal_12m', 'follower_goal_90',

  // Section 3 – Your Content (8)
  'posts_per_week', 'avg_views', 'best_performing_content', 'content_style',
  'hook_style', 'brand_voice', 'topics_covered', 'content_frequency_goal',

  // Section 4 – Where You're Stuck (6)
  'biggest_problem', 'what_tried_before', 'what_held_back', 'previous_coaches',
  'content_consistency', 'dm_sales_experience',

  // Section 5 – What You Want (5)
  'goal_90_days', 'goal_12_months', 'what_success_looks_like', 'why_now', 'why_cult',

  // Section 6 – Mindset & Opinions (4)
  'controversial_opinion', 'what_you_hate', 'what_you_believe', 'philosophy',

  // Section 7 – Your Story (6)
  'origin_story', 'lowest_point', 'turning_point', 'best_client_result',
  'proof_results', 'content_angle',

  // Section 8 – Story Profile (7)
  'story_transformation', 'story_mechanism_name', 'story_best_client_result',
  'story_avg_views', 'story_primary_keyword', 'story_secondary_keyword',
  'story_lead_magnet',
] as const

export const ONBOARDING_TOTAL = ONBOARDING_HUB_KEYS.length        // 59
export const ONBOARDING_UNLOCK_THRESHOLD = Math.ceil(ONBOARDING_TOTAL * 0.75) // 45

/** Returns the number of filled fields given a saved intro_structured object */
export function calcHubFilledCount(introStructured: Record<string, unknown> | null | undefined): number {
  if (!introStructured) return 0
  return ONBOARDING_HUB_KEYS.filter(k => {
    const v = introStructured[k]
    return v !== undefined && v !== null && String(v).trim() !== ''
  }).length
}

/** Returns the completion percentage (0-100) given a saved intro_structured object */
export function calcHubProgress(introStructured: Record<string, unknown> | null | undefined): number {
  if (!introStructured) return 0
  return Math.round((calcHubFilledCount(introStructured) / ONBOARDING_TOTAL) * 100)
}
