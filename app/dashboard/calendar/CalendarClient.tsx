'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader, Button, Card, EmptyState } from '@/components/ui'
import { Calendar, Copy, Check, List, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CalendarEntry {
  date: string
  day: string
  format: string
  hook: string
  angle: string
  cta: string
  pillar: string
}

type ViewMode = 'grid' | 'list'

// ─── Format badge colors ──────────────────────────────────────────────────────

function getFormatStyle(format: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    'RAW STORY': { background: 'hsl(38 92% 50%)', color: '#fff' },
    'LISTICLE': { background: 'var(--accent)', color: '#fff' },
    'COMPARISON': { background: 'hsl(270 70% 50%)', color: '#fff' },
    'TUTORIAL': { background: 'hsl(142 76% 36%)', color: '#fff' },
    'POV': { background: 'var(--foreground)', color: 'var(--background)' },
    'TRANSFORMATION': { background: 'hsl(25 95% 55%)', color: '#fff' },
    'MYTH BUST': { background: 'hsl(0 72% 51%)', color: '#fff' },
  }
  return map[format] ?? { background: 'var(--muted)', color: 'var(--foreground)' }
}

function FormatBadge({ format }: { format: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: 10, fontWeight: 700, padding: '2px 6px',
      borderRadius: 6, whiteSpace: 'nowrap', letterSpacing: '0.04em',
      ...getFormatStyle(format),
    }}>
      {format}
    </span>
  )
}

function CtaBadge({ cta }: { cta: string }) {
  const style: React.CSSProperties =
    cta === 'DM CULT'
      ? { background: 'hsl(220 90% 56% / 0.12)', color: 'var(--accent)', border: '1px solid hsl(220 90% 56% / 0.25)' }
      : cta === 'Comment AUDIT'
      ? { background: 'hsl(142 76% 36% / 0.1)', color: 'hsl(142 76% 36%)', border: '1px solid hsl(142 76% 36% / 0.25)' }
      : { background: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: 11, fontWeight: 600, padding: '2px 8px',
      borderRadius: 999, whiteSpace: 'nowrap',
      ...style,
    }}>
      {cta}
    </span>
  )
}

function PillarBadge({ pillar }: { pillar: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: 11, fontWeight: 600, padding: '2px 8px',
      borderRadius: 999, whiteSpace: 'nowrap',
      background: 'var(--muted)', color: 'var(--muted-foreground)',
    }}>
      {pillar}
    </span>
  )
}

// ─── Calendar grid helpers ────────────────────────────────────────────────────

interface WeekRow {
  days: (Date | null)[]
}

function getMonthDays(date: Date): WeekRow[] {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const startOffset = (firstDay.getDay() + 6) % 7
  const totalSlots = startOffset + lastDay.getDate()
  const weeks: WeekRow[] = []
  let currentWeek: (Date | null)[] = []

  for (let i = 0; i < startOffset; i++) {
    currentWeek.push(null)
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    currentWeek.push(new Date(year, month, d))
    if (currentWeek.length === 7) {
      weeks.push({ days: currentWeek })
      currentWeek = []
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push({ days: currentWeek })
  }

  void totalSlots
  return weeks
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

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

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ─── Copy hook button ─────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleCopy} style={{ gap: 6 }}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copied!' : 'Copy hook'}
    </Button>
  )
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function DetailPanel({ entry, onClose }: { entry: CalendarEntry; onClose: () => void }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 20, marginTop: 16, position: 'relative',
    }}>
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 12, right: 12,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--muted-foreground)', fontSize: 18, lineHeight: 1,
          padding: '2px 6px', borderRadius: 4,
        }}
        aria-label="Close detail"
      >
        ×
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)' }}>
          {entry.day}, {entry.date}
        </span>
        <FormatBadge format={entry.format} />
        <CtaBadge cta={entry.cta} />
        <PillarBadge pillar={entry.pillar} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          Hook
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.4 }}>
          {entry.hook}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          Angle
        </div>
        <div style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5 }}>
          {entry.angle}
        </div>
      </div>

      <CopyButton text={entry.hook} />
    </div>
  )
}

// ─── List view card ───────────────────────────────────────────────────────────

