'use client'

import { useState } from 'react'
import {
  Target, ArrowRight, ArrowLeft, Sparkles, Copy, Check,
  Shield, Users, Zap, AlertCircle, CheckCircle2, Clock,
  ChevronRight,
} from 'lucide-react'

// ── Wizard questions ──────────────────────────────────────────────────────────
// Works for complete beginners and experienced coaches alike.
// Every question accepts "I don't know" — Claude fills the gaps intelligently.

const STEPS = [
  {
    key: 'skills',
    question: 'What are you good at? What\'s your background or experience?',
    hint: 'Skills, qualifications, years in a field, results you\'ve achieved yourself — anything counts. The more you give here, the more specific your offer will be.',
    placeholder: 'Detailed: "8 years of gym experience, certified PT, lost 25lbs myself, know everything about nutrition for busy people, used to work in finance..."\n\nOr just: "I\'m good with fitness and helping people get in shape, I don\'t know how to describe it yet"',
  },
  {
    key: 'content_direction',
    question: 'What topics do you want to create content about?',
    hint: 'What could you post about endlessly, even if nobody paid you? This defines your niche. Type "I don\'t know" if you\'re not sure — we\'ll figure it out from your other answers.',
    placeholder: 'Detailed: "Men\'s fitness after 30, morning routines, discipline, cutting body fat without giving up beer, staying consistent when life is chaotic..."\n\nOr: "Something in the health and fitness space, not sure exactly"',
  },
  {
    key: 'ideal_client',
    question: 'Who do you want to help? Describe your ideal client.',
    hint: 'As specific or as vague as you like — even "people like me a few years ago" gives us something to work with. Type "I don\'t know" and we\'ll build the avatar from your story.',
    placeholder: 'Detailed: "Dads aged 35–50, carry extra weight, did sport when they were younger, too busy for the gym, feel embarrassed taking their shirt off, want their energy back..."\n\nOr: "I don\'t know yet — probably people similar to me"',
  },
  {
    key: 'main_problem',
    question: 'What\'s the #1 problem your ideal client is stuck with?',
    hint: 'What are they struggling with right now? What have they already tried that hasn\'t worked? Type "I don\'t know" — we\'ll predict this from your niche.',
    placeholder: 'Detailed: "They start every diet on Monday and quit by Thursday. They feel like they\'ve tried everything. Deep down they think they\'re the problem, not the plan..."\n\nOr: "I don\'t know"',
  },
  {
    key: 'dream_outcome',
    question: 'What transformation do you want to create for them?',
    hint: 'Not just the result — the feeling, the identity shift, the thing they\'d finally stop dreading. Type "I don\'t know" and we\'ll craft this from your dream result.',
    placeholder: 'Detailed: "Lose 20lbs, feel genuinely confident again, stop avoiding cameras, keep up with their kids at the park, have their partner notice before they say anything..."\n\nOr: "I don\'t know exactly, something around feeling confident and healthy again"',
  },
  {
    key: 'own_story',
    question: 'What\'s your own story or transformation?',
    hint: 'Your personal before-and-after is your most powerful credibility. Even a small win counts. Skip this or type "I don\'t have one" if you\'d rather not use your personal story.',
    placeholder: 'Detailed: "I was 30lbs overweight after my second kid, completely exhausted, avoided mirrors. Fixed it in 6 months and now feel better than I did at 25..."\n\nOr: "I don\'t have a dramatic story" / "I\'d rather not use my personal story"',
  },
  {
    key: 'unique_mechanism',
    question: 'Do you have a specific method or approach that makes you different?',
    hint: 'Your system, philosophy, or unfair advantage. If you don\'t have one yet — type "I don\'t know" and we\'ll invent a proprietary mechanism name for you.',
    placeholder: 'Detailed: "I focus on habit stacking rather than willpower, 20-minute home workouts only, no calorie counting, designed for people with unpredictable schedules..."\n\nOr: "I don\'t know — create something for me"',
  },
  {
    key: 'proof',
    question: 'What proof do you have that this works?',
    hint: 'Client results, your own transformation, credentials, years of experience. If you\'re just starting out, type "None yet" — we\'ll write around it honestly.',
    placeholder: 'Detailed: "Lost 25lbs myself using this approach, helped 3 friends do the same, qualified PT since 2020, 40+ clients over 2 years, client John lost 18lbs in 10 weeks..."\n\nOr: "None yet, I\'m just starting out" / "Just my own results so far"',
  },
  {
    key: 'format_and_price',
    question: 'How would you work with clients, and what would you charge?',
    hint: '1:1 coaching, group programme, 3 months, weekly calls, WhatsApp support? If you have no idea what to charge — say so, we\'ll suggest a price that fits your market.',
    placeholder: 'Detailed: "12-week 1:1 online coaching, 2x weekly video calls, daily WhatsApp check-ins, custom plan, £1,497 or 3x £540..."\n\nOr: "I don\'t know what to charge, probably 1:1 coaching but not sure on the format"',
  },
]

