'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Zap, ChevronLeft, ChevronRight } from 'lucide-react'

const STEPS = [
  'Your profile',
  'Who you help',
  'Your content',
  'Your business',
  'Your story',
]

type FormData = {
  // Step 1
  name: string
  ig_username: string
  specific_niche: string
  // Step 2
  ideal_client: string
  client_transformation: string
  dream_outcome: string
  // Step 3
  posting_frequency: string
  content_experience: string
  brand_voice: string
  hook_style: string
  // Step 4
  monthly_revenue: string
  goal_90_days: string
  biggest_problem: string
  // Step 5
  unique_story: string
  why_joined: string
  offer_description: string
}

const INITIAL: FormData = {
  name: '', ig_username: '', specific_niche: '',
  ideal_client: '', client_transformation: '', dream_outcome: '',
  posting_frequency: '', content_experience: '', brand_voice: '', hook_style: '',
  monthly_revenue: '', goal_90_days: '', biggest_problem: '',
  unique_story: '', why_joined: '', offer_description: '',
}

const REVENUE_OPTIONS = ['Pre-revenue', '£0–£1k/mo', '£1k–£3k/mo', '£3k–£7k/mo', '£7k–£15k/mo', '£15k+/mo']
const FREQUENCY_OPTIONS = ['Daily (7x/week)', '5–6x/week', '3–4x/week', '1–2x/week', 'Less than weekly']
const EXPERIENCE_OPTIONS = ['Just starting out', '6–18 months in', '18+ months / experienced']

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0) // 0-indexed
  const [form, setForm] = useState<FormData>(INITIAL)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      // Pre-fill name from auth metadata
      const authName = (user.user_metadata?.name as string) || ''
      if (authName) setForm(f => ({ ...f, name: authName }))
      setCheckingAuth(false)
    })
  }, [router])

  function set(field: keyof FormData, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function canAdvance(): boolean {
    if (step === 0) return !!form.name.trim() && !!form.specific_niche.trim()
    if (step === 1) return !!form.ideal_client.trim() && !!form.client_transformation.trim()
    if (step === 2) return !!form.posting_frequency && !!form.brand_voice.trim()
    if (step === 3) return !!form.monthly_revenue && !!form.biggest_problem.trim()
    return true
  }

  async function handleComplete() {
    setSubmitting(true)
    setError('')
    try {
      const introStructured = {
        specific_niche: form.specific_niche,
        ideal_client: form.ideal_client,
        client_transformation: form.client_transformation,
        dream_outcome: form.dream_outcome,
        posting_frequency: form.posting_frequency,
        content_experience: form.content_experience,
        brand_voice: form.brand_voice,
        hook_style: form.hook_style,
        monthly_revenue: form.monthly_revenue,
        goal_90_days: form.goal_90_days,
        biggest_problem: form.biggest_problem,
        unique_story: form.unique_story,
        why_joined: form.why_joined,
        offer_description: form.offer_description,
      }

      const res = await fetch('/api/profile/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          ig_username: form.ig_username,
          niche: form.specific_niche,
          biggest_challenge: form.biggest_problem,
          why_joined: form.why_joined,
          onboarding_completed: true,
          intro_structured: introStructured,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  if (checkingAuth) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const isLast = step === STEPS.length - 1

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 36 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={16} color="white" fill="white" />
        </div>
        <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.4px' }}>Creator Cult</span>
      </div>

      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* Step dots */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: i === step ? 28 : 8, height: 8,
                borderRadius: 99,
                background: i < step ? 'var(--accent)' : i === step ? 'var(--accent)' : 'var(--border)',
                transition: 'all 0.25s',
              }} />
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 36, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
              Step {step + 1} of {STEPS.length}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--foreground)', margin: 0, letterSpacing: '-0.4px' }}>
              {STEPS[step]}
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {step === 0 && <StepProfile form={form} set={set} />}
            {step === 1 && <StepAudience form={form} set={set} />}
            {step === 2 && <StepContent form={form} set={set} frequencies={FREQUENCY_OPTIONS} experiences={EXPERIENCE_OPTIONS} />}
            {step === 3 && <StepBusiness form={form} set={set} revenues={REVENUE_OPTIONS} />}
            {step === 4 && <StepStory form={form} set={set} />}
          </div>

          {error && (
            <div style={{ marginTop: 16, background: 'hsl(0 50% 96%)', border: '1px solid hsl(0 70% 88%)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'hsl(0 72% 45%)' }}>
              {error}
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  height: 44, padding: '0 18px', borderRadius: 9,
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--muted-foreground)', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <ChevronLeft size={15} />
                Back
              </button>
            )}

            {!isLast ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canAdvance()}
                style={{
                  flex: 1, height: 44, borderRadius: 9, border: 'none',
                  background: canAdvance() ? 'var(--accent)' : 'var(--muted)',
                  color: canAdvance() ? 'white' : 'var(--muted-foreground)',
                  fontSize: 14, fontWeight: 700, cursor: canAdvance() ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'background 0.15s',
                }}
              >
                Continue
                <ChevronRight size={15} />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={submitting}
                style={{
                  flex: 1, height: 44, borderRadius: 9, border: 'none',
                  background: submitting ? 'var(--muted)' : 'var(--accent)',
                  color: submitting ? 'var(--muted-foreground)' : 'white',
                  fontSize: 14, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {submitting ? (
                  <>
                    <span style={{ width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                    Setting up your account…
                  </>
                ) : (
                  <>Enter Creator Cult →</>
                )}
              </button>
            )}
          </div>

          {/* Skip option on last step */}
          {isLast && (
            <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--muted-foreground)' }}>
              You can always update these details in your{' '}
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Onboarding Hub</span> later.
            </p>
          )}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}

// ─── Step sub-components ──────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4 }}>{hint}</p>}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: '100%' }} />
}

function TextArea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{ width: '100%', resize: 'vertical' }} />
}

