'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader, Button, Card, EmptyState } from '@/components/ui'
import { Calendar, Copy, Check, List, LayoutGrid, ChevronLeft, ChevronRight, ExternalLink, Eye, Heart } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlannedEntry {
  date: string
  day: string
  format: string
  hook: string
  angle: string
  cta: string
  pillar: string
}

interface PostedReel {
  reel_id: string
  date: string           // YYYY-MM-DD
  caption: string | null
  thumbnail_url: string | null
  views: number | null
  likes: number | null
  permalink: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toMonthParam(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

function fmtNum(n: number | null | undefined): string {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

interface WeekRow { days: (Date | null)[] }

function getMonthDays(date: Date): WeekRow[] {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7
  const weeks: WeekRow[] = []
  let currentWeek: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) currentWeek.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) {
    currentWeek.push(new Date(year, month, d))
    if (currentWeek.length === 7) { weeks.push({ days: currentWeek }); currentWeek = [] }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push({ days: currentWeek })
  }
  return weeks
}

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ─── Format badge ─────────────────────────────────────────────────────────────

function getFormatStyle(format: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    'RAW STORY':      { background: 'hsl(38 92% 50%)',   color: '#fff' },
    'LISTICLE':       { background: 'var(--accent)',       color: '#fff' },
    'COMPARISON':     { background: 'hsl(270 70% 50%)',   color: '#fff' },
    'TUTORIAL':       { background: 'hsl(142 76% 36%)',   color: '#fff' },
    'POV':            { background: 'var(--foreground)',   color: 'var(--background)' },
    'TRANSFORMATION': { background: 'hsl(25 95% 55%)',    color: '#fff' },
    'MYTH BUST':      { background: 'hsl(0 72% 51%)',     color: '#fff' },
  }
  return map[format] ?? { background: 'var(--muted)', color: 'var(--foreground)' }
}

function FormatBadge({ format }: { format: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: 9, fontWeight: 700, padding: '2px 5px',
      borderRadius: 4, whiteSpace: 'nowrap', letterSpacing: '0.04em',
      ...getFormatStyle(format),
    }}>{format}</span>
  )
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }
  return (
    <Button variant="secondary" size="sm" onClick={handleCopy} style={{ gap: 6 }}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copied!' : 'Copy hook'}
    </Button>
  )
}

// ─── Detail panels ────────────────────────────────────────────────────────────

function PlannedDetail({ entry, onClose }: { entry: PlannedEntry; onClose: () => void }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 20, marginTop: 16, position: 'relative',
    }}>
      <button onClick={onClose} style={{
        position: 'absolute', top: 12, right: 12, background: 'transparent',
        border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)',
        fontSize: 18, lineHeight: 1, padding: '2px 6px', borderRadius: 4, fontFamily: 'inherit',
      }}>×</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)' }}>{entry.day}, {entry.date}</span>
        <FormatBadge format={entry.format} />
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'var(--muted)', color: 'var(--muted-foreground)' }}>{entry.pillar}</span>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Hook</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.4 }}>{entry.hook}</div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Angle</div>
        <div style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5 }}>{entry.angle}</div>
      </div>
      <CopyButton text={entry.hook} />
    </div>
  )
}

