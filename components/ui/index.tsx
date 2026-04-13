import React from 'react'

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({ children, className = '', style = {}, onClick, glow = false }: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
  glow?: boolean
}) {
  return (
    <div
      onClick={onClick}
      className={[
        'gradient-border',
        onClick ? 'card-hover' : '',
        glow ? 'animate-glow-pulse' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={{
        background: 'var(--card)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-xs)',
        ...style,
        ...(onClick ? { cursor: 'pointer' } : {}),
      }}
    >
      {children}
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'accent' | 'muted' | 'info'

export function Badge({ children, variant = 'default', style = {} }: {
  children: React.ReactNode
  variant?: BadgeVariant
  style?: React.CSSProperties
}) {
  const styles: Record<BadgeVariant, React.CSSProperties> = {
    default: { background: 'var(--muted)', color: 'var(--muted-foreground)' },
    success: { background: 'rgba(74, 222, 128, 0.12)', color: 'rgba(74, 222, 128, 0.9)', border: '1px solid rgba(74, 222, 128, 0.2)' },
    warning: { background: 'rgba(251, 191, 36, 0.12)', color: 'rgba(251, 191, 36, 0.9)', border: '1px solid rgba(251, 191, 36, 0.2)' },
    error:   { background: 'rgba(248, 113, 113, 0.12)', color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.2)' },
    accent:  { background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--accent-subtle-border)' },
    muted:   { background: 'var(--muted)', color: 'var(--muted-foreground)' },
    info:    { background: 'rgba(59, 130, 246, 0.12)', color: '#93C5FD', border: '1px solid rgba(59, 130, 246, 0.25)' },
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 600, padding: '3px 8px',
      borderRadius: 6, whiteSpace: 'nowrap',
      letterSpacing: '0.01em',
      ...styles[variant],
      ...style,
    }}>
      {children}
    </span>
  )
}

// ─── Button ───────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'accent'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'xs' | 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({
  children, variant = 'primary', size = 'md',
  style = {}, loading, disabled, ...props
}: ButtonProps) {
  const heights  = { xs: 26, sm: 30, md: 36, lg: 42 }
  const paddings = { xs: '0 10px', sm: '0 12px', md: '0 16px', lg: '0 20px' }
  const fontSizes = { xs: 11, sm: 12, md: 13, lg: 14 }

  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 'var(--radius)', fontWeight: 600,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    border: 'none', fontFamily: 'inherit', whiteSpace: 'nowrap',
    height: heights[size], padding: paddings[size], fontSize: fontSizes[size],
    transition: 'all 0.13s ease',
    opacity: disabled || loading ? 0.5 : 1,
    letterSpacing: '-0.01em',
  }
  const variants: Record<ButtonVariant, React.CSSProperties> = {
    primary:     { background: 'var(--foreground)', color: 'var(--background)', boxShadow: 'var(--shadow-sm)' },
    accent:      { background: 'var(--accent)', color: 'var(--accent-foreground)', boxShadow: '0 1px 8px rgba(59, 130, 246, 0.35), 0 0 20px rgba(59, 130, 246, 0.15)' },
    secondary:   { background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' },
    ghost:       { background: 'transparent', color: 'var(--muted-foreground)' },
    destructive: { background: 'var(--destructive)', color: 'var(--destructive-foreground)', boxShadow: 'var(--shadow-xs)' },
  }
  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{ ...base, ...variants[variant], ...style }}
      onMouseEnter={e => {
        if (disabled || loading) return
        const el = e.currentTarget as HTMLElement
        el.style.filter = 'brightness(0.9)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.filter = ''
        el.style.transform = ''
      }}
      onMouseDown={e => {
        if (disabled || loading) return
        const el = e.currentTarget as HTMLElement
        el.style.transform = 'scale(0.97)'
      }}
      onMouseUp={e => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = ''
      }}
    >
      {loading ? <Spinner size={size === 'xs' || size === 'sm' ? 12 : 14} /> : null}
      {children}
    </button>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.5" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

interface Tab { id: string; label: string; icon?: React.ReactNode; badge?: string | number }

