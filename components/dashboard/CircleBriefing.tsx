'use client'

import { useState, useCallback } from 'react'
import type { CircleActionItem, ActionItemType, ActionItemPriority } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GenerateResult {
  items_generated: number
  clients_synced: number
  clients_unmatched: number
}

// ─── Badge labels & colours ───────────────────────────────────────────────────

const TYPE_LABEL: Record<ActionItemType, string> = {
  check_in_quiet:   'QUIET',
  check_in_dormant: 'DORMANT',
  celebrate_win:    'WIN',
  address_problem:  'NEEDS HELP',
  respond_intro:    'NEW MEMBER',
  follow_up_goal:   'FOLLOW UP',
}

const PRIORITY_DOT: Record<ActionItemPriority, string> = {
  high:   '#ef4444',
  medium: '#f59e0b',
  low:    '#22c55e',
}

const PRIORITY_LABEL: Record<ActionItemPriority, string> = {
  high:   'HIGH PRIORITY',
  medium: 'MEDIUM PRIORITY',
  low:    'LOW PRIORITY',
}

// ─── Single action item card ──────────────────────────────────────────────────

function ActionCard({
  item,
  onUpdate,
}: {
  item: CircleActionItem
  onUpdate: (id: string, patch: Partial<CircleActionItem>) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editedDraft, setEditedDraft] = useState(item.draft_message)
  const [dismissing, setDismissing] = useState(false)
  const [dismissNote, setDismissNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const isDone = item.status === 'sent' || item.status === 'dismissed'

  async function patch(body: Record<string, unknown>) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/circle/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json() as { item?: CircleActionItem; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      if (data.item) onUpdate(item.id, data.item)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove() {
    const message = editing ? editedDraft : item.draft_message
    await navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    await patch({ status: 'sent', draft_message: message })
  }

  async function handleSaveEdit() {
    await patch({ draft_message: editedDraft })
    setEditing(false)
  }

  async function handleDismiss() {
    await patch({ status: 'dismissed', dismiss_note: dismissNote || undefined })
    setDismissing(false)
  }

  const clientLabel = item.profile_name
    ? item.profile_ig_username
      ? `${item.profile_name} · @${item.profile_ig_username}`
      : item.profile_name
    : item.circle_member_id
      ? `Member #${item.circle_member_id}`
      : 'Unknown'

  // Dismissed — collapsed muted row
  if (item.status === 'dismissed') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 14px',
        borderRadius: 8,
        background: 'var(--muted)',
        opacity: 0.45,
        fontSize: 12,
        color: 'var(--muted-foreground)',
        userSelect: 'none',
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        <span style={{ fontWeight: 600 }}>{item.profile_name ?? 'Unknown'}</span>
        <span>·</span>
        <span>{TYPE_LABEL[item.action_type]}</span>
        <span style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}>— dismissed</span>
        {item.dismiss_note && (
          <span style={{ fontStyle: 'italic', opacity: 0.7 }}>"{item.dismiss_note}"</span>
        )}
      </div>
    )
  }

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 10,
      background: isDone ? 'transparent' : 'var(--card)',
      opacity: item.status === 'sent' ? 0.55 : 1,
      overflow: 'hidden',
      transition: 'opacity 0.3s',
    }}>
      {/* Card header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px 10px',
        borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}>
        {/* Priority dot */}
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: PRIORITY_DOT[item.priority],
          flexShrink: 0,
          boxShadow: `0 0 6px ${PRIORITY_DOT[item.priority]}80`,
        }} />

        {/* Client name */}
        <span style={{
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--foreground)',
          letterSpacing: '-0.2px',
          fontFamily: 'var(--font-display)',
        }}>
          {clientLabel}
        </span>

        {/* Action type badge */}
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.06em',
          padding: '2px 7px',
          borderRadius: 4,
          background: 'var(--accent-subtle)',
          color: 'var(--accent)',
          border: '1px solid var(--accent-subtle-border)',
        }}>
          {TYPE_LABEL[item.action_type]}
        </span>

        {/* Sent badge */}
        {item.status === 'sent' && (
          <span style={{
            marginLeft: 'auto',
            fontSize: 11,
            fontWeight: 700,
            color: '#22c55e',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Sent
          </span>
        )}
      </div>

      {/* Reason + context */}
      <div style={{ padding: '12px 16px 0' }}>
        <p style={{
          fontSize: 13,
          color: 'var(--muted-foreground)',
          margin: 0,
          lineHeight: 1.5,
        }}>
          {item.reason}
        </p>
        {item.context_quote && (
          <p style={{
            fontSize: 12,
            color: 'var(--muted-foreground)',
            margin: '6px 0 0',
            padding: '6px 10px',
            borderLeft: '2px solid var(--border)',
            fontStyle: 'italic',
            lineHeight: 1.5,
            opacity: 0.75,
          }}>
            {item.context_quote}
          </p>
        )}
      </div>

      {/* Draft message */}
      <div style={{ padding: '10px 16px 0' }}>
        {editing ? (
          <textarea
            value={editedDraft}
            onChange={e => setEditedDraft(e.target.value)}
            rows={6}
            style={{
              width: '100%',
              background: 'var(--muted)',
              border: '1px solid var(--border)',
              borderRadius: 7,
              padding: '10px 12px',
              fontSize: 13,
              color: 'var(--foreground)',
              fontFamily: 'inherit',
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        ) : (
          <div style={{
            background: 'var(--muted)',
            borderRadius: 7,
            padding: '10px 12px',
            fontSize: 13,
            color: 'var(--foreground)',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            border: '1px solid var(--border)',
          }}>
            {item.draft_message}
          </div>
        )}
      </div>

      {/* Dismiss note input */}
      {dismissing && (
        <div style={{ padding: '8px 16px 0' }}>
          <input
            value={dismissNote}
            onChange={e => setDismissNote(e.target.value)}
            placeholder="Reason (optional)"
            style={{
              width: '100%',
              background: 'var(--muted)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 12,
              color: 'var(--foreground)',
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      {/* Actions */}
      {item.status === 'pending' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 16px',
          flexWrap: 'wrap',
        }}>
          {editing ? (
            <>
              <ActionButton
                onClick={handleApprove}
                disabled={loading}
                variant="approve"
              >
                {copied ? '✓ Copied!' : '✓ Save & Copy'}
              </ActionButton>
              <ActionButton onClick={handleSaveEdit} disabled={loading} variant="ghost">
                Save draft
              </ActionButton>
              <ActionButton onClick={() => { setEditing(false); setEditedDraft(item.draft_message) }} disabled={loading} variant="ghost">
                Cancel
              </ActionButton>
            </>
          ) : dismissing ? (
            <>
              <ActionButton onClick={handleDismiss} disabled={loading} variant="dismiss">
                Dismiss
              </ActionButton>
              <ActionButton onClick={() => { setDismissing(false); setDismissNote('') }} disabled={loading} variant="ghost">
                Cancel
              </ActionButton>
            </>
          ) : (
            <>
              <ActionButton onClick={handleApprove} disabled={loading} variant="approve">
                {copied ? '✓ Copied!' : '✓ Approve & Copy'}
              </ActionButton>
              <ActionButton onClick={() => setEditing(true)} disabled={loading} variant="edit">
                ✏ Edit
              </ActionButton>
              <ActionButton onClick={() => setDismissing(true)} disabled={loading} variant="dismiss-outline">
                ✕ Dismiss
              </ActionButton>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ActionButton({
  onClick, disabled, variant, children,
}: {
  onClick: () => void
  disabled: boolean
  variant: 'approve' | 'edit' | 'dismiss' | 'dismiss-outline' | 'ghost'
  children: React.ReactNode
}) {
  const styles: Record<string, React.CSSProperties> = {
    approve: {
      background: 'var(--accent)',
      color: 'var(--accent-foreground)',
      border: 'none',
    },
    edit: {
      background: 'var(--muted)',
      color: 'var(--foreground)',
      border: '1px solid var(--border)',
    },
    dismiss: {
      background: '#ef4444',
      color: '#fff',
      border: 'none',
    },
    'dismiss-outline': {
      background: 'transparent',
      color: 'var(--muted-foreground)',
      border: '1px solid var(--border)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--muted-foreground)',
      border: 'none',
    },
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles[variant],
        padding: '5px 13px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'inherit',
        letterSpacing: '-0.1px',
        transition: 'opacity 0.15s',
      }}
    >
      {children}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  initialItems: CircleActionItem[]
}

type GenerateStep = 'idle' | 'fetching' | 'analysing' | 'done' | 'error'

export default function CircleBriefing({ initialItems }: Props) {
  const [items, setItems] = useState<CircleActionItem[]>(initialItems)
  const [showHistory, setShowHistory] = useState(false)
  const [generateStep, setGenerateStep] = useState<GenerateStep>('idle')
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<GenerateResult | null>(null)

  const pendingItems = items.filter(i => i.status === 'pending')
  const lastGenerated = items[0]?.generated_at ?? null

  // ── Generate briefing ──────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    setGenerateStep('fetching')
    setGenerateError(null)

    // Fake two-step progress for UX
    const fetchingTimer = setTimeout(() => setGenerateStep('analysing'), 3000)

    try {
      const res = await fetch('/api/admin/circle/generate', { method: 'POST' })
      clearTimeout(fetchingTimer)
      const data = await res.json() as GenerateResult & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      setLastResult(data)
      setGenerateStep('done')

      // Refresh items list
      const itemRes = await fetch('/api/admin/circle/items?status=pending')
      const itemData = await itemRes.json() as { items: CircleActionItem[] }
      setItems(itemData.items ?? [])
      setShowHistory(false)
    } catch (err) {
      clearTimeout(fetchingTimer)
      setGenerateError(err instanceof Error ? err.message : 'Unknown error')
      setGenerateStep('error')
    }
  }, [])

  // ── Load history ────────────────────────────────────────────────────────────

  const handleToggleHistory = useCallback(async () => {
    if (showHistory) {
      // Switch back to pending
      setShowHistory(false)
      const res = await fetch('/api/admin/circle/items?status=pending')
      const data = await res.json() as { items: CircleActionItem[] }
      setItems(data.items ?? [])
    } else {
      setShowHistory(true)
      const res = await fetch('/api/admin/circle/items?status=all')
      const data = await res.json() as { items: CircleActionItem[] }
      setItems(data.items ?? [])
    }
  }, [showHistory])

  // ── Update single item ─────────────────────────────────────────────────────

  const handleUpdate = useCallback((id: string, patch: Partial<CircleActionItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item))
  }, [])

  // ── Group by priority ──────────────────────────────────────────────────────

  const grouped = {
    high:   items.filter(i => i.priority === 'high'),
    medium: items.filter(i => i.priority === 'medium'),
    low:    items.filter(i => i.priority === 'low'),
  }

  const generateStatusLabel: Record<GenerateStep, string> = {
    idle:      '',
    fetching:  'Fetching Circle data…',
    analysing: 'Analysing clients…',
    done:      lastResult
      ? `Done — ${lastResult.items_generated} items generated · ${lastResult.clients_synced} clients synced`
      : 'Done',
    error:     generateError ?? 'Error',
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '16px', maxWidth: 760, margin: '0 auto' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 6,
        flexWrap: 'wrap',
      }}>
        <div>
          <h1 style={{
            fontSize: 20,
            fontWeight: 800,
            color: 'var(--foreground)',
            margin: 0,
            letterSpacing: '-0.4px',
            fontFamily: 'var(--font-display)',
          }}>
            Circle Briefing
          </h1>
          <p style={{
            fontSize: 13,
            color: 'var(--muted-foreground)',
            margin: '4px 0 0',
            lineHeight: 1.5,
          }}>
            {showHistory
              ? 'Showing last 7 days of sent & dismissed items.'
              : pendingItems.length > 0
                ? `${pendingItems.length} item${pendingItems.length !== 1 ? 's' : ''} pending — here's what needs your attention.`
                : lastGenerated
                  ? 'All clear — everyone\'s engaged!'
                  : 'Generate a briefing to see who needs your attention.'}
          </p>
          {lastGenerated && !showHistory && (
            <p style={{ fontSize: 11, color: 'var(--muted-foreground)', margin: '2px 0 0', opacity: 0.6 }}>
              Last generated: {new Date(lastGenerated).toLocaleString('en-GB', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            onClick={handleToggleHistory}
            style={{
              padding: '6px 13px',
              borderRadius: 7,
              border: '1px solid var(--border)',
              background: showHistory ? 'var(--accent-subtle)' : 'transparent',
              color: showHistory ? 'var(--accent)' : 'var(--muted-foreground)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            History
          </button>

          <button
            onClick={handleGenerate}
            disabled={generateStep === 'fetching' || generateStep === 'analysing'}
            style={{
              padding: '6px 14px',
              borderRadius: 7,
              border: 'none',
              background: generateStep === 'fetching' || generateStep === 'analysing'
                ? 'var(--accent-subtle)'
                : 'var(--accent)',
              color: generateStep === 'fetching' || generateStep === 'analysing'
                ? 'var(--accent)'
                : 'var(--accent-foreground)',
              fontSize: 12,
              fontWeight: 700,
              cursor: generateStep === 'fetching' || generateStep === 'analysing' ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '-0.1px',
              transition: 'all 0.15s',
            }}
          >
            {generateStep === 'fetching' || generateStep === 'analysing'
              ? '⏳ Generating…'
              : '↻ Generate Briefing'}
          </button>
        </div>
      </div>

      {/* ── Generate status bar ─────────────────────────────────────────── */}
      {generateStep !== 'idle' && (
        <div style={{
          fontSize: 12,
          padding: '7px 12px',
          borderRadius: 7,
          marginBottom: 16,
          background: generateStep === 'error' ? 'rgba(239,68,68,0.1)' : 'var(--accent-subtle)',
          color: generateStep === 'error' ? '#ef4444' : 'var(--accent)',
          border: `1px solid ${generateStep === 'error' ? 'rgba(239,68,68,0.25)' : 'var(--accent-subtle-border)'}`,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 7,
        }}>
          {(generateStep === 'fetching' || generateStep === 'analysing') && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ animation: 'spin 0.9s linear infinite', flexShrink: 0 }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          )}
          {generateStatusLabel[generateStep]}
        </div>
      )}

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {items.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--muted-foreground)',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>✓</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', margin: '0 0 6px' }}>
            {showHistory ? 'No history in the last 7 days.' : 'All clear — everyone\'s engaged!'}
          </p>
          <p style={{ fontSize: 12, margin: 0 }}>
            {showHistory
              ? 'Generate a briefing to start building history.'
              : 'Generate a fresh briefing to check on your clients.'}
          </p>
        </div>
      )}

      {/* ── Priority groups ──────────────────────────────────────────────── */}
      {(['high', 'medium', 'low'] as ActionItemPriority[]).map(priority => {
        const group = grouped[priority]
        if (group.length === 0) return null

        return (
          <div key={priority} style={{ marginBottom: 32 }}>
            {/* Section header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
            }}>
              <div style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: PRIORITY_DOT[priority],
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: 'var(--muted-foreground)',
                textTransform: 'uppercase',
              }}>
                {PRIORITY_LABEL[priority]}
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{
                fontSize: 10,
                color: 'var(--muted-foreground)',
                opacity: 0.6,
              }}>
                {group.length}
              </span>
            </div>

            {/* Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {group.map(item => (
                <ActionCard key={item.id} item={item} onUpdate={handleUpdate} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
