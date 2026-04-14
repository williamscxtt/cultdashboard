'use client'

import { useState } from 'react'
import { Zap, ArrowRight, Check, Phone } from 'lucide-react'

// ── Options ──────────────────────────────────────────────────────────────────

const PLATFORM_OPTIONS = ['Instagram', 'TikTok', 'YouTube', 'Not posting yet']

const FREQUENCY_OPTIONS = ['0–5 posts', '6–15 posts', '16–30 posts', 'Daily or more']

const IF_NOTHING_CHANGES_OPTIONS = [
  "I'd stay consistent but plateau — income and growth wouldn't move",
  "I'd lose momentum and motivation would drop",
  "I'd lose leads or clients — what I'm doing is becoming less effective",
  "I'd fall behind competitors who are scaling faster",
  "Honestly, that would be a serious problem — I need growth soon",
]

const BIGGEST_OBSTACLE_OPTIONS = [
  "Not knowing how to position content to attract clients",
  "Doing everything myself — spreading too thin",
  "No clear plan to grow",
  "Not knowing what to do next",
]

const STRATEGIES_TRIED_OPTIONS = [
  'Posting consistently',
  'Outreaching to potential clients',
  'Posting across platforms',
  'Email campaigns',
  'Referrals',
  'None yet',
]

const MONTHLY_INCOME_OPTIONS = [
  'Under £1,200',
  '£1,200–£2,000',
  '£2,000–£3,500',
  '£3,500–£5,000',
  '£5,000–£7,000',
  '£7,000–£10,000',
  '£10,000–£15,000',
  '£15,000–£20,000',
  '£20,000+',
]

const INVESTMENT_APPROACH_OPTIONS = [
  { label: 'I can invest immediately', disqualify: false },
  { label: 'I need to plan and allocate capital first', disqualify: false },
  { label: "I'm not in a position to invest right now", disqualify: true },
]

const INVESTMENT_AMOUNT_OPTIONS = [
  { label: '£1,000–£2,000', disqualify: false },
  { label: '£2,000–£3,500', disqualify: false },
  { label: '£3,500–£5,000', disqualify: false },
  { label: '£5,000–£7,000', disqualify: false },
  { label: '£7,000–£10,000', disqualify: false },
  { label: '£10,000+', disqualify: false },
  { label: "I'm not in a position to invest right now", disqualify: true },
]

const INCOME_GOAL_OPTIONS = [
  'Under £2,500/month',
  '£2,500–£5,000/month',
  '£5,000–£7,500/month',
  '£7,500–£10,000/month',
  '£10,000–£20,000/month',
  '£20,000–£50,000/month',
  '£50,000+/month',
]

// ── Types ─────────────────────────────────────────────────────────────────────

type FormData = {
  first_name: string
  last_name: string
  date_of_birth: string
  email: string
  phone: string
  instagram_handle: string
  platforms: string[]
  posting_frequency: string
  niche: string
  if_nothing_changes: string
  biggest_obstacle: string
  strategies_tried: string[]
  monthly_income: string
  investment_approach: string
  investment_amount: string
  income_goal: string
  business_mindset: string
}

