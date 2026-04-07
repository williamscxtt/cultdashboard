import React from 'react'

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({ children, className = '', style = {}, onClick }: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: 'var(--shadow-sm)',
        ...style,
        ...(onClick ? { cursor: 'pointer' } : {}),
      }}
      className={className}
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
    success: { background: 'hsl(142 50% 94%)', color: 'hsl(142 71% 28%)' },
    warning: { background: 'hsl(38 70% 93%)', color: 'hsl(38 92% 34%)' },
    error:   { background: 'hsl(0 50% 95%)',  color: 'hsl(0 72% 45%)' },
    accent:  { background: 'hsl(220 90% 56% / 0.1)', color: 'var(--accent)', border: '1px solid hsl(220 90% 56% / 0.2)' },
    muted:   { background: 'var(--muted)', color: 'var(--muted-foreground)' },
    info:    { background: 'hsl(200 80% 94%)', color: 'hsl(200 80% 32%)' },
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
  const heights = { xs: 26, sm: 32, md: 38, lg: 44 }
  const paddings = { xs: '0 10px', sm: '0 12px', md: '0 16px', lg: '0 20px' }
  const fontSizes = { xs: 11, sm: 12, md: 13, lg: 14 }

  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 8, fontWeight: 600, cursor: disabled || loading ? 'not-allowed' : 'pointer',
    border: 'none', fontFamily: 'inherit', whiteSpace: 'nowrap',
    height: heights[size], padding: paddings[size], fontSize: fontSizes[size],
    transition: 'all 0.15s ease',
    opacity: disabled || loading ? 0.55 : 1,
    letterSpacing: '-0.01em',
  }
  const variants: Record<ButtonVariant, React.CSSProperties> = {
    primary:     { background: 'var(--foreground)', color: 'var(--background)', boxShadow: 'var(--shadow-xs)' },
    accent:      { background: 'var(--accent)', color: 'var(--accent-foreground)', boxShadow: '0 1px 3px hsl(220 90% 56% / 0.35)' },
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
        el.style.filter = 'brightness(0.92)'
        el.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.filter = ''
        el.style.transform = ''
      }}
      onMouseDown={e => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = 'translateY(0)'
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
              padding: '6px 14px', borderRadius: 7,
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 600,
              transition: 'all 0.15s ease',
              background: isActive ? 'var(--card)' : 'transparent',
              color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)',
              boxShadow: isActive ? 'var(--shadow-xs)' : 'none',
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
  return (
    <Card style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {label}
        </div>
        {icon && (
          <div style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}>{icon}</div>
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.7px', lineHeight: 1 }}>
        {value}
      </div>
      {(sub || trend != null) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          {trend != null && (
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: trend >= 0 ? 'hsl(142 71% 35%)' : 'hsl(0 72% 51%)',
            }}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
          {sub && <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{sub}</span>}
        </div>
      )}
    </Card>
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
          width: 52, height: 52, borderRadius: 14,
          background: 'var(--muted)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16, color: 'var(--muted-foreground)',
        }}>
          {icon}
        </div>
      )}
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--muted-foreground)', maxWidth: 320, lineHeight: 1.6, marginBottom: action ? 20 : 0 }}>
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
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.4px', lineHeight: 1.2 }}>
          {title}
        </h1>
        {description && (
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginTop: 3, lineHeight: 1.5 }}>
            {description}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  )
}

// ─── Section Label ────────────────────────────────────────────────────────────

export function SectionLabel({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)',
      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
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
    <div style={{
      width, height, borderRadius: rounded ? 999 : 6,
      background: 'var(--muted)',
      animation: 'pulse 1.5s ease-in-out infinite',
      ...style,
    }} />
  )
}

// ─── Input Label ──────────────────────────────────────────────────────────────

export function InputLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: 'block', fontSize: 12, fontWeight: 600,
        color: 'var(--foreground)', marginBottom: 6, letterSpacing: '-0.01em',
      }}
    >
      {children}
    </label>
  )
}

// ─── Toast-style alert ────────────────────────────────────────────────────────

export function Alert({
  type = 'info', children,
}: {
  type?: 'info' | 'success' | 'warning' | 'error'
  children: React.ReactNode
}) {
  const colors = {
    info:    { bg: 'hsl(220 90% 97%)', border: 'hsl(220 90% 86%)', text: 'hsl(220 80% 40%)' },
    success: { bg: 'hsl(142 50% 96%)', border: 'hsl(142 50% 80%)', text: 'hsl(142 71% 28%)' },
    warning: { bg: 'hsl(38 90% 95%)',  border: 'hsl(38 90% 78%)',  text: 'hsl(38 80% 32%)' },
    error:   { bg: 'hsl(0 50% 96%)',   border: 'hsl(0 50% 84%)',   text: 'hsl(0 72% 40%)' },
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
