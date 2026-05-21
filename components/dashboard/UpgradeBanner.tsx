'use client'

import { useState, useEffect } from 'react'
import type { Profile } from '@/lib/types'

const BIANNUAL_LINK = 'https://buy.stripe.com/bJe28qcmWe970hMews9IQ1P'
const DISMISS_KEY = 'upgrade_banner_dismissed_at'
const COOLDOWN_DAYS = 7

function isCooledDown(): boolean {
  try {
    const v = localStorage.getItem(DISMISS_KEY)
    if (!v) return true
    return (Date.now() - parseInt(v, 10)) / (1000 * 60 * 60 * 24) >= COOLDOWN_DAYS
  } catch {
    return true
  }
}

export default function UpgradeBanner({ profile }: { profile: Profile }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (profile.plan_type !== 'monthly') return
    if (profile.subscription_status !== 'active' && profile.subscription_status !== 'trialing') return
    if (!isCooledDown()) return
    setVisible(true)
  }, [profile.plan_type, profile.subscription_status])

  if (!visible) return null

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, Date.now().toString()) } catch {}
    setVisible(false)
  }

  return (
    <div style={{
      position: 'relative',
      marginBottom: 20,
      borderRadius: 10,
      border: '1px solid rgba(59,130,246,0.25)',
      background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(13,13,10,0.6) 100%)',
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
    }}>
      <div style={{
        flexShrink: 0,
        fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase',
        color: '#3b82f6',
        background: 'rgba(59,130,246,0.12)',
        border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: 4, padding: '3px 8px', whiteSpace: 'nowrap',
      }}>
        Save £185
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
          Switch to 6 months — get 2 months free.
        </span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginLeft: 8 }}>
          Pay £997 instead of £1,182. Same everything, locked in.
        </span>
      </div>

      <a
        href={BIANNUAL_LINK}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          flexShrink: 0, fontSize: 12, fontWeight: 700,
          color: '#ffffff', background: '#3b82f6',
          borderRadius: 6, padding: '7px 14px',
          textDecoration: 'none', whiteSpace: 'nowrap',
          cursor: 'pointer', transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        Switch now →
      </a>

      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          flexShrink: 0, background: 'none', border: 'none',
          color: 'rgba(255,255,255,0.25)', cursor: 'pointer',
          padding: 4, fontSize: 16, lineHeight: 1,
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
      >
        ✕
      </button>
    </div>
  )
}