function isDisqualified(form: FormData): boolean {
  const approachDisq = INVESTMENT_APPROACH_OPTIONS.find(o => o.label === form.investment_approach)?.disqualify
  const amountDisq = INVESTMENT_AMOUNT_OPTIONS.find(o => o.label === form.investment_amount)?.disqualify
  return !!(approachDisq || amountDisq || form.business_mindset === 'No')
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ApplyPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<'qualified' | 'disqualified' | null>(null)
  const [form, setForm] = useState<FormData>({
    first_name: '', last_name: '', date_of_birth: '', email: '', phone: '',
    instagram_handle: '', platforms: [], posting_frequency: '', niche: '',
    if_nothing_changes: '', biggest_obstacle: '', strategies_tried: [],
    monthly_income: '', investment_approach: '', investment_amount: '',
    income_goal: '', business_mindset: '',
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
    if (step === 1) return (
      form.first_name.trim() && form.last_name.trim() &&
      form.email.trim() && form.phone.trim().startsWith('+') && form.phone.trim().length >= 10 &&
      form.instagram_handle.trim() && form.date_of_birth
    )
    if (step === 2) return form.platforms.length > 0 && form.posting_frequency && form.niche.trim()
    if (step === 3) return form.if_nothing_changes && form.biggest_obstacle && form.strategies_tried.length > 0
    if (step === 4) return form.monthly_income && form.investment_approach && form.investment_amount && form.income_goal && form.business_mindset
    return true
  }

  async function handleNext() {
    if (step < 4) { setStep(s => s + 1); return }

    setLoading(true)
    const qualified = !isDisqualified(form)
    try {
      await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, qualified }),
      })
    } catch { /* non-blocking */ }
    setLoading(false)
    setDone(qualified ? 'qualified' : 'disqualified')
  }

  const totalSteps = 4
  const pct = Math.round((step - 1) / totalSteps * 100)
  const firstName = form.first_name.trim()

  // ── Disqualification screen ────────────────────────────────────────────────
  if (done === 'disqualified') {
    return (
      <PageShell>
        <div style={{ animation: 'fadeUp 0.4s ease both', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <span style={{ fontSize: 24 }}>🤝</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f0f0f0', marginBottom: 12, letterSpacing: '-0.5px' }}>
            Not the right fit right now{firstName ? `, ${firstName}` : ''}.
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, maxWidth: 380, margin: '0 auto' }}>
            Creator Cult requires an upfront investment to get started. When you&apos;re in a position to invest in your growth, come back and apply — the door is open.
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 28 }}>
            In the meantime, follow Will on Instagram for free content strategy tips.
          </p>
        </div>
      </PageShell>
    )
  }

  // ── Qualified confirmation screen ──────────────────────────────────────────
  if (done === 'qualified') {
    return (
      <PageShell>
        <div style={{ animation: 'fadeUp 0.4s ease both', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Check size={26} color="rgba(74,222,128,0.9)" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f0f0f0', marginBottom: 10, letterSpacing: '-0.5px' }}>
            Application received{firstName ? `, ${firstName}` : ''}.
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, maxWidth: 380, margin: '0 auto 20px' }}>
            Will reviews every application personally. If it&apos;s a fit, he&apos;ll call you on <strong style={{ color: 'rgba(255,255,255,0.65)' }}>{form.phone}</strong> — usually within 24 hours.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Phone size={13} color="rgba(255,255,255,0.3)" />
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', margin: 0 }}>Keep your phone nearby.</p>
          </div>
        </div>
      </PageShell>
    )
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <PageShell>
      {/* Progress bar */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Step {step} of {totalSteps}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{pct}%</span>
        </div>
        <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: '#3B82F6', borderRadius: 2, transition: 'width 0.4s ease' }} />
        </div>
      </div>

      <div key={step} style={{ animation: 'fadeUp 0.35s ease both' }}>

        {/* ── Step 1: About you ── */}
        {step === 1 && (
          <>
            <h1 style={headingStyle}>Apply for Creator Cult</h1>
            <p style={subStyle}>This is an application — not a sign-up page. Will personally reviews every form and reaches out to the ones he can genuinely help.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="First name">
                  <input className="apply-input" type="text" placeholder="First" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
                </Field>
                <Field label="Last name">
                  <input className="apply-input" type="text" placeholder="Last" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
                </Field>
              </div>
              <Field label="Date of birth">
                <input className="apply-input" type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} style={{ colorScheme: 'dark' }} />
              </Field>
              <Field label="Email address">
                <input className="apply-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
              </Field>
              <Field label="Phone (WhatsApp — include country code)">
                <input className="apply-input" type="tel" placeholder="+44 7911 123456" value={form.phone} onChange={e => set('phone', e.target.value)} />
                {form.phone.trim() && !form.phone.trim().startsWith('+') && (
                  <p style={{ fontSize: 11, color: 'rgba(255,110,60,0.9)', marginTop: 5 }}>Start with your country code — e.g. +44 for UK, +1 for US</p>
                )}
              </Field>
              <Field label="Instagram handle">
                <input className="apply-input" type="text" placeholder="@yourhandle" value={form.instagram_handle} onChange={e => set('instagram_handle', e.target.value)} />
              </Field>
            </div>
          </>
        )}

        {/* ── Step 2: Your content ── */}
        {step === 2 && (
          <>
            <h1 style={headingStyle}>Your content right now</h1>
            <p style={subStyle}>Give us an honest picture of where you are with content today.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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

              <Field label="In the last 30 days, how many posts have you published?">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {FREQUENCY_OPTIONS.map(opt => (
                    <button key={opt} className={`pill-option${form.posting_frequency === opt ? ' selected' : ''}`} onClick={() => set('posting_frequency', opt)}>
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

        {/* ── Step 3: Your situation ── */}
        {step === 3 && (
          <>
            <h1 style={headingStyle}>What&apos;s actually going on?</h1>
            <p style={subStyle}>Be direct — the more honest you are, the better Will can tell if he can actually move the needle for you.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <Field label="If your business stays exactly the same for the next 6 months, what's the most likely outcome?">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {IF_NOTHING_CHANGES_OPTIONS.map(opt => (
                    <button key={opt} className={`pill-option${form.if_nothing_changes === opt ? ' selected' : ''}`} onClick={() => set('if_nothing_changes', opt)}>
                      {opt}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="What's been the biggest thing stopping your business from growing?">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {BIGGEST_OBSTACLE_OPTIONS.map(opt => (
                    <button key={opt} className={`pill-option${form.biggest_obstacle === opt ? ' selected' : ''}`} onClick={() => set('biggest_obstacle', opt)}>
                      {opt}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="What have you already tried to grow? (select all that apply)">
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

        {/* ── Step 4: Investment & commitment ── */}
        {step === 4 && (
          <>
            <h1 style={headingStyle}>Investment & commitment</h1>
            <p style={subStyle}>Last section. Creator Cult is a serious programme — we need to know you&apos;re in the right position to make it work.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <Field label="What is your current average monthly income from all sources?">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {MONTHLY_INCOME_OPTIONS.map(opt => (
                    <button key={opt} className={`pill-option${form.monthly_income === opt ? ' selected' : ''}`} onClick={() => set('monthly_income', opt)}>
                      {opt}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="If a clear plan for growth exists, how would you approach investing in it?">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {INVESTMENT_APPROACH_OPTIONS.map(({ label }) => (
                    <button key={label} className={`pill-option${form.investment_approach === label ? ' selected' : ''}`} onClick={() => set('investment_approach', label)}>
                      {label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="How much are you prepared to invest in the growth of your business?">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {INVESTMENT_AMOUNT_OPTIONS.map(({ label }) => (
                    <button key={label} className={`pill-option${form.investment_amount === label ? ' selected' : ''}`} onClick={() => set('investment_amount', label)}>
                      {label}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 8, lineHeight: 1.5 }}>
                  If you have less than £1,000 to invest right now, we don&apos;t recommend booking a call — Creator Cult requires an upfront commitment.
                </p>
              </Field>

              <Field label="What is your desired monthly income goal?">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {INCOME_GOAL_OPTIONS.map(opt => (
                    <button key={opt} className={`pill-option${form.income_goal === opt ? ' selected' : ''}`} onClick={() => set('income_goal', opt)}>
                      {opt}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="This call is a business evaluation, not a free coaching session. Are you prepared to engage with a business mindset and make decisions based on outcomes?">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {['Yes — I&apos;m ready to make a decision', 'No — I&apos;m not ready yet'].map(opt => {
                    const raw = opt.replace(/&apos;/g, "'")
                    const isYes = raw.startsWith('Yes')
                    const storedVal = isYes ? 'Yes' : 'No'
                    return (
                      <button key={raw} className={`pill-option${form.business_mindset === storedVal ? ' selected' : ''}`} onClick={() => set('business_mindset', storedVal)}>
                        {raw}
                      </button>
                    )
                  })}
                </div>
              </Field>
            </div>
          </>
        )}

      </div>

      {/* CTA */}
      <div style={{ marginTop: 32 }}>
        <button className="apply-btn" onClick={handleNext} disabled={!canProceed() || loading}>
          {loading ? 'Submitting…' : step === 4 ? <>Submit application <ArrowRight size={16} /></> : <>Continue <ArrowRight size={16} /></>}
        </button>
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

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes glowPulse { 0%,100% { opacity:0.12; } 50% { opacity:0.22; } }
        .apply-input {
          width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
          color: #f0f0f0; border-radius: 8px; padding: 0 14px; height: 46px; outline: none;
          font-size: 14px; font-weight: 500; font-family: inherit; box-sizing: border-box;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
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
        .pill-option {
          padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: 600;
          cursor: pointer; border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.5);
          background: transparent; font-family: inherit; transition: all 0.12s; text-align: left;
          display: flex; align-items: center;
        }
        .pill-option:hover { border-color: rgba(59,130,246,0.5); color: #a0c4ff; }
        .pill-option.selected { border-color: #3B82F6; background: rgba(59,130,246,0.12); color: #93c5fd; }
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