function ListCard({ entry, isSelected, onClick }: {
  entry: CalendarEntry
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--card)',
        border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 8, padding: '14px 16px',
        cursor: 'pointer', transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', minWidth: 110 }}>
          {entry.day}, {entry.date}
        </span>
        <FormatBadge format={entry.format} />
        <CtaBadge cta={entry.cta} />
        <PillarBadge pillar={entry.pillar} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.4, marginBottom: 4 }}>
        {entry.hook}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
        {entry.angle}
      </div>
      {isSelected && (
        <div style={{ marginTop: 12 }}>
          <CopyButton text={entry.hook} />
        </div>
      )}
    </div>
  )
}

// ─── Main client component ────────────────────────────────────────────────────

export default function CalendarClient({ profileId }: { profileId: string }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calendar, setCalendar] = useState<CalendarEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [selectedDay, setSelectedDay] = useState<CalendarEntry | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [postsPerWeek, setPostsPerWeek] = useState(5)
  const [error, setError] = useState('')

  const fetchCalendar = useCallback(async (month: Date) => {
    setFetching(true)
    setSelectedDay(null)
    setError('')
    try {
      const monthParam = toMonthParam(month)
      const res = await fetch(`/api/generate-calendar?profileId=${profileId}&month=${monthParam}`)
      const data = await res.json()
      if (data.calendar && Array.isArray(data.calendar)) {
        setCalendar(data.calendar)
      } else {
        setCalendar([])
      }
    } catch {
      setCalendar([])
    } finally {
      setFetching(false)
    }
  }, [profileId])

  useEffect(() => {
    fetchCalendar(currentMonth)
  }, [currentMonth, fetchCalendar])

  async function handleGenerate() {
    setLoading(true)
    setError('')
    setSelectedDay(null)
    try {
      const res = await fetch('/api/generate-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, month: toMonthParam(currentMonth), postsPerWeek }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to generate calendar')
        return
      }
      if (data.calendar && Array.isArray(data.calendar)) {
        setCalendar(data.calendar)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate calendar')
    } finally {
      setLoading(false)
    }
  }

  function prevMonth() {
    setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }

  function nextMonth() {
    setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }

  const entryByDate: Record<string, CalendarEntry> = {}
  calendar.forEach(e => { entryByDate[e.date] = e })

  const today = toISODate(new Date())
  const weeks = getMonthDays(currentMonth)

  return (
    <div style={{ padding: '24px', maxWidth: 1024, margin: '0 auto' }}>
      <PageHeader
        title="Content Calendar"
        description="AI-generated month of content tailored to your niche and top formats."
      />

      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Month selector */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '0 4px', height: 38,
        }}>
          <button
            onClick={prevMonth}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--muted-foreground)', padding: '6px 8px',
              display: 'flex', alignItems: 'center', borderRadius: 6,
            }}
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{
            fontSize: 14, fontWeight: 600, color: 'var(--foreground)',
            minWidth: 148, textAlign: 'center',
          }}>
            {formatMonthLabel(currentMonth)}
          </span>
          <button
            onClick={nextMonth}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--muted-foreground)', padding: '6px 8px',
              display: 'flex', alignItems: 'center', borderRadius: 6,
            }}
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Posts/week selector */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '0 4px', height: 38,
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', paddingLeft: 8 }}>
            Posts/week:
          </span>
          {[3, 5, 7].map(n => (
            <button
              key={n}
              onClick={() => setPostsPerWeek(n)}
              style={{
                background: postsPerWeek === n ? 'var(--foreground)' : 'transparent',
                color: postsPerWeek === n ? 'var(--background)' : 'var(--muted-foreground)',
                border: 'none', borderRadius: 6, width: 32, height: 28,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Generate button */}
        <Button variant="primary" onClick={handleGenerate} disabled={loading} style={{ gap: 6 }}>
          {loading ? (
            <>
              <span style={{
                display: 'inline-block', width: 13, height: 13,
                border: '2px solid var(--background)', borderTopColor: 'transparent',
                borderRadius: '50%', animation: 'spin 0.7s linear infinite',
              }} />
              Generating...
            </>
          ) : (
            <>
              <Calendar size={14} />
              Generate Calendar
            </>
          )}
        </Button>

        {/* View toggle */}
        <div style={{
          display: 'flex', gap: 2, marginLeft: 'auto',
          background: 'var(--muted)', borderRadius: 8, padding: 3,
        }}>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              background: viewMode === 'grid' ? 'var(--card)' : 'transparent',
              color: viewMode === 'grid' ? 'var(--foreground)' : 'var(--muted-foreground)',
              border: viewMode === 'grid' ? '1px solid var(--border)' : '1px solid transparent',
              borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
            }}
          >
            <LayoutGrid size={13} />
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              background: viewMode === 'list' ? 'var(--card)' : 'transparent',
              color: viewMode === 'list' ? 'var(--foreground)' : 'var(--muted-foreground)',
              border: viewMode === 'list' ? '1px solid var(--border)' : '1px solid transparent',
              borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
            }}
          >
            <List size={13} />
            List
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: 'hsl(0 50% 96%)', border: '1px solid hsl(0 72% 51% / 0.25)',
          borderRadius: 8, padding: '10px 14px',
          fontSize: 13, color: 'hsl(0 72% 51%)', marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-skeleton {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* Main content area */}
      {fetching ? (
        <Card style={{ padding: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                height: 24, borderRadius: 6, background: 'var(--muted)',
                animation: 'pulse-skeleton 1.5s ease-in-out infinite',
                width: i === 1 ? '60%' : i === 2 ? '80%' : '40%',
              }} />
            ))}
          </div>
        </Card>
      ) : calendar.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Calendar size={20} />}
            title="No calendar yet"
            description={`No content calendar for ${formatMonthLabel(currentMonth)}. Hit "Generate Calendar" to create one.`}
          />
        </Card>
      ) : viewMode === 'grid' ? (
        <>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 10, overflow: 'hidden',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
              {DAY_HEADERS.map(h => (
                <div key={h} style={{
                  padding: '8px 0', textAlign: 'center',
                  fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)',
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                }}>
                  {h}
                </div>
              ))}
            </div>

            {weeks.map((week, wi) => (
              <div key={wi} style={{
                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                borderBottom: wi < weeks.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                {week.days.map((day, di) => {
                  if (!day) {
                    return (
                      <div key={di} style={{
                        minHeight: 80, padding: 8,
                        background: 'var(--muted)', opacity: 0.4,
                        borderRight: di < 6 ? '1px solid var(--border)' : 'none',
                      }} />
                    )
                  }

                  const dateStr = toISODate(day)
                  const entry = entryByDate[dateStr]
                  const isToday = dateStr === today
                  const isSelected = selectedDay?.date === dateStr

                  return (
                    <div
                      key={di}
                      onClick={() => { if (entry) setSelectedDay(isSelected ? null : entry) }}
                      style={{
                        minHeight: 80, padding: 8,
                        background: isSelected
                          ? 'hsl(220 90% 56% / 0.06)'
                          : entry ? 'var(--card)' : 'var(--muted)',
                        opacity: entry ? 1 : 0.6,
                        cursor: entry ? 'pointer' : 'default',
                        borderRight: di < 6 ? '1px solid var(--border)' : 'none',
                        borderTop: isToday ? '2px solid var(--accent)' : undefined,
                        transition: 'background 0.15s',
                        position: 'relative', overflow: 'hidden',
                      }}
                    >
                      <div style={{
                        fontSize: 11, fontWeight: 600,
                        color: isToday ? 'var(--accent)' : 'var(--muted-foreground)',
                        marginBottom: 4,
                      }}>
                        {day.getDate()}
                      </div>
                      {entry && (
                        <>
                          <FormatBadge format={entry.format} />
                          <div style={{
                            fontSize: 11, fontWeight: 500, color: 'var(--foreground)',
                            marginTop: 4, lineHeight: 1.35,
                            display: '-webkit-box', WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          }}>
                            {entry.hook}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {selectedDay && (
            <DetailPanel entry={selectedDay} onClose={() => setSelectedDay(null)} />
          )}
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {calendar.map(entry => (
            <ListCard
              key={entry.date}
              entry={entry}
              isSelected={selectedDay?.date === entry.date}
              onClick={() => setSelectedDay(prev => prev?.date === entry.date ? null : entry)}
            />
          ))}
        </div>
      )}

      {!fetching && calendar.length > 0 && (
        <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, marginRight: 4 }}>
            FORMATS:
          </span>
          {['RAW STORY', 'LISTICLE', 'COMPARISON', 'TUTORIAL', 'POV', 'TRANSFORMATION', 'MYTH BUST', 'BEHIND SCENES', 'TESTIMONIAL', 'HOT TAKE'].map(f => (
            <FormatBadge key={f} format={f} />
          ))}
        </div>
      )}
    </div>
  )
}
