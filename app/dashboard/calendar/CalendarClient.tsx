'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { PageHeader, Button, Card, EmptyState } from '@/components/ui'
import { Calendar, Copy, Check, List, LayoutGrid, ChevronLeft, ChevronRight, ExternalLink, Eye, Heart, Pencil, Trash2, Plus, X } from 'lucide-react'
import { useIsMobile } from '@/lib/use-mobile'

// ─── Constants ────────────────────────────────────────────────────────────────

const FORMAT_OPTIONS = ['RAW STORY', 'LISTICLE', 'COMPARISON', 'TUTORIAL', 'POV', 'TRANSFORMATION', 'MYTH BUST', 'BEHIND SCENES', 'TESTIMONIAL', 'HOT TAKE']
const CTA_OPTIONS = ['DM CULT', 'Comment AUDIT', 'Follow for more', 'Link in bio']
const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlannedEntry {
  id: string
  date: string
  day: string
  format: string
  hook: string
  angle: string
  cta: string
  pillar: string
  source?: 'ai' | 'user'
}

interface PostedReel {
  reel_id: string
  date: string
  caption: string | null
  transcript: string | null
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

function getDayName(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleString('en-US', { weekday: 'long' })
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

// ─── Format badge ─────────────────────────────────────────────────────────────

function getFormatStyle(format: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    'RAW STORY':      { background: 'rgba(255,255,255,0.35)',   color: '#fff' },
    'LISTICLE':       { background: 'var(--accent)',       color: '#fff' },
    'COMPARISON':     { background: 'hsl(270 70% 50%)',   color: '#fff' },
    'TUTORIAL':       { background: 'rgba(255,255,255,0.12)',   color: '#fff' },
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

// ─── Edit modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  entry: PlannedEntry | null  // null = new entry
  date: string
  dayName: string
  onSave: (entry: Partial<PlannedEntry> & { date: string; day: string }) => void
  onClose: () => void
  saving: boolean
}

function EditModal({ entry, date, dayName, onSave, onClose, saving }: EditModalProps) {
  const [hook, setHook] = useState(entry?.hook ?? '')
  const [format, setFormat] = useState(entry?.format ?? 'RAW STORY')
  const [angle, setAngle] = useState(entry?.angle ?? '')
  const [cta, setCta] = useState(entry?.cta ?? 'DM CULT')
  const [pillar, setPillar] = useState(entry?.pillar ?? '')
  const backdropRef = useRef<HTMLDivElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!hook.trim()) return
    onSave({
      ...(entry ? { id: entry.id } : {}),
      date,
      day: dayName,
      hook: hook.trim(),
      format,
      angle: angle.trim(),
      cta,
      pillar: pillar.trim(),
      source: 'user',
    })
  }

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--background)',
    border: '1px solid var(--border)', borderRadius: 6,
    padding: '8px 10px', fontSize: 13, color: 'var(--foreground)',
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)',
    textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5,
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 24, width: '100%', maxWidth: 520,
        maxHeight: '90vh', overflowY: 'auto', position: 'relative',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)' }}>
              {entry ? 'Edit idea' : 'Add your own idea'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>
              {dayName}, {date}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--muted)', border: 'none', cursor: 'pointer',
            borderRadius: 8, padding: '6px 8px', display: 'flex', alignItems: 'center',
            color: 'var(--muted-foreground)',
          }}>
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Hook */}
          <div>
            <label style={labelStyle}>Hook *</label>
            <textarea
              value={hook}
              onChange={e => setHook(e.target.value)}
              placeholder="The opening line that stops the scroll..."
              rows={3}
              required
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Format + CTA row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Format</label>
              <select value={format} onChange={e => setFormat(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {FORMAT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>CTA</label>
              <select value={cta} onChange={e => setCta(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {CTA_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Angle */}
          <div>
            <label style={labelStyle}>Angle / Content brief</label>
            <textarea
              value={angle}
              onChange={e => setAngle(e.target.value)}
              placeholder="What's the story, key point, or structure of this video?"
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Pillar */}
          <div>
            <label style={labelStyle}>Content pillar</label>
            <input
              type="text"
              value={pillar}
              onChange={e => setPillar(e.target.value)}
              placeholder="e.g. Client results, Mindset, Behind the scenes..."
              style={inputStyle}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving || !hook.trim()}>
              {saving ? 'Saving…' : entry ? 'Save changes' : 'Add to calendar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Detail panels ────────────────────────────────────────────────────────────

function PlannedDetail({
  entry, onClose, onEdit, onDelete
}: {
  entry: PlannedEntry
  onClose: () => void
  onEdit: (e: PlannedEntry) => void
  onDelete: (id: string) => void
}) {
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
        {entry.pillar && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'var(--muted)', color: 'var(--muted-foreground)' }}>{entry.pillar}</span>
        )}
        {entry.source === 'user' && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'hsl(250 80% 96%)', color: 'hsl(250 60% 50%)' }}>✏ Your idea</span>
        )}
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Hook</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.4 }}>{entry.hook}</div>
      </div>
      {entry.angle && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Angle</div>
          <div style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5 }}>{entry.angle}</div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <CopyButton text={entry.hook} />
        <Button variant="secondary" size="sm" onClick={() => onEdit(entry)} style={{ gap: 6 }}>
          <Pencil size={12} /> Edit
        </Button>
        <button
          onClick={() => onDelete(entry.id)}
          style={{
            background: 'transparent', border: '1px solid hsl(0 72% 51% / 0.3)',
            borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
            color: 'hsl(0 72% 51%)', fontSize: 12, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'inherit',
          }}
        >
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </div>
  )
}