export function Tabs({
  tabs, active, onChange, style = {},
}: {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
  style?: React.CSSProperties
}) {
  return (
    <div style={{
      display: 'flex', gap: 2,
      background: 'var(--muted)', padding: 3, borderRadius: 10,
      ...style,
    }}>
      {tabs.map(tab => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 13px', borderRadius: 7,
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 600,
              transition: 'all 0.13s ease',
              background: isActive ? 'var(--card)' : 'transparent',
              color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)',
              boxShadow: isActive ? 'var(--shadow-xs)' : 'none',
              letterSpacing: '-0.15px',
            }}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 18, height: 18, borderRadius: 999,
                background: isActive ? 'var(--accent)' : 'var(--border)',
                color: isActive ? 'white' : 'var(--muted-foreground)',
                fontSize: 10, fontWeight: 700, padding: '0 5px',
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

export function StatCard({
  label, value, sub, trend, icon,
}: {
  label: string
  value: string | number
  sub?: string
  trend?: number | null
  icon?: React.ReactNode
}) {
  const isUp = trend != null && trend >= 0
  return (
    <div
      className="gradient-border card-hover"
      style={{
        background: 'var(--card)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow spot */}
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 80, height: 80, borderRadius: '50%',
        background: 'rgba(59, 130, 246, 0.06)',
        filter: 'blur(20px)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{
          fontSize: 11, fontWeight: 700,
          color: 'var(--muted-foreground)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          {label}
        </div>
        {icon && (
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#93C5FD',
          }}>
            {icon}
          </div>
        )}
      </div>

      <div
        className="animate-number-up"
        style={{
          fontSize: 30, fontWeight: 800,
          background: 'linear-gradient(135deg, var(--foreground) 60%, hsl(0 5% 65%))',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
          letterSpacing: '-1px',
          lineHeight: 1,
          fontFamily: 'var(--font-display)',
        }}
      >
        {value}
      </div>

      {(sub || trend != null) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
          {trend != null && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 2,
              fontSize: 11, fontWeight: 700,
              color: isUp ? 'rgba(255,255,255,0.5)' : 'hsl(0 72% 55%)',
              background: isUp ? 'rgba(255,255,255,0.04)' : 'hsl(0 50% 12%)',
              border: `1px solid ${isUp ? 'rgba(255,255,255,0.09)' : 'hsl(0 50% 25%)'}`,
              padding: '2px 7px', borderRadius: 5,
            }}>
              {isUp ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
          {sub && <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{sub}</span>}
        </div>
      )}
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function EmptyState({
  icon, title, description, action,
}: {
  icon?: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '56px 24px', textAlign: 'center',
    }}>
      {icon && (
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'var(--muted)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16, color: 'var(--muted-foreground)',
        }}>
          {icon}
        </div>
      )}
      <div style={{
        fontSize: 15, fontWeight: 700, color: 'var(--foreground)',
        marginBottom: 6, fontFamily: 'var(--font-display)',
        letterSpacing: '-0.2px',
      }}>
        {title}
      </div>
      <div style={{
        fontSize: 13, color: 'var(--muted-foreground)',
        maxWidth: 320, lineHeight: 1.6, marginBottom: action ? 20 : 0,
      }}>
        {description}
      </div>
      {action}
    </div>
  )
}

// ─── Page Header ──────────────────────────────────────────────────────────────

export function PageHeader({
  title, description, action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="page-header-row" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{
          fontSize: 20, fontWeight: 800,
          color: 'var(--foreground)',
          letterSpacing: '-0.5px', lineHeight: 1.2,
          fontFamily: 'var(--font-display)',
        }}>
          {title}
        </h1>
        {description && (
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginTop: 3, lineHeight: 1.5 }}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="page-header-actions" style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  )
}

// ─── Section Label ────────────────────────────────────────────────────────────

export function SectionLabel({ children, style = {} }: {
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700,
      color: 'var(--muted-foreground)',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      marginBottom: 10,
      ...style,
    }}>
      {children}
    </div>
  )
}

// ─── Divider ──────────────────────────────────────────────────────────────────