// ── Types ─────────────────────────────────────────────────────────────────────

interface ValueStackItem { name: string; description: string; perceived_value: string }
interface ObjectionCrusher { objection: string; response: string }
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

// ── Shared style tokens (match dashboard dark theme) ──────────────────────────

const card: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 12,
}

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

// ── Section label ─────────────────────────────────────────────────────────────

function Section({ icon, label, color, children }: {
  icon: React.ReactNode; label: string; color: string; children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <span style={{ color, flexShrink: 0 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  )
}

// ── Offer output display (identical to dashboard OfferDisplay) ─────────────────

function OfferDisplay({ offer }: { offer: OfferOutput }) {
  const p = '18px 20px'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      <div style={{ ...card, padding: p, borderLeft: '3px solid var(--accent)', background: 'hsl(220 90% 56% / 0.04)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
          Your Core One-Liner
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.5, marginBottom: 14 }}>
          &ldquo;{offer.one_liner}&rdquo;
        </div>
        <CopyBtn text={offer.one_liner} label="Copy one-liner" />
      </div>

      <div style={{ ...card, padding: p, background: 'hsl(142 71% 45% / 0.05)', borderLeft: '3px solid hsl(142 71% 45%)' }}>
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
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        <div style={{ ...card, padding: p }}>
          <Section icon={<Users size={13} />} label="Target Avatar" color="hsl(270 60% 65%)">
            <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.65, margin: 0, wordBreak: 'break-word' }}>
              {offer.target_avatar}
            </p>
          </Section>
        </div>
        <div style={{ ...card, padding: p }}>
          <Section icon={<Target size={13} />} label="Core Promise" color="var(--accent)">
            <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.65, margin: 0, wordBreak: 'break-word' }}>
              {offer.core_promise}
            </p>
          </Section>
        </div>
      </div>

      <div style={{ ...card, padding: p }}>
        <Section icon={<Zap size={13} />} label="Unique Mechanism" color="hsl(43 96% 56%)">
          <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.65, margin: 0, wordBreak: 'break-word' }}>
            {offer.unique_mechanism}
          </p>
        </Section>
      </div>

      {offer.value_stack?.length > 0 && (
        <div style={{ ...card, padding: p }}>
          <Section icon={<CheckCircle2 size={13} />} label="Value Stack — What They Get" color="hsl(142 71% 45%)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {offer.value_stack.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 12px', background: 'var(--muted)', borderRadius: 8 }}>
                  <CheckCircle2 size={14} style={{ color: 'hsl(142 71% 45%)', flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>{item.name}</span>
                      {item.perceived_value && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'hsl(142 71% 45%)', flexShrink: 0 }}>
                          {item.perceived_value}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.55, margin: 0 }}>
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      <div style={{ ...card, padding: p, background: 'hsl(220 90% 56% / 0.04)', borderLeft: '3px solid var(--accent)' }}>
        <Section icon={<Shield size={13} />} label="The Guarantee" color="var(--accent)">
          <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.65, margin: 0 }}>{offer.guarantee}</p>
        </Section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        <div style={{ ...card, padding: p }}>
          <Section icon={<CheckCircle2 size={13} />} label="This Is For You If..." color="hsl(142 71% 45%)">
            <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' }}>
              {offer.who_its_for}
            </p>
          </Section>
        </div>
        <div style={{ ...card, padding: p }}>
          <Section icon={<AlertCircle size={13} />} label="This Is NOT For You If..." color="hsl(0 84% 60%)">
            <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' }}>
              {offer.who_its_not_for}
            </p>
          </Section>
        </div>
      </div>

      {offer.objection_crushers?.length > 0 && (
        <div style={{ ...card, padding: p }}>
          <Section icon={<AlertCircle size={13} />} label="Objection Crushers" color="hsl(270 60% 65%)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {offer.objection_crushers.map((item, i) => (
                <div key={i} style={{ borderLeft: '2px solid hsl(270 60% 65% / 0.4)', paddingLeft: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'hsl(270 60% 65%)', marginBottom: 3 }}>
                    &ldquo;{item.objection}&rdquo;
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.6, margin: 0 }}>{item.response}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {offer.urgency_angle && (
        <div style={{ ...card, padding: p }}>
          <Section icon={<Clock size={13} />} label="Why Act Now" color="hsl(0 84% 60%)">
            <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.65, margin: 0 }}>{offer.urgency_angle}</p>
          </Section>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Stage = 'lead' | 'wizard' | 'review' | 'generating' | 'results'

