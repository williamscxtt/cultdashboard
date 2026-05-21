'use client'

import { useState } from 'react'
import { Zap, Check, ArrowRight, Phone } from 'lucide-react'

const CREATOR_TYPE_OPTIONS = [
  { value: 'creator', label: 'Pure Content Creator',        desc: 'Building a brand and audience — deals, sponsorships, digital products' },
  { value: 'coach',   label: 'Coaching / Service Business', desc: 'Using content to attract clients and grow a coaching or service business' },
  { value: 'both',    label: 'Both',                        desc: 'Building an audience and running a coaching or service business' },
]

const MONTHLY_INCOME_STEPS = [
  'Under £1,200', '£1,200–£2,000', '£2,000–£3,500', '£3,500–£5,000',
  '£5,000–£7,000', '£7,000–£10,000', '£10,000–£15,000', '£15,000–£20,000', '£20,000+',
]

const INCOME_GOAL_STEPS = [
  'Under £2,500/mo', '£2,500–£5,000/mo', '£5,000–£7,500/mo',
  '£7,500–£10,000/mo', '£10,000–£20,000/mo', '£20,000–£50,000/mo', '£50,000+/mo',
]

const INVESTMENT_OPTIONS = [
  { value: 'yes_500',   label: 'Yes — £500 or below' },
  { value: 'yes_1000',  label: 'Yes — £500–£1,000' },
  { value: 'yes_2000',  label: 'Yes — £1,000–£2,000' },
  { value: 'yes_2000p', label: 'Yes — £2,000+' },
  { value: 'not_yet',   label: 'Not right now' },
]

type FormData = {
  first_name: string
  last_name: string
  instagram_handle: string
  phone: string
  creator_type: string
  monthly_income: string
  income_goal: string
  willing_to_invest: string
}

