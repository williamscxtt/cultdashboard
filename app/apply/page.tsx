'use client'

import { useState } from 'react'
import { Zap, ArrowRight, ArrowLeft, Check, Phone } from 'lucide-react'

// ── Options ──────────────────────────────────────────────────────────────────

const CREATOR_TYPE_OPTIONS = [
  {
    value: 'creator',
    label: 'Pure Content Creator',
    desc: 'Building a brand and audience — income comes from deals, sponsorships, platforms, or digital products',
  },
  {
    value: 'coach',
    label: 'Coaching / Service Business',
    desc: 'Using content to attract clients and scale a coaching, consulting, or service business',
  },
  {
    value: 'both',
    label: 'Both',
    desc: 'Building an audience AND running a coaching or service business',
  },
]

const PLATFORM_OPTIONS = ['Instagram', 'TikTok', 'YouTube', 'Not posting yet']

const FREQUENCY_OPTIONS = ['0–5 posts', '6–15 posts', '16–30 posts', 'Daily or more']

const STRATEGIES_TRIED_OPTIONS = [
  'Posting consistently',
  'Outreaching to potential clients',
  'Posting across platforms',
  'Email campaigns',
  'Referrals',
  'None yet',
]

const MONTHLY_INCOME_STEPS = [
  'Under £1,200', '£1,200–£2,000', '£2,000–£3,500', '£3,500–£5,000',
  '£5,000–£7,000', '£7,000–£10,000', '£10,000–£15,000', '£15,000–£20,000', '£20,000+',
]

// Investment amount — "Not right now" triggers hard disqualify
const INVESTMENT_AMOUNT_STEPS = [
  'Not right now',
  '£250–£1,000',
  '£1,000–£2,000',
  '£2,000+',
]

const INCOME_GOAL_STEPS = [
  'Under £2,500/month', '£2,500–£5,000/month', '£5,000–£7,500/month',
  '£7,500–£10,000/month', '£10,000–£20,000/month', '£20,000–£50,000/month', '£50,000+/month',
]

const WANTS_OPTIONS = [
  {
    value: 'dashboard',
    label: 'Dashboard access only',
    desc: 'I want the AI tools, content system, analytics, and scripts — self-directed',
  },
  {
    value: 'coaching',
    label: 'Dashboard + coaching from Will',
    desc: 'I want direct guidance, accountability, and Will working with me personally',
  },
]

// ── Types ─────────────────────────────────────────────────────────────────────

type FormData = {
  creator_type: string
  wants: string
  first_name: string
  last_name: string
  email: string
  phone: string
  instagram_handle: string
  platforms: string[]
  posting_frequency: string
  niche: string
  biggest_obstacle: string
  strategies_tried: string[]
  monthly_income: string
  investment_amount: string
  income_goal: string
  business_mindset: string
}

type Outcome = 'qualified' | 'payment' | 'disqualified'

function getOutcome(form: FormData): Outcome {
  const inv = form.investment_amount

  // Hard disqualify — can't invest
  if (inv === 'Not right now') return 'disqualified'

  // Low investment → always self-serve payment
  if (inv === '£250–£1,000') return 'payment'

  // High investment (£2,000+) → Will always wants to call regardless of coaching preference
  if (inv === '£2,000+') return 'qualified'

  // Mid investment (£1,000–£2,000)
  if (inv === '£1,000–£2,000') {
    // Dashboard only or not ready to commit → self-serve
    if (form.wants === 'dashboard' || form.business_mindset === 'No') return 'payment'
    // Wants coaching and ready to commit → qualified
    return 'qualified'
  }

  return 'qualified'
}

const TOTAL_STEPS = 5

// ── Component ─────────────────────────────────────────────────────────────────

