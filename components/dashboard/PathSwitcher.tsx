'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Sparkles } from 'lucide-react'

const CREATOR_STYLES = [
  { value: 'educational',   label: 'Educational' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'motivational',  label: 'Motivational' },
  { value: 'lifestyle',     label: 'Lifestyle' },
  { value: 'fitness',       label: 'Fitness' },
  { value: 'finance',       label: 'Finance' },
  { value: 'beauty',        label: 'Beauty' },
  { value: 'gaming',        label: 'Gaming' },
  { value: 'other',         label: 'Other' },
]

interface Props {
  /** Profile to update. For self-service, pass the user's own profileId. */
  profileId: string
  currentType: 'coach' | 'creator' | null
  currentStyle: string | null
  /** 'admin' calls /api/admin/clients PATCH with an id field.
   *  'self' calls PATCH /api/profile (impersonation-aware). */
  mode?: 'admin' | 'self'
  /** Visual variant — 'badge' is compact for header rows; 'button' is larger for hub pages */
  variant?: 'badge' | 'button'
}

export default function PathSwitcher({
  profileId,
  currentType,
  currentStyle,
  mode = 'admin',
  variant = 'badge',
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<'coach' | 'creator'>(currentType === 'creator' ? 'creator' : 'coach')
  const [style, setStyle] = useState(currentStyle || 'educational')
  const [saving, setSaving] = useState(false)

  const displayLabel = currentType === 'creator'
    ? `Creator · ${currentStyle
        ? currentStyle.charAt(0).toUpperCase() + currentStyle.slice(1)
        : 'Creator'}`
    : 'Coach'

  const isCreatorColor = currentType === 'creator'

  async function save() {
    setSaving(true)
    try {
      if (mode === 'admin') {
        await fetch('/api/admin/clients', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: profileId,
            user_type: type,
            creator_style: type === 'creator' ? style : null,
          }),
        })
      } else {
        await fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_type: type,
            creator_style: type === 'creator' ? style : null,
          }),
        })
      }
      setOpen(false)
      router.refresh()
    } catch {
      // silent — UI state reset on close anyway
    } finally {
      setSaving(false)
    }
  }

  const trigger = variant === 'badge' ? (
    <button
      onClick={() => setOpen(true)}
      style={{
        padding: '3px 10px',
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 700,
        border: `1px solid ${isCreatorColor ? 'rgba(192,132,252,0.3)' : 'var(--border)'}`,
        background: isCreatorColor ? 'rgba(192,132,252,0.1)' : 'transparent',
        color: isCreatorColor ? '#c084fc' : 'var(--muted-foreground)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        transition: 'all 0.12s',
      }}
    >
      {isCreatorColor ? <Sparkles size={10} /> : <Users size={10} />}
      {displayLabel}
    </button>
  ) : (
    <button
      onClick={() => setOpen(true)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        borderRadius: 9,
        border: `1px solid ${isCreatorColor ? 'rgba(192,132,252,0.3)' : 'var(--border)'}`,
        background: isCreatorColor ? 'rgba(192,132,252,0.08)' : 'var(--card)',
        color: isCreatorColor ? '#c084fc' : 'var(--foreground)',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 0.12s',
      }}
    >
      {isCreatorColor ? <Sparkles size={14} /> : <Users size={14} />}
      {displayLabel}
      <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 500, marginLeft: 2 }}>
        · Change
      </span>
    </button>
  )

  return (
    <>
      {trigger}

      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 28,
            width: '100%',
            maxWidth: 440,
          }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: 'var(--foreground)' }}>
              Change content path
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--muted-foreground)' }}>
              This affects how the Content Studio, Hook Lab, and Series Planner write for this account.
            </p>

            {/* Type selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {(['coach', 'creator'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    border: `2px solid ${type === t ? 'var(--accent)' : 'var(--border)'}`,
                    background: type === t ? 'hsl(var(--accent-hsl, 25 100% 55%) / 0.08)' : 'transparent',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    fontSize: 13, fontWeight: 700,
                    color: type === t ? 'var(--accent)' : 'var(--foreground)',
                    marginBottom: 3,
                  }}>
                    {t === 'coach' ? 'Coaching Creator' : 'Content Creator'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
                    {t === 'coach'
                      ? 'Sells services or coaching. Scripts drive DMs and client enquiries.'
                      : 'Builds audience and brand. Scripts drive follows, saves, and engagement.'}
                  </div>
                </button>
              ))}
            </div>

            {/* Creator style picker */}
            {type === 'creator' && (
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: 'block', fontSize: 12, fontWeight: 600,
                  color: 'var(--muted-foreground)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  Creator style
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {CREATOR_STYLES.map(s => (
                    <button
                      key={s.value}
                      onClick={() => setStyle(s.value)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 99,
                        fontSize: 12,
                        fontWeight: 600,
                        border: `1.5px solid ${style === s.value ? '#c084fc' : 'var(--border)'}`,
                        background: style === s.value ? 'rgba(192,132,252,0.12)' : 'transparent',
                        color: style === s.value ? '#c084fc' : 'var(--muted-foreground)',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 0.12s',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                onClick={() => setOpen(false)}
                style={{
                  padding: '9px 18px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'transparent',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  color: 'var(--muted-foreground)', fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                style={{
                  padding: '9px 20px', borderRadius: 8, border: 'none',
                  background: saving ? 'var(--muted)' : 'var(--accent)',
                  color: saving ? 'var(--muted-foreground)' : 'white',
                  fontSize: 13, fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', transition: 'background 0.15s',
                }}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
