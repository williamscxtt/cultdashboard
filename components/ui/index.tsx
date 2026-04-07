import React from 'react'

// Card
export function Card({ children, className = '', style = {} }: { children: React.ReactNode, className?: string, style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 10, ...style
    }} className={className}>
      {children}
    </div>
  )
}

// Badge
type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'accent' | 'muted'
export function Badge({ children, variant = 'default' }: { children: React.ReactNode, variant?: BadgeVariant }) {
  const styles: Record<BadgeVariant, React.CSSProperties> = {
    default: { background: 'var(--muted)', color: 'var(--muted-foreground)' },
    success: { background: 'hsl(142 50% 95%)', color: 'hsl(142 71% 35%)' },
    warning: { background: 'hsl(38 70% 95%)', color: 'hsl(38 92% 40%)' },
    error: { background: 'hsl(0 50% 96%)', color: 'hsl(0 72% 51%)' },
    accent: { background: 'hsl(220 90% 56% / 0.1)', color: 'var(--accent)' },
    muted: { background: 'var(--muted)', color: 'var(--muted-foreground)' },
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: 11, fontWeight: 600, padding: '2px 8px',
      borderRadius: 999, whiteSpace: 'nowrap',
      ...styles[variant]
    }}>
      {children}
    </span>
  )
}

// Button
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
}
export function Button({ children, variant = 'primary', size = 'md', style = {}, ...props }: ButtonProps) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 6, fontWeight: 600, fontSize: 13,
    cursor: 'pointer', border: 'none', transition: 'opacity 0.15s, background 0.15s',
    fontFamily: 'inherit', whiteSpace: 'nowrap',
    height: size === 'sm' ? 32 : size === 'lg' ? 44 : 38,
    padding: size === 'sm' ? '0 12px' : '0 16px',
  }
  const variants: Record<ButtonVariant, React.CSSProperties> = {
    primary: { background: 'var(--foreground)', color: 'var(--background)' },
    secondary: { background: 'var(--muted)', color: 'var(--foreground)' },
    ghost: { background: 'transparent', color: 'var(--foreground)' },
    destructive: { background: 'var(--destructive)', color: 'var(--destructive-foreground)' },
  }
  return (
    <button {...props} style={{ ...base, ...variants[variant], ...style }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}>
      {children}
    </button>
  )
}

// Stat Card
export function StatCard({ label, value, sub }: { label: string, value: string | number, sub?: string }) {
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.5px', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 4 }}>{sub}</div>}
    </Card>
  )
}

// Empty state
export function EmptyState({ icon, title, description }: { icon?: React.ReactNode, title: string, description: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center' }}>
      {icon && (
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: 'var(--muted-foreground)' }}>
          {icon}
        </div>
      )}
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--muted-foreground)', maxWidth: 320, lineHeight: 1.6 }}>{description}</div>
    </div>
  )
}

// Page header
export function PageHeader({ title, description, action }: { title: string, description?: string, action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.3px' }}>{title}</h1>
        {description && <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginTop: 2 }}>{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// Section label
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
      {children}
    </div>
  )
}

// Skeleton loader
export function Skeleton({ width = '100%', height = 16, rounded = false }: { width?: string | number, height?: number, rounded?: boolean }) {
  return (
    <div style={{
      width, height, borderRadius: rounded ? 999 : 6,
      background: 'var(--muted)', animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  )
}
