'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, CheckCircle, Sparkles, Save, CalendarCheck } from 'lucide-react'
import type { Profile, IntroStructured, IntroInsights } from '@/lib/types'
import { Button } from '@/components/ui'
import { ONBOARDING_UNLOCK_THRESHOLD } from '@/lib/onboarding-keys'
import PathSwitcher from '@/components/dashboard/PathSwitcher'

// ─── Section definitions ──────────────────────────────────────────────────────

interface FieldDef {
  key: string           // key in the form state (also used as update payload key)
  label: string
  placeholder: string
  type?: 'text' | 'textarea' | 'number' | 'select'
  options?: string[]    // for select
  hint?: string
}

interface SectionDef {
  number: number
  title: string
  description: string
  fields: FieldDef[]
}

// ─── Section definitions — base + creator overrides ──────────────────────────

const SECTION_1_COACH: SectionDef = {
  number: 1,
  title: 'Who You Are',
  description: 'The basics. Tell us about you as a person, not just as a coach.',
  fields: [
    { key: 'full_name', label: 'Full name', placeholder: 'William Scott' },
    { key: 'age', label: 'Age', placeholder: '25', type: 'number' },
    { key: 'location', label: "Where you're based", placeholder: 'England, UK' },
    { key: 'occupation_before', label: 'What did you do before coaching?', placeholder: 'e.g. Personal trainer, delivery driver, teacher', type: 'textarea' },
    { key: 'how_long_coaching', label: 'How long have you been coaching?', placeholder: 'e.g. 2 years', type: 'text' },
    { key: 'active_clients', label: 'How many active 1-1 clients do you have right now?', placeholder: 'e.g. 8' },
    { key: 'monthly_revenue_current', label: 'What is your current monthly revenue?', placeholder: 'e.g. £3,500/month', type: 'text' },
    { key: 'highest_revenue', label: "What's the highest monthly revenue you've ever hit?", placeholder: 'e.g. £6,000', type: 'text' },
    { key: 'offer_price', label: "What's the price of your main offer?", placeholder: 'e.g. £300/month, £1,200 upfront', type: 'text' },
    { key: 'offer_description', label: 'Describe your offer in one sentence.', placeholder: 'e.g. 12-week 1:1 coaching to help men over 40 build muscle without pain', type: 'textarea' },
    { key: 'personality_type', label: "How would you describe your personality?", placeholder: 'e.g. Introvert, straight-talker, motivator', type: 'text' },
    { key: 'fun_fact', label: 'One fun or surprising fact about you.', placeholder: 'e.g. I used to be a semi-professional footballer', type: 'text' },
    { key: 'values', label: 'What are your top 3 personal values?', placeholder: 'e.g. Discipline, honesty, family', type: 'text' },
  ],
}

const SECTION_1_CREATOR: SectionDef = {
  number: 1,
  title: 'Who You Are',
  description: 'The basics. Tell us about you as a person, not just as a creator.',
  fields: [
    { key: 'full_name', label: 'Full name', placeholder: 'William Scott' },
    { key: 'age', label: 'Age', placeholder: '25', type: 'number' },
    { key: 'location', label: "Where you're based", placeholder: 'England, UK' },
    { key: 'occupation_before', label: 'What did you do before creating?', placeholder: 'e.g. Marketing exec, fitness coach, student', type: 'textarea' },
    { key: 'how_long_creating', label: 'How long have you been creating content?', placeholder: 'e.g. 2 years', type: 'text' },
    { key: 'brand_partnerships_done', label: 'How many brand deals or partnerships have you done?', placeholder: 'e.g. 3 — all gifted so far', type: 'text' },
    { key: 'monthly_revenue_current', label: 'What is your current monthly income from content?', placeholder: 'e.g. £800/month from brand deals', type: 'text' },
    { key: 'monetization_model_hub', label: 'How do you currently monetise (or plan to)?', placeholder: 'e.g. Brand deals, digital products, platform revenue, UGC', type: 'textarea' },
    { key: 'content_description', label: 'Describe your content in one sentence.', placeholder: 'e.g. Short-form finance education for 20-somethings who want to stop living paycheck to paycheck', type: 'textarea' },
    { key: 'personality_type', label: "How would you describe your personality?", placeholder: 'e.g. Introvert, straight-talker, entertainer', type: 'text' },
    { key: 'fun_fact', label: 'One fun or surprising fact about you.', placeholder: 'e.g. I used to be a semi-professional footballer', type: 'text' },
    { key: 'values', label: 'What are your top 3 personal values?', placeholder: 'e.g. Authenticity, creativity, consistency', type: 'text' },
  ],
}

