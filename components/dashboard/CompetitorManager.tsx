'use client'
import { useState, useEffect } from 'react'
import { Card, Button, SectionLabel } from '@/components/ui'
import { toast } from 'sonner'
import { X, Plus, RefreshCw } from 'lucide-react'

interface Competitor {
  id: string
  ig_username: string
  added_at: string
  reel_count: number
  avg_views: number
  last_scraped: string | null
  insight: string | null
  insight_updated_at: string | null
}

const DEFAULT_MAX = 10 // fallback; real limit comes from API

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

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 0 }}>
      <div style={{
        fontSize: 22, fontWeight: 800,
        color: 'var(--foreground)',
        letterSpacing: '-0.5px',
        lineHeight: 1,
        fontFamily: 'var(--font-display)',
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 10, fontWeight: 600,
        color: 'var(--muted-foreground)',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        marginTop: 4,
        whiteSpace: 'nowrap',
      }}>
        {label}
      </div>
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
  const [refreshingInsight, setRefreshingInsight] = useState<string | null>(null)
  const [generatingAll, setGeneratingAll] = useState(false)

  const maxCompetitors = limit ?? DEFAULT_MAX
  const atLimit = limit !== null && competitors.length >= maxCompetitors

  async function fetchCompetitors() {
    try {
      const res = await fetch('/api/competitors')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setCompetitors(json.competitors || [])
      setLimit(json.limit ?? null) // null = unlimited (admin)
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
        reel_count: 0, avg_views: 0,
        last_scraped: null, insight: null, insight_updated_at: null,
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

  async function handleGenerateAll() {
    const pending = competitors.filter(c => c.reel_count > 0)
    if (pending.length === 0) return
    setGeneratingAll(true)
    let done = 0
    for (const c of pending) {
      setRefreshingInsight(c.id)
      try {
        const res = await fetch('/api/competitors/insight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ig_username: c.ig_username }),
        })
        const json = await res.json()
        if (res.ok && json.insight) {
          setCompetitors(prev => prev.map(x =>
            x.id === c.id ? { ...x, insight: json.insight, insight_updated_at: new Date().toISOString() } : x
          ))
          done++
        }
      } catch { /* skip failed accounts */ }
      setRefreshingInsight(null)
    }
    setGeneratingAll(false)
    toast.success(`Insights generated for ${done} account${done !== 1 ? 's' : ''}`)
  }

  async function handleRefreshInsight(c: Competitor) {
    setRefreshingInsight(c.id)
    try {
      const res = await fetch('/api/competitors/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ig_username: c.ig_username }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to generate insight')
      setCompetitors(prev => prev.map(x =>
        x.id === c.id ? { ...x, insight: json.insight, insight_updated_at: new Date().toISOString() } : x
      ))
      toast.success('Insight updated')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to refresh insight')
    } finally {
      setRefreshingInsight(null)
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

      {/* Count + generate all */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {loading ? '—' : limit !== null ? `${competitors.length} / ${maxCompetitors} accounts tracked` : `${competitors.length} accounts tracked`}
        </div>
        {!loading && competitors.some(c => c.reel_count > 0) && (
          <button
            onClick={handleGenerateAll}
            disabled={generatingAll}
            style={{
              background: 'transparent', border: 'none', cursor: generatingAll ? 'default' : 'pointer',
              fontSize: 11, fontWeight: 600, color: 'var(--accent)',
              display: 'flex', alignItems: 'center', gap: 4, padding: 0,
              opacity: generatingAll ? 0.6 : 1, transition: 'opacity 0.15s',
            }}
          >
            <RefreshCw size={11} style={{ animation: generatingAll ? 'spin 1s linear infinite' : 'none' }} />
            {generatingAll ? 'Generating...' : 'Generate all insights'}
          </button>
        )}
      </div>

      {/* Competitor cards */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 88, background: 'var(--muted)', borderRadius: 10 }} />
          ))}
        </div>
      ) : competitors.length === 0 ? (
        <div style={{
          padding: '16px 0', fontSize: 13, color: 'var(--muted-foreground)',
          textAlign: 'center',
        }}>
          No competitors added yet. {limit !== null ? `You can track up to ${maxCompetitors} accounts.` : 'Start tracking competitor accounts.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {competitors.map(c => (
            <div
              key={c.id}
              style={{
                background: 'var(--muted)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '14px 16px',
              }}
            >
              {/* Top row: handle + remove */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: c.reel_count > 0 ? 14 : 0 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.2px' }}>
                  @{c.ig_username}
                </span>
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
                  <X size={13} />
                </button>
              </div>

              {c.reel_count > 0 ? (
                <>
                  {/* Three bold stats */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 8, marginBottom: 14,
                    paddingBottom: 14,
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <StatPill value={String(c.reel_count)} label="Reels" />
                    <StatPill value={fmtViews(c.avg_views)} label="Avg Views" />
                    <StatPill
                      value={c.last_scraped ? formatScrapedWeek(c.last_scraped) : '—'}
                      label="Last Scraped"
                    />
                  </div>

                  {/* Insight */}
                  <div>
                    {c.insight ? (
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <p style={{
                          fontSize: 12, color: 'var(--muted-foreground)',
                          lineHeight: 1.6, margin: 0, flex: 1,
                          fontStyle: 'italic',
                        }}>
                          {c.insight}
                        </p>
                        <button
                          onClick={() => handleRefreshInsight(c)}
                          disabled={refreshingInsight === c.id}
                          title="Refresh insight"
                          style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            color: 'var(--muted-foreground)', padding: 0,
                            display: 'flex', alignItems: 'center', flexShrink: 0,
                            marginTop: 2, opacity: 0.6,
                            transition: 'opacity 0.15s',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.6' }}
                        >
                          <RefreshCw
                            size={11}
                            style={{
                              animation: refreshingInsight === c.id ? 'spin 1s linear infinite' : 'none',
                            }}
                          />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
                          No insight yet —
                        </span>
                        <button
                          onClick={() => handleRefreshInsight(c)}
                          disabled={refreshingInsight === c.id}
                          style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            fontSize: 12, color: 'var(--accent)', padding: 0,
                            fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
                          }}
                        >
                          <RefreshCw size={11} style={{ animation: refreshingInsight === c.id ? 'spin 1s linear infinite' : 'none' }} />
                          {refreshingInsight === c.id ? 'Generating...' : 'Generate'}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '8px 0 0', lineHeight: 1.5 }}>
                  Not scraped yet — run a scrape to unlock stats and insights.
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </Card>
  )
}
