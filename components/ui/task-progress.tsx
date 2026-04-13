'use client'

import React, { useEffect, useRef, useState } from 'react'

// Thin spinner matching the UI design system
function Spinner({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" stroke="var(--accent)" strokeWidth="2.5" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </svg>
  )
}

/**
 * TaskProgress — animated progress bar for long-running async operations.
 *
 * Uses a timer-based fake-progress approach:
 * - Fills to ~92% over `estimatedMs` using an ease-out curve
 * - Pauses and shows "Finishing…" if still waiting after that time
 * - Snaps to 100% (green) and fades out after the task completes
 */
export function TaskProgress({
  active,
  estimatedMs = 60000,
  label = 'Working…',
  sublabel,
}: {
  active: boolean
  estimatedMs?: number
  label?: string
  sublabel?: string
}) {
  const [pct, setPct] = useState(0)
  const [done, setDone] = useState(false)
  const [visible, setVisible] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const prevActive = useRef(false)

  useEffect(() => {
    if (active && !prevActive.current) {
      // Task started
      setPct(0)
      setDone(false)
      setVisible(true)
      setElapsed(0)
      startRef.current = Date.now()

      const tick = () => {
        if (!startRef.current) return
        const ms = Date.now() - startRef.current
        setElapsed(Math.floor(ms / 1000))
        // Ease-out: fast start, slow finish, caps at 92%
        const raw = ms / estimatedMs
        const eased = 1 - Math.pow(1 - Math.min(raw, 1), 2.5)
        setPct(Math.min(eased * 92, 92))
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    if (!active && prevActive.current) {
      // Task finished
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      startRef.current = null
      setDone(true)
      setPct(100)
      const t = setTimeout(() => setVisible(false), 1400)
      return () => clearTimeout(t)
    }

    prevActive.current = active
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [active, estimatedMs])

  if (!visible) return null

  const remaining = Math.max(0, Math.round(estimatedMs / 1000 - elapsed))

  return (
    <div style={{
      marginBottom: 14,
      opacity: done ? 0 : 1,
      transition: done ? 'opacity 1.2s ease' : 'none',
    }}>
      {/* Label + countdown */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 7,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {!done && <Spinner size={11} />}
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>{label}</span>
          {sublabel && (
            <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>· {sublabel}</span>
          )}
        </div>
        <span style={{
          fontSize: 11, color: done ? 'rgba(74, 222, 128, 0.9)' : 'var(--muted-foreground)',
          fontVariantNumeric: 'tabular-nums', fontWeight: done ? 600 : 400,
        }}>
          {done ? 'Done' : remaining > 0 ? `~${remaining}s` : 'Almost done…'}
        </span>
      </div>

      {/* Bar */}
      <div style={{
        height: 3, borderRadius: 3,
        background: 'var(--muted)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: `${pct}%`,
          borderRadius: 3,
          background: done
            ? 'rgba(74, 222, 128, 0.85)'
            : 'linear-gradient(90deg, hsl(220 90% 56%) 0%, hsl(210 90% 68%) 100%)',
          transition: done
            ? 'width 0.4s ease, background 0.4s ease'
            : 'width 0.08s linear',
          boxShadow: done ? 'none' : '0 0 6px rgba(59, 130, 246, 0.5)',
        }} />
      </div>
    </div>
  )
}
