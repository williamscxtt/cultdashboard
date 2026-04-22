'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { RefreshCw, Copy, Check, X, Edit2, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { Button, PageHeader, Spinner } from '@/components/ui'
import type { CircleActionItem, ActionItemType, ActionItemPriority } from '@/lib/types'

interface Props {
  initialItems: CircleActionItem[]
  lastGenerated: string | null
}

// ── Label + colour maps ──────────────────────────────────────────────────────

const ACTION_LABELS: Record<ActionItemType, string> = {
  check_in_quiet:    'QUIET',
  check_in_dormant:  'DORMANT',
  celebrate_win:     'WIN 🎉',
  address_problem:   'NEEDS HELP',
  respond_intro:     'NEW MEMBER',
  follow_up_goal:    'FOLLOW UP',
}

const ACTION_COLORS: Record<ActionItemType, { bg: string; text: string; border: string }> = {
  check_in_dormant:  { bg: 'hsl(0 72% 51% / 0.12)',  text: 'hsl(0 72% 45%)',   border: 'hsl(0 72% 51% / 0.3)' },
  address_problem:   { bg: 'hsl(0 72% 51% / 0.12)',  text: 'hsl(0 72% 45%)',   border: 'hsl(0 72% 51% / 0.3)' },
  check_in_quiet:    { bg: 'hsl(43 96% 56% / 0.12)', text: 'hsl(43 75% 38%)',  border: 'hsl(43 96% 56% / 0.3)' },
  follow_up_goal:    { bg: 'hsl(43 96% 56% / 0.12)', text: 'hsl(43 75% 38%)',  border: 'hsl(43 96% 56% / 0.3)' },
  celebrate_win:     { bg: 'hsl(142 71% 45% / 0.12)',text: 'hsl(142 60% 30%)', border: 'hsl(142 71% 45% / 0.3)' },
  respond_intro:     { bg: 'hsl(221 83% 53% / 0.12)',text: 'hsl(221 70% 40%)', border: 'hsl(221 83% 53% / 0.3)' },
}

const PRIORITY_DOT: Record<ActionItemPriority, string> = {
  high:   'hsl(0 72% 51%)',
  medium: 'hsl(43 96% 56%)',
  low:    'hsl(142 71% 45%)',
}