const SECTION_2_COACH: SectionDef = {
  number: 2,
  title: 'Your Business',
  description: 'Tell us about what you do and who you do it for.',
  fields: [
    { key: 'specific_niche', label: 'What is your specific niche?', placeholder: 'e.g. Fitness coaches personal brand growth', type: 'textarea' },
    { key: 'what_you_coach', label: 'What do you coach people on?', placeholder: 'e.g. I help online coaches grow their Instagram and close clients through DMs', type: 'textarea' },
    { key: 'ideal_client', label: 'Who is your ideal client?', placeholder: 'e.g. A fitness coach stuck between £3K–£7K a month with a working offer but weak content', type: 'textarea' },
    { key: 'client_transformation', label: "What's the #1 transformation your clients get?", placeholder: 'e.g. From £2K/month to £10K/month in 90 days', type: 'textarea' },
    { key: 'unique_mechanism', label: 'What is your unique method or framework?', placeholder: "e.g. The CULT System — Content, Upsell, Lead, Trust", type: 'textarea' },
    { key: 'why_different', label: 'Why are you different from other coaches in your space?', placeholder: "e.g. I've done it myself with no big brand. I teach organic only.", type: 'textarea' },
    { key: 'main_platforms', label: 'Which platforms are you on?', placeholder: 'e.g. Instagram, TikTok, YouTube Shorts', type: 'text' },
    { key: 'revenue_goal_90', label: 'Revenue goal in 90 days?', placeholder: 'e.g. £10,000/month', type: 'text' },
    { key: 'revenue_goal_12m', label: 'Revenue goal in 12 months?', placeholder: 'e.g. £25,000/month', type: 'text' },
    { key: 'follower_goal_90', label: 'Follower goal in 90 days?', placeholder: 'e.g. 10,000', type: 'text' },
  ],
}

const SECTION_2_CREATOR: SectionDef = {
  number: 2,
  title: 'Your Brand',
  description: 'Tell us about your content, your audience, and what makes you different.',
  fields: [
    { key: 'specific_niche', label: 'What is your content niche?', placeholder: 'e.g. Personal finance education for people in their 20s and 30s', type: 'textarea' },
    { key: 'content_transformation', label: "What transformation does your content create for viewers?", placeholder: 'e.g. They go from confused and overwhelmed about money to confident and in control', type: 'textarea' },
    { key: 'ideal_client', label: 'Who is your target audience?', placeholder: 'e.g. 22–35 year olds who want to take control of their finances but find traditional advice dry', type: 'textarea' },
    { key: 'creator_style_hub', label: 'How would you describe your content style?', placeholder: 'e.g. Educational but entertaining — like a smart friend giving advice, not a lecturer', type: 'textarea' },
    { key: 'why_different', label: 'What makes your content different from others in your niche?', placeholder: "e.g. I make complex financial concepts feel simple and funny — not intimidating", type: 'textarea' },
    { key: 'main_platforms', label: 'Which platforms are you on?', placeholder: 'e.g. Instagram, TikTok, YouTube Shorts', type: 'text' },
    { key: 'follower_goal_90', label: 'Follower goal in 90 days?', placeholder: 'e.g. 10,000', type: 'text' },
    { key: 'follower_goal_12m', label: 'Follower goal in 12 months?', placeholder: 'e.g. 100,000', type: 'text' },
    { key: 'income_goal_content', label: 'Income goal from content in 12 months?', placeholder: 'e.g. £3,000/month from brand deals and digital products', type: 'text' },
  ],
}

const SECTION_4_COACH: SectionDef = {
  number: 4,
  title: "Where You're Stuck",
  description: 'Be honest. The more detail here, the better I can help.',
  fields: [
    { key: 'biggest_problem', label: "What's your #1 problem right now?", placeholder: 'e.g. Views are stuck at 500–1K no matter what I post', type: 'textarea' },
    { key: 'what_tried_before', label: "What have you tried that hasn't worked?", placeholder: 'e.g. Posting daily, trending audios, viral hooks — nothing moved the needle', type: 'textarea' },
    { key: 'what_held_back', label: "What do you think is holding you back?", placeholder: 'e.g. My hooks are weak and I don\'t know who I\'m talking to', type: 'textarea' },
    { key: 'previous_coaches', label: 'Have you worked with any coaches or programmes before?', placeholder: 'e.g. Yes — bought two courses, hired a business coach for 3 months', type: 'textarea' },
    { key: 'content_consistency', label: 'How consistent have you been with content?', placeholder: 'e.g. Post 2–3x/week but then burn out and go quiet for 2 weeks', type: 'textarea' },
    { key: 'dm_sales_experience', label: 'How are your DM conversations going?', placeholder: 'e.g. Getting some leads but they ghost when I mention price', type: 'textarea' },
  ],
}

const SECTION_4_CREATOR: SectionDef = {
  number: 4,
  title: "Where You're Stuck",
  description: 'Be honest. The more detail here, the better I can help.',
  fields: [
    { key: 'biggest_problem', label: "What's your #1 problem right now?", placeholder: 'e.g. Views are stuck at 2K per reel and I don\'t know how to break through', type: 'textarea' },
    { key: 'what_tried_before', label: "What have you tried that hasn't worked?", placeholder: 'e.g. Trending audios, posting daily, better editing — nothing shifted the numbers', type: 'textarea' },
    { key: 'what_held_back', label: "What do you think is holding you back?", placeholder: 'e.g. My hooks aren\'t strong enough and I don\'t have a clear enough niche', type: 'textarea' },
    { key: 'previous_coaches', label: 'Have you worked with any coaches or programmes before?', placeholder: 'e.g. Yes — bought a content course, tried a growth service', type: 'textarea' },
    { key: 'content_consistency', label: 'How consistent have you been with posting?', placeholder: 'e.g. Post 2–3x/week but inconsistent — sometimes go quiet for 2 weeks', type: 'textarea' },
    { key: 'brand_deal_experience', label: 'Any experience with brand deals or sponsorships?', placeholder: 'e.g. A few gifted deals but haven\'t been able to secure paid ones yet', type: 'textarea' },
    { key: 'monetization_clarity', label: 'How clear are you on your monetisation path?', placeholder: 'e.g. I know I want brand deals but have no idea how to approach brands', type: 'textarea' },
  ],
}

