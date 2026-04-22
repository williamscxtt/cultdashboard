'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Copy, Check, RefreshCw, ExternalLink } from 'lucide-react'
import { Button, Spinner } from '@/components/ui'
import type { CircleActivityCache, CircleActionItem, ActionItemType } from '@/lib/types'

interface Props {
  profileId: string
  circleCache: CircleActivityCache | null
  pendingItems: CircleActionItem[]
}

const ACTION_LABELS: Record<ActionItemType, string> = {
  check_in_quiet:   'QUIET',
  check_in_dormant: 'DORMANT',
  celebrate_win:    'WIN 🎉',
  address_problem:  'NEEDS HELP',
  respond_intro:    'NEW MEMBER',
  follow_up_goal:   'FOLLOW UP',
}

function engagementStatus(cache: CircleActivityCache): {
  label: string
  color: string
  bg: string
} {
  if (!cache.last_seen_at) return { label: 'Not in Circle', color: 'var(--muted-foreground)', bg: 'var(--muted)' }
  const days = Math.floor((Date.now() - new Date(cache.last_seen_at).getTime()) / 86400000)
  if (days < 3)  return { label: 'Thriving',  color: 'hsl(142 60% 30%)', bg: 'hsl(142 71% 45% / 0.12)' }
  if (days < 7)  return { label: 'Engaged',   color: 'hsl(170 60% 30%)', bg: 'hsl(170 71% 45% / 0.12)' }
  if (days < 14) return { label: 'Quiet',     color: 'hsl(43 75% 38%)',  bg: 'hsl(43 96% 56% / 0.12)' }
  if (days < 21) return { label: 'At Risk',   color: 'hsl(25 75% 38%)',  bg: 'hsl(25 96% 56% / 0.12)' }
  return { label: 'Dormant', color: 'hsl(0 72% 45%)', bg: 'hsl(0 72% 51% / 0.12)' }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: copied ? 'hsl(142 60% 35%)' : 'var(--muted-foreground)',
        padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center',
        transition: 'color 0.15s',
        flexShrink: 0,
      }}
      title="Copy message"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  )
}

export default function CircleClientPanel({ profileId, circleCache: initialCache, pendingItems: initialItems }: Props) {
  const [cache, setCache] = useState<CircleActivityCache | null>(initialCache)
  const [items, setItems] = useState<CircleActionItem[]>(initialItems)
  const [syncing, setSyncing] = useState(false)

  async function handleSync() {
    setSyncing(true)
    try {
      // Trigger a full briefing regeneration (quickest way to refresh this client's data)
      const res = await fetch('/api/admin/circle/generate', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Sync failed')

      // Refresh this client's pending items
      const itemsRes = await fetch(`/api/admin/circle/items?status=pending`)
      const itemsJson = await itemsRes.json()
      const clientItems = (itemsJson.items ?? []).filter((i: CircleActionItem) => i.profile_id === profileId)
      setItems(clientItems)

      toast.success('Circle data refreshed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to sync')
    } finally {
      setSyncing(false)
    }
  }

  async function handleDismiss(id: string) {
    await fetch(`/api/admin/circle/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'dismissed' }),
    })
    setItems(prev => prev.filter(i => i.id !== id))
    toast.success('Dismissed')
  }

  async function handleApprove(item: CircleActionItem) {
    await fetch(`/api/admin/circle/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sent' }),
    })
    await navigator.clipboard.writeText(item.draft_message)
    setItems(prev => prev.filter(i => i.id !== item.id))
    toast.success('Copied & marked as sent')
  }

  if (!cache) {
    return (
      <div style={{
        padding: '32px 24px', textAlign: 'center',
        border: '1px dashed var(--border)', borderRadius: 12,
        color: 'var(--muted-foreground)',
      }}>
        <div style={{ fontSize: 14, marginBottom: 8 }}>No Circle data yet</div>
        <div style={{ fontSize: 12, marginBottom: 16 }}>
          This client hasn&apos;t been matched to a Circle member, or the briefing hasn&apos;t been generated.
        </div>
        <Button size="sm" onClick={handleSync} disabled={syncing} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {syncing ? <Spinner size={12} /> : <RefreshCw size={13} />}
          {syncing ? 'Syncing…' : 'Sync Now'}
        </Button>
      </div>
    )
  }

  const days = cache.last_seen_at
    ? Math.floor((Date.now() - new Date(cache.last_seen_at).getTime()) / 86400000)
    : null
  const status = engagementStatus(cache)

  return (
    <div>
      {/* Status card */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 10,
        marginBottom: 20,
      }}>
        <div style={{
          padding: '14px 16px', borderRadius: 10,
          background: status.bg,
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            Status
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: status.color }}>
            {status.label}
          </div>
          {days !== null && (
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>
              {days === 0 ? 'Active today' : `${days}d ago`}
            </div>
          )}
        </div>

        <div style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--muted)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Posts</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{cache.posts_count ?? 0}</div>
        </div>

        <div style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--muted)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Comments</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{cache.comments_count ?? 0}</div>
        </div>

        {cache.gamification_points > 0 && (
          <div style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--muted)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Points</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{cache.gamification_points.toLocaleString()}</div>
          </div>
        )}
      </div>

      {/* Profile link + sync */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        {cache.circle_profile_url && (
          <a
            href={cache.circle_profile_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 12, color: 'var(--muted-foreground)',
              textDecoration: 'none',
            }}
          >
            <ExternalLink size={12} />
            View in Circle
          </a>
        )}
        <Button size="sm" onClick={handleSync} disabled={syncing} style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          {syncing ? <Spinner size={12} /> : <RefreshCw size={13} />}
          {syncing ? 'Syncing…' : 'Refresh'}
        </Button>
      </div>

      {/* Recent posts */}
      {cache.recent_post_titles && cache.recent_post_titles.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
          }}>
            Recent Posts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cache.recent_post_titles.map((title, i) => (
              <div
                key={i}
                style={{
                  padding: '10px 12px',
                  background: 'var(--muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{title}</div>
                {cache.recent_post_bodies?.[i] && (
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
                    {cache.recent_post_bodies[i]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending action items for this client */}
      {items.length > 0 && (
        <div>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
          }}>
            Pending Actions ({items.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(item => (
              <div
                key={item.id}
                style={{
                  padding: '12px 14px',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {ACTION_LABELS[item.action_type] ?? item.action_type}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{item.reason}</span>
                </div>
                <div style={{
                  fontSize: 12, color: 'var(--foreground)',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border)',
                  borderRadius: 6, padding: '8px 10px',
                  lineHeight: 1.6, marginBottom: 8,
                  whiteSpace: 'pre-wrap',
                }}>
                  {item.draft_message}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleApprove(item)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
                  >
                    <Copy size={11} />
                    Copy & Send
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDismiss(item.id)}
                    style={{ fontSize: 12, color: 'var(--muted-foreground)' }}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
          No pending actions for this client.
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--muted-foreground)' }}>
        Synced {new Date(cache.synced_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  )
}