const PRIORITY_LABELS: Record<ActionItemPriority, string> = {
  high:   'HIGH PRIORITY',
  medium: 'MEDIUM PRIORITY',
  low:    'LOW PRIORITY',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── Action item card ─────────────────────────────────────────────────────────

function ActionCard({
  item,
  onUpdate,
}: {
  item: CircleActionItem
  onUpdate: (id: string, updates: Partial<CircleActionItem> & { dismiss_note?: string }) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editedDraft, setEditedDraft] = useState(item.draft_message)
  const [dismissing, setDismissing] = useState(false)
  const [dismissNote, setDismissNote] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const label = ACTION_LABELS[item.action_type] ?? item.action_type.toUpperCase()
  const colors = ACTION_COLORS[item.action_type] ?? { bg: 'var(--muted)', text: 'var(--muted-foreground)', border: 'var(--border)' }
  const displayName = item.profile_name ?? item.circle_member_id ?? 'Unknown'
  const handle = item.profile_ig_username ? `@${item.profile_ig_username}` : null

  async function handleApprove() {
    setLoading(true)
    try {
      const messageToSend = editing ? editedDraft : item.draft_message
      const res = await fetch(`/api/admin/circle/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent', draft_message: messageToSend }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to approve')
      }
      // Copy to clipboard
      await navigator.clipboard.writeText(messageToSend)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      onUpdate(item.id, { status: 'sent', draft_message: messageToSend })
      toast.success('Copied & marked as sent')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleDismiss() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/circle/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dismissed', dismiss_note: dismissNote }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to dismiss')
      }
      onUpdate(item.id, { status: 'dismissed', dismiss_note: dismissNote })
      toast.success('Dismissed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
      setDismissing(false)
    }
  }

  async function handleSaveDraft() {
    await fetch(`/api/admin/circle/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft_message: editedDraft }),
    })
    onUpdate(item.id, { draft_message: editedDraft })
  }

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '18px 20px',
      marginBottom: 10,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
              {displayName}
            </span>
            {handle && (
              <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{handle}</span>
            )}
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
              background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`,
              textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
            }}>
              {label}
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--foreground)', margin: 0, lineHeight: 1.5 }}>
            {item.reason}
          </p>
        </div>
      </div>

      {/* Context quote */}
      {item.context_quote && (
        <div style={{
          fontSize: 12, color: 'var(--muted-foreground)',
          fontStyle: 'italic',
          padding: '6px 10px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          marginBottom: 12,
          lineHeight: 1.5,
        }}>
          &ldquo;{item.context_quote}&rdquo;
        </div>
      )}

      {/* Draft message */}
      <div style={{ marginBottom: 14 }}>
        {editing ? (
          <textarea
            ref={textareaRef}
            value={editedDraft}
            onChange={e => setEditedDraft(e.target.value)}
            style={{
              width: '100%',
              minHeight: 100,
              padding: '10px 12px',
              background: 'var(--background)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--foreground)',
              lineHeight: 1.6,
              resize: 'vertical',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
            autoFocus
          />
        ) : (
          <div style={{
            fontSize: 13,
            color: 'var(--foreground)',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '10px 12px',
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
          }}>
            {item.draft_message}
          </div>
        )}
      </div>

      {/* Dismiss reason input */}
      {dismissing && (
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            value={dismissNote}
            onChange={e => setDismissNote(e.target.value)}
            placeholder="Reason (optional)"
            style={{ width: '100%', fontSize: 13, boxSizing: 'border-box' }}
            onKeyDown={e => { if (e.key === 'Enter') handleDismiss() }}
            autoFocus
          />
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {editing ? (
          <>
            <Button
              size="sm"
              variant="primary"
              onClick={async () => { await handleSaveDraft(); await handleApprove() }}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {loading ? <Spinner size={12} /> : <Check size={13} />}
              Save & Approve
            </Button>
            <Button
              size="sm"
              onClick={() => { setEditing(false); setEditedDraft(item.draft_message) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              Cancel
            </Button>
          </>
        ) : dismissing ? (
          <>
            <Button
              size="sm"
              onClick={handleDismiss}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'hsl(0 72% 51% / 0.1)', color: 'hsl(0 72% 45%)',
                border: '1px solid hsl(0 72% 51% / 0.25)',
              }}
            >
              {loading ? <Spinner size={12} /> : <X size={13} />}
              Confirm Dismiss
            </Button>
            <Button
              size="sm"
              onClick={() => setDismissing(false)}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="primary"
              onClick={handleApprove}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {loading ? <Spinner size={12} /> : copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Approve & Copy'}
            </Button>
            <Button
              size="sm"
              onClick={() => { setEditing(true); setTimeout(() => textareaRef.current?.focus(), 50) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Edit2 size={13} />
              Edit
            </Button>
            <Button
              size="sm"
              onClick={() => setDismissing(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                color: 'var(--muted-foreground)',
              }}
            >
              <X size={13} />
              Dismiss
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main briefing component ──────────────────────────────────────────────────

export default function CircleBriefing({ initialItems, lastGenerated }: Props) {
  const [items, setItems] = useState<CircleActionItem[]>(initialItems)
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [historyItems, setHistoryItems] = useState<CircleActionItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [lastGen, setLastGen] = useState<string | null>(lastGenerated)

  const pendingItems = items.filter(i => i.status === 'pending')
  const grouped = (['high', 'medium', 'low'] as ActionItemPriority[])
    .map(priority => ({
      priority,
      items: pendingItems.filter(i => i.priority === priority),
    }))
    .filter(g => g.items.length > 0)

  async function handleGenerate() {
    setGenerating(true)
    setGenProgress('Fetching Circle data…')
    try {
      // Stagger progress messages
      const t1 = setTimeout(() => setGenProgress('Matching clients to Circle members…'), 4000)
      const t2 = setTimeout(() => setGenProgress('Analysing activity and drafting messages…'), 10000)

      const res = await fetch('/api/admin/circle/generate', { method: 'POST' })
      clearTimeout(t1)
      clearTimeout(t2)

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Generation failed')

      setGenProgress(`Done — ${json.items_generated} items generated`)

      // Refresh items from server
      const itemsRes = await fetch('/api/admin/circle/items?status=pending')
      const itemsJson = await itemsRes.json()
      setItems(itemsJson.items ?? [])
      setLastGen(new Date().toISOString())

      toast.success(`Briefing ready — ${json.items_generated} action items`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed'
      setGenProgress('')
      toast.error(`Failed: ${msg}`)
    } finally {
      setGenerating(false)
    }
  }

  async function handleLoadHistory() {
    if (showHistory) {
      setShowHistory(false)
      return
    }
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/admin/circle/items?status=all')
      const json = await res.json()
      setHistoryItems(json.items ?? [])
      setShowHistory(true)
    } catch {
      toast.error('Failed to load history')
    } finally {
      setLoadingHistory(false)
    }
  }

  function handleUpdate(id: string, updates: Partial<CircleActionItem>) {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ))
  }

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 16px 60px' }}>
      <PageHeader
        title="Circle Briefing"
        description="Your daily action list — drafted and ready to send."
      />

      {/* Controls */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28,
        padding: '14px 18px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        flexWrap: 'wrap',
      }}>
        <Button
          size="sm"
          variant="primary"
          onClick={handleGenerate}
          disabled={generating}
          style={{ display: 'flex', alignItems: 'center', gap: 7 }}
        >
          {generating ? <Spinner size={13} /> : <RefreshCw size={13} />}
          {generating ? genProgress || 'Generating…' : 'Generate Briefing'}
        </Button>

        <div style={{ flex: 1, minWidth: 0 }}>
          {lastGen && !generating && (
            <span style={{ fontSize: 12, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Clock size={11} />
              Last generated {timeAgo(lastGen)}
              {pendingItems.length > 0 && ` · ${pendingItems.length} item${pendingItems.length !== 1 ? 's' : ''} pending`}
            </span>
          )}
        </div>

        <Button
          size="sm"
          onClick={handleLoadHistory}
          disabled={loadingHistory}
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted-foreground)' }}
        >
          {loadingHistory ? <Spinner size={12} /> : showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          History
        </Button>
      </div>

      {/* Action items grouped by priority */}
      {pendingItems.length === 0 && !showHistory ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          color: 'var(--muted-foreground)',
          fontSize: 14,
          border: '1px dashed var(--border)',
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>All clear</div>
          <div style={{ fontSize: 13 }}>Everyone&apos;s engaged. Generate a fresh briefing to check for updates.</div>
        </div>
      ) : (
        grouped.map(group => (
          <div key={group.priority} style={{ marginBottom: 28 }}>
            {/* Priority divider */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: PRIORITY_DOT[group.priority],
                flexShrink: 0,
              }} />
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)',
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                {PRIORITY_LABELS[group.priority]}
              </div>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            {group.items.map(item => (
              <ActionCard key={item.id} item={item} onUpdate={handleUpdate} />
            ))}
          </div>
        ))
      )}

      {/* History section */}
      {showHistory && historyItems.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)',
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              History (last 7 days)
            </div>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          {historyItems.map(item => (
            <div
              key={item.id}
              style={{
                padding: '12px 16px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                marginBottom: 8,
                opacity: 0.6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{item.profile_name ?? 'Unknown'}</span>
                {item.profile_ig_username && (
                  <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>@{item.profile_ig_username}</span>
                )}
                <span style={{
                  marginLeft: 'auto', fontSize: 11, fontWeight: 700,
                  color: item.status === 'sent' ? 'hsl(142 60% 35%)' : 'var(--muted-foreground)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {item.status === 'sent' ? '✓ Sent' : '✗ Dismissed'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{item.reason}</div>
              {item.dismiss_note && (
                <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 3, fontStyle: 'italic' }}>
                  Note: {item.dismiss_note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