const SECTION_5_COACH: SectionDef = {
  number: 5,
  title: 'What You Want',
  description: 'Be specific. Vague goals get vague results.',
  fields: [
    { key: 'goal_90_days', label: 'What do you want to achieve in 90 days?', placeholder: 'e.g. Hit £10K/month, get to 10K followers, close 3 new high-ticket clients', type: 'textarea' },
    { key: 'goal_12_months', label: 'Where do you want to be in 12 months?', placeholder: 'e.g. Running a £25K/month business with a team, known in my niche', type: 'textarea' },
    { key: 'what_success_looks_like', label: 'What does success look like to you beyond money?', placeholder: 'e.g. Freedom to work from anywhere, time with family, making a real impact', type: 'textarea' },
    { key: 'why_now', label: 'Why is now the right time for this?', placeholder: "e.g. I'm done playing small. I've seen others do it and I know I can.", type: 'textarea' },
    { key: 'why_cult', label: "Why did you join CULT specifically?", placeholder: "e.g. I've followed Will for 2 years and his system is the only one that made sense", type: 'textarea' },
  ],
}

const SECTION_5_CREATOR: SectionDef = {
  number: 5,
  title: 'What You Want',
  description: 'Be specific. Vague goals get vague results.',
  fields: [
    { key: 'goal_90_days', label: 'What do you want to achieve in 90 days?', placeholder: 'e.g. Hit 20K followers, land my first paid brand deal, post consistently', type: 'textarea' },
    { key: 'goal_12_months', label: 'Where do you want to be in 12 months?', placeholder: 'e.g. 100K followers, £2K/month from content, recognized in my niche', type: 'textarea' },
    { key: 'brand_deal_goal', label: 'What brand deal / monetisation goal do you have?', placeholder: 'e.g. 2 paid brand deals per month averaging £500 each by end of year', type: 'textarea' },
    { key: 'what_success_looks_like', label: 'What does success look like to you beyond numbers?', placeholder: 'e.g. Making content I\'m proud of, building a community, doing this full-time', type: 'textarea' },
    { key: 'why_now', label: 'Why is now the right time for this?', placeholder: "e.g. I've been putting it off for 2 years. I'm committing fully now.", type: 'textarea' },
    { key: 'why_cult', label: "Why did you join CULT specifically?", placeholder: "e.g. Will's approach to content growth is the most practical I've seen", type: 'textarea' },
  ],
}