export default function ApplyPage() {
  const [step, setStep]             = useState(1)
  const [loading, setLoading]       = useState(false)
  const [processing, setProcessing] = useState(false)
  const [done, setDone]             = useState<Outcome | null>(null)
  const [form, setForm]             = useState<FormData>({
    creator_type: '', wants: '',
    first_name: '', last_name: '', email: '', phone: '', instagram_handle: '',
    platforms: [], posting_frequency: '', niche: '',
    biggest_obstacle: '', strategies_tried: [],
    monthly_income:    MONTHLY_INCOME_STEPS[2],
    investment_amount: INVESTMENT_AMOUNT_STEPS[1],
    income_goal:       INCOME_GOAL_STEPS[2],
    business_mindset: '',
  })

  function set(field: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggle(field: 'platforms' | 'strategies_tried', value: string) {
    setForm(prev => {
      const arr = prev[field] as string[]
      return { ...prev, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] }
    })
  }

  function canProceed() {
    if (step === 1) return !!(form.creator_type && form.platforms.length > 0 && form.niche.trim())
    if (step === 2) return !!(form.posting_frequency && form.monthly_income)
    if (step === 3) return !!(form.biggest_obstacle.trim() && form.strategies_tried.length > 0)
    if (step === 4) return !!(form.wants && form.investment_amount && form.income_goal && form.business_mindset)
    if (step === 5) return !!(
      form.first_name.trim() && form.last_name.trim() &&
      form.email.trim() && form.phone.trim().startsWith('+') && form.phone.trim().length >= 10 &&
      form.instagram_handle.trim()
    )
    return true
  }

  async function handleNext() {
    if (step < TOTAL_STEPS) { setStep(s => s + 1); return }
    setLoading(true)
    setProcessing(true)
    const outcome = getOutcome(form)
    try {
      await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, outcome }),
      })
    } catch { /* non-blocking */ }
    await new Promise(resolve => setTimeout(resolve, 2200))
    setLoading(false)
    setProcessing(false)
    setDone(outcome)
  }

  function handleBack() {
    if (step > 1) setStep(s => s - 1)
  }

  const pct       = Math.round(((step - 1) / TOTAL_STEPS) * 100)
  const firstName = form.first_name.trim()

  // ── Reviewing screen ───────────────────────────────────────────────────────
  if (processing) {
    return (
      <PageShell>
        <div style={{ textAlign: 'center', animation: 'fadeUp 0.4s ease both' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              border: '2.5px solid rgba(59,130,246,0.15)',
              borderTopColor: '#3B82F6',
              animation: 'spin 0.85s linear infinite',
            }} />
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f0f0f0', margin: '0 0 8px', letterSpacing: '-0.4px' }}>
                Reviewing your answers…
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                Matching you against Creator Cult criteria
              </p>
            </div>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </PageShell>
    )
  }

  // ── Disqualified screen ────────────────────────────────────────────────────
  if (done === 'disqualified') {
    return (
      <PageShell>
        <div style={{ animation: 'fadeUp 0.4s ease both', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
          }}>
            <span style={{ fontSize: 24 }}>🤝</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f0f0f0', marginBottom: 12, letterSpacing: '-0.5px' }}>
            Not the right time{firstName ? `, ${firstName}` : ''}.
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, maxWidth: 380, margin: '0 auto 20px' }}>
            Creator Cult requires an investment to get access. When you&apos;re in a position to move, come back and apply — the door is open.
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 8 }}>
            Follow Will on Instagram in the meantime for free content strategy.
          </p>
        </div>
      </PageShell>
    )
  }

  // ── Payment screen ─────────────────────────────────────────────────────────
  if (done === 'payment') {
    return (
      <PageShell>
        <div style={{ animation: 'fadeUp 0.4s ease both', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
          }}>
            <Check size={26} color="rgba(59,130,246,0.9)" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f0f0f0', marginBottom: 10, letterSpacing: '-0.5px' }}>
            You&apos;re in{firstName ? `, ${firstName}` : ''}.
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, maxWidth: 420, margin: '0 auto 32px' }}>
            Pick a plan below and get immediate access to the Creator Cult dashboard — scripts, analytics, hook lab, content calendar, and everything else.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 420, margin: '0 auto' }}>
            {/* Monthly */}
            <a
              href="https://buy.stripe.com/14A9AS0Ee0ihe8Cagc9IQ1G"
              style={{ display: 'block', padding: '20px 24px', borderRadius: 12, textDecoration: 'none', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.35)', transition: 'background 0.15s, border-color 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(59,130,246,0.18)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(59,130,246,0.6)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(59,130,246,0.1)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(59,130,246,0.35)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>Monthly</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#93c5fd', letterSpacing: '-0.5px' }}>
                    £495<span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>/mo</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                  Cancel anytime <ArrowRight size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />
                </div>
              </div>
            </a>

            {/* 6-month — NOTE: update this Stripe URL to a £2,000 product */}
            <a
              href="https://buy.stripe.com/dRm3cuev48ON3tY8849IQ1I"
              style={{ display: 'block', padding: '20px 24px', borderRadius: 12, textDecoration: 'none', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', transition: 'background 0.15s, border-color 0.15s', position: 'relative' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.22)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.12)' }}
            >
              <div style={{
                position: 'absolute', top: -10, right: 16,
                fontSize: 10, fontWeight: 800, color: '#000',
                background: '#4ade80', padding: '3px 8px', borderRadius: 99, letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>
                Best value
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>6 Months</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#f0f0f0', letterSpacing: '-0.5px' }}>
                    £2,000<span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}> total</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                  Save £970 <ArrowRight size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />
                </div>
              </div>
            </a>
          </div>

          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)', marginTop: 28, lineHeight: 1.6 }}>
            Questions? DM Will on Instagram before you commit.
          </p>
        </div>
      </PageShell>
    )
  }

  // ── Qualified screen ───────────────────────────────────────────────────────
  if (done === 'qualified') {
    return (
      <PageShell>
        <div style={{ animation: 'fadeUp 0.4s ease both', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
          }}>
            <Check size={26} color="rgba(74,222,128,0.9)" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f0f0f0', marginBottom: 10, letterSpacing: '-0.5px' }}>
            Application received{firstName ? `, ${firstName}` : ''}.
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, maxWidth: 380, margin: '0 auto 20px' }}>
            Will reviews every application personally. If it&apos;s a fit, he&apos;ll call you on{' '}
            <strong style={{ color: 'rgba(255,255,255,0.65)' }}>{form.phone}</strong> — usually within 24 hours.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Phone size={13} color="rgba(255,255,255,0.3)" />
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', margin: 0 }}>Keep your phone nearby.</p>
          </div>
        </div>
      </PageShell>
    )
  }

  // ── Main quiz ──────────────────────────────────────────────────────────────
  return (
    <PageShell>

      {/* Progress */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {step < TOTAL_STEPS ? `${pct}% complete` : 'Almost there'}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)' }}>{step} / {TOTAL_STEPS}</span>
        </div>
        <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: '#3B82F6', borderRadius: 2, transition: 'width 0.4s ease' }} />
        </div>
      </div>

      <div key={step} style={{ animation: 'fadeUp 0.35s ease both' }}>

        {/* ── Step 1: Who are you ────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <h1 style={headingStyle}>Let&apos;s figure out where you&apos;re at</h1>
            <p style={subStyle}>Answer honestly — the better the match, the better the result.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <Field label="What best describes what you're building?">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {CREATOR_TYPE_OPTIONS.map(({ value, label, desc }) => (
                    <button
                      key={value}
                      className={`pill-option${form.creator_type === value ? ' selected' : ''}`}
                      onClick={() => set('creator_type', value)}
                      style={{ padding: '14px 16px', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}
                    >
                      <span style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {form.creator_type === value && <Check size={11} style={{ flexShrink: 0 }} />}
                        {label}
                      </span>
                      <span style={{ fontSize: 12, opacity: 0.5, fontWeight: 400 }}>{desc}</span>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="What platforms are you posting on? (select all that apply)">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {PLATFORM_OPTIONS.map(opt => (
                    <button key={opt} className={`pill-option${form.platforms.includes(opt) ? ' selected' : ''}`} onClick={() => toggle('platforms', opt)}>
                      {form.platforms.includes(opt) && <Check size={11} style={{ marginRight: 5, flexShrink: 0 }} />}
                      {opt}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="What niche or industry are you in?">
                <input className="apply-input" type="text" placeholder="e.g. fitness coaching, trading, business mentoring" value={form.niche} onChange={e => set('niche', e.target.value)} />
              </Field>
            </div>
          </>
        )}

        {/* ── Step 2: Current activity ───────────────────────────────────── */}
        {step === 2 && (
          <>
            <StepBadge text="You're further along than most people who apply here." />
            <h1 style={headingStyle}>How active are you right now?</h1>
            <p style={subStyle}>Give us an honest snapshot of your output and where you are financially.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <Field label="In the last 30 days, how many posts have you published?">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {FREQUENCY_OPTIONS.map(opt => (
                    <button key={opt} className={`pill-option${form.posting_frequency === opt ? ' selected' : ''}`} onClick={() => set('posting_frequency', opt)}>
                      {form.posting_frequency === opt && <Check size={11} style={{ marginRight: 5, flexShrink: 0 }} />}
                      {opt}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Total monthly income from all sources">
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '0 0 14px', lineHeight: 1.5 }}>
                  Include everything — employment, business revenue, content income, side income. Combined total.
                </p>
                <MoneySlider steps={MONTHLY_INCOME_STEPS} value={form.monthly_income} onChange={v => set('monthly_income', v)} />
              </Field>
            </div>
          </>
        )}

        {/* ── Step 3: What's in the way ──────────────────────────────────── */}
        {step === 3 && (
          <>
            <StepBadge text="Most people at your level are 1–2 moves away from a breakthrough." />
            <h1 style={headingStyle}>What&apos;s been in the way?</h1>
            <p style={subStyle}>Be direct — the more specific you are, the clearer the path forward.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <Field label="What's been the biggest thing stopping your growth?">
                <textarea
                  className="apply-input apply-textarea"
                  placeholder="Be specific — what's the actual blocker?"
                  value={form.biggest_obstacle}
                  onChange={e => set('biggest_obstacle', e.target.value)}
                  rows={3}
                />
              </Field>

              <Field label="What have you already tried? (select all that apply)">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {STRATEGIES_TRIED_OPTIONS.map(opt => (
                    <button key={opt} className={`pill-option${form.strategies_tried.includes(opt) ? ' selected' : ''}`} onClick={() => toggle('strategies_tried', opt)}>
                      {form.strategies_tried.includes(opt) && <Check size={11} style={{ marginRight: 5, flexShrink: 0 }} />}
                      {opt}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </>
        )}

        {/* ── Step 4: Commitment & investment ───────────────────────────── */}
        {step === 4 && (
          <>
            <StepBadge text="Almost there. One final check before we match you." />
            <h1 style={headingStyle}>How serious are you about changing it?</h1>
            <p style={subStyle}>We need to understand what you&apos;re looking for and what you&apos;re in a position to do.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

              <Field label="What do you want from Creator Cult?">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {WANTS_OPTIONS.map(({ value, label, desc }) => (
                    <button
                      key={value}
                      className={`pill-option${form.wants === value ? ' selected' : ''}`}
                      onClick={() => set('wants', value)}
                      style={{ padding: '14px 16px', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}
                    >
                      <span style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {form.wants === value && <Check size={11} style={{ flexShrink: 0 }} />}
                        {label}
                      </span>
                      <span style={{ fontSize: 12, opacity: 0.5, fontWeight: 400 }}>{desc}</span>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="How much are you in a position to invest?">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {INVESTMENT_AMOUNT_STEPS.map(opt => {
                    const isDisqualify = opt === 'Not right now'
                    return (
                      <button
                        key={opt}
                        className={`pill-option${form.investment_amount === opt ? ' selected' : ''}`}
                        onClick={() => set('investment_amount', opt)}
                        style={isDisqualify ? { opacity: 0.6 } : {}}
                      >
                        {form.investment_amount === opt && <Check size={11} style={{ marginRight: 8, flexShrink: 0 }} />}
                        {opt}
                      </button>
                    )
                  })}
                </div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 12, lineHeight: 1.5 }}>
                  Dashboard access starts from £250. Coaching programmes start from £1,000.
                </p>
              </Field>

              <Field label="Your desired monthly income goal">
                <MoneySlider steps={INCOME_GOAL_STEPS} value={form.income_goal} onChange={v => set('income_goal', v)} />
              </Field>

              <Field label="This programme is a business investment, not a free coaching session. Are you prepared to engage with a business mindset and make decisions based on outcomes?">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { display: "Yes — I'm ready to commit", value: 'Yes' },
                    { display: "No — I'm not there yet",    value: 'No'  },
                  ].map(({ display, value }) => (
                    <button key={value} className={`pill-option${form.business_mindset === value ? ' selected' : ''}`} onClick={() => set('business_mindset', value)}>
                      {form.business_mindset === value && <Check size={11} style={{ marginRight: 5, flexShrink: 0 }} />}
                      {display}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </>
        )}

        {/* ── Step 5: Contact info ───────────────────────────────────────── */}
        {step === 5 && (
          <>
            <div style={{
              padding: '14px 16px', borderRadius: 10, marginBottom: 24,
              background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.22)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', marginBottom: 4 }}>Your result is ready</div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.55 }}>
                Based on your answers, we&apos;ve got a clear picture. Enter your details below to see where you qualify.
              </p>
            </div>

            <h1 style={headingStyle}>One last thing</h1>
            <p style={subStyle}>Where do we send your result?</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="First name">
                  <input className="apply-input" type="text" placeholder="First" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
                </Field>
                <Field label="Last name">
                  <input className="apply-input" type="text" placeholder="Last" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
                </Field>
              </div>
              <Field label="Email address">
                <input className="apply-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
              </Field>
              <Field label="Phone (WhatsApp — include country code)">
                <input className="apply-input" type="tel" placeholder="+44 7911 123456" value={form.phone} onChange={e => set('phone', e.target.value)} />
                {form.phone.trim() && !form.phone.trim().startsWith('+') && (
                  <p style={{ fontSize: 11, color: 'rgba(255,110,60,0.9)', marginTop: 5 }}>Start with your country code — e.g. +44 for UK, +1 for US</p>
                )}
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', marginTop: 5 }}>Make sure it&apos;s the number you use on WhatsApp.</p>
              </Field>
              <Field label="Instagram handle">
                <input className="apply-input" type="text" placeholder="@yourhandle" value={form.instagram_handle} onChange={e => set('instagram_handle', e.target.value)} />
              </Field>
            </div>
          </>
        )}

      </div>

      {/* CTAs */}
      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="apply-btn" onClick={handleNext} disabled={!canProceed() || loading}>
          {loading
            ? 'Submitting…'
            : step === TOTAL_STEPS
              ? <>See my result <ArrowRight size={16} /></>
              : <>Continue <ArrowRight size={16} /></>
          }
        </button>

        {step > 1 && (
          <button className="apply-back-btn" onClick={handleBack}>
            <ArrowLeft size={14} /> Back
          </button>
        )}
      </div>

      {step === 1 && (
        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 20 }}>
          Already a member?{' '}
          <a href="/login" style={{ color: '#3B82F6', textDecoration: 'none', fontWeight: 600 }}>Sign in →</a>
        </p>
      )}
    </PageShell>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const headingStyle: React.CSSProperties = {
  fontSize: 26, fontWeight: 800, color: '#f0f0f0',
  marginBottom: 8, letterSpacing: '-0.5px', lineHeight: 1.2,
}
const subStyle: React.CSSProperties = {
  fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 32, lineHeight: 1.6,
}

function StepBadge({ text }: { text: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', marginBottom: 12,
      padding: '4px 12px', borderRadius: 99,
      background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {text}
      </span>
    </div>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 'max(24px, env(safe-area-inset-top))', paddingBottom: 'max(24px, env(safe-area-inset-bottom))', paddingLeft: 'max(16px, env(safe-area-inset-left))', paddingRight: 'max(16px, env(safe-area-inset-right))' }}>
      <style>{`
        @keyframes fadeUp    { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes glowPulse { 0%,100% { opacity:0.07; } 50% { opacity:0.14; } }
        .apply-input {
          width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
          color: #f0f0f0; border-radius: 8px; padding: 0 14px; height: 46px; outline: none;
          font-size: 14px; font-weight: 500; font-family: inherit; box-sizing: border-box;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .apply-textarea { height: auto !important; padding: 12px 14px !important; resize: vertical; min-height: 84px; line-height: 1.6; }
        .apply-input:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
        .apply-input::placeholder { color: #555; }
        .apply-btn {
          width: 100%; height: 48px; background: #3B82F6; color: #fff; border: none;
          border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer;
          font-family: inherit; transition: background 0.15s, opacity 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .apply-btn:hover:not(:disabled) { background: #60A5FA; }
        .apply-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .apply-back-btn {
          width: 100%; height: 40px; background: transparent; color: rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
          font-family: inherit; transition: color 0.15s, border-color 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .apply-back-btn:hover { color: rgba(255,255,255,0.55); border-color: rgba(255,255,255,0.18); }
        .pill-option {
          padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: 600;
          cursor: pointer; border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.5);
          background: transparent; font-family: inherit; transition: all 0.12s; text-align: left;
          display: flex; align-items: center;
        }
        .pill-option:hover { border-color: rgba(59,130,246,0.5); color: #a0c4ff; }
        .pill-option.selected { border-color: #3B82F6; background: rgba(59,130,246,0.12); color: #93c5fd; }
        .money-slider {
          -webkit-appearance: none; appearance: none; width: 100%; height: 4px;
          border-radius: 2px; outline: none; cursor: pointer;
          background: linear-gradient(to right, #3B82F6 var(--slider-fill, 0%), rgba(255,255,255,0.12) var(--slider-fill, 0%));
        }
        .money-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none; width: 22px; height: 22px;
          border-radius: 50%; background: #3B82F6; cursor: pointer;
          border: 2.5px solid #000;
          box-shadow: 0 0 0 1.5px rgba(59,130,246,0.7), 0 0 14px rgba(59,130,246,0.4);
          transition: box-shadow 0.15s, transform 0.1s;
        }
        .money-slider:active::-webkit-slider-thumb { transform: scale(1.15); box-shadow: 0 0 0 2px rgba(59,130,246,0.9), 0 0 22px rgba(59,130,246,0.6); }
        .money-slider::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: #3B82F6; cursor: pointer; border: 2.5px solid #000; box-shadow: 0 0 0 1.5px rgba(59,130,246,0.7); }
        .money-slider::-moz-range-track { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.12); }
        .money-slider::-moz-range-progress { height: 4px; border-radius: 2px; background: #3B82F6; }
      `}</style>

      <div style={{ position: 'fixed', top: -100, left: '50%', transform: 'translateX(-50%)', width: 500, height: 400, background: '#3B82F6', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.07, animation: 'glowPulse 5s ease-in-out infinite', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 520, animation: 'fadeUp 0.5s ease both', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 40, justifyContent: 'center' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={16} color="white" fill="white" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#f0f0f0', letterSpacing: '-0.3px' }}>Creator Cult</span>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 8, letterSpacing: '0.01em', lineHeight: 1.5 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function MoneySlider({ steps, value, onChange }: { steps: string[]; value: string; onChange: (val: string) => void }) {
  const idx        = steps.indexOf(value)
  const currentIdx = idx === -1 ? 0 : idx
  const pct        = steps.length > 1 ? (currentIdx / (steps.length - 1)) * 100 : 0

  return (
    <div style={{ paddingTop: 4 }}>
      <div style={{ textAlign: 'center', fontSize: 22, fontWeight: 800, color: '#93c5fd', marginBottom: 20, letterSpacing: '-0.5px', minHeight: 30, transition: 'color 0.15s' }}>
        {steps[currentIdx]}
      </div>
      <input
        type="range" min={0} max={steps.length - 1} value={currentIdx}
        onChange={e => onChange(steps[parseInt(e.target.value)])}
        className="money-slider"
        style={{ '--slider-fill': `${pct}%` } as React.CSSProperties}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>{steps[0]}</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>{steps[steps.length - 1]}</span>
      </div>
    </div>
  )
}
