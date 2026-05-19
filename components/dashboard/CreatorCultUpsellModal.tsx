'use client'

import { useState, useEffect } from 'react'
import type { Profile } from '@/lib/types'

// Only show for dashboard-tier members on an active/trialing sub
// Shows once every 21 days — stored in localStorage
const DISMISS_KEY = 'cc_upsell_last_shown'
const COOLDOWN_DAYS = 21

// Will's application/booking page
const BOOK_CALL_URL = 'https://apply.scottvip.com'

function shouldShow(profile: Profile): boolean {
  if (profile.membership_tier === 'creator_cult') return false
  if (profile.role === 'admin') return false
  if (profile.subscription_status !== 'active' && profile.subscription_status !== 'trialing') return false
  try {
    const last = localStorage.getItem(DISMISS_KEY)
    if (!last) return true
    const daysSince = (Date.now() - parseInt(last, 10)) / (1000 * 60 * 60 * 24)
    return daysSince >= COOLDOWN_DAYS
  } catch {
    return true
  }
}

function recordShown() {
  try { localStorage.setItem(DISMISS_KEY, Date.now().toString()) } catch {}
}

export default function CreatorCultUpsellModal({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Delay slightly so it doesn't flash on first paint
    const t = setTimeout(() => {
      if (shouldShow(profile)) {
        setOpen(true)
        recordShown()
      }
    }, 3000)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        backdropFilter: 'blur(4px)',
      }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#111110',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: '36px 32px',
          maxWidth: 480,
          width: '100%',
          position: 'relative',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Close */}
        <button
          onClick={() => setOpen(false)}
          style={{
            position: 'absolute', top: 14, right: 14,
            background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
            fontSize: 18, lineHeight: 1, padding: 4,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Badge */}
        <div style={{
          display: 'inline-block',
          fontSize: 10, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase',
          color: '#e2c97e',
          background: 'rgba(226,201,126,0.1)',
          border: '1px solid rgba(226,201,126,0.2)',
          borderRadius: 4, padding: '3px 10px',
          marginBottom: 20,
        }}>
          Full Creator Cult
        </div>

        <h2 style={{
          fontSize: 24, fontWeight: 800, color: '#ffffff',
          letterSpacing: '-.03em', lineHeight: 1.2,
          margin: '0 0 12px',
        }}>
          Want Will in your corner every week?
        </h2>

        <p style={{
          fontSize: 14, color: 'rgba(255,255,255,0.55)',
          lineHeight: 1.7, margin: '0 0 24px',
        }}>
          The dashboard gives you the tools. Creator Cult gives you everything else — the full curriculum, live weekly coaching with Will, 1-to-1 support between calls, and a community of people actually doing it.
        </p>

        {/* What's included */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 8,
          marginBottom: 28,
        }}>
          {[
            'Live weekly group coaching with Will',
            'Full 5-phase course curriculum',
            '1-to-1 support between calls',
            'Private Circle community',
            'Lifetime dashboard access',
          ].map(item => (
            <div key={item} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 13, color: 'rgba(255,255,255,0.75)',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e2c97e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {item}
            </div>
          ))}
        </div>

        {/* CTA */}
        <a
          href={BOOK_CALL_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block', width: '100%',
            padding: '14px 20px',
            background: '#e2c97e', color: '#0d0d0a',
            border: 'none', borderRadius: 8,
            fontSize: 14, fontWeight: 800, letterSpacing: '-.01em',
            textAlign: 'center', textDecoration: 'none',
            cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Apply for Creator Cult →
        </a>

        <p style={{
          fontSize: 11, color: 'rgba(255,255,255,0.2)',
          textAlign: 'center', marginTop: 12, marginBottom: 0,
        }}>
          Will reviews every application personally. Limited cohort size.
        </p>
      </div>
    </div>
  )
}