export default function OfferBuilderPage() {
  const [stage, setStage] = useState<Stage>('lead')
  const [lead, setLead] = useState({ name: '', email: '', phone: '' })
  const [leadError, setLeadError] = useState('')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [offer, setOffer] = useState<OfferOutput | null>(null)
  const [genError, setGenError] = useState('')

  // ── Lead capture submit ─────────────────────────────────────────────────
  function submitLead(e: React.FormEvent) {
    e.preventDefault()
    if (!lead.name.trim()) { setLeadError('Please enter your name.'); return }
    if (!lead.email.trim() && !lead.phone.trim()) { setLeadError('Please enter your email or phone number.'); return }
    setLeadError('')
    setStage('wizard')
  }

  // ── Wizard nav ──────────────────────────────────────────────────────────
  function handleAnswer(value: string) {
    setAnswers(prev => ({ ...prev, [STEPS[step].key]: value }))
  }
  function nextStep() {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else setStage('review')
  }
  function prevStep() {
    if (step > 0) setStep(s => s - 1)
    else setStage('lead')
  }

  // ── Generate ────────────────────────────────────────────────────────────
  async function generate() {
    setStage('generating')
    setGenError('')
    try {
      const res = await fetch('/api/lead-magnets/offer-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead, answers }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setOffer(data.offer as OfferOutput)
      setStage('results')
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Something went wrong')
      setStage('review')
    }
  }

  const current = STEPS[step]
  const currentAnswer = answers[current?.key ?? ''] || ''
  const canAdvance = currentAnswer.trim().length > 3
  const progress = ((step + 1) / STEPS.length) * 100

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px',
    background: 'var(--input)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--foreground)', fontSize: 14,
    fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  }
  const primaryBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '11px 24px', borderRadius: 9, border: 'none',
    background: 'var(--accent)', color: 'white',
    fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    transition: 'opacity 0.15s', whiteSpace: 'nowrap' as const,
  }
  const ghostBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '10px 18px', borderRadius: 9,
    border: '1px solid var(--border)', background: 'var(--muted)',
    color: 'var(--muted-foreground)', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        body { background: var(--background); }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)' }}>

        {/* Header */}
        <div style={{ borderBottom: '1px solid var(--border)', padding: '0 24px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 16 }}>⚡</span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.3px' }}>
              Creator Cult
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Free Offer Builder
            </span>
          </div>
        </div>

        <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 80px' }}>

          {/* ── STAGE: lead capture ─────────────────────────────────────── */}
          {stage === 'lead' && (
            <>
              {/* Hero */}
              <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 14px', borderRadius: 99, marginBottom: 20,
                  background: 'hsl(220 90% 56% / 0.1)', border: '1px solid hsl(220 90% 56% / 0.25)',
                  fontSize: 11, fontWeight: 700, color: 'var(--accent)',
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                }}>
                  <Sparkles size={10} /> Free Tool
                </div>
                <h1 style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1.2, margin: '0 0 16px', letterSpacing: '-0.5px' }}>
                  Build your Precision<br />Offer Blueprint
                </h1>
                <p style={{ fontSize: 15, color: 'var(--muted-foreground)', lineHeight: 1.65, maxWidth: 500, margin: '0 auto 8px' }}>
                  Know exactly what you want to offer? Fill everything in and get something deeply specific. Starting from scratch? Answer what you can and type &ldquo;I don&apos;t know&rdquo; for the rest — we&apos;ll figure it out.
                </p>
                <p style={{ fontSize: 13, color: 'var(--muted-foreground)', opacity: 0.7 }}>
                  9 questions. Completely free. No coaching experience needed.
                </p>
              </div>

              {/* Lead form */}
              <div style={{ ...card, padding: '28px 28px', maxWidth: 460, margin: '0 auto' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', marginBottom: 4 }}>
                  Where should we send your offer?
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 22, lineHeight: 1.5 }}>
                  Your results appear instantly on screen. No email needed — but we&apos;ll save your details so we can reach out with how to actually launch this offer.
                </div>
                <form onSubmit={submitLead} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>
                      Your name <span style={{ color: 'hsl(0 84% 60%)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={lead.name}
                      onChange={e => setLead(l => ({ ...l, name: e.target.value }))}
                      placeholder="First name"
                      required
                      style={inputStyle}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>
                      Email address
                    </label>
                    <input
                      type="email"
                      value={lead.email}
                      onChange={e => setLead(l => ({ ...l, email: e.target.value }))}
                      placeholder="you@example.com"
                      style={inputStyle}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>
                      Or phone number
                    </label>
                    <input
                      type="tel"
                      value={lead.phone}
                      onChange={e => setLead(l => ({ ...l, phone: e.target.value }))}
                      placeholder="+44 7700 000000"
                      style={inputStyle}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                    />
                  </div>
                  {leadError && (
                    <div style={{ fontSize: 12, color: 'hsl(0 84% 60%)', padding: '8px 12px', background: 'hsl(0 84% 60% / 0.08)', borderRadius: 6 }}>
                      {leadError}
                    </div>
                  )}
                  <button type="submit" style={{ ...primaryBtn, width: '100%', marginTop: 4 }}>
                    Build My Free Offer <ArrowRight size={14} />
                  </button>
                </form>
              </div>

              {/* Trust row */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginTop: 28, flexWrap: 'wrap' }}>
                {['Takes 5 minutes', 'No login required', '100% free'].map(t => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted-foreground)' }}>
                    <Check size={12} style={{ color: 'hsl(142 71% 45%)' }} />
                    {t}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── STAGE: wizard ───────────────────────────────────────────── */}
          {stage === 'wizard' && (
            <div style={{ ...card, padding: '28px 28px' }}>
              {/* Progress */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Build Your Offer
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                    {step + 1} of {STEPS.length}
                  </span>
                </div>
                <div style={{ height: 3, background: 'var(--muted)', borderRadius: 3 }}>
                  <div style={{ height: '100%', borderRadius: 3, background: 'var(--accent)', width: `${progress}%`, transition: 'width 0.3s ease' }} />
                </div>
              </div>

              {/* Question */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.4, marginBottom: 8 }}>
                  {current.question}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
                  {current.hint}
                </div>
              </div>

              <textarea
                value={currentAnswer}
                onChange={e => handleAnswer(e.target.value)}
                placeholder={current.placeholder}
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canAdvance) nextStep() }}
                style={{
                  ...inputStyle, minHeight: 120, resize: 'vertical' as const, lineHeight: 1.65,
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
              />
              <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 6 }}>⌘ + Enter to continue</div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, gap: 10 }}>
                <button onClick={prevStep} style={ghostBtn}>
                  <ArrowLeft size={13} />
                  {step === 0 ? 'Back' : 'Back'}
                </button>
                <button onClick={nextStep} disabled={!canAdvance} style={{ ...primaryBtn, opacity: canAdvance ? 1 : 0.4 }}>
                  {step === STEPS.length - 1 ? 'Review My Answers' : 'Next'}
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}

          {/* ── STAGE: review ───────────────────────────────────────────── */}
          {stage === 'review' && (
            <div style={{ ...card, padding: '28px 28px' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)', marginBottom: 6 }}>
                Review Your Answers
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 22, lineHeight: 1.5 }}>
                Check everything looks right. Click any answer to edit it.
              </div>

              {genError && (
                <div style={{ fontSize: 13, color: 'hsl(0 84% 60%)', padding: '10px 14px', background: 'hsl(0 84% 60% / 0.08)', borderRadius: 8, marginBottom: 18 }}>
                  {genError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {STEPS.map((s, i) => (
                  <div key={s.key} style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--muted)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', marginBottom: 4 }}>
                      {i + 1}. {s.question}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.55, wordBreak: 'break-word' }}>
                      {answers[s.key] || <span style={{ color: 'var(--muted-foreground)', fontStyle: 'italic' }}>Not answered</span>}
                    </div>
                    <button
                      onClick={() => { setStep(i); setStage('wizard') }}
                      style={{ marginTop: 8, fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
                    >
                      Edit →
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setStep(STEPS.length - 1); setStage('wizard') }} style={ghostBtn}>
                  Back
                </button>
                <button onClick={generate} style={{ ...primaryBtn, flex: 1 }}>
                  <Sparkles size={13} /> Generate My Offer
                </button>
              </div>
            </div>
          )}

          {/* ── STAGE: generating ───────────────────────────────────────── */}
          {stage === 'generating' && (
            <div style={{ ...card, padding: '60px 32px', textAlign: 'center' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'hsl(220 90% 56% / 0.1)', border: '1px solid hsl(220 90% 56% / 0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                animation: 'pulse-soft 2s ease-in-out infinite',
              }}>
                <Sparkles size={22} style={{ color: 'var(--accent)' }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)', marginBottom: 10 }}>
                Building Your Precision Offer Blueprint…
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.65, maxWidth: 360, margin: '0 auto' }}>
                Applying Will Scott&apos;s framework to your answers and crafting your complete offer. Takes about 20 seconds.
              </div>
            </div>
          )}

          {/* ── STAGE: results ──────────────────────────────────────────── */}
          {stage === 'results' && offer && (
            <>
              {/* Results header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <Target size={14} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>
                  Your Precision Offer Blueprint
                </span>
              </div>

              <OfferDisplay offer={offer} />

              {/* ── Conversion CTA ──────────────────────────────────────── */}
              <div style={{
                marginTop: 32,
                borderRadius: 16,
                border: '1px solid var(--accent)',
                background: 'hsl(220 90% 56% / 0.05)',
                overflow: 'hidden',
              }}>
                {/* Top bar */}
                <div style={{
                  background: 'var(--accent)',
                  padding: '10px 24px',
                  fontSize: 11, fontWeight: 700,
                  color: 'white',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  textAlign: 'center',
                }}>
                  Your offer is built. Now make it work.
                </div>

                <div style={{ padding: '28px 28px' }}>
                  <h2 style={{ fontSize: 'clamp(18px, 3vw, 24px)', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1.3, margin: '0 0 12px', letterSpacing: '-0.3px' }}>
                    A great offer is just the foundation.
                  </h2>
                  <p style={{ fontSize: 14, color: 'var(--muted-foreground)', lineHeight: 1.7, margin: '0 0 22px', maxWidth: 560 }}>
                    Creator Cult gives you the complete system — the hooks, scripts, content strategy, DM sales process, and weekly AI-powered plan that turns your offer into a consistent stream of clients from Instagram.
                  </p>

                  {/* Feature bullets */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginBottom: 28 }}>
                    {[
                      'Weekly AI script package — 7 reels built from competitor intel',
                      'Content Studio — hooks, captions, and series planned for you',
                      'DM Sales Tracker — manage leads and close more clients',
                      'Profile Audit — optimise your bio, highlights, and content mix',
                      'Hook Lab & Series Planner — never run out of ideas',
                      'Competitor Intelligence — know what\'s working before you post',
                    ].map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <CheckCircle2 size={13} style={{ color: 'hsl(142 71% 45%)', flexShrink: 0, marginTop: 2 }} />
                        <span style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.55 }}>{f}</span>
                      </div>
                    ))}
                  </div>

                  <a
                    href="https://cultdashboard.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      padding: '13px 28px', borderRadius: 10, border: 'none',
                      background: 'var(--accent)', color: 'white',
                      fontSize: 15, fontWeight: 700, textDecoration: 'none',
                      transition: 'opacity 0.15s',
                    }}
                  >
                    Apply for the Full Programme <ChevronRight size={16} />
                  </a>
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 10 }}>
                    Limited spots · High-ticket coaching · Application required
                  </div>
                </div>
              </div>

              {/* Start over link */}
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <button
                  onClick={() => { setStage('lead'); setOffer(null); setAnswers({}); setLead({ name: '', email: '', phone: '' }); setStep(0) }}
                  style={{ fontSize: 12, color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
                >
                  Start over with different answers
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  )
}
