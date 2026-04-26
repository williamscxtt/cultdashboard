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
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: '-1px' }}>£50</span>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>/month</span>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
            Full dashboard access · Cancel anytime
          </div>

          {/* Trial badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 20,
            background: 'rgba(59,130,246,0.12)',
            border: '1px solid rgba(59,130,246,0.3)',
            fontSize: 12, fontWeight: 700, color: '#60a5fa',
          }}>
            <Zap size={11} />
            30-day free trial — no charge today
          </div>
        </div>

        {/* Features */}
        <div style={{ padding: '20px 28px' }}>
          {[
            'Full Instagram analytics & reel tracking',
            'AI content analysis & hook scoring',
            'Weekly coaching reports',
            'Circle community briefings',
            'Client progress dashboard',
            'Cancel anytime from billing settings',
          ].map((feature) => (
            <div key={feature} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              marginBottom: 10,
            }}>
              <div style={{
                flexShrink: 0, width: 18, height: 18, borderRadius: '50%',
                background: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Check size={10} color="#60a5fa" strokeWidth={3} />
              </div>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{feature}</span>
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
              width: '100%', padding: '14px', borderRadius: 10,
              background: loading ? 'rgba(59,130,246,0.5)' : '#3b82f6',
              border: 'none', color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.15s',
              fontFamily: 'inherit',
            }}
          >
            <CreditCard size={16} />
            {loading ? 'Redirecting to checkout…' : 'Start free trial'}
          </button>
          <p style={{ marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
            Card required to start. You won&apos;t be charged until after your 30-day trial.
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
