'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Target, ChevronDown, ChevronUp, ArrowRight, ArrowLeft,
  Sparkles, RefreshCw, Copy, Check, RotateCcw, Shield,
  Users, Zap, AlertCircle, CheckCircle2, Clock,
} from 'lucide-react'
import { Card, Button } from '@/components/ui'
import { useIsMobile } from '@/lib/use-mobile'
import { toast } from 'sonner'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ValueStackItem {
  name: string
  description: string
  perceived_value: string
}

interface ObjectionCrusher {
  objection: string
  response: string
}

interface OfferOutput {
  one_liner: string
  bio_headline: string
  target_avatar: string
  core_promise: string
  unique_mechanism: string
  value_stack: ValueStackItem[]
  guarantee: string
  who_its_for: string
  who_its_not_for: string
  urgency_angle: string
  objection_crushers: ObjectionCrusher[]
}

interface Iteration {
  offer: OfferOutput
  feedback: string
  iterated_at: string
}

// ── Wizard steps ──────────────────────────────────────────────────────────────

const STEPS = [
  {
    key: 'niche',
    question: 'What do you do and what\'s your niche?',
    hint: 'Be broad here — we\'ll sharpen it. What problem do you solve and in what space?',
    placeholder: 'e.g. Online fitness coaching, business mentoring for agency owners, dating coaching for introverted men...',
  },
  {
    key: 'ideal_client',
    question: 'Who is your ideal client? Describe them in detail.',
    hint: 'Think: age, gender, job, situation, what their life looks like right now. The more specific, the better your offer.',
    placeholder: 'e.g. Men aged 30-45, business owners or high earners, carrying 20+ extra lbs, too busy for the gym, feel embarrassed without their shirt off at the beach...',
  },
  {
    key: 'main_problem',
    question: 'What\'s the #1 painful problem they\'re stuck with right now?',
    hint: 'Go emotional. What\'s keeping them up at night? What have they already tried that hasn\'t worked?',
    placeholder: 'e.g. They\'ve tried every diet and gym plan but always quit after 3 weeks. They feel like they\'ve lost their identity and confidence. Nothing ever sticks...',
  },
  {
    key: 'dream_outcome',
    question: 'What\'s the dream outcome they desperately want?',
    hint: 'Not just the surface result — the feeling, the identity shift, the life change they\'re really buying.',
    placeholder: 'e.g. To feel confident and energetic again, keep up with their kids, look good in photos, have their partner notice the difference, feel proud of what they see in the mirror...',
  },
  {
    key: 'unique_mechanism',
    question: 'What makes your approach different or unique?',
    hint: 'Your system, method, or unfair advantage. Why does yours work when everything else hasn\'t?',
    placeholder: 'e.g. I focus only on habits that fit a busy lifestyle — no 2-hour gym sessions or restrictive diets. My 3-phase system works around your schedule and actually sticks long-term...',
  },
  {
    key: 'timeframe',
    question: 'What timeframe can clients expect real, visible results?',
    hint: 'Be specific. A concrete number is far more powerful than "results vary."',
    placeholder: 'e.g. Most clients see noticeable changes in 4 weeks and lose their first 10lbs by week 8. Full transformation in 90 days...',
  },
  {
    key: 'objections',
    question: 'What are the top objections or fears people have before buying?',
    hint: 'Why do they hesitate? Price, trust, "I\'ve tried before and failed", no time, not sure online coaching works?',
    placeholder: 'e.g. Too expensive compared to a gym, worried it won\'t work because they\'ve failed before, don\'t have enough time, not sure online coaching can replace in-person...',
  },
  {
    key: 'proof',
    question: 'What proof do you have that your approach works?',
    hint: 'Your own story, client transformations, credentials, specific results with numbers.',
    placeholder: 'e.g. I lost 25lbs myself using this method. Helped 40+ clients in 2 years. Client John lost 18lbs in 10 weeks while working 60-hour weeks. BSc Sport Science...',
  },
  {
    key: 'format_and_price',
    question: 'What format does your service take, and what\'s the price?',
    hint: 'How do clients work with you? What do they get? What does it cost?',
    placeholder: 'e.g. 12-week 1:1 online coaching, 2x weekly check-in calls, daily WhatsApp support, custom training + nutrition plan. £1,497 or 3x £540...',
  },
]

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyBtn({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
      background: copied ? 'rgba(34,197,94,0.12)' : 'var(--muted)',
      color: copied ? 'hsl(142 71% 45%)' : 'var(--muted-foreground)',
      border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
    }}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied!' : label}
    </button>
  )
}