function PostedDetail({ reel, onClose }: { reel: PostedReel; onClose: () => void }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 20, marginTop: 16, position: 'relative',
    }}>
      <button onClick={onClose} style={{
        position: 'absolute', top: 12, right: 12, background: 'transparent',
        border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)',
        fontSize: 18, lineHeight: 1, padding: '2px 6px', borderRadius: 4, fontFamily: 'inherit',
      }}>×</button>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {reel.thumbnail_url && (
          <img
            src={reel.thumbnail_url}
            alt="Reel thumbnail"
            style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
              background: 'hsl(142 50% 95%)', color: 'hsl(142 71% 35%)',
            }}>✓ Posted {reel.date}</span>
            {reel.permalink && (
              <a href={reel.permalink} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none',
              }}>
                <ExternalLink size={11} /> View on Instagram
              </a>
            )}
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>
              <Eye size={13} style={{ color: 'var(--muted-foreground)' }} /> {fmtNum(reel.views)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>
              <Heart size={13} style={{ color: 'var(--muted-foreground)' }} /> {fmtNum(reel.likes)}
            </div>
          </div>
          {reel.caption && (
            <div style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {reel.caption}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  profileId: string
  reels: PostedReel[]
}

type Selected =
  | { type: 'planned'; entry: PlannedEntry }
  | { type: 'posted'; reel: PostedReel }

export default function CalendarClient({ profileId, reels }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [planned, setPlanned] = useState<PlannedEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [selected, setSelected] = useState<Selected | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [postsPerWeek, setPostsPerWeek] = useState(5)
  const [error, setError] = useState('')

  // Build lookup maps
  const plannedByDate: Record<string, PlannedEntry> = {}
  planned.forEach(e => { plannedByDate[e.date] = e })

  // Group reels by date — keep the one with most views if multiple same day
  const reelsByDate: Record<string, PostedReel> = {}
  reels.forEach(r => {
    if (!r.date) return
    const existing = reelsByDate[r.date]
    if (!existing || (r.views ?? 0) > (existing.views ?? 0)) reelsByDate[r.date] = r
  })

  const fetchPlanned = useCallback(async (month: Date) => {
    setFetching(true)
    setSelected(null)
    setError('')
    try {
      const res = await fetch(`/api/generate-calendar?profileId=${profileId}&month=${toMonthParam(month)}`)
      const data = await res.json()
      setPlanned(Array.isArray(data.calendar) ? data.calendar : [])
    } catch {
      setPlanned([])
    } finally {
      setFetching(false)
    }
  }, [profileId])

  useEffect(() => { fetchPlanned(currentMonth) }, [currentMonth, fetchPlanned])

  async function handleGenerate() {
    setLoading(true)
    setError('')
    setSelected(null)
    try {
      const res = await fetch('/api/generate-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, month: toMonthParam(currentMonth), postsPerWeek }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to generate calendar'); return }
      if (Array.isArray(data.calendar)) setPlanned(data.calendar)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate calendar')
    } finally {
      setLoading(false)
    }
  }

  function prevMonth() { setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)) }
  function nextMonth() { setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)) }

  const today = toISODate(new Date())
  const weeks = getMonthDays(currentMonth)

  // For list view: merge posted reels + planned entries, sorted by date
  const monthStr = toMonthParam(currentMonth)
  const monthReels = reels.filter(r => r.date?.startsWith(monthStr))
  const postedDates = new Set(monthReels.map(r => r.date))
  const allDates = new Set([...Object.keys(plannedByDate), ...monthReels.map(r => r.date)])
  const listItems = [...allDates].sort().map(date => ({
    date,
    posted: reelsByDate[date] ?? null,
    plan: plannedByDate[date] ?? null,
  }))

  return (
    <div style={{ padding: '24px', maxWidth: 1024, margin: '0 auto' }}>
      <PageHeader
        title="Content Calendar"
        description="See what you've posted and plan what's coming next."
      />

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Month nav */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '0 4px', height: 38,
        }}>
          <button onClick={prevMonth} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '6px 8px', display: 'flex', alignItems: 'center', borderRadius: 6 }} aria-label="Previous month">
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', minWidth: 148, textAlign: 'center' }}>
            {formatMonthLabel(currentMonth)}
          </span>
          <button onClick={nextMonth} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '6px 8px', display: 'flex', alignItems: 'center', borderRadius: 6 }} aria-label="Next month">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Posts/week */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 4px', height: 38 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', paddingLeft: 8 }}>Posts/week:</span>
          {[3, 5, 7].map(n => (
            <button key={n} onClick={() => setPostsPerWeek(n)} style={{
              background: postsPerWeek === n ? 'var(--foreground)' : 'transparent',
              color: postsPerWeek === n ? 'var(--background)' : 'var(--muted-foreground)',
              border: 'none', borderRadius: 6, width: 32, height: 28,
              fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
            }}>{n}</button>
          ))}
        </div>

        {/* Generate */}
        <Button variant="primary" onClick={handleGenerate} disabled={loading} style={{ gap: 6 }}>
          {loading ? (
            <><span style={{ display: 'inline-block', width: 13, height: 13, border: '2px solid var(--background)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Generating...</>
          ) : (
            <><Calendar size={14} />Plan this month</>
          )}
        </Button>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 2, marginLeft: 'auto', background: 'var(--muted)', borderRadius: 8, padding: 3 }}>
          {(['grid', 'list'] as const).map(v => (
            <button key={v} onClick={() => setViewMode(v)} style={{
              background: viewMode === v ? 'var(--card)' : 'transparent',
              color: viewMode === v ? 'var(--foreground)' : 'var(--muted-foreground)',
              border: viewMode === v ? '1px solid var(--border)' : '1px solid transparent',
              borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
            }}>
              {v === 'grid' ? <LayoutGrid size={13} /> : <List size={13} />}
              {v === 'grid' ? 'Grid' : 'List'}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted-foreground)' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'hsl(142 71% 45%)', display: 'inline-block' }} />
          Posted
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted-foreground)' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
          Planned
        </div>
      </div>

      {error && (
        <div style={{ background: 'hsl(0 50% 96%)', border: '1px solid hsl(0 72% 51% / 0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'hsl(0 72% 51%)', marginBottom: 16 }}>
          {error}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Grid view */}
      {viewMode === 'grid' && (
        <>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
              {DAY_HEADERS.map(h => (
                <div key={h} style={{ padding: '8px 0', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  {h}
                </div>
              ))}
            </div>

            {/* Weeks */}
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: wi < weeks.length - 1 ? '1px solid var(--border)' : 'none' }}>
                {week.days.map((day, di) => {
                  if (!day) {
                    return <div key={di} style={{ minHeight: 80, borderRight: di < 6 ? '1px solid var(--border)' : 'none' }} />
                  }

                  const dateStr = toISODate(day)
                  const plan = plannedByDate[dateStr]
                  const reel = reelsByDate[dateStr]
                  const isToday = dateStr === today
                  const isPast = dateStr < today
                  const selKey = selected?.type === 'planned' ? selected.entry.date : selected?.type === 'posted' ? selected.reel.date : null
                  const isSelected = selKey === dateStr

                  function handleClick() {
                    if (reel) {
                      setSelected(isSelected && selected?.type === 'posted' ? null : { type: 'posted', reel })
                    } else if (plan) {
                      setSelected(isSelected && selected?.type === 'planned' ? null : { type: 'planned', entry: plan })
                    }
                  }

                  return (
                    <div
                      key={di}
                      onClick={handleClick}
                      style={{
                        minHeight: 80, padding: 7,
                        background: isSelected ? 'hsl(220 90% 56% / 0.06)' : 'var(--card)',
                        cursor: (reel || plan) ? 'pointer' : 'default',
                        borderRight: di < 6 ? '1px solid var(--border)' : 'none',
                        borderTop: isToday ? '2px solid var(--accent)' : undefined,
                        transition: 'background 0.15s',
                        position: 'relative',
                        opacity: isPast && !reel && !plan ? 0.45 : 1,
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 600, color: isToday ? 'var(--accent)' : 'var(--muted-foreground)', marginBottom: 5 }}>
                        {day.getDate()}
                      </div>

                      {/* Posted reel indicator */}
                      {reel && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {reel.thumbnail_url ? (
                            <img
                              src={reel.thumbnail_url}
                              alt=""
                              style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 4 }}
                            />
                          ) : (
                            <div style={{ width: '100%', aspectRatio: '1', borderRadius: 4, background: 'hsl(142 50% 92%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: 16 }}>📹</span>
                            </div>
                          )}
                          <div style={{ fontSize: 10, color: 'hsl(142 71% 35%)', fontWeight: 700 }}>
                            {fmtNum(reel.views)} views
                          </div>
                        </div>
                      )}

                      {/* Planned entry (no reel on this day) */}
                      {!reel && plan && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <FormatBadge format={plan.format} />
                          <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--foreground)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {plan.hook}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Detail panel */}
          {selected?.type === 'posted' && (
            <PostedDetail reel={selected.reel} onClose={() => setSelected(null)} />
          )}
          {selected?.type === 'planned' && (
            <PlannedDetail entry={selected.entry} onClose={() => setSelected(null)} />
          )}
        </>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        fetching ? (
          <Card style={{ padding: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 24, borderRadius: 6, background: 'var(--muted)', animation: 'pulse-skeleton 1.5s ease-in-out infinite', width: i === 1 ? '60%' : i === 2 ? '80%' : '40%' }} />
              ))}
            </div>
          </Card>
        ) : listItems.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Calendar size={20} />}
              title="Nothing here yet"
              description='No reels posted or planned for this month. Hit "Plan this month" to generate a schedule.'
            />
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {listItems.map(({ date, posted, plan }) => {
              const isSelDate = selected?.type === 'posted' ? selected.reel.date === date : selected?.type === 'planned' ? selected.entry.date === date : false
              return (
                <div
                  key={date}
                  onClick={() => {
                    if (posted) setSelected(isSelDate ? null : { type: 'posted', reel: posted })
                    else if (plan) setSelected(isSelDate ? null : { type: 'planned', entry: plan })
                  }}
                  style={{
                    background: 'var(--card)', border: `1px solid ${isSelDate ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 8, padding: '12px 16px', cursor: (posted || plan) ? 'pointer' : 'default',
                    transition: 'border-color 0.15s',
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                  }}
                >
                  {posted?.thumbnail_url && (
                    <img src={posted.thumbnail_url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)' }}>{date}</span>
                      {posted && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: 'hsl(142 50% 95%)', color: 'hsl(142 71% 35%)' }}>✓ Posted</span>
                      )}
                      {plan && !posted && <FormatBadge format={plan.format} />}
                    </div>
                    {posted && (
                      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 4 }}>
                        <span><Eye size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />{fmtNum(posted.views)}</span>
                        <span><Heart size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />{fmtNum(posted.likes)}</span>
                      </div>
                    )}
                    <div style={{ fontSize: 13, color: 'var(--foreground)', fontWeight: 500, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {posted ? (posted.caption || '—') : plan?.hook}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