function PostedDetail({ reels, onClose }: { reels: PostedReel[]; onClose: () => void }) {
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

      {reels.length > 1 && (
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
          {reels.length} videos posted this day
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {reels.map((reel, i) => (
          <div key={reel.reel_id} style={reels.length > 1 ? { paddingTop: i > 0 ? 16 : 0, borderTop: i > 0 ? '1px solid var(--border)' : 'none' } : undefined}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {reel.thumbnail_url && (
                <img src={reel.thumbnail_url} alt="Reel thumbnail" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }}>✓ Posted {reel.date}</span>
                  {reel.permalink && (
                    <a href={reel.permalink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>
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
                {(reel.transcript || reel.caption) && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                      {reel.transcript ? 'Script' : 'Caption'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {reel.transcript || reel.caption}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
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
  | { type: 'posted'; reels: PostedReel[] }

export default function CalendarClient({ profileId, reels }: Props) {
  const isMobile = useIsMobile()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [planned, setPlanned] = useState<PlannedEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [selected, setSelected] = useState<Selected | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(isMobile ? 'list' : 'grid')
  const [postsPerWeek, setPostsPerWeek] = useState(5)
  const [error, setError] = useState('')
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)
  const [editModal, setEditModal] = useState<{ entry: PlannedEntry | null; date: string; dayName: string } | null>(null)
  const [saving, setSaving] = useState(false)

  // Lookup maps
  const plannedByDate: Record<string, PlannedEntry> = {}
  planned.forEach(e => { plannedByDate[e.date] = e })

  const reelsByDate: Record<string, PostedReel[]> = {}
  reels.forEach(r => {
    if (!r.date) return
    if (!reelsByDate[r.date]) reelsByDate[r.date] = []
    reelsByDate[r.date].push(r)
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

  // ── PATCH: add or update an entry ─────────────────────────────────────────
  async function handleSave(entry: Partial<PlannedEntry> & { date: string; day: string }) {
    setSaving(true)
    // Optimistic update
    const isNew = !entry.id || !planned.some(p => p.id === entry.id)
    const newEntry: PlannedEntry = {
      id: entry.id || Math.random().toString(36).slice(2),
      date: entry.date,
      day: entry.day,
      format: entry.format ?? 'RAW STORY',
      hook: entry.hook ?? '',
      angle: entry.angle ?? '',
      cta: entry.cta ?? 'DM CULT',
      pillar: entry.pillar ?? '',
      source: (entry.source ?? 'user') as 'ai' | 'user',
    }
    if (isNew) {
      setPlanned(prev => [...prev, newEntry].sort((a, b) => a.date.localeCompare(b.date)))
    } else {
      setPlanned(prev => prev.map(p => p.id === newEntry.id ? newEntry : p))
    }
    // Update selected detail if editing what's open
    if (selected?.type === 'planned' && selected.entry.id === newEntry.id) {
      setSelected({ type: 'planned', entry: newEntry })
    }
    setEditModal(null)

    try {
      const res = await fetch('/api/generate-calendar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, month: toMonthParam(currentMonth), entry: newEntry }),
      })
      const data = await res.json()
      if (Array.isArray(data.entries)) setPlanned(data.entries)
    } catch {
      // keep optimistic state
    } finally {
      setSaving(false)
    }
  }

  // ── DELETE an entry ────────────────────────────────────────────────────────
  async function handleDelete(entryId: string) {
    if (!entryId) return   // guard: never wipe all entries if id is missing
    // Optimistic update
    setPlanned(prev => prev.filter(p => p.id !== entryId))
    if (selected?.type === 'planned' && selected.entry.id === entryId) setSelected(null)

    try {
      const res = await fetch('/api/generate-calendar', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, month: toMonthParam(currentMonth), entryId }),
      })
      const data = await res.json()
      if (Array.isArray(data.entries)) setPlanned(data.entries)
    } catch {
      // keep optimistic state
    }
  }

  function openEdit(entry: PlannedEntry) {
    setEditModal({ entry, date: entry.date, dayName: entry.day || getDayName(entry.date) })
  }

  function openAdd(dateStr: string) {
    setEditModal({ entry: null, date: dateStr, dayName: getDayName(dateStr) })
  }

  function prevMonth() { setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)) }
  function nextMonth() { setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)) }

  const today = toISODate(new Date())
  const weeks = getMonthDays(currentMonth)

  const monthStr = toMonthParam(currentMonth)
  const monthReels = reels.filter(r => r.date?.startsWith(monthStr))
  const allDates = new Set([...Object.keys(plannedByDate), ...monthReels.map(r => r.date)])
  const listItems = [...allDates].sort().map(date => ({
    date,
    posted: reelsByDate[date] ?? [],
    plan: plannedByDate[date] ?? null,
  }))

  return (
    <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: 1400, margin: '0 auto' }}>
      <PageHeader
        title="Content Calendar"
        description="See what you've posted and plan what's coming next."
      />

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 4px', height: 38 }}>
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

        {/* Add manual idea */}
        <Button variant="secondary" onClick={() => openAdd(today >= monthStr + '-01' && today <= monthStr + '-31' ? today : monthStr + '-01')} style={{ gap: 6 }}>
          <Plus size={14} /> Add idea
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
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', display: 'inline-block' }} />
          Posted
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted-foreground)' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
          AI planned
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted-foreground)' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'hsl(250 60% 55%)', display: 'inline-block' }} />
          Your idea
        </div>
      </div>

      {error && (
        <div style={{ background: 'hsl(0 50% 96%)', border: '1px solid hsl(0 72% 51% / 0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'hsl(0 72% 51%)', marginBottom: 16 }}>
          {error}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .cal-cell-actions { opacity: 0; transition: opacity 0.15s; }
        .cal-cell:hover .cal-cell-actions { opacity: 1; }
        .cal-cell-add { opacity: 0; transition: opacity 0.15s; }
        .cal-cell:hover .cal-cell-add { opacity: 1; }
        .cal-list-actions { opacity: 0; transition: opacity 0.15s; }
        .cal-list-row:hover .cal-list-actions { opacity: 1; }
      `}</style>

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
                  const dayReels = reelsByDate[dateStr] ?? []
                  const isToday = dateStr === today
                  const isPast = dateStr < today
                  const isFuture = dateStr > today
                  const selKey = selected?.type === 'planned' ? selected.entry.date : selected?.type === 'posted' ? selected.reels[0]?.date : null
                  const isSelected = selKey === dateStr
                  const isUserEntry = plan?.source === 'user'

                  function handleClick(e: React.MouseEvent) {
                    // Don't trigger cell click if clicking action buttons
                    const target = e.target as HTMLElement
                    if (target.closest('.cal-cell-actions') || target.closest('.cal-cell-add')) return
                    if (dayReels.length > 0) {
                      setSelected(isSelected && selected?.type === 'posted' ? null : { type: 'posted', reels: dayReels })
                    } else if (plan) {
                      setSelected(isSelected && selected?.type === 'planned' ? null : { type: 'planned', entry: plan })
                    }
                  }

                  return (
                    <div
                      key={di}
                      className="cal-cell"
                      onClick={handleClick}
                      style={{
                        minHeight: 80, padding: 7,
                        background: isSelected ? 'hsl(220 90% 56% / 0.06)' : 'var(--card)',
                        cursor: (dayReels.length > 0 || plan) ? 'pointer' : isFuture ? 'default' : 'default',
                        borderRight: di < 6 ? '1px solid var(--border)' : 'none',
                        borderTop: isToday ? '2px solid var(--accent)' : undefined,
                        borderLeft: isUserEntry ? '2px solid hsl(250 60% 55%)' : plan ? '2px solid var(--accent)' : undefined,
                        transition: 'background 0.15s',
                        position: 'relative',
                        opacity: isPast && dayReels.length === 0 && !plan ? 0.45 : 1,
                      }}
                    >
                      {/* Date number + action buttons row */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: isToday ? 'var(--accent)' : 'var(--muted-foreground)' }}>
                          {day.getDate()}
                        </div>

                        {/* Edit/Delete on planned entries */}
                        {plan && dayReels.length === 0 && (
                          <div className="cal-cell-actions" style={{ display: 'flex', gap: 2 }}>
                            <button
                              onClick={e => { e.stopPropagation(); openEdit(plan) }}
                              title="Edit"
                              style={{ background: 'var(--muted)', border: 'none', borderRadius: 4, padding: '2px 4px', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center' }}
                            >
                              <Pencil size={10} />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); handleDelete(plan.id) }}
                              title="Delete"
                              style={{ background: 'hsl(0 50% 96%)', border: 'none', borderRadius: 4, padding: '2px 4px', cursor: 'pointer', color: 'hsl(0 72% 51%)', display: 'flex', alignItems: 'center' }}
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        )}

                        {/* Add idea on future empty days */}
                        {!plan && dayReels.length === 0 && !isPast && (
                          <div className="cal-cell-add">
                            <button
                              onClick={e => { e.stopPropagation(); openAdd(dateStr) }}
                              title="Add idea"
                              style={{ background: 'var(--muted)', border: 'none', borderRadius: 4, padding: '2px 4px', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center' }}
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Posted reels */}
                      {dayReels.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {/* Stack thumbnails side-by-side if multiple */}
                          <div style={{ display: 'flex', gap: 2, position: 'relative' }}>
                            {dayReels.slice(0, 2).map((reel, i) => (
                              reel.thumbnail_url ? (
                                <img key={reel.reel_id} src={reel.thumbnail_url} alt="" style={{ flex: 1, aspectRatio: '1', objectFit: 'cover', borderRadius: 4, minWidth: 0 }} />
                              ) : (
                                <div key={reel.reel_id} style={{ flex: 1, aspectRatio: '1', borderRadius: 4, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <span style={{ fontSize: 14 }}>📹</span>
                                </div>
                              )
                            ))}
                            {dayReels.length > 2 && (
                              <div style={{ position: 'absolute', bottom: 2, right: 2, background: 'rgba(0,0,0,0.7)', borderRadius: 3, padding: '1px 4px', fontSize: 9, fontWeight: 700, color: '#fff' }}>
                                +{dayReels.length - 2}
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
                            {fmtNum(dayReels.reduce((a, r) => a + (r.views ?? 0), 0))} views{dayReels.length > 1 ? ` · ${dayReels.length} videos` : ''}
                          </div>
                        </div>
                      )}

                      {/* Planned entry */}
                      {dayReels.length === 0 && plan && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <FormatBadge format={plan.format} />
                            {isUserEntry && <span style={{ fontSize: 8, color: 'hsl(250 60% 55%)' }}>✏</span>}
                          </div>
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
            <PostedDetail reels={selected.reels} onClose={() => setSelected(null)} />
          )}
          {selected?.type === 'planned' && (
            <PlannedDetail
              entry={selected.entry}
              onClose={() => setSelected(null)}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
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
              const isSelDate = selected?.type === 'posted' ? selected.reels[0]?.date === date : selected?.type === 'planned' ? selected.entry.date === date : false
              const isUserEntry = plan?.source === 'user'
              const firstReel = posted[0] ?? null
              return (
                <div key={date}>
                  <div
                    className="cal-list-row"
                    onClick={() => {
                      if (posted.length > 0) setSelected(isSelDate ? null : { type: 'posted', reels: posted })
                      else if (plan) setSelected(isSelDate ? null : { type: 'planned', entry: plan })
                    }}
                    style={{
                      background: 'var(--card)',
                      border: `1px solid ${isSelDate ? 'var(--accent)' : isUserEntry ? 'hsl(250 60% 55% / 0.4)' : 'var(--border)'}`,
                      borderLeft: plan && posted.length === 0 ? `3px solid ${isUserEntry ? 'hsl(250 60% 55%)' : 'var(--accent)'}` : undefined,
                      borderRadius: 8, padding: '12px 16px', cursor: (posted.length > 0 || plan) ? 'pointer' : 'default',
                      transition: 'border-color 0.15s',
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                    }}
                  >
                    {firstReel?.thumbnail_url && (
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <img src={firstReel.thumbnail_url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                        {posted.length > 1 && (
                          <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--accent)', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {posted.length}
                          </span>
                        )}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)' }}>{date}</span>
                        {posted.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }}>✓ Posted{posted.length > 1 ? ` · ${posted.length} videos` : ''}</span>}
                        {plan && posted.length === 0 && <FormatBadge format={plan.format} />}
                        {isUserEntry && posted.length === 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: 'hsl(250 80% 96%)', color: 'hsl(250 60% 50%)' }}>✏ Your idea</span>}
                      </div>
                      {firstReel && (
                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 4 }}>
                          <span><Eye size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />{fmtNum(posted.reduce((a, r) => a + (r.views ?? 0), 0))}</span>
                          <span><Heart size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />{fmtNum(posted.reduce((a, r) => a + (r.likes ?? 0), 0))}</span>
                        </div>
                      )}
                      <div style={{ fontSize: 13, color: 'var(--foreground)', fontWeight: 500, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {firstReel ? (firstReel.transcript || firstReel.caption || '—') : plan?.hook}
                      </div>
                    </div>

                    {/* Edit/Delete buttons on list rows */}
                    {plan && posted.length === 0 && (
                      <div className="cal-list-actions" style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => openEdit(plan)}
                          title="Edit"
                          style={{ background: 'var(--muted)', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(plan.id)}
                          title="Delete"
                          style={{ background: 'transparent', border: '1px solid hsl(0 72% 51% / 0.3)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'hsl(0 72% 51%)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expanded detail below selected row */}
                  {isSelDate && selected?.type === 'posted' && (
                    <PostedDetail reels={selected.reels} onClose={() => setSelected(null)} />
                  )}
                  {isSelDate && selected?.type === 'planned' && (
                    <PlannedDetail
                      entry={selected.entry}
                      onClose={() => setSelected(null)}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Edit / Add modal */}
      {editModal && (
        <EditModal
          entry={editModal.entry}
          date={editModal.date}
          dayName={editModal.dayName}
          onSave={handleSave}
          onClose={() => setEditModal(null)}
          saving={saving}
        />
      )}
    </div>
  )
}