// Shared sections (3, 6, 7, 8) — same for both coaches and creators
const SECTIONS_SHARED: SectionDef[] = [
  {
    number: 3,
    title: 'Your Content',
    description: 'How you currently create and what has worked.',
    fields: [
      { key: 'posts_per_week', label: 'How many reels do you post per week?', placeholder: 'e.g. 5', type: 'number' },
      { key: 'avg_views', label: 'What are your average reel views right now?', placeholder: 'e.g. 1,200', type: 'text' },
      { key: 'best_performing_content', label: 'What type of content has performed best for you?', placeholder: 'e.g. Raw talking-to-camera, transformation comparisons, tutorial walkthroughs', type: 'textarea' },
      { key: 'content_style', label: 'How would you describe your content style?', placeholder: 'e.g. Direct, no fluff, real talk', type: 'text' },
      { key: 'hook_style', label: 'What hook styles do you use most?', placeholder: 'e.g. Bold statement, question, controversial take', type: 'text' },
      { key: 'brand_voice', label: 'Describe your brand voice.', placeholder: 'e.g. Tough love, no BS, big brother energy', type: 'textarea' },
      { key: 'topics_covered', label: 'What topics do you cover in your content?', placeholder: 'e.g. Mindset, content strategy, DM sales, consistency', type: 'textarea' },
      { key: 'content_frequency_goal', label: 'How often do you want to post going forward?', placeholder: 'e.g. Daily, 5x/week', type: 'text' },
    ],
  },
  {
    number: 6,
    title: 'Mindset & Opinions',
    description: "Your takes. What you believe. This is what makes your content different.",
    fields: [
      { key: 'controversial_opinion', label: 'What is a controversial opinion you have about your industry?', placeholder: "e.g. Most fitness coaches are selling overpriced PDFs with no real results", type: 'textarea' },
      { key: 'what_you_hate', label: "What do you hate seeing in your industry?", placeholder: 'e.g. Coaches flexing cars they can\'t afford to trick people into buying their course', type: 'textarea' },
      { key: 'what_you_believe', label: 'What do you believe that most people disagree with?', placeholder: 'e.g. You don\'t need a big audience to make £10K/month', type: 'textarea' },
      { key: 'philosophy', label: "What's your coaching philosophy in one sentence?", placeholder: 'e.g. Real growth comes from doing the boring things consistently, not chasing hacks', type: 'textarea' },
    ],
  },
  {
    number: 7,
    title: 'Your Story',
    description: 'Your origin, your proof, your credibility. This powers every script.',
    fields: [
      { key: 'origin_story', label: 'What is your origin story? How did you get here?', placeholder: "e.g. I was delivering pizzas at 22 while trying to grow my PT business on Instagram. Nothing worked until...", type: 'textarea' },
      { key: 'lowest_point', label: 'What was your lowest point?', placeholder: "e.g. I nearly quit 3 times. I had one client paying me £200/month and was £8K in debt", type: 'textarea' },
      { key: 'turning_point', label: 'What was your turning point?', placeholder: 'e.g. I posted one honest video about struggling and it hit 40K views. Everything changed.', type: 'textarea' },
      { key: 'best_client_result', label: 'What is your best client result?', placeholder: 'e.g. Sarah went from £1.5K to £12K/month in 4 months', type: 'textarea' },
      { key: 'proof_results', label: 'What proof or results can you talk about publicly?', placeholder: 'e.g. Screenshots, case studies, testimonials, before/after', type: 'textarea' },
      { key: 'content_angle', label: "What's your content angle or 'character'?", placeholder: "e.g. The 'pizza delivery driver turned £50K/month coach' underdog story", type: 'textarea' },
    ],
  },
  {
    number: 8,
    title: 'Story Profile',
    description: 'Powers your Instagram story sequences. Complete this to unlock the Story Generator.',
    fields: [
      {
        key: 'story_transformation',
        label: 'Your origin story in 3 sentences',
        type: 'textarea',
        placeholder: 'Before: what life looked like before you figured this out. Turning point: what changed or what you discovered. After: where you are now as a result.',
        hint: 'This is the backbone of your story sequences. Be specific — real details beat vague claims every time. Include numbers if you have them.',
      },
      {
        key: 'story_mechanism_name',
        label: 'What do you call your method or system?',
        type: 'text',
        placeholder: 'e.g. The Creator Cult Method, The 5-Step Fitness Framework, The Revenue Reset System',
        hint: "If you don't have a name yet, describe your process in 4-6 words and we'll use that.",
      },
      {
        key: 'story_best_client_result',
        label: 'Your single best client result with a specific number',
        type: 'text',
        placeholder: 'e.g. Sarah went from £2K to £11K/month in 6 weeks. James lost 22lbs in 9 weeks without cutting carbs.',
        hint: 'Specific numbers outperform vague claims by a huge margin. If you have multiple results, pick the most specific and relatable one.',
      },
      {
        key: 'story_avg_views',
        label: 'Approximate average story views per slide',
        type: 'number',
        placeholder: 'e.g. 800',
        hint: 'Rough estimate is fine. This helps calibrate the type of sequences we recommend.',
      },
      {
        key: 'story_primary_keyword',
        label: 'Your hard CTA keyword — the one that triggers your main offer',
        type: 'text',
        placeholder: 'e.g. CULT, APPLY, SCALE, COACH',
        hint: 'This is the word people DM to get your main offer information. Used on Monday conversion sequences.',
      },
      {
        key: 'story_secondary_keyword',
        label: 'Your soft CTA keyword — the one that delivers your free resource',
        type: 'text',
        placeholder: 'e.g. SYSTEM, FREE, GUIDE, BLUEPRINT',
        hint: 'This is the word people DM to get your lead magnet. Used on Thursday conversion sequences.',
      },
      {
        key: 'story_lead_magnet',
        label: 'What do people receive when they DM your soft CTA keyword?',
        type: 'text',
        placeholder: 'e.g. A free 5-step content system PDF. A 20-minute strategy video. A free training on [topic].',
        hint: 'Keep it to one sentence. This gets used in your Thursday soft CTA story slides.',
      },
    ],
  },
]

// ─── Section assembly ─────────────────────────────────────────────────────────
function getSections(isCreator: boolean): SectionDef[] {
  const [s3, s6, s7, s8] = SECTIONS_SHARED
  return [
    isCreator ? SECTION_1_CREATOR : SECTION_1_COACH,
    isCreator ? SECTION_2_CREATOR : SECTION_2_COACH,
    s3,
    isCreator ? SECTION_4_CREATOR : SECTION_4_COACH,
    isCreator ? SECTION_5_CREATOR : SECTION_5_COACH,
    s6, s7, s8,
  ]
}

// ─── All field keys in one flat list ──────────────────────────────────────────
function getAllKeys(isCreator: boolean): string[] {
  return getSections(isCreator).flatMap(s => s.fields.map(f => f.key))
}

