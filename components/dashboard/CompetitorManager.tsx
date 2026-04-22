'use client'
import { useState, useEffect } from 'react'
import { Card, Button, SectionLabel } from '@/components/ui'
import { toast } from 'sonner'
import { X, Plus } from 'lucide-react'
import { useIsMobile } from '@/lib/use-mobile'

interface Competitor {
  id: string
  ig_username: string
  added_at: string
  reel_count: number
  avg_views: number
  last_scraped: string | null
}

const DEFAULT_MAX = 10

/** Converts "2026-04-W16" → "Apr '26" for display */
function formatScrapedWeek(raw: string): string {
  try {
    const [year, month] = raw.split('-')
    if (!year || !month) return raw
    const d = new Date(Number(year), Number(month) - 1, 1)
    return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
  } catch {
    return raw
  }
}

function fmtViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
      <span style={{ fontSize: 11, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.2px' }}>{value}</span>
    </div>
  )
}

export default function CompetitorManager() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [limit, setLimit] = useState<number | null>(DEFAULT_MAX)
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const isMobile = useIsMobile()

  const maxCompetitors = limit ?? DEFAULT_MAX
  const atLimit = limit !== null && competitors.length >= maxCompetitors

  async function fetchCompetitors() {
    try {
      const res = await fetch('/api/competitors')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setCompetitors(json.competitors || [])
      setLimit(json.limit ?? null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load competitors')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCompetitors() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const username = input.replace(/^@/, '').trim()
    if (!username) return
    if (atLimit) {
      toast.error(`You can track up to ${maxCompetitors} competitor accounts.`)
      return
    }
    if (competitors.some(c => c.ig_username.toLowerCase() === username.toLowerCase())) {
      toast.error('This account is already in your list')
      return
    }
    setAdding(true)
    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ig_username: username }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to add')
      setCompetitors(prev => [{
        ...json.competitor,
        reel_count: 0, avg_views: 0, last_scraped: null,
      }, ...prev])
      setInput('')
      toast.success(`@${username} added`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add competitor')
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(id: string, username: string) {
    setRemovingId(id)
    try {
      const res = await fetch('/api/competitors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to remove')
      setCompetitors(prev => prev.filter(c => c.id !== id))
      toast.success(`@${username} removed`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove competitor')
    } finally {
      setRemovingId(null)
    }
  }

  const cols = isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'

  return (
    <Card style={{ padding: 20, marginBottom: 0 }}>
      <SectionLabel>My Competitors</SectionLabel>
      <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 16, lineHeight: 1.6 }}>
        Add Instagram accounts in your niche. Every week, we&apos;ll learn from their best-performing reels to make your scripts better.
      </p>

      {/* Add input row */}
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 14, fontWeight: 500, color: 'var(--muted-foreground)',
            pointerEvents: 'none',
          }}>
            @
          </span>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="username"
            style={{ paddingLeft: 28 }}
            disabled={adding || atLimit}
          />
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={adding || !input.trim() || atLimit}
          style={{ flexShrink: 0 }}
        >
          <Plus size={13} />
          {adding ? 'Adding...' : 'Add'}
        </Button>
      </form>

      {/* Count */}
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 12,
      }}>
        {loading ? '—' : limit !== null
          ? `${competitors.length} / ${maxCompetitors} accounts tracked`
          : `${competitors.length} accounts tracked`}
      </div>

      {/* Competitor cards — grid layout */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 96, background: 'var(--muted)', borderRadius: 10 }} />
          ))}
        </div>
      ) : competitors.length === 0 ? (
        <div style={{
          padding: '16px 0', fontSize: 13,
          color: 'var(--muted-foreground)', textAlign: 'center',
        }}>
          No competitors added yet.{' '}
          {limit !== null
            ? `You can track up to ${maxCompetitors} accounts.`
            : 'Start tracking competitor accounts.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 10 }}>
          {competitors.map(c => (
            <div
              key={c.id}
              style={{
                background: 'var(--muted)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '12px 14px',
                minWidth: 0,
              }}
            >
              {/* Handle + remove */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{
                  fontSize: 13, fontWeight: 700, color: 'var(--foreground)',
                  letterSpacing: '-0.2px', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  minWidth: 0, flex: 1,
                }}>
                  @{c.ig_username}
                </span>
                <button
                  onClick={() => handleRemove(c.id, c.ig_username)}
                  disabled={removingId === c.id}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'var(--muted-foreground)', padding: 0, flexShrink: 0,
                    marginLeft: 6, display: 'flex', alignItems: 'center',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'hsl(0 72% 51%)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)' }}
                  title={`Remove @${c.ig_username}`}
                >
                  <X size={12} />
                </button>
              </div>

              {c.reel_count > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <StatRow label="Reels" value={String(c.reel_count)} />
                  <StatRow label="Avg Views" value={fmtViews(c.avg_views)} />
                  <StatRow
                    label="Last Scraped"
                    value={c.last_scraped ? formatScrapedWeek(c.last_scraped) : '—'}
                  />
                </div>
              ) : (
                <p style={{ fontSize: 11, color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.5 }}>
                  Not scraped yet
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
