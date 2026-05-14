'use client'

import { useState, useCallback } from 'react'
import { Zap, Check, ArrowRight, TrendingUp, Lightbulb, MessageSquare, BarChart2, Calendar, PhoneCall, Search, Send, List, ArrowLeft } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const STRIPE_APPEARANCE = {
  theme: 'night' as const,
  variables: {
    colorPrimary: '#ffffff',
    colorBackground: '#0d0d0d',
    colorText: '#f0f0f0',
    colorDanger: '#f87171',
    colorTextPlaceholder: '#555',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: '8px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': { border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)' },
    '.Input:focus': { border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 0 0 3px rgba(255,255,255,0.06)' },
    '.Label': { color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.01em' },
  },
}

const FEATURES = [
  { icon: BarChart2,      label: 'Instagram analytics & follower tracking' },
  { icon: Lightbulb,     label: 'AI content studio: scripts written around your niche every week' },
  { icon: TrendingUp,    label: 'Competitor intelligence: see exactly what\'s working in your niche' },
  { icon: Zap,           label: 'Hook Lab: generate 20+ scroll-stopping hooks per topic instantly' },
  { icon: List,          label: 'Series Planner: multi-part content series mapped out in seconds' },
  { icon: Calendar,      label: 'Content calendar: plan and schedule your entire month' },
  { icon: Search,        label: 'Profile audit tools: fix what\'s killing your reach' },
  { icon: PhoneCall,     label: 'DM sales system: scripts and strategies to close clients in the DMs' },
  { icon: Send,          label: 'Outreach tools: cold and warm outreach frameworks' },
  { icon: MessageSquare, label: 'Ask Will AI: 24/7 coaching, available any time you need it' },
]

function CheckoutForm({ plan, onBack, intentType }: { plan: 'monthly' | 'sixmonth'; onBack: () => void; intentType: 'payment_intent' | 'setup_intent' }) {
  const stripe   = useStripe()
  const elements = useElements()
  const [status,   setStatus]   = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setStatus('loading')
    setErrorMsg('')
    const confirmFn = intentType === 'setup_intent' ? stripe.confirmSetup : stripe.confirmPayment
    const { error } = await confirmFn({
      elements,
      confirmParams: { return_url: `${window.location.origin}/apply/success` },
    })
    if (error) {
      setErrorMsg(error.message ?? 'Something went wrong.')
      setStatus('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      <PaymentElement options={{ layout: 'auto', wallets: { applePay: 'auto', googlePay: 'auto' } }} />
      {errorMsg && (
        <p style={{ marginTop: 14, fontSize: 13, color: '#f87171', textAlign: 'center', lineHeight: 1.5 }}>{errorMsg}</p>
      )}
      <button
        type="submit"
        disabled={!stripe || status === 'loading'}
        style={{
          width: '100%', height: 50, marginTop: 20,
          background: '#3B82F6', color: '#fff', border: 'none',
          borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'inherit', transition: 'background 0.15s, opacity 0.15s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: (!stripe || status === 'loading') ? 0.5 : 1,
        }}
      >
        {status === 'loading' ? 'Processing…' : plan === 'monthly' ? 'Pay £95 / month →' : 'Pay £395 →'}
      </button>
      <p style={{ marginTop: 10, fontSize: 11, textAlign: 'center', color: 'rgba(255,255,255,0.22)', lineHeight: 1.5 }}>
        Secure payment · Powered by Stripe
      </p>
      <button
        type="button" onClick={onBack}
        style={{ marginTop: 6, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.28)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 0', width: '100%', justifyContent: 'center', fontFamily: 'inherit' }}
      >
        <ArrowLeft size={13} /> Change plan
      </button>
    </form>
  )
}

interface AccessCheckoutPageProps {
  /** Optional first name — shows personalised greeting when set */
  firstName?: string
  /** Pre-fill email in Stripe */
  email?: string
}

export default function AccessCheckoutPage({ firstName, email }: AccessCheckoutPageProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'sixmonth' | null>(null)
  const [clientSecret,  setClientSecret] = useState<string | null>(null)
  const [intentType,    setIntentType]   = useState<'payment_intent' | 'setup_intent'>('payment_intent')
  const [fetchError,    setFetchError]   = useState<string | null>(null)

  const selectPlan = useCallback(async (plan: 'monthly' | 'sixmonth') => {
    setSelectedPlan(plan)
    setClientSecret(null)
    setFetchError(null)
    try {
      const res  = await fetch('/api/stripe/apply-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, email }),
      })
      const data = await res.json()
      if (data.clientSecret) {
        setClientSecret(data.clientSecret)
        setIntentType(data.intentType ?? 'payment_intent')
      } else {
        setFetchError(data.error ?? 'Failed to initialise checkout.')
      }
    } catch (e: unknown) {
      setFetchError(e instanceof Error ? e.message : 'Network error.')
    }
  }, [email])

  return (
    <div style={{
      minHeight: '100dvh', background: '#000', color: '#fff',
      fontFamily: 'Inter, system-ui, sans-serif',
      paddingTop: 'max(40px, env(safe-area-inset-top))',
      paddingBottom: 'max(60px, env(safe-area-inset-bottom))',
      paddingLeft: 'max(20px, env(safe-area-inset-left))',
      paddingRight: 'max(20px, env(safe-area-inset-right))',
    }}>
      <style>{`
        @keyframes fadeUp  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin    { to { transform: rotate(360deg); } }
        .plan-btn          { transition: border-color 0.15s, background 0.15s; }
        .plan-btn:hover    { border-color: rgba(59,130,246,0.6) !important; background: rgba(59,130,246,0.13) !important; }
        .plan-btn-best:hover { border-color: rgba(74,222,128,0.55) !important; background: rgba(74,222,128,0.06) !important; }
      `}</style>

      <div style={{ maxWidth: 560, margin: '0 auto', animation: 'fadeUp 0.45s ease both' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: firstName ? 32 : 48 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={17} color="#fff" fill="#fff" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px' }}>Creator Cult</span>
        </div>

        {/* Personalised greeting (apply form context) */}
        {firstName && (
          <div style={{ marginBottom: 32, padding: '14px 18px', borderRadius: 12, background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Check size={14} color="#4ade80" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#4ade80' }}>You&apos;re in, {firstName}.</span>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4, lineHeight: 1.55 }}>
              Pick a plan below and get instant access to everything.
            </p>
          </div>
        )}

        {/* Hero */}
        {!firstName && (
          <div style={{ marginBottom: 40 }}>
            <h1 style={{ fontSize: 'clamp(28px, 6vw, 38px)', fontWeight: 800, letterSpacing: '-0.8px', lineHeight: 1.12, marginBottom: 14, color: '#fff' }}>
              Everything you need to grow<br />
              <span style={{ color: '#60a5fa' }}>on Instagram</span>, in one place.
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: 480 }}>
              Scripts written to your niche every week. Competitor intelligence. Analytics. Hook Lab. Ask Will AI. All the tools Will uses, now yours.
            </p>
          </div>
        )}

        {/* Feature list */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '18px 20px', marginBottom: 32 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 13 }}>
            What&apos;s inside
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
            {FEATURES.map(({ label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <Check size={11} color="#4ade80" strokeWidth={3} style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.45 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>
            Choose a plan
          </div>

          {!selectedPlan ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Monthly */}
              <button
                onClick={() => selectPlan('monthly')}
                className="plan-btn"
                style={{ width: '100%', padding: '20px 22px', borderRadius: 12, textAlign: 'left', cursor: 'pointer', background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.28)', fontFamily: 'inherit' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 5, letterSpacing: '0.02em' }}>Monthly</div>
                    <div style={{ fontSize: 30, fontWeight: 800, color: '#93c5fd', letterSpacing: '-0.6px', lineHeight: 1 }}>
                      £95<span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.35)' }}>/mo</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                    Cancel anytime <ArrowRight size={12} />
                  </div>
                </div>
              </button>

              {/* 6-month */}
              <button
                onClick={() => selectPlan('sixmonth')}
                className="plan-btn plan-btn-best"
                style={{ width: '100%', padding: '20px 22px', borderRadius: 12, textAlign: 'left', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)', fontFamily: 'inherit', position: 'relative' }}
              >
                <div style={{ position: 'absolute', top: -10, right: 16, fontSize: 10, fontWeight: 800, color: '#000', background: '#4ade80', padding: '3px 10px', borderRadius: 99, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Best value
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 5, letterSpacing: '0.02em' }}>6 Months</div>
                    <div style={{ fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: '-0.6px', lineHeight: 1 }}>
                      £395<span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.35)' }}> total</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>~£66/mo · save £175</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(74,222,128,0.8)', fontWeight: 700 }}>
                    Save £175 <ArrowRight size={12} />
                  </div>
                </div>
              </button>
            </div>
          ) : (
            <div style={{ animation: 'fadeUp 0.3s ease both' }}>
              {/* Selected plan badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Check size={13} color="#4ade80" />
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                    {selectedPlan === 'monthly' ? 'Monthly · £95/mo' : '6 Months · £395 total'}
                  </span>
                </div>
                <button
                  onClick={() => { setSelectedPlan(null); setClientSecret(null) }}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 12, cursor: 'pointer', fontWeight: 600, padding: 0, fontFamily: 'inherit' }}
                >
                  Change
                </button>
              </div>

              {fetchError && (
                <p style={{ fontSize: 13, color: '#f87171', textAlign: 'center', marginBottom: 16 }}>{fetchError}</p>
              )}

              {!clientSecret && !fetchError && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid rgba(59,130,246,0.15)', borderTopColor: '#3B82F6', animation: 'spin 0.85s linear infinite' }} />
                </div>
              )}

              {clientSecret && (
                <Elements key={selectedPlan} stripe={stripePromise} options={{ clientSecret, appearance: STRIPE_APPEARANCE }}>
                  <CheckoutForm plan={selectedPlan} intentType={intentType} onBack={() => { setSelectedPlan(null); setClientSecret(null) }} />
                </Elements>
              )}
            </div>
          )}
        </div>

        {/* Explainer */}
        {!selectedPlan && (
          <div style={{ marginTop: 20, padding: '14px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.65 }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Both plans include everything.</span>
            {' '}Full dashboard access, all AI tools, weekly scripts, and unlimited use of every feature. The 6-month plan is the same tools at a lower monthly rate, no features removed.
          </div>
        )}

        {/* Social proof */}
        {!selectedPlan && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 28, marginBottom: 8, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', flexShrink: 0 }}>
              {[47, 11, 32, 5, 68].map((img, i) => (
                <img
                  key={i}
                  src={`https://i.pravatar.cc/150?img=${img}`}
                  alt=""
                  width={28} height={28}
                  style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #000', marginLeft: i === 0 ? 0 : -8, flexShrink: 0, objectFit: 'cover', position: 'relative', zIndex: 5 - i }}
                />
              ))}
            </div>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
              Used by creators and coaches growing on Instagram
            </span>
          </div>
        )}

        {/* Footer */}
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', lineHeight: 1.6, marginTop: 24, textAlign: 'center' }}>
          Questions before you commit?{' '}
          <a href="https://instagram.com/williamscxtt" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontWeight: 600 }}>
            DM Will on Instagram →
          </a>
        </p>

      </div>
    </div>
  )
}