function Pills({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(o => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          style={{
            padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            border: `1.5px solid ${value === o ? 'var(--accent)' : 'var(--border)'}`,
            background: value === o ? 'hsl(var(--accent-hsl, 25 100% 55%) / 0.1)' : 'transparent',
            color: value === o ? 'var(--accent)' : 'var(--muted-foreground)',
            cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
          }}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

function StepProfile({ form, set }: { form: FormData; set: (k: keyof FormData, v: string) => void }) {
  return (
    <>
      <Field label="Your full name *">
        <TextInput value={form.name} onChange={v => set('name', v)} placeholder="Will Scott" />
      </Field>
      <Field label="Instagram username" hint="We use this to sync your reels and analytics.">
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', fontSize: 14, fontWeight: 600 }}>@</span>
          <input type="text" value={form.ig_username} onChange={e => set('ig_username', e.target.value.replace(/^@/, ''))} placeholder="yourhandle" style={{ paddingLeft: 28 }} />
        </div>
      </Field>
      <Field label="Your coaching niche *" hint="Be specific — this powers all your AI advice.">
        <TextArea value={form.specific_niche} onChange={v => set('specific_niche', v)} placeholder="e.g. I help online fitness coaches grow their Instagram and sign clients through DMs" rows={2} />
      </Field>
      <Field label="What do you actually coach people on?">
        <TextArea value={form.offer_description} onChange={v => set('offer_description', v)} placeholder="Describe your offer in one sentence — what they get, for how long, for how much" rows={2} />
      </Field>
    </>
  )
}

function StepAudience({ form, set }: { form: FormData; set: (k: keyof FormData, v: string) => void }) {
  return (
    <>
      <Field label="Who is your ideal client? *" hint="Be specific about where they are right now.">
        <TextArea value={form.ideal_client} onChange={v => set('ideal_client', v)} placeholder="e.g. A fitness coach earning £2k–£5k/month with a working offer but weak content — stuck, not knowing why their reels aren't converting" rows={3} />
      </Field>
      <Field label="What transformation do you deliver? *">
        <TextArea value={form.client_transformation} onChange={v => set('client_transformation', v)} placeholder="e.g. From £2k/month to £10k/month in 90 days through content and DM sales alone" rows={2} />
      </Field>
      <Field label="What does their dream life/business look like?">
        <TextArea value={form.dream_outcome} onChange={v => set('dream_outcome', v)} placeholder="What does success actually look like for them?" rows={2} />
      </Field>
    </>
  )
}

function StepContent({ form, set, frequencies, experiences }: { form: FormData; set: (k: keyof FormData, v: string) => void; frequencies: string[]; experiences: string[] }) {
  return (
    <>
      <Field label="How often do you post? *">
        <Pills options={frequencies} value={form.posting_frequency} onChange={v => set('posting_frequency', v)} />
      </Field>
      <Field label="Your content experience level *">
        <Pills options={experiences} value={form.content_experience} onChange={v => set('content_experience', v)} />
      </Field>
      <Field label="Your brand voice *" hint="How would you describe the way you write and talk?">
        <TextArea value={form.brand_voice} onChange={v => set('brand_voice', v)} placeholder="e.g. Direct, no BS, big brother energy — tough love but you always want the best for people" rows={2} />
      </Field>
      <Field label="What hook styles work best for you?">
        <TextInput value={form.hook_style} onChange={v => set('hook_style', v)} placeholder="e.g. Bold statement, controversial take, personal confession" />
      </Field>
    </>
  )
}

function StepBusiness({ form, set, revenues }: { form: FormData; set: (k: keyof FormData, v: string) => void; revenues: string[] }) {
  return (
    <>
      <Field label="Current monthly revenue *">
        <Pills options={revenues} value={form.monthly_revenue} onChange={v => set('monthly_revenue', v)} />
      </Field>
      <Field label="90-day revenue goal">
        <TextInput value={form.goal_90_days} onChange={v => set('goal_90_days', v)} placeholder="e.g. £10,000/month" />
      </Field>
      <Field label="What's your biggest challenge right now? *">
        <TextArea value={form.biggest_problem} onChange={v => set('biggest_problem', v)} placeholder="What's the main thing stopping you from hitting your goals? Be honest." rows={3} />
      </Field>
    </>
  )
}

function StepStory({ form, set }: { form: FormData; set: (k: keyof FormData, v: string) => void }) {
  return (
    <>
      <Field label="Your unique background / story" hint="This is what makes your content different from everyone else's.">
        <TextArea value={form.unique_story} onChange={v => set('unique_story', v)} placeholder="What's the story behind why you do this? What have you overcome? What makes you credible?" rows={4} />
      </Field>
      <Field label="Why did you join Creator Cult?">
        <TextArea value={form.why_joined} onChange={v => set('why_joined', v)} placeholder="What made you decide to invest in this? What's the moment that made you commit?" rows={2} />
      </Field>
    </>
  )
}
