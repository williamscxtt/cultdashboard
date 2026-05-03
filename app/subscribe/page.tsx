'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Zap, Check, Lock, CreditCard } from 'lucide-react'

// Separated so useSearchParams() has a Suspense boundary (Next.js requirement)
function SubscribeContent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const canceled = searchParams.get('canceled') === '1'
  const pastDue = searchParams.get('past_due') === '1'

  async function handleSubscribe() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 420 }}>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 48, height: 48, borderRadius: 14,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.1)',
          marginBottom: 16,
        }}>
          <Zap size={22} color="white" fill="white" />
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.4px' }}>
          Creator Cult Dashboard
        </div>
      </div>

      {/* Past due / canceled banners */}
      {(pastDue || canceled) && (
        <div style={{
          marginBottom: 20, padding: '12px 16px', borderRadius: 10,
          background: pastDue ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${pastDue ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`,
          color: pastDue ? '#f87171' : 'rgba(255,255,255,0.5)',
          fontSize: 13,
        }}>
          {pastDue
            ? 'Your last payment failed. Please subscribe to regain access.'
            : 'Checkout was cancelled. Subscribe below to access your dashboard.'}
        </div>
      )}

      {/* Card */}
      <div style={{
        background: '#141414',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '28px 28px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'linear-gradient(160deg, rgba(59,130,246,0.07) 0%, transparent 60%)',
        }}>
          {/* Free month hero */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '5px 12px', borderRadius: 20,
            background: 'rgba(59,130,246,0.15)',
            border: '1px solid rgba(59,130,246,0.35)',
            fontSize: 11, fontWeight: 700, color: '#60a5fa',
            textTransform: 'uppercase', letterSpacing: '0.07em',
            marginBottom: 14,
          }}>
            <Zap size={10} fill="#60a5fa" />
            Limited offer
          </div>

          <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '-0.8px', lineHeight: 1.1, marginBottom: 6 }}>
            First month free
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>then</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.7)', letterSpacing: '-0.5px' }}>£50</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>/month after that · cancel anytime</span>
          </div>

          {/* Why it costs */}
          <div style={{
            padding: '12px 14px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            fontSize: 12,
            color: 'rgba(255,255,255,0.4)',
            lineHeight: 1.65,
          }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Why £50/month?</span>
            {' '}The dashboard runs real AI — weekly script packages, hook analysis, content intelligence, and the Ask Will AI are all powered by live AI credits. The £50 covers those running costs so the tools stay fast, accurate, and always on.
          </div>
        </div>

        {/* Features */}
        <div style={{ padding: '20px 28px' }}>
          {[
            'Full Instagram analytics & follower tracking — see exactly what\'s growing and why',
            'AI competitor analysis — track your niche\'s top accounts and what\'s working for them',
            'Weekly AI script writer — 7 ready-to-film reels built from real competitor data, every week',
            'Story sequence generator — plug-and-play story scripts that convert followers to leads',
            'Offer builder — turn your skills and story into a complete, priced coaching offer',
            'Lead magnet generator — build free tools that capture emails and attract ideal clients',
            'Ask Will AI — get coaching answers, feedback, and strategy at any time, day or night',
          ].map((feature) => (
            <div key={feature} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              marginBottom: 10,
            }}>
              <div style={{
                flexShrink: 0, width: 18, height: 18, borderRadius: '50%',
                background: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: 1,
              }}>
                <Check size={10} color="#60a5fa" strokeWidth={3} />
              </div>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{feature}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ padding: '4px 28px 28px' }}>
          {error && (
            <div style={{
              marginBottom: 12, padding: '10px 14px', borderRadius: 8,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#f87171', fontSize: 13,
            }}>
              {error}
            </div>
          )}
          <button
            onClick={handleSubscribe}
            disabled={loading}
            style={{
              width: '100%', padding: '15px', borderRadius: 10,
              background: loading ? 'rgba(59,130,246,0.5)' : '#3b82f6',
              border: 'none', color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.15s',
              fontFamily: 'inherit',
              letterSpacing: '-0.1px',
            }}
          >
            <CreditCard size={16} />
            {loading ? 'Redirecting to checkout…' : 'Claim your free month →'}
          </button>
          <p style={{ marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', lineHeight: 1.6 }}>
            Card saved but not charged today. First month completely free,<br />then £50/month. Cancel before it ends and pay nothing.
          </p>
        </div>
      </div>

      {/* Lock note */}
      <div style={{
        marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 6, color: 'rgba(255,255,255,0.25)', fontSize: 12,
      }}>
        <Lock size={11} />
        Dashboard access requires an active subscription
      </div>
    </div>
  )
}

export default function SubscribePage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <Suspense fallback={<div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Loading…</div>}>
        <SubscribeContent />
      </Suspense>
    </div>
  )
}
