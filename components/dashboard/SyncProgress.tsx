'use client'

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

// ─── Context ──────────────────────────────────────────────────────────────────

interface SyncState {
  active: boolean
  progress: number   // 0–100
  label: string
}

interface SyncContextValue {
  syncState: SyncState
  startSync: (label?: string) => void
  updateProgress: (pct: number, label?: string) => void
  finishSync: () => void
}

const SyncContext = createContext<SyncContextValue | null>(null)

export function useSyncProgress() {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSyncProgress must be used inside SyncProgressProvider')
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SyncProgressProvider({ children }: { children: React.ReactNode }) {
  const [syncState, setSyncState] = useState<SyncState>({ active: false, progress: 0, label: '' })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function startSync(label = 'Syncing…') {
    if (timerRef.current) clearTimeout(timerRef.current)
    setSyncState({ active: true, progress: 5, label })
  }

  const updateProgress = useCallback((pct: number, label?: string) => {
    setSyncState(prev => ({
      ...prev,
      progress: Math.min(pct, 99),
      label: label ?? prev.label,
    }))
  }, [])

  const finishSync = useCallback(() => {
    setSyncState(prev => ({ ...prev, progress: 100 }))
    timerRef.current = setTimeout(() => {
      setSyncState({ active: false, progress: 0, label: '' })
    }, 600)
  }, [])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return (
    <SyncContext.Provider value={{ syncState, startSync, updateProgress, finishSync }}>
      {children}
      <SyncProgressBar state={syncState} />
    </SyncContext.Provider>
  )
}

// ─── Bar UI ───────────────────────────────────────────────────────────────────

function SyncProgressBar({ state }: { state: SyncState }) {
  const { active, progress, label } = state
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (active) setVisible(true)
    else {
      const t = setTimeout(() => setVisible(false), 700)
      return () => clearTimeout(t)
    }
  }, [active])

  if (!visible) return null

  const isFinished = progress >= 100

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      pointerEvents: 'none',
    }}>
      {/* Progress bar */}
      <div style={{
        height: 2,
        background: 'var(--border)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: `linear-gradient(90deg, var(--accent), hsl(221 83% 70%))`,
          transition: isFinished
            ? 'width 0.3s ease, opacity 0.4s ease 0.3s'
            : 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
          opacity: isFinished ? 0 : 1,
          boxShadow: '0 0 8px hsl(221 83% 53% / 0.6)',
        }} />
      </div>

      {/* Label pill */}
      {!isFinished && label && (
        <div style={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--foreground)',
          color: 'var(--background)',
          fontSize: 11,
          fontWeight: 700,
          padding: '4px 12px',
          borderRadius: 999,
          whiteSpace: 'nowrap',
          boxShadow: 'var(--shadow-md)',
          letterSpacing: '-0.1px',
          animation: 'slide-down 0.18s ease both',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
        }}>
          {/* Pulsing dot */}
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--accent)',
            display: 'inline-block',
            animation: 'pulse-soft 1.2s ease-in-out infinite',
            flexShrink: 0,
          }} />
          {label}
          {progress > 0 && progress < 100 && (
            <span style={{ opacity: 0.6, fontWeight: 500 }}>
              {Math.round(progress)}%
            </span>
          )}
        </div>
      )}
    </div>
  )
}
