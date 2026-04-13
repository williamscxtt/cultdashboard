'use client'
import { useState, useEffect } from 'react'
import { Card, Button, SectionLabel } from '@/components/ui'
import { toast } from 'sonner'
import { X, Plus } from 'lucide-react'

interface Competitor {
  id: string
  ig_username: string
  added_at: string
  reel_count: number
  last_scraped: string | null
}

const MAX_COMPETITORS = 10

/** Converts "2026-04-W16" → "Apr 2026" for display */
function formatScrapedWeek(raw: string): string {
  try {
    // raw is like "2026-04-W16" — grab the year+month part
    const [year, month] = raw.split('-')
    if (!year || !month) return raw
    const d = new Date(Number(year), Number(month) - 1, 1)
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  } catch {
    return raw
  }
}

export default function CompetitorManager() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function fetchCompetitors() {
    try {
      const res = await fetch('/api/competitors')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setCompetitors(json.competitors || [])
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
    if (competitors.length >= MAX_COMPETITORS) {
      toast.error(`Maximum ${MAX_COMPETITORS} competitors allowed`)
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
      setCompetitors(prev => [{ ...json.competitor, reel_count: 0, last_scraped: null }, ...prev])
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

  return (
    <Card style={{ padding: 20 }}>
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
            disabled={adding || competitors.length >= MAX_COMPETITORS}
          />
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={adding || !input.trim() || competitors.length >= MAX_COMPETITORS}
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
        marginBottom: 10,
      }}>
        {loading ? '— / 10 accounts tracked' : `${competitors.length} / ${MAX_COMPETITORS} accounts tracked`}
      </div>

      {/* Competitor pills */}
      {loading ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 32, width: 100, background: 'var(--muted)', borderRadius: 999 }} />
          ))}
        </div>
      ) : competitors.length === 0 ? (
        <div style={{
          padding: '16px 0', fontSize: 13, color: 'var(--muted-foreground)',
          textAlign: 'center',
        }}>
          No competitors added yet. Start tracking up to 10 accounts.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {competitors.map(c => (
            <div
              key={c.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--muted)', borderRadius: 8,
                padding: '8px 12px', gap: 8,
              }}
            >
              {/* Left: handle */}
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', flexShrink: 0 }}>
                @{c.ig_username}
              </span>

              {/* Centre: stats */}
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)', flex: 1 }}>
                {c.reel_count > 0 ? (
                  <>
                    {c.reel_count} reel{c.reel_count !== 1 ? 's' : ''}
                    {c.last_scraped && (
                      <> · last scraped {formatScrapedWeek(c.last_scraped)}</>
                    )}
                  </>
                ) : (
                  <span style={{ opacity: 0.5 }}>not scraped yet</span>
                )}
              </span>

              {/* Right: remove */}
              <button
                onClick={() => handleRemove(c.id, c.ig_username)}
                disabled={removingId === c.id}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--muted-foreground)', padding: 0, display: 'flex',
                  alignItems: 'center', lineHeight: 1, flexShrink: 0,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'hsl(0 72% 51%)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)' }}
                title={`Remove @${c.ig_username}`}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