// ─── Build initial form state ──────────────────────────────────────────────────
function buildInitialForm(profile: Profile): Record<string, string> {
  const intro = (profile.intro_structured ?? {}) as IntroStructured

  // Read a string value — tries keys in order, returns first non-empty
  function iVal(...keys: string[]): string {
    for (const k of keys) {
      const v = intro[k]
      if (!v) continue
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
    return ''
  }

  // Read a value that may be stored as an array (old system stored some fields as string[])
  function iArr(...keys: string[]): string {
    for (const k of keys) {
      const v = intro[k]
      if (!v) continue
      if (Array.isArray(v) && v.length > 0) return v.filter(Boolean).join('\n')
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
    return ''
  }

  return {
    // ── Section 1: Who You Are ───────────────────────────────────────────────
    full_name:             profile.name || iVal('full_name', 'name') || '',
    age:                   iVal('age') || '',
    location:              iVal('location', 'country', 'city', 'accent_background') || '',
    // Old system: 'before_coaching'
    occupation_before:     iVal('occupation_before', 'before_coaching', 'previous_job', 'what_did_you_do_before') || '',
    how_long_coaching:     iVal('how_long_coaching', 'coaching_experience', 'years_coaching') || '',
    active_clients:        iVal('active_clients', 'current_clients', 'clients_now') || (profile.starting_active_clients?.toString() ?? ''),
    // Old system: 'monthly_revenue' (same key, but no '_current' suffix)
    monthly_revenue_current: profile.monthly_revenue || iVal('monthly_revenue_current', 'monthly_revenue', 'current_revenue', 'revenue') || (profile.starting_revenue ?? ''),
    highest_revenue:       iVal('highest_revenue', 'best_month_revenue', 'max_revenue') || '',
    // Old system: 'offer_cost'
    offer_price:           iVal('offer_price', 'offer_cost', 'price', 'programme_price') || '',
    // Old system: 'current_offer'
    offer_description:     iVal('offer_description', 'current_offer', 'offer', 'what_you_offer') || '',
    // Old system: 'three_words'
    personality_type:      iVal('personality_type', 'three_words', 'personality') || '',
    // Old system: 'fun_outside_work', 'something_unknown'
    fun_fact:              iVal('fun_fact', 'fun_outside_work', 'something_unknown', 'random_fact', 'interesting_fact') || '',
    // Old system: 'worldview'
    values:                iVal('values', 'worldview', 'core_values', 'personal_values') || '',

    // ── Section 2: Your Business ─────────────────────────────────────────────
    specific_niche:        profile.niche || iVal('specific_niche', 'niche', 'your_niche') || '',
    what_you_coach:        iVal('what_you_coach', 'coaching_on', 'i_help') || '',
    ideal_client:          profile.target_audience || iVal('ideal_client', 'target_audience', 'dream_client') || '',
    client_transformation: iVal('client_transformation', 'transformation', 'result', 'outcome') || '',
    unique_mechanism:      iVal('unique_mechanism', 'framework', 'method', 'system') || '',
    // Old system: 'what_makes_you_different'
    why_different:         iVal('why_different', 'what_makes_you_different', 'differentiator') || '',
    // Old system: 'primary_platform'
    main_platforms:        iVal('main_platforms', 'primary_platform', 'platforms', 'social_media', 'where_you_post') || '',
    revenue_goal_90:       profile.revenue_goal || profile.ninety_day_revenue_goal?.toString() || iVal('revenue_goal_90', 'revenue_goal', 'goal_revenue') || '',
    revenue_goal_12m:      iVal('revenue_goal_12m', 'goal_12_months_revenue', 'twelve_month_revenue') || '',
    follower_goal_90:      profile.ninety_day_follower_goal?.toString() || iVal('follower_goal_90', 'follower_goal', 'ninety_day_follower_goal') || '',

    // ── Section 3: Your Content ──────────────────────────────────────────────
    posts_per_week:        profile.posts_per_week?.toString() || iVal('posts_per_week', 'posting_frequency') || '',
    avg_views:             iVal('avg_views', 'average_views', 'current_avg_views') || (profile.starting_avg_views?.toString() ?? ''),
    // Old system: 'best_content', 'current_content_type'
    best_performing_content: iVal('best_performing_content', 'best_content', 'current_content_type', 'top_content', 'what_works') || '',
    // Old system: 'brand_description', 'engagement_type'
    content_style:         iVal('content_style', 'brand_description', 'engagement_type', 'my_style') || '',
    hook_style:            iVal('hook_style', 'hooks') || '',
    // Old system: 'brand_description'
    brand_voice:           iVal('brand_voice', 'brand_description', 'voice', 'tone') || '',
    topics_covered:        iVal('topics_covered', 'content_topics', 'pillars') || (profile.content_pillars?.join(', ') ?? ''),
    content_frequency_goal: iVal('content_frequency_goal', 'posting_goal') || '',

    // ── Section 4: Where You're Stuck ────────────────────────────────────────
    biggest_problem:       profile.biggest_challenge || iVal('biggest_problem', 'main_problem', 'challenge') || '',
    // Old system: 'tried_to_fix', 'why_not_worked'
    what_tried_before:     iVal('what_tried_before', 'tried_to_fix', 'why_not_worked', 'tried_before', 'previous_attempts') || '',
    // Old system: 'content_missing', 'thing_avoiding'
    what_held_back:        iVal('what_held_back', 'content_missing', 'thing_avoiding', 'held_back', 'what_stops_you') || '',
    // Old system: 'mentor_story'
    previous_coaches:      iVal('previous_coaches', 'mentor_story', 'coaching_before', 'programmes') || '',
    // Old system: 'posting_consistency'
    content_consistency:   iVal('content_consistency', 'posting_consistency', 'consistency', 'posting_history') || '',
    // Old system: 'getting_clients', 'dms_from_content'
    dm_sales_experience:   iVal('dm_sales_experience', 'getting_clients', 'dms_from_content', 'dm_experience', 'sales_experience') || '',

    // ── Section 5: What You Want ─────────────────────────────────────────────
    goal_90_days:          profile.ninety_day_goal || iVal('goal_90_days', '90_day_goal', 'one_thing_6months') || '',
    goal_12_months:        iVal('goal_12_months', 'one_year_goal', '12_month_goal') || '',
    // Old system: 'what_changes', 'perfect_business', 'financial_freedom'
    what_success_looks_like: iVal('what_success_looks_like', 'what_changes', 'perfect_business', 'financial_freedom', 'success_definition') || '',
    // Old system: 'motivation'
    why_now:               iVal('why_now', 'motivation', 'why_this_time') || '',
    // Old system: 'why_creator_cult'
    why_cult:              profile.why_joined || iVal('why_cult', 'why_creator_cult', 'why_coaching', 'why_joined') || '',

    // ── Section 6: Mindset & Opinions ────────────────────────────────────────
    // Old system: 'niche_bullshit', 'take_on_career', 'take_on_social_media'
    controversial_opinion: iVal('controversial_opinion', 'niche_bullshit', 'take_on_career', 'take_on_social_media', 'hot_take', 'controversial_take') || '',
    what_you_hate:         iVal('what_you_hate', 'hate_in_industry', 'industry_frustration', 'angry_frustrated_by') || '',
    // Old system: 'contrarian_beliefs' (array), 'worldview'
    what_you_believe:      iArr('contrarian_beliefs', 'what_you_believe') || iVal('worldview', 'unpopular_opinion', 'belief', 'inner_critic') || '',
    // Old system: 'relationship_with_failure', 'take_on_money', 'take_on_relationships'
    philosophy:            iVal('philosophy', 'relationship_with_failure', 'take_on_money', 'coaching_philosophy', 'beliefs') || '',

    // ── Section 7: Your Story ────────────────────────────────────────────────
    // Old system: 'transformation_story'
    origin_story:          iVal('origin_story', 'transformation_story', 'background_story', 'my_story') || '',
    // Old system: 'moments_wanted_to_quit', 'hard_times_personal' (arrays)
    lowest_point:          iVal('lowest_point', 'rock_bottom', 'hardest_moment') || iArr('moments_wanted_to_quit', 'hard_times_personal') || '',
    // Old system: 'moments_changed_perspective' (array)
    turning_point:         iVal('turning_point', 'breakthrough', 'when_things_changed') || iArr('moments_changed_perspective') || '',
    best_client_result:    iVal('best_client_result', 'client_result', 'case_study', 'best_result') || '',
    proof_results:         iVal('proof_results', 'proof', 'results', 'testimonials') || '',
    // Old system: 'brand_description' (sometimes used as content angle)
    content_angle:         iVal('content_angle', 'character', 'story_angle', 'brand_story') || '',

    // ── Section 8: Story Profile ─────────────────────────────────────────────
    story_transformation:    iVal('story_transformation') || '',
    story_mechanism_name:    iVal('story_mechanism_name') || iVal('unique_mechanism', 'framework', 'method') || '',
    story_best_client_result: iVal('story_best_client_result') || iVal('best_client_result', 'client_result') || '',
    story_avg_views:         iVal('story_avg_views') || '',
    story_primary_keyword:   iVal('story_primary_keyword') || '',
    story_secondary_keyword: iVal('story_secondary_keyword') || '',
    story_lead_magnet:       iVal('story_lead_magnet') || '',

    // ── Creator-specific fields ──────────────────────────────────────────────
    how_long_creating:       iVal('how_long_creating', 'how_long_coaching', 'coaching_experience') || '',
    brand_partnerships_done: iVal('brand_partnerships_done') || '',
    monetization_model_hub:  iVal('monetization_model_hub', 'monetization_model') || '',
    content_description:     iVal('content_description', 'offer_description') || '',
    content_transformation:  iVal('content_transformation', 'client_transformation') || '',
    creator_style_hub:       iVal('creator_style_hub', 'content_style_description', 'content_style') || '',
    follower_goal_12m:       iVal('follower_goal_12m') || '',
    income_goal_content:     iVal('income_goal_content', 'revenue_goal_12m') || '',
    brand_deal_experience:   iVal('brand_deal_experience', 'dm_sales_experience') || '',
    monetization_clarity:    iVal('monetization_clarity') || '',
    brand_deal_goal:         iVal('brand_deal_goal', 'revenue_goal_90') || '',
  }
}

// ─── sub-components ───────────────────────────────────────────────────────────

function FieldInput({ field, value, onChange, readOnly = false }: {
  field: FieldDef; value: string; onChange: (v: string) => void; readOnly?: boolean
}) {
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', fontSize: 14, boxSizing: 'border-box',
    background: readOnly ? 'var(--muted)' : 'var(--background)',
    border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--foreground)', fontFamily: 'inherit',
    outline: 'none', transition: 'border-color 0.15s',
    cursor: readOnly ? 'default' : undefined,
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--foreground)', marginBottom: 6 }}>
        {field.label}
      </label>
      {field.hint && (
        <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 6 }}>{field.hint}</div>
      )}
      {field.type === 'textarea' ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={readOnly && !value ? '—' : field.placeholder}
          rows={3}
          readOnly={readOnly}
          style={{ ...inputStyle, resize: readOnly ? 'none' : 'vertical', lineHeight: 1.6 }}
          onFocus={readOnly ? undefined : e => { (e.target as HTMLElement).style.borderColor = 'var(--accent)' }}
          onBlur={readOnly ? undefined : e => { (e.target as HTMLElement).style.borderColor = 'var(--border)' }}
        />
      ) : (
        <input
          type={field.type === 'number' ? 'number' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={readOnly && !value ? '—' : field.placeholder}
          readOnly={readOnly}
          style={inputStyle}
          onFocus={readOnly ? undefined : e => { (e.target as HTMLElement).style.borderColor = 'var(--accent)' }}
          onBlur={readOnly ? undefined : e => { (e.target as HTMLElement).style.borderColor = 'var(--border)' }}
        />
      )}
    </div>
  )
}