// ── Section heading ───────────────────────────────────────────────────────────

function OfferSection({ icon, label, color, children }: {
  icon: React.ReactNode; label: string; color: string; children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <span style={{ color, flexShrink: 0 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  )
}

// ── Offer display ─────────────────────────────────────────────────────────────

function OfferDisplay({ offer, p }: { offer: OfferOutput; p: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* One-liner — hero card */}
      <Card style={{ padding: p, borderLeft: '3px solid var(--accent)', background: 'hsl(220 90% 56% / 0.04)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
          Your Core One-Liner
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.5, marginBottom: 14 }}>
          &ldquo;{offer.one_liner}&rdquo;
        </div>
        <CopyBtn text={offer.one_liner} label="Copy one-liner" />
      </Card>

      {/* Bio headline */}
      <Card style={{ padding: p, background: 'hsl(142 71% 45% / 0.05)', borderLeft: '3px solid hsl(142 71% 45%)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'hsl(142 71% 45%)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
          Instagram Bio Headline
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.5, marginBottom: 10 }}>
          {offer.bio_headline}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 12 }}>
          {offer.bio_headline.length} / 60 characters
        </div>
        <CopyBtn text={offer.bio_headline} label="Copy bio headline" />
      </Card>

      {/* Avatar + Promise grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card style={{ padding: p, minWidth: 0 }}>
          <OfferSection icon={<Users size={13} />} label="Target Avatar" color="hsl(270 60% 65%)">
            <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.65, margin: 0, wordBreak: 'break-word' }}>
              {offer.target_avatar}
            </p>
          </OfferSection>
        </Card>
        <Card style={{ padding: p, minWidth: 0 }}>
          <OfferSection icon={<Target size={13} />} label="Core Promise" color="var(--accent)">
            <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.65, margin: 0, wordBreak: 'break-word' }}>
              {offer.core_promise}
            </p>
          </OfferSection>
        </Card>
      </div>

      {/* Unique mechanism */}
      <Card style={{ padding: p }}>
        <OfferSection icon={<Zap size={13} />} label="Unique Mechanism" color="hsl(43 96% 56%)">
          <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.65, margin: 0, wordBreak: 'break-word' }}>
            {offer.unique_mechanism}
          </p>
        </OfferSection>
      </Card>

      {/* Value stack */}
      {offer.value_stack?.length > 0 && (
        <Card style={{ padding: p }}>
          <OfferSection icon={<CheckCircle2 size={13} />} label="Value Stack — What They Get" color="hsl(142 71% 45%)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {offer.value_stack.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 12, padding: '10px 12px',
                  background: 'var(--muted)', borderRadius: 8, minWidth: 0,
                }}>
                  <div style={{ flexShrink: 0, marginTop: 1 }}>
                    <CheckCircle2 size={14} style={{ color: 'hsl(142 71% 45%)' }} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', wordBreak: 'break-word' }}>{item.name}</span>
                      {item.perceived_value && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'hsl(142 71% 45%)', flexShrink: 0 }}>
                          {item.perceived_value}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.55, margin: 0, wordBreak: 'break-word' }}>
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </OfferSection>
        </Card>
      )}

      {/* Guarantee */}
      <Card style={{ padding: p, background: 'hsl(220 90% 56% / 0.04)', border: '1px solid var(--accent-subtle-border)' }}>
        <OfferSection icon={<Shield size={13} />} label="The Guarantee" color="var(--accent)">
          <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.65, margin: 0, wordBreak: 'break-word' }}>
            {offer.guarantee}
          </p>
        </OfferSection>
      </Card>

      {/* Who it's for / not for */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card style={{ padding: p, minWidth: 0 }}>
          <OfferSection icon={<CheckCircle2 size={13} />} label="This Is For You If..." color="hsl(142 71% 45%)">
            <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.7, margin: 0, wordBreak: 'break-word', whiteSpace: 'pre-line' }}>
              {offer.who_its_for}
            </p>
          </OfferSection>
        </Card>
        <Card style={{ padding: p, minWidth: 0 }}>
          <OfferSection icon={<AlertCircle size={13} />} label="This Is NOT For You If..." color="hsl(0 84% 60%)">
            <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.7, margin: 0, wordBreak: 'break-word', whiteSpace: 'pre-line' }}>
              {offer.who_its_not_for}
            </p>
          </OfferSection>
        </Card>
      </div>

      {/* Objection crushers */}
      {offer.objection_crushers?.length > 0 && (
        <Card style={{ padding: p }}>
          <OfferSection icon={<AlertCircle size={13} />} label="Objection Crushers" color="hsl(270 60% 65%)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {offer.objection_crushers.map((item, i) => (
                <div key={i} style={{ borderLeft: '2px solid hsl(270 60% 65% / 0.4)', paddingLeft: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'hsl(270 60% 65%)', marginBottom: 3 }}>
                    &ldquo;{item.objection}&rdquo;
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.6, margin: 0, wordBreak: 'break-word' }}>
                    {item.response}
                  </p>
                </div>
              ))}
            </div>
          </OfferSection>
        </Card>
      )}

      {/* Urgency */}
      {offer.urgency_angle && (
        <Card style={{ padding: p }}>
          <OfferSection icon={<Clock size={13} />} label="Why Act Now" color="hsl(0 84% 60%)">
            <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.65, margin: 0, wordBreak: 'break-word' }}>
              {offer.urgency_angle}
            </p>
          </OfferSection>
        </Card>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OfferBuilder({ profileId }: { profileId: string }) {
  const isMobile = useIsMobile()
  const p = isMobile ? '14px' : '18px 20px'

  type Stage = 'collapsed' | 'wizard' | 'review' | 'generating' | 'results' | 'history'
  const [stage, setStage] = useState<Stage>('collapsed')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [offer, setOffer] = useState<OfferOutput | null>(null)
  const [iterations, setIterations] = useState<Iteration[]>([])
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [iterating, setIterating] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(false)

  // Load existing offer on mount
  const loadExisting = useCallback(async () => {
    setLoadingExisting(true)
    try {
      const res = await fetch(`/api/offer-builder?profileId=${profileId}`)
      const data = await res.json()
      if (data.offer) {
        setOffer(data.offer as OfferOutput)
        setAnswers(data.answers || {})
        setIterations(data.iterations || [])
        setUpdatedAt(data.updated_at)
        setStage('results')
      }
    } catch { /* silent */ }
    finally { setLoadingExisting(false) }
  }, [profileId])

  useEffect(() => { loadExisting() }, [loadExisting])

  function startWizard() {
    setStep(0)
    setAnswers({})
    setStage('wizard')
  }

  function handleAnswer(value: string) {
    setAnswers(prev => ({ ...prev, [STEPS[step].key]: value }))
  }

  function nextStep() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      setStage('review')
    }
  }

  function prevStep() {
    if (step > 0) setStep(s => s - 1)
    else setStage('collapsed')
  }

  async function handleGenerate() {
    setStage('generating')
    try {
      const res = await fetch('/api/offer-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, answers }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setOffer(data.offer as OfferOutput)
      setIterations([])
      setUpdatedAt(data.updated_at)
      setStage('results')
      toast.success('Your offer is ready!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
      setStage('review')
    }
  }

  async function handleIterate() {
    if (!feedback.trim()) return
    setIterating(true)
    try {
      const res = await fetch('/api/offer-builder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, feedback }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Iteration failed')
      // Archive current before replacing
      if (offer) {
        setIterations(prev => [{ offer, feedback, iterated_at: new Date().toISOString() }, ...prev].slice(0, 5))
      }
      setOffer(data.offer as OfferOutput)
      setUpdatedAt(data.updated_at)
      setFeedback('')
      toast.success('Offer refined!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Refinement failed')
    } finally {
      setIterating(false)
    }
  }

  // ── Collapsed / teaser ────────────────────────────────────────────────────
  if (stage === 'collapsed' && !loadingExisting) {
    return (
      <div style={{ marginTop: 40 }}>
        <Card style={{ padding: isMobile ? '20px 16px' : '24px 28px', textAlign: 'center' }}>
          <Target size={26} style={{ color: 'var(--accent)', margin: '0 auto 14px', display: 'block' }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginBottom: 8 }}>
            Need Help Building Your Offer?
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 24, maxWidth: 420, margin: '0 auto 24px', lineHeight: 1.65 }}>
            Stop saying &ldquo;I help people lose weight.&rdquo; Build your Precision Offer Blueprint — specific, compelling, and impossible to ignore. Takes 5 minutes.
          </div>
          <Button onClick={startWizard} variant="primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={13} /> Build My Offer
          </Button>
        </Card>
      </div>
    )
  }

  // ── Wizard ────────────────────────────────────────────────────────────────
  if (stage === 'wizard') {
    const current = STEPS[step]
    const progress = ((step + 1) / STEPS.length) * 100
    const currentAnswer = answers[current.key] || ''
    const canAdvance = currentAnswer.trim().length > 3

    return (
      <div style={{ marginTop: 40 }}>
        <Card style={{ padding: isMobile ? '20px 16px' : '28px 32px' }}>
          {/* Progress */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Build Your Offer
              </span>
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                {step + 1} of {STEPS.length}
              </span>
            </div>
            <div style={{ height: 3, background: 'var(--muted)', borderRadius: 3 }}>
              <div style={{
                height: '100%', borderRadius: 3, background: 'var(--accent)',
                width: `${progress}%`, transition: 'width 0.3s ease',
              }} />
            </div>
          </div>

          {/* Question */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.4, marginBottom: 8 }}>
              {current.question}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
              {current.hint}
            </div>
          </div>

          {/* Input */}
          <textarea
            value={currentAnswer}
            onChange={e => handleAnswer(e.target.value)}
            placeholder={current.placeholder}
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canAdvance) nextStep()
            }}
            style={{
              width: '100%', minHeight: 120, padding: '12px 14px',
              background: 'var(--input)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--foreground)', fontSize: 13,
              lineHeight: 1.65, fontFamily: 'inherit', resize: 'vertical',
              outline: 'none', transition: 'border-color 0.15s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
          />
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 6 }}>
            ⌘ + Enter to continue
          </div>

          {/* Nav */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, gap: 10 }}>
            <button
              onClick={prevStep}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--muted)', color: 'var(--muted-foreground)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <ArrowLeft size={13} />
              {step === 0 ? 'Cancel' : 'Back'}
            </button>
            <Button
              onClick={nextStep}
              disabled={!canAdvance}
              variant="primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {step === STEPS.length - 1 ? 'Review My Answers' : 'Next'}
              <ArrowRight size={13} />
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // ── Review before generating ──────────────────────────────────────────────
  if (stage === 'review') {
    return (
      <div style={{ marginTop: 40 }}>
        <Card style={{ padding: isMobile ? '20px 16px' : '28px 32px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginBottom: 6 }}>
            Review Your Answers
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 20 }}>
            Check everything looks right before generating. Click any answer to edit it.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {STEPS.map((s, i) => (
              <div key={s.key} style={{
                padding: '10px 14px', borderRadius: 8, background: 'var(--muted)',
                border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', marginBottom: 4 }}>
                  {i + 1}. {s.question}
                </div>
                <div style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.55, wordBreak: 'break-word' }}>
                  {answers[s.key] || <span style={{ color: 'var(--muted-foreground)', fontStyle: 'italic' }}>Not answered</span>}
                </div>
                <button
                  onClick={() => { setStep(i); setStage('wizard') }}
                  style={{
                    marginTop: 8, fontSize: 11, color: 'var(--accent)', background: 'none',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0,
                  }}
                >
                  Edit →
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setStage('wizard')}
              style={{
                padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--muted)', color: 'var(--muted-foreground)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Back
            </button>
            <Button onClick={handleGenerate} variant="primary" style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={13} />
              Generate My Offer
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // ── Generating ────────────────────────────────────────────────────────────
  if (stage === 'generating') {
    return (
      <div style={{ marginTop: 40 }}>
        <Card style={{ padding: isMobile ? '32px 20px' : '48px', textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'var(--accent-subtle)', border: '1px solid var(--accent-subtle-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            animation: 'pulse-soft 2s ease-in-out infinite',
          }}>
            <Sparkles size={22} style={{ color: 'var(--accent)' }} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginBottom: 8 }}>
            Building Your Precision Offer Blueprint…
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
            Claude is applying Will&apos;s framework to your answers, pulling from the knowledge base, and crafting your offer. Takes about 20 seconds.
          </div>
        </Card>
      </div>
    )
  }

  // ── Results ───────────────────────────────────────────────────────────────
  if (stage === 'results' && offer) {
    return (
      <div style={{ marginTop: 40 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={14} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>Your Precision Offer Blueprint</span>
            {updatedAt && (
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                · saved {new Date(updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
          <button
            onClick={startWizard}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'var(--muted)', color: 'var(--muted-foreground)',
              fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <RotateCcw size={11} /> Start Over
          </button>
        </div>

        {/* Offer breakdown */}
        <OfferDisplay offer={offer} p={p} />

        {/* Iteration panel */}
        <Card style={{ padding: isMobile ? '16px' : '20px 24px', marginTop: 12, border: '1px solid var(--accent-subtle-border)', background: 'hsl(220 90% 56% / 0.03)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', marginBottom: 6 }}>
            Not quite right?
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 14, lineHeight: 1.6 }}>
            Tell Claude what you don&apos;t like and it&apos;ll rebuild the whole offer. Previous versions are saved below.
          </div>
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="e.g. The one-liner sounds too generic. Make the avatar more specific — I only work with gym owners not general business owners. The guarantee feels weak..."
            style={{
              width: '100%', minHeight: 90, padding: '10px 12px',
              background: 'var(--input)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--foreground)', fontSize: 13,
              lineHeight: 1.6, fontFamily: 'inherit', resize: 'vertical', outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <Button
              onClick={handleIterate}
              disabled={iterating || !feedback.trim()}
              variant="primary"
              style={{ display: 'flex', alignItems: 'center', gap: 7 }}
            >
              {iterating
                ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Refining…</>
                : <><Sparkles size={12} /> Refine My Offer</>
              }
            </Button>
          </div>
        </Card>

        {/* Version history */}
        {iterations.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => setHistoryOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--muted)', color: 'var(--muted-foreground)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {historyOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              Previous versions ({iterations.length})
            </button>
            {historyOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                {iterations.map((item, i) => (
                  <Card key={i} style={{ padding: isMobile ? '14px' : '16px 20px' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 8 }}>
                      Version {iterations.length - i} · {new Date(item.iterated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>
                      Feedback that changed it:
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.55, marginBottom: 12, fontStyle: 'italic', wordBreak: 'break-word' }}>
                      &ldquo;{item.feedback}&rdquo;
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 4 }}>
                      Previous one-liner:
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.55, wordBreak: 'break-word' }}>
                      &ldquo;{item.offer.one_liner}&rdquo;
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return null
}
