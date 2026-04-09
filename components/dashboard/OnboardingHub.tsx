'use client'

import { useState, useCallback } from 'react'
import { ChevronDown, ChevronUp, CheckCircle, Sparkles, Save } from 'lucide-react'
import type { Profile, IntroStructured, IntroInsights } from '@/lib/types'
import { Button } from '@/components/ui'

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

const SECTIONS: SectionDef[] = [
  {
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
  },
  {
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
  },
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
  },
  {
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
]

// ─── All field keys in one flat list ──────────────────────────────────────────
const ALL_KEYS = SECTIONS.flatMap(s => s.fields.map(f => f.key))

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
          background: completedCount === total ? 'hsl(142 60% 40%)' : 'var(--muted)',
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
  const [form, setForm] = useState<Record<string, string>>(() => buildInitialForm(profile))
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

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
    <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>

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
        <p style={{ fontSize: 14, color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.5 }}>
          {adminView
            ? 'Client profile data — all onboarding fields.'
            : 'The more you put in, the better your AI gets. Come back and update whenever something changes.'
          }
        </p>
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
          border: '1px solid hsl(142 50% 75%)',
          borderRadius: 10, padding: 20, marginBottom: 20,
          background: 'hsl(142 50% 97%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <CheckCircle size={14} color="hsl(142 60% 40%)" />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'hsl(142 60% 35%)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              AI Personalised
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
            {aiNiche && (
              <div>
                <div style={{ fontSize: 11, color: 'hsl(142 40% 50%)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Niche</div>
                <div style={{ fontSize: 13, color: 'hsl(142 60% 25%)', lineHeight: 1.5 }}>{aiNiche}</div>
              </div>
            )}
            {aiIdealClient && (
              <div>
                <div style={{ fontSize: 11, color: 'hsl(142 40% 50%)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Ideal client</div>
                <div style={{ fontSize: 13, color: 'hsl(142 60% 25%)', lineHeight: 1.5 }}>{aiIdealClient}</div>
              </div>
            )}
            {aiTransformation && (
              <div>
                <div style={{ fontSize: 11, color: 'hsl(142 40% 50%)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Transformation</div>
                <div style={{ fontSize: 13, color: 'hsl(142 60% 25%)', lineHeight: 1.5 }}>{aiTransformation}</div>
              </div>
            )}
            {aiContentAngle && (
              <div>
                <div style={{ fontSize: 11, color: 'hsl(142 40% 50%)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Content angle</div>
                <div style={{ fontSize: 13, color: 'hsl(142 60% 25%)', lineHeight: 1.5 }}>{aiContentAngle}</div>
              </div>
            )}
            {insights?.strengths && insights.strengths.length > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, color: 'hsl(142 40% 50%)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Strengths</div>
                <div style={{ fontSize: 13, color: 'hsl(142 60% 25%)', lineHeight: 1.5 }}>{insights.strengths.join(' · ')}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Accordion sections */}
      {SECTIONS.map(section => (
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
    </div>
  )
}