function AccordionSection({ section, form, onChange, completedCount, readOnly = false }: {
  section: SectionDef
  form: Record<string, string>
  onChange: (key: string, value: string) => void
  completedCount: number
  readOnly?: boolean
}) {
  const [open, setOpen] = useState(section.number <= 2)
  const total = section.fields.length

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 10,
      marginBottom: 10, overflow: 'hidden',
      background: 'var(--card)',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', width: '100%',
          padding: '16px 20px', background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          gap: 14,
        }}
      >
        {/* Number bubble */}
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: completedCount === total ? 'rgba(255,255,255,0.5)' : 'var(--muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
          color: completedCount === total ? '#fff' : 'var(--muted-foreground)',
        }}>
          {completedCount === total ? <CheckCircle size={14} /> : section.number}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>{section.title}</span>
            <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{completedCount}/{total} completed</span>
          </div>
          {!open && (
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>{section.description}</div>
          )}
        </div>

        <div style={{ color: 'var(--muted-foreground)', flexShrink: 0 }}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {open && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)', margin: '14px 0 20px', lineHeight: 1.5 }}>
            {section.description}
          </p>
          {section.fields.map(field => (
            <FieldInput
              key={field.key}
              field={field}
              value={form[field.key] ?? ''}
              onChange={readOnly ? () => {} : (v => onChange(field.key, v))}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

interface Props { profile: Profile; adminView?: boolean }

export default function OnboardingHub({ profile, adminView = false }: Props) {
  const router = useRouter()
  const isCreator = profile.user_type === 'creator'
  const sections = getSections(isCreator)
  const ALL_KEYS = getAllKeys(isCreator)

  const [form, setForm] = useState<Record<string, string>>(() => buildInitialForm(profile))
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [hubComplete, setHubComplete] = useState(!!profile.onboarding_hub_complete)

  const insights = profile.intro_insights as IntroInsights | null

  // Count filled fields
  const filledCount = ALL_KEYS.filter(k => (form[k] ?? '').trim() !== '').length
  const totalCount = ALL_KEYS.length
  const progressPct = Math.round((filledCount / totalCount) * 100)

  const handleChange = useCallback((key: string, value: string) => {
    setForm(f => ({ ...f, [key]: value }))
  }, [])

  // Section completion counts
  function sectionCompleted(section: SectionDef): number {
    return section.fields.filter(f => (form[f.key] ?? '').trim() !== '').length
  }

  async function handleSave() {
    setSaving(true)
    try {
      // Build the intro_structured object from form state
      const introStructured: Record<string, string> = {}
      for (const key of ALL_KEYS) {
        if ((form[key] ?? '').trim()) introStructured[key] = form[key].trim()
      }

      // Also map key fields to profile columns
      const payload = {
        name: form.full_name || null,
        niche: form.specific_niche || null,
        target_audience: form.ideal_client || null,
        monthly_revenue: form.monthly_revenue_current || null,
        revenue_goal: form.revenue_goal_90 || null,
        ninety_day_goal: form.goal_90_days || null,
        biggest_challenge: form.biggest_problem || null,
        why_joined: form.why_cult || null,
        posts_per_week: form.posts_per_week ? Number(form.posts_per_week) : null,
        // Store all form data in intro_structured too
        intro_structured: introStructured,
      }

      const res = await fetch('/api/profile/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 4000)
      // Unlock the sidebar if they've hit the threshold
      if (filledCount >= ONBOARDING_UNLOCK_THRESHOLD) {
        setHubComplete(true)
        // Refresh server data so the sidebar unlocks without a full page reload
        router.refresh()
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // AI insights top fields
  const introData = (profile.intro_structured ?? {}) as IntroStructured
  function iVal(...keys: string[]): string {
    for (const k of keys) {
      const v = introData[k] || (form[k] ?? '')
      if (v && String(v).trim()) return String(v).trim()
    }
    return ''
  }
  const aiNiche = iVal('specific_niche') || profile.niche || ''
  const aiIdealClient = iVal('ideal_client') || profile.target_audience || ''
  const aiTransformation = iVal('client_transformation', 'transformation') || ''
  const aiContentAngle = iVal('content_angle') || ''
  const hasAiData = insights || aiNiche || aiIdealClient || aiTransformation || aiContentAngle

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>

      {/* Admin read-only notice */}
      {adminView && (
        <div style={{
          marginBottom: 20, padding: '10px 14px', borderRadius: 8,
          background: 'var(--accent-subtle)', border: '1px solid var(--accent-subtle-border)',
          fontSize: 13, color: 'var(--accent)', fontWeight: 500, lineHeight: 1.5,
        }}>
          <strong>Read-only view.</strong> To edit this client&apos;s profile, use <strong>View as Client</strong> from the client list.
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.5px', margin: '0 0 6px' }}>
          {adminView ? `${profile.name || 'Client'}'s Profile` : 'Onboarding Hub'}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 14, color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.5 }}>
            {adminView
              ? 'Client profile data — all onboarding fields.'
              : 'The more you put in, the better your AI gets. Come back and update whenever something changes.'
            }
          </p>
          {!adminView && (
            <PathSwitcher
              profileId={profile.id}
              currentType={profile.user_type ?? null}
              currentStyle={profile.creator_style ?? null}
              mode="self"
              variant="button"
            />
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '16px 20px', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
            {filledCount} fields completed
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>{progressPct}%</span>
        </div>
        <div style={{ height: 6, background: 'var(--muted)', borderRadius: 99 }}>
          <div style={{
            height: '100%', background: 'var(--foreground)',
            borderRadius: 99, width: `${progressPct}%`,
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* Save button — hidden in admin read-only view */}
      {!adminView && (
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '14px', marginBottom: 20,
            background: 'var(--foreground)', color: 'var(--background)',
            border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'opacity 0.15s',
          }}
        >
          {saving ? 'Saving…' : savedMsg ? (
            <><CheckCircle size={16} /> Saved — AI Updated</>
          ) : (
            <><Save size={16} /> Save &amp; Update My AI</>
          )}
        </button>
      )}

      {/* AI Personalised card */}
      {hasAiData && (
        <div style={{
          border: '1px solid var(--accent)',
          borderRadius: 10, padding: 20, marginBottom: 20,
          background: 'hsl(var(--accent-hsl, 25 100% 55%) / 0.07)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <CheckCircle size={14} color="var(--accent)" />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              AI Personalised
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
            {aiNiche && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Niche</div>
                <div style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5 }}>{aiNiche}</div>
              </div>
            )}
            {aiIdealClient && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Ideal client</div>
                <div style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5 }}>{aiIdealClient}</div>
              </div>
            )}
            {aiTransformation && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Transformation</div>
                <div style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5 }}>{aiTransformation}</div>
              </div>
            )}
            {aiContentAngle && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Content angle</div>
                <div style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5 }}>{aiContentAngle}</div>
              </div>
            )}
            {insights?.strengths && insights.strengths.length > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Strengths</div>
                <div style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5 }}>{insights.strengths.join(' · ')}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Accordion sections */}
      {sections.map(section => (
        <AccordionSection
          key={section.number}
          section={section}
          form={form}
          onChange={handleChange}
          completedCount={sectionCompleted(section)}
          readOnly={adminView}
        />
      ))}

      {/* Bottom save — hidden in admin read-only view */}
      {!adminView && (
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '14px', marginTop: 16,
            background: 'var(--foreground)', color: 'var(--background)',
            border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {saving ? 'Saving…' : <><Save size={16} /> Save &amp; Update My AI</>}
        </button>
      )}

      {/* ── Booking CTA — shown once hub is unlocked ─────────────────────────── */}
      {!adminView && hubComplete && (
        <div style={{
          marginTop: 24,
          padding: '24px',
          borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(99,102,241,0.08) 100%)',
          border: '1px solid rgba(59,130,246,0.3)',
          textAlign: 'center',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: '#3B82F6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <CalendarCheck size={20} color="white" />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--foreground)', margin: '0 0 8px', letterSpacing: '-0.3px' }}>
            You&apos;ve unlocked the full dashboard 🎉
          </h3>
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.6, margin: '0 0 20px', maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
            Next step: book your 1-to-1 onboarding call with Will. You&apos;ll map out your first 90 days, get your content plan set, and hit the ground running.
          </p>
          <a
            href="https://calendly.com/scottvip/mentorship-call"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '13px 28px',
              background: '#3B82F6', color: '#fff',
              borderRadius: 8, fontSize: 14, fontWeight: 700,
              textDecoration: 'none', letterSpacing: '-0.2px',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.88' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
          >
            <CalendarCheck size={15} />
            Book your onboarding call →
          </a>
        </div>
      )}

      {/* Progress nudge — shown when hub is not yet unlocked and not admin */}
      {!adminView && !hubComplete && filledCount > 0 && (
        <div style={{
          marginTop: 16, padding: '14px 18px',
          borderRadius: 10, background: 'var(--card)',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12, fontSize: 13,
          color: 'var(--muted-foreground)',
        }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>
              {ONBOARDING_UNLOCK_THRESHOLD - filledCount > 0
                ? `${ONBOARDING_UNLOCK_THRESHOLD - filledCount} more fields`
                : 'Hit Save'
              }
            </span>
            {ONBOARDING_UNLOCK_THRESHOLD - filledCount > 0
              ? ' to unlock the full dashboard and book your onboarding call.'
              : ' to unlock the full dashboard and book your onboarding call.'
            }
          </div>
        </div>
      )}
    </div>
  )
}
