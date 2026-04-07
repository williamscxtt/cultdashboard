'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const NICHES = ['fitness', 'life coaching', 'business', 'mindset', 'health', 'relationships', 'other']
const CONTENT_EXPERIENCE = ['Beginner (< 6 months)', 'Intermediate (6–18 months)', 'Experienced (18+ months)']
const POSTING_FREQUENCIES = ['1–2x per week', '3–4x per week', '5–7x per week', 'Less than once a week']
const BRAND_VOICES = ['Educational', 'Entertainment', 'Personal Story']
const REVENUE_RANGES = ['$0 (pre-revenue)', '$1k–$5k/mo', '$5k–$10k/mo', '$10k–$25k/mo', '$25k+/mo']

type FormData = Record<string, string>

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>({
    name: '',
    niche: '',
    ig_username: '',
    current_followers: '',
    target_audience: '',
    audience_problem: '',
    dream_outcome: '',
    posting_frequency: '',
    content_experience: '',
    brand_voice: '',
    monthly_revenue: '',
    main_goal: '',
    biggest_challenge: '',
    unique_story: '',
    why_joined_cult: '',
    competitors_they_admire: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function nextStep() {
    setStep(s => Math.min(s + 1, 5))
  }

  function prevStep() {
    setStep(s => Math.max(s - 1, 1))
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('You must be logged in to complete onboarding.')
      setLoading(false)
      return
    }

    if (form.name || form.ig_username) {
      await supabase.from('profiles').update({
        name: form.name,
        ig_username: form.ig_username || null,
      }).eq('id', user.id)
    }

    const { error: onboardingError } = await supabase.from('onboarding').upsert({
      profile_id: user.id,
      niche: form.niche,
      target_audience: `${form.target_audience}. Their main problem: ${form.audience_problem}. Dream outcome: ${form.dream_outcome}`,
      current_followers: parseInt(form.current_followers) || 0,
      monthly_revenue: form.monthly_revenue,
      main_goal: form.main_goal,
      biggest_challenge: form.biggest_challenge,
      content_experience: form.content_experience,
      posting_frequency: form.posting_frequency,
      brand_voice: form.brand_voice,
      unique_story: form.unique_story,
      competitors_they_admire: form.competitors_they_admire,
      why_joined_cult: form.why_joined_cult,
      raw_data: form,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'profile_id' })

    if (onboardingError) {
      setError(onboardingError.message)
      setLoading(false)
      return
    }

    await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id)

    router.push('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f5f6f8',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: 540 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 4 }}>
            CULT <span style={{ color: '#cc0000' }}>Dashboard</span>
          </div>
          <p style={{ color: '#6b7280', fontSize: 14 }}>Let&apos;s get to know you</p>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Step {step} of 5</span>
            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{Math.round((step / 5) * 100)}%</span>
          </div>
          <div style={{ height: 4, background: '#e8eaed', borderRadius: 4 }}>
            <div style={{
              height: '100%', background: '#cc0000', borderRadius: 4,
              width: `${(step / 5) * 100}%`, transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#ffffff', border: '1px solid #e8eaed',
          borderRadius: 16, padding: 32,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        }}>
          {step === 1 && <Step1 form={form} update={update} />}
          {step === 2 && <Step2 form={form} update={update} />}
          {step === 3 && <Step3 form={form} update={update} />}
          {step === 4 && <Step4 form={form} update={update} />}
          {step === 5 && <Step5 form={form} update={update} />}

          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, color: '#dc2626', marginTop: 16,
            }}>
              {error}
            </div>
          )}

          {/* Nav buttons */}
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            {step > 1 && (
              <button
                onClick={prevStep}
                style={{
                  flex: 1, background: 'transparent', color: '#6b7280',
                  border: '1px solid #e8eaed', borderRadius: 8,
                  padding: '11px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Back
              </button>
            )}
            {step < 5 ? (
              <button
                onClick={nextStep}
                style={{
                  flex: 1, background: '#cc0000', color: '#ffffff',
                  border: 'none', borderRadius: 8,
                  padding: '11px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  flex: 1,
                  background: loading ? '#9ca3af' : '#cc0000', color: '#ffffff',
                  border: 'none', borderRadius: 8, padding: '11px',
                  fontSize: 14, fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Saving...' : 'Complete Onboarding'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────
// Step sub-components
// ────────────────────────────────────────────

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

function Step1({ form, update }: { form: FormData; update: (k: string, v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>About You</h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Tell us the basics.</p>
      </div>
      <FieldGroup label="Your name *">
        <input type="text" value={form.name} onChange={e => update('name', e.target.value)} placeholder="John Smith" required />
      </FieldGroup>
      <FieldGroup label="Your niche *">
        <select value={form.niche} onChange={e => update('niche', e.target.value)}>
          <option value="">Select your niche...</option>
          {NICHES.map(n => <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>)}
        </select>
      </FieldGroup>
      <FieldGroup label="Instagram handle (without @)">
        <input type="text" value={form.ig_username} onChange={e => update('ig_username', e.target.value)} placeholder="yourhandle" />
      </FieldGroup>
      <FieldGroup label="Current follower count">
        <input type="number" value={form.current_followers} onChange={e => update('current_followers', e.target.value)} placeholder="e.g. 2500" min="0" />
      </FieldGroup>
    </div>
  )
}

function Step2({ form, update }: { form: FormData; update: (k: string, v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Your Audience</h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Who are you trying to reach?</p>
      </div>
      <FieldGroup label="Who do you help? *">
        <input type="text" value={form.target_audience} onChange={e => update('target_audience', e.target.value)} placeholder="e.g. men aged 25–40 who want to get lean" />
      </FieldGroup>
      <FieldGroup label="Their main problem *">
        <textarea value={form.audience_problem} onChange={e => update('audience_problem', e.target.value)} placeholder="What pain are they in? Be specific." rows={3} />
      </FieldGroup>
      <FieldGroup label="Their dream outcome *">
        <textarea value={form.dream_outcome} onChange={e => update('dream_outcome', e.target.value)} placeholder="What does success look like for them?" rows={3} />
      </FieldGroup>
    </div>
  )
}

function Step3({ form, update }: { form: FormData; update: (k: string, v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Your Content</h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>How you create and how often.</p>
      </div>
      <FieldGroup label="Posting frequency *">
        <select value={form.posting_frequency} onChange={e => update('posting_frequency', e.target.value)}>
          <option value="">Select...</option>
          {POSTING_FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </FieldGroup>
      <FieldGroup label="Content experience level *">
        <select value={form.content_experience} onChange={e => update('content_experience', e.target.value)}>
          <option value="">Select...</option>
          {CONTENT_EXPERIENCE.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </FieldGroup>
      <FieldGroup label="Brand voice *">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {BRAND_VOICES.map(voice => (
            <button
              key={voice}
              type="button"
              onClick={() => update('brand_voice', voice)}
              style={{
                padding: '8px 16px', borderRadius: 8,
                border: `1px solid ${form.brand_voice === voice ? '#cc0000' : '#e8eaed'}`,
                background: form.brand_voice === voice ? '#fef2f2' : 'transparent',
                color: form.brand_voice === voice ? '#cc0000' : '#374151',
                fontSize: 13, fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {voice}
            </button>
          ))}
        </div>
      </FieldGroup>
    </div>
  )
}

function Step4({ form, update }: { form: FormData; update: (k: string, v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Your Business</h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Where you are and where you want to go.</p>
      </div>
      <FieldGroup label="Monthly revenue *">
        <select value={form.monthly_revenue} onChange={e => update('monthly_revenue', e.target.value)}>
          <option value="">Select range...</option>
          {REVENUE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </FieldGroup>
      <FieldGroup label="Main goal from CULT *">
        <textarea value={form.main_goal} onChange={e => update('main_goal', e.target.value)} placeholder="What's the #1 thing you want to achieve?" rows={3} />
      </FieldGroup>
      <FieldGroup label="Biggest challenge right now *">
        <textarea value={form.biggest_challenge} onChange={e => update('biggest_challenge', e.target.value)} placeholder="What's the main thing holding you back?" rows={3} />
      </FieldGroup>
    </div>
  )
}

function Step5({ form, update }: { form: FormData; update: (k: string, v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Your Story</h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>The context that makes your content different.</p>
      </div>
      <FieldGroup label="Your unique background/story *">
        <textarea value={form.unique_story} onChange={e => update('unique_story', e.target.value)} placeholder="What's the story behind why you do what you do? What have you overcome?" rows={4} />
      </FieldGroup>
      <FieldGroup label="Why did you join CULT? *">
        <textarea value={form.why_joined_cult} onChange={e => update('why_joined_cult', e.target.value)} placeholder="What made you decide to invest in this?" rows={3} />
      </FieldGroup>
      <FieldGroup label="Accounts you admire">
        <input type="text" value={form.competitors_they_admire} onChange={e => update('competitors_they_admire', e.target.value)} placeholder="e.g. @garyvee, @alexhormozi" />
      </FieldGroup>
    </div>
  )
}