export function Divider({ style = {} }: { style?: React.CSSProperties }) {
  return (
    <div style={{ height: 1, background: 'var(--border)', width: '100%', ...style }} />
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function Skeleton({ width = '100%', height = 16, rounded = false, style = {} }: {
  width?: string | number
  height?: number
  rounded?: boolean
  style?: React.CSSProperties
}) {
  return (
    <div
      className="skeleton-shimmer"
      style={{
        width, height,
        borderRadius: rounded ? 999 : 6,
        ...style,
      }}
    />
  )
}

// ─── Input Label ──────────────────────────────────────────────────────────────

export function InputLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: 'block', fontSize: 12, fontWeight: 600,
        color: 'var(--foreground)', marginBottom: 6,
        letterSpacing: '-0.01em',
      }}
    >
      {children}
    </label>
  )
}

// ─── Alert ────────────────────────────────────────────────────────────────────

export function Alert({
  type = 'info', children,
}: {
  type?: 'info' | 'success' | 'warning' | 'error'
  children: React.ReactNode
}) {
  const colors = {
    info:    { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.25)', text: '#93C5FD' },
    success: { bg: 'rgba(255,255,255,0.03)',  border: 'rgba(255,255,255,0.08)', text: 'rgba(74, 222, 128, 0.8)' },
    warning: { bg: 'rgba(255,255,255,0.03)',   border: 'rgba(255,255,255,0.08)',  text: 'rgba(255,255,255,0.45)' },
    error:   { bg: 'hsl(0 50% 10%)',   border: 'hsl(0 50% 22%)',   text: 'hsl(0 72% 65%)' },
  }
  const c = colors[type]
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 8,
      background: c.bg, border: `1px solid ${c.border}`,
      color: c.text, fontSize: 13, fontWeight: 500, lineHeight: 1.5,
    }}>
      {children}
    </div>
  )
}

// ─── Page Loading Skeleton ────────────────────────────────────────────────────

export function PageLoading({ rows = 3, cards = 4 }: { rows?: number; cards?: number }) {
  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .page-skeleton {
          background: linear-gradient(90deg, var(--muted) 25%, hsl(0 5% 16%) 50%, var(--muted) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite linear;
          border-radius: 8px;
        }
      `}</style>

      {/* Header skeleton */}
      <div style={{ marginBottom: 28 }}>
        <div className="page-skeleton" style={{ height: 28, width: 200, marginBottom: 10 }} />
        <div className="page-skeleton" style={{ height: 14, width: 160 }} />
      </div>

      {/* Cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(cards, 4)}, 1fr)`, gap: 12, marginBottom: 16 }}>
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div className="page-skeleton" style={{ height: 3, borderRadius: 0 }} />
            <div style={{ padding: '18px 20px', background: 'var(--card)' }}>
              <div className="page-skeleton" style={{ height: 10, width: 80, marginBottom: 12 }} />
              <div className="page-skeleton" style={{ height: 32, width: 120, marginBottom: 12 }} />
              <div className="page-skeleton" style={{ height: 20, width: 100, borderRadius: 6 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Content rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="page-skeleton" style={{ height: 200, borderRadius: 14, marginBottom: 12 }} />
      ))}
    </div>
  )
}

// ─── Loading Overlay ──────────────────────────────────────────────────────────

export function LoadingOverlay({
  label = 'Loading…', visible,
}: {
  label?: string
  visible: boolean
}) {
  if (!visible) return null
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10,
      background: 'hsl(0 0% 0% / 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      borderRadius: 'inherit', gap: 12,
    }}>
      <Spinner size={28} color="#3B82F6" />
      <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(0 5% 80%)' }}>{label}</span>
    </div>
  )
}

// ─── Generating State ─────────────────────────────────────────────────────────

export function GeneratingState({
  label = 'Generating with AI…',
  sub,
}: {
  label?: string
  sub?: string
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px', gap: 16, textAlign: 'center',
    }}>
      {/* Animated rings */}
      <div style={{ position: 'relative', width: 56, height: 56 }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '2px solid rgba(59, 130, 246, 0.2)',
          animation: 'spin 2s linear infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 4, borderRadius: '50%',
          border: '2px solid rgba(59, 130, 246, 0.4)',
          borderTopColor: '#3B82F6',
          animation: 'spin 0.9s linear infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 12, borderRadius: '50%',
          background: 'rgba(59, 130, 246, 0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 14 }}>✦</span>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', marginBottom: 4, fontFamily: 'var(--font-display)' }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{sub}</div>}
      </div>
    </div>
  )
}
