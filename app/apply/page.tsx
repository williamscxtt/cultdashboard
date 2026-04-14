'use client'

import { useState } from 'react'
import { Zap, ArrowRight, Check } from 'lucide-react'

// ── Replace this with your actual payment link ────────────────────────────────
const PAYMENT_LINK = process.env.NEXT_PUBLIC_PAYMENT_LINK || 'https://www.fanbasis.com/agency-checkout/will/Q7VRY'

const MONTHLY_REVENUE_OPTIONS = [
  'Less than £1k/month',
  '£1k–£3k/month',
  '£3k–£5k/month',
  '£5k–£10k/month',
  '£10k+/month',
]

const FOLLOWER_OPTIONS = [
  'Under 1,000',
  '1,000–5,000',
  '5,000–15,000',
  '15,000–50,000',
  '50,000+',
]

const GOAL_OPTIONS = [
  'Hit consistent £5k/month from content',
  'Build to £10k+/month',
  'Grow my audience and fill a programme',
  'Go full-time from coaching/content',
]

type FormData = {
  name: string
  email: string
  instagram_handle: string
  monthly_revenue: string
  niche: string
  followers: string
  biggest_challenge: string
  revenue_goal: string
}

export default function ApplyPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<FormData>({
    name: '', email: '', instagram_handle: '',
    monthly_revenue: '', niche: '', followers: '',
    biggest_challenge: '', revenue_goal: '',
  })

  function set(field: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function canProceed() {
    if (step === 1) return form.name.trim() && form.email.trim() && form.instagram_handle.trim()
    if (step === 2) return form.niche.trim() && form.monthly_revenue && form.followers
    if (step === 3) return form.biggest_challenge.trim() && form.revenue_goal
    return true
  }

  async function handleNext() {
    if (step < 3) { setStep(s => s + 1); return }

    // Step 3 → submit then go to payment
    setLoading(true)
    try {
      await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    } catch { /* non-blocking */ }
    setLoading(false)
    setStep(4)
  }

  const totalSteps = 3
  const pct = Math.round((step > totalSteps ? totalSteps : step - 1) / totalSteps * 100)

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
        .apply-textarea {
          width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
          color: #f0f0f0; border-radius: 8px; padding: 12px 14px; outline: none;
          font-size: 14px; font-weight: 500; font-family: inherit; box-sizing: border-box;
          resize: none; transition: border-color 0.15s, box-shadow 0.15s;
        }
        .apply-textarea:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
        .apply-textarea::placeholder { color: #555; }
        .apply-btn {
          width: 100%; height: 48px; background: #3B82F6; color: #fff; border: none;
          border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer;
          font-family: inherit; letter-radius: -0.2px; transition: background 0.15s, opacity 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .apply-btn:hover:not(:disabled) { background: #60A5FA; }
        .apply-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .pill-option {
          padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
          cursor: pointer; border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.5);
          background: transparent; font-family: inherit; transition: all 0.12s; text-align: left;
        }
        .pill-option:hover { border-color: rgba(59,130,246,0.5); color: #a0c4ff; }
        .pill-option.selected {
          border-color: #3B82F6; background: rgba(59,130,246,0.12); color: #93c5fd;
        }
      `}</style>

      {/* Glow */}
      <div style={{ position: 'fixed', top: -100, left: '50%', transform: 'translateX(-50%)', width: 500, height: 400, background: '#3B82F6', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.07, animation: 'glowPulse 5s ease-in-out infinite', pointerEvents: 'none' }} />

      {/* Card */}
      <div style={{ width: '100%', maxWidth: 480, animation: 'fadeUp 0.5s ease both', position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 40, justifyContent: 'center' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={16} color="white" fill="white" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#f0f0f0', letterSpacing: '-0.3px' }}>Creator Cult</span>
        </div>

        {step < 4 && (
          <>
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

            {/* Step content */}
            <div key={step} style={{ animation: 'fadeUp 0.35s ease both' }}>

              {/* ── Step 1 ── */}
              {step === 1 && (
                <>
                  <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f0f0f0', marginBottom: 8, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                    Apply for Creator Cult
                  </h1>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 32, lineHeight: 1.6 }}>
                    This dashboard is for serious creators only. Tell us about yourself and we'll see if you're a fit.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <Field label="Full name">
                      <input className="apply-input" type="text" placeholder="Your name" value={form.name} onChange={e => set('name', e.target.value)} />
                    </Field>
                    <Field label="Email address">
                      <input className="apply-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
                    </Field>
                    <Field label="Instagram handle">
                      <input className="apply-input" type="text" placeholder="@yourhandle" value={form.instagram_handle} onChange={e => set('instagram_handle', e.target.value)} />
                    </Field>
                  </div>
                </>
              )}

              {/* ── Step 2 ── */}
              {step === 2 && (
                <>
                  <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f0f0f0', marginBottom: 8, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                    Your current situation
                  </h1>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 32, lineHeight: 1.6 }}>
                    Be honest — this helps us understand where you are and what you need.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <Field label="What niche/industry are you in?">
                      <input className="apply-input" type="text" placeholder="e.g. fitness coaching, trading, business coaching" value={form.niche} onChange={e => set('niche', e.target.value)} />
                    </Field>

                    <Field label="Current monthly revenue from your content/coaching">
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {MONTHLY_REVENUE_OPTIONS.map(opt => (
                          <button key={opt} className={`pill-option${form.monthly_revenue === opt ? ' selected' : ''}`} onClick={() => set('monthly_revenue', opt)}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </Field>

                    <Field label="Instagram followers">
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {FOLLOWER_OPTIONS.map(opt => (
                          <button key={opt} className={`pill-option${form.followers === opt ? ' selected' : ''}`} onClick={() => set('followers', opt)}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </div>
                </>
              )}

              {/* ── Step 3 ── */}
              {step === 3 && (
                <>
                  <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f0f0f0', marginBottom: 8, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                    What do you want to achieve?
                  </h1>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 32, lineHeight: 1.6 }}>
                    Last step. Tell us where you want to go.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <Field label="What's the main thing holding your content back right now?">
                      <textarea className="apply-textarea" rows={3} placeholder="Be specific — the more honest you are, the better we can help" value={form.biggest_challenge} onChange={e => set('biggest_challenge', e.target.value)} />
                    </Field>

                    <Field label="What's your main goal?">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {GOAL_OPTIONS.map(opt => (
                          <button key={opt} className={`pill-option${form.revenue_goal === opt ? ' selected' : ''}`} onClick={() => set('revenue_goal', opt)}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </div>
                </>
              )}

            </div>

            {/* CTA */}
            <div style={{ marginTop: 32 }}>
              <button className="apply-btn" onClick={handleNext} disabled={!canProceed() || loading}>
                {loading ? 'Saving…' : step === 3 ? <>See your access options <ArrowRight size={16} /></> : <>Continue <ArrowRight size={16} /></>}
              </button>
            </div>

            {step === 1 && (
              <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 20 }}>
                Already a member?{' '}
                <a href="/login" style={{ color: '#3B82F6', textDecoration: 'none', fontWeight: 600 }}>Sign in →</a>
              </p>
            )}
          </>
        )}

        {/* ── Step 4 — Payment ── */}
        {step === 4 && (
          <div style={{ animation: 'fadeUp 0.4s ease both', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Check size={26} color="rgba(74,222,128,0.9)" strokeWidth={2.5} />
            </div>

            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f0f0f0', marginBottom: 10, letterSpacing: '-0.5px' }}>
              You look like a great fit, {form.name.split(' ')[0]}.
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: 36, maxWidth: 380, margin: '0 auto 36px' }}>
              Complete your payment below to get instant access to the Creator Cult dashboard — AI-written scripts every week, competitor intelligence, full analytics, and direct coaching support.
            </p>

            {/* What they get */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '20px 24px', marginBottom: 28, textAlign: 'left' }}>
              {[
                '7 fully-written reel scripts every week',
                'Competitor intelligence — what\'s working in your niche',
                'Instagram analytics & follower growth tracking',
                'AI profile audit & bio rewrite',
                'Ask Will AI — 24/7 coaching on demand',
                'DM sales pipeline & outreach tracker',
              ].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={10} color="#3B82F6" strokeWidth={2.5} />
                  </div>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{item}</span>
                </div>
              ))}
            </div>

            <a href={PAYMENT_LINK} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
              <button className="apply-btn" style={{ fontSize: 16 }}>
                Get access now <ArrowRight size={17} />
              </button>
            </a>

            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 16 }}>
              Secure payment · Instant access after checkout
            </p>
          </div>
        )}

      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 8, letterSpacing: '0.01em' }}>
        {label}
      </label>
      {children}
    </div>
  )
}