export default function ApplyPage() {
  const [track, setTrack] = useState<'dashboard' | 'mentorship' | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<FormData>({
    first_name: '',
    last_name: '',
    instagram_handle: '',
    phone: '',
    creator_type: '',
    monthly_income: MONTHLY_INCOME_STEPS[2],
    income_goal: INCOME_GOAL_STEPS[2],
    willing_to_invest: '',
  })

  function set(field: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const canSubmit = !!(
    form.first_name.trim() &&
    form.last_name.trim() &&
    form.instagram_handle.trim() &&
    form.phone.trim().startsWith('+') && form.phone.trim().length >= 10 &&
    form.creator_type &&
    form.monthly_income &&
    form.income_goal &&
    form.willing_to_invest
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    try {
      await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, track: 'mentorship' }),
      })
    } catch { /* non-blocking */ }
    setLoading(false)
    setSubmitted(true)
  }

  const incomeIdx     = MONTHLY_INCOME_STEPS.indexOf(form.monthly_income)
  const incomePct     = incomeIdx >= 0 ? (incomeIdx / (MONTHLY_INCOME_STEPS.length - 1)) * 100 : 0
  const goalIdx       = INCOME_GOAL_STEPS.indexOf(form.income_goal)
  const goalPct       = goalIdx >= 0 ? (goalIdx / (INCOME_GOAL_STEPS.length - 1)) * 100 : 0

  return (
    <div style={{
      minHeight: '100dvh', background: '#000',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      paddingTop: 'max(32px, env(safe-area-inset-top))',
      paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
      paddingLeft: 'max(20px, env(safe-area-inset-left))',
      paddingRight: 'max(20px, env(safe-area-inset-right))',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .apply-track-btn { transition: border-color 0.15s, background 0.15s; }
        .apply-track-btn:hover { border-color: rgba(59,130,246,0.5) !important; background: rgba(59,130,246,0.07) !important; }
        .apply-input {
          width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
          color: #f0f0f0; border-radius: 8px; padding: 0 14px; height: 46px; outline: none;
          font-size: 14px; font-weight: 500; font-family: inherit; box-sizing: border-box;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .apply-input:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
        .apply-input::placeholder { color: #555; }
        .apply-slider {
          -webkit-appearance: none; appearance: none; width: 100%; height: 4px;
          border-radius: 2px; outline: none; cursor: pointer;
          background: linear-gradient(to right, #3B82F6 var(--fill, 0%), rgba(255,255,255,0.12) var(--fill, 0%));
        }
        .apply-slider::-webkit-slider-thumb {
          -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%;
          background: #3B82F6; cursor: pointer; border: 2.5px solid #000;
          box-shadow: 0 0 0 1.5px rgba(59,130,246,0.7), 0 0 14px rgba(59,130,246,0.4);
        }
        .apply-slider::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: #3B82F6; cursor: pointer; border: 2.5px solid #000; }
        .apply-opt { transition: border-color 0.12s, background 0.12s; }
        .apply-opt:hover { border-color: rgba(59,130,246,0.5) !important; background: rgba(59,130,246,0.07) !important; }
        @media (max-width: 440px) { .name-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <div style={{ width: '100%', maxWidth: 520, animation: 'fadeUp 0.45s ease both' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48, justifyContent: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={17} color="#fff" fill="#fff" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px', color: '#f0f0f0' }}>Creator Cult</span>
        </div>

        {/* ── Track selection ── */}
        {!track && (
          <div key="track" style={{ animation: 'fadeUp 0.35s ease both' }}>
            <h1 style={{ fontSize: 'clamp(24px, 6vw, 30px)', fontWeight: 800, color: '#f0f0f0', letterSpacing: '-0.6px', lineHeight: 1.15, marginBottom: 10, textAlign: 'center' }}>
              What are you here for?
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 36, lineHeight: 1.6 }}>
              Pick the right path and we&apos;ll get you sorted.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                className="apply-track-btn"
                onClick={() => window.location.href = '/'}
                style={{
                  width: '100%', padding: '22px 24px', borderRadius: 14, textAlign: 'left',
                  cursor: 'pointer', background: 'rgba(59,130,246,0.07)',
                  border: '1px solid rgba(59,130,246,0.28)', fontFamily: 'inherit',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#93c5fd', marginBottom: 4 }}>Get the Cult Dashboard</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                    12 AI tools, instant access — £197/mo or £997 for 6 months
                  </div>
                </div>
                <ArrowRight size={16} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0, marginLeft: 16 }} />
              </button>

              <button
                className="apply-track-btn"
                onClick={() => setTrack('mentorship')}
                style={{
                  width: '100%', padding: '22px 24px', borderRadius: 14, textAlign: 'left',
                  cursor: 'pointer', background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.12)', fontFamily: 'inherit',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  position: 'relative',
                }}
              >
                <div style={{ position: 'absolute', top: -10, right: 16, fontSize: 10, fontWeight: 800, color: '#000', background: '#e2c97e', padding: '3px 10px', borderRadius: 99, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Application
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f0f0', marginBottom: 4 }}>Apply for Creator Cult Mentorship</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                    Full coaching from Will — course, weekly calls, 1:1 support
                  </div>
                </div>
                <ArrowRight size={16} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0, marginLeft: 16 }} />
              </button>
            </div>

            <p style={{ marginTop: 28, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.22)' }}>
              Already a member?{' '}
              <a href="/login" style={{ color: '#3B82F6', textDecoration: 'none', fontWeight: 600 }}>Sign in →</a>
            </p>
          </div>
        )}

        {/* ── Mentorship form ── */}
        {track === 'mentorship' && !submitted && (
          <div key="form" style={{ animation: 'fadeUp 0.35s ease both' }}>
            <h1 style={{ fontSize: 'clamp(22px, 5.5vw, 28px)', fontWeight: 800, color: '#f0f0f0', letterSpacing: '-0.5px', lineHeight: 1.15, marginBottom: 8 }}>
              Apply for mentorship
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginBottom: 32, lineHeight: 1.6 }}>
              Fill this in and Will&apos;s team will call you within 24 hours.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

              {/* Name */}
              <div className="name-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>First name</label>
                  <input className="apply-input" type="text" autoComplete="given-name" placeholder="First" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Last name</label>
                  <input className="apply-input" type="text" autoComplete="family-name" placeholder="Last" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
                </div>
              </div>

              {/* Instagram */}
              <div>
                <label style={labelStyle}>Instagram username</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }}>@</span>
                  <input className="apply-input" type="text" placeholder="yourhandle" value={form.instagram_handle} onChange={e => set('instagram_handle', e.target.value.replace(/^@+/, ''))} style={{ paddingLeft: 26 }} />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label style={labelStyle}>Phone number (WhatsApp — include country code)</label>
                <input className="apply-input" type="tel" inputMode="tel" autoComplete="tel" placeholder="+44 7911 123456" value={form.phone} onChange={e => set('phone', e.target.value)} />
                {form.phone.trim() && !form.phone.trim().startsWith('+') && (
                  <p style={{ fontSize: 11, color: 'rgba(255,110,60,0.9)', marginTop: 5 }}>Start with your country code — e.g. +44 for UK, +1 for US</p>
                )}
              </div>

              {/* Creator type */}
              <div>
                <label style={labelStyle}>What best describes what you&apos;re building?</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  {CREATOR_TYPE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className="apply-opt"
                      onClick={() => set('creator_type', opt.value)}
                      style={{
                        width: '100%', padding: '13px 16px', borderRadius: 8, textAlign: 'left',
                        cursor: 'pointer', fontFamily: 'inherit',
                        border: form.creator_type === opt.value ? '1px solid #3B82F6' : '1px solid rgba(255,255,255,0.1)',
                        background: form.creator_type === opt.value ? 'rgba(59,130,246,0.14)' : 'rgba(255,255,255,0.02)',
                        display: 'flex', flexDirection: 'column', gap: 3,
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: form.creator_type === opt.value ? '#93c5fd' : 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: 7 }}>
                        {form.creator_type === opt.value && <Check size={11} style={{ flexShrink: 0 }} />}
                        {opt.label}
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.45 }}>{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Current monthly income */}
              <div>
                <label style={labelStyle}>Current monthly income (all sources)</label>
                <div style={{ textAlign: 'center', fontSize: 20, fontWeight: 800, color: '#93c5fd', margin: '10px 0 14px', letterSpacing: '-0.4px' }}>
                  {form.monthly_income}
                </div>
                <input
                  type="range" min={0} max={MONTHLY_INCOME_STEPS.length - 1} value={incomeIdx >= 0 ? incomeIdx : 0}
                  onChange={e => set('monthly_income', MONTHLY_INCOME_STEPS[parseInt(e.target.value)])}
                  className="apply-slider"
                  style={{ '--fill': `${incomePct}%` } as React.CSSProperties}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{MONTHLY_INCOME_STEPS[0]}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{MONTHLY_INCOME_STEPS[MONTHLY_INCOME_STEPS.length - 1]}</span>
                </div>
              </div>

              {/* Income goal */}
              <div>
                <label style={labelStyle}>Where do you want to get to monthly?</label>
                <div style={{ textAlign: 'center', fontSize: 20, fontWeight: 800, color: '#4ade80', margin: '10px 0 14px', letterSpacing: '-0.4px' }}>
                  {form.income_goal}
                </div>
                <input
                  type="range" min={0} max={INCOME_GOAL_STEPS.length - 1} value={goalIdx >= 0 ? goalIdx : 0}
                  onChange={e => set('income_goal', INCOME_GOAL_STEPS[parseInt(e.target.value)])}
                  className="apply-slider"
                  style={{ '--fill': `${goalPct}%`, background: `linear-gradient(to right, #4ade80 ${goalPct}%, rgba(255,255,255,0.12) ${goalPct}%)` } as React.CSSProperties}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{INCOME_GOAL_STEPS[0]}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{INCOME_GOAL_STEPS[INCOME_GOAL_STEPS.length - 1]}</span>
                </div>
              </div>

              {/* Willing to invest */}
              <div>
                <label style={labelStyle}>Are you willing to invest in your growth?</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  {INVESTMENT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className="apply-opt"
                      onClick={() => set('willing_to_invest', opt.value)}
                      style={{
                        width: '100%', padding: '12px 16px', borderRadius: 8, textAlign: 'left',
                        cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                        border: form.willing_to_invest === opt.value ? '1px solid #3B82F6' : '1px solid rgba(255,255,255,0.1)',
                        background: form.willing_to_invest === opt.value ? 'rgba(59,130,246,0.14)' : 'rgba(255,255,255,0.02)',
                        color: form.willing_to_invest === opt.value ? '#93c5fd' : 'rgba(255,255,255,0.65)',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}
                    >
                      {form.willing_to_invest === opt.value && <Check size={11} style={{ flexShrink: 0 }} />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!canSubmit || loading}
                style={{
                  width: '100%', height: 50, marginTop: 4,
                  background: canSubmit && !loading ? '#3B82F6' : 'rgba(59,130,246,0.3)',
                  color: '#fff', border: 'none', borderRadius: 8,
                  fontSize: 15, fontWeight: 700, cursor: canSubmit && !loading ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', transition: 'background 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {loading ? 'Submitting…' : <>Submit Application <ArrowRight size={16} /></>}
              </button>

              <button
                type="button"
                onClick={() => setTrack(null)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0' }}
              >
                ← Back
              </button>
            </form>
          </div>
        )}

        {/* ── Confirmation ── */}
        {submitted && (
          <div key="done" style={{ animation: 'fadeUp 0.4s ease both', textAlign: 'center' }}>
            <div style={{
              width: 60, height: 60, borderRadius: 18,
              background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
            }}>
              <Phone size={26} color="rgba(74,222,128,0.9)" />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f0f0f0', marginBottom: 10, letterSpacing: '-0.5px' }}>
              We&apos;ll call you soon, {form.first_name}.
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 380, margin: '0 auto 20px' }}>
              Your application is with Will&apos;s team now. Expect a call to <strong style={{ color: 'rgba(255,255,255,0.75)' }}>{form.phone}</strong> within 24 hours.
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 12 }}>
              Keep your phone nearby and make sure it&apos;s a number you answer.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 700,
  color: 'rgba(255,255,255,0.6)', marginBottom: 8, letterSpacing: '0.01em',
}
