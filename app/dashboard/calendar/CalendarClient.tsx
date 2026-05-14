'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { PageHeader, Button, Card, EmptyState } from '@/components/ui'
import {
  Calendar, Copy, Check, List, LayoutGrid,
  ChevronLeft, ChevronRight, ExternalLink, Eye, Heart,
  Pencil, Trash2, Plus, X, Sparkles, Target, TrendingUp,
} from 'lucide-react'
import { useIsMobile } from '@/lib/use-mobile'

// ─── Constants ────────────────────────────────────────────────────────────────

const FORMAT_OPTIONS = ['RAW STORY', 'LISTICLE', 'COMPARISON', 'TUTORIAL', 'POV', 'TRANSFORMATION', 'MYTH BUST', 'BEHIND SCENES', 'TESTIMONIAL', 'HOT TAKE']
const CTA_OPTIONS = ['DM CULT', 'Comment AUDIT', 'Follow for more', 'Link in bio']
const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
// Fixed cell height — every cell is the same, no matter what's in it
const CELL_HEIGHT = 130

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
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
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

const FORMAT_COLORS: Record<string, { bg: string; color: string }> = {
  'RAW STORY':      { bg: 'rgba(255,255,255,0.18)', color: '#fff' },
  'LISTICLE':       { bg: 'var(--accent)', color: '#fff' },
  'COMPARISON':     { bg: 'hsl(270 70% 50%)', color: '#fff' },
  'TUTORIAL':       { bg: 'rgba(255,255,255,0.1)', color: '#fff' },
  'POV':            { bg: 'var(--foreground)', color: 'var(--background)' },
  'TRANSFORMATION': { bg: 'hsl(25 95% 55%)', color: '#fff' },
  'MYTH BUST':      { bg: 'hsl(0 72% 51%)', color: '#fff' },
  'BEHIND SCENES':  { bg: 'hsl(160 60% 40%)', color: '#fff' },
  'TESTIMONIAL':    { bg: 'hsl(200 70% 45%)', color: '#fff' },
  'HOT TAKE':       { bg: 'hsl(340 80% 50%)', color: '#fff' },
}

function FormatBadge({ format, small }: { format: string; small?: boolean }) {
  const c = FORMAT_COLORS[format] ?? { bg: 'var(--muted)', color: 'var(--foreground)' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: small ? 8 : 9, fontWeight: 700,
      padding: small ? '1px 4px' : '2px 5px',
      borderRadius: 4, whiteSpace: 'nowrap', letterSpacing: '0.04em',
      background: c.bg, color: c.color,
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

// ─── Month stats bar ──────────────────────────────────────────────────────────

function MonthStats({
  planned, posted, totalDays, postsPerWeek, aiCount,
}: {
  planned: number; posted: number; totalDays: number; postsPerWeek: number; aiCount: number
}) {
  const weeks = Math.ceil(totalDays / 7)
  const target = weeks * postsPerWeek
  const filled = planned + posted
  const pct = target > 0 ? Math.min(100, Math.round((filled / target) * 100)) : 0
  const remaining = Math.max(0, target - filled)

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 12, marginBottom: 20,
    }}>
      {[
        { label: 'Posted', value: posted, color: 'rgba(255,255,255,0.7)', icon: <Check size={13} /> },
        { label: 'Planned', value: planned, color: 'var(--accent)', icon: <Calendar size={13} /> },
        { label: 'Remaining', value: remaining, color: remaining > 0 ? 'hsl(38 92% 50%)' : 'hsl(142 71% 45%)', icon: <Target size={13} /> },
        { label: 'Target hit', value: `${pct}%`, color: pct >= 80 ? 'hsl(142 71% 45%)' : pct >= 50 ? 'hsl(38 92% 50%)' : 'hsl(0 72% 51%)', icon: <TrendingUp size={13} /> },
      ].map(({ label, value, color, icon }) => (
        <div key={label} style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '12px 16px',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--muted-foreground)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <span style={{ color }}>{icon}</span>
            {label}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: '-0.5px', lineHeight: 1 }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  entry: PlannedEntry | null
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
      date, day: dayName,
      hook: hook.trim(), format,
      angle: angle.trim(), cta,
      pillar: pillar.trim(), source: 'user',
    })
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
      onClick={e => { if (e.target === backdropRef.current) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom))' }}
    >
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)' }}>{entry ? 'Edit idea' : 'Add your own idea'}</div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>{dayName}, {date}</div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--muted)', border: 'none', cursor: 'pointer', borderRadius: 8, padding: '6px 8px', display: 'flex', alignItems: 'center', color: 'var(--muted-foreground)' }}>
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Hook *</label>
            <textarea value={hook} onChange={e => setHook(e.target.value)} placeholder="The opening line that stops the scroll..." rows={3} required style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
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
          <div>
            <label style={labelStyle}>Angle / Content brief</label>
            <textarea value={angle} onChange={e => setAngle(e.target.value)} placeholder="What's the story, key point, or structure?" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div>
            <label style={labelStyle}>Content pillar</label>
            <input type="text" value={pillar} onChange={e => setPillar(e.target.value)} placeholder="e.g. Client results, Mindset, Behind the scenes..." style={inputStyle} />
          </div>
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

function PlannedDetail({ entry, onClose, onEdit, onDelete }: {
  entry: PlannedEntry; onClose: () => void
  onEdit: (e: PlannedEntry) => void; onDelete: (id: string) => void
}) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginTop: 12, position: 'relative' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', fontSize: 18, lineHeight: 1, padding: '2px 6px', borderRadius: 4, fontFamily: 'inherit' }}>×</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)' }}>{entry.day}, {entry.date}</span>
        <FormatBadge format={entry.format} />
        {entry.pillar && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'var(--muted)', color: 'var(--muted-foreground)' }}>{entry.pillar}</span>}
        {entry.source === 'ai' && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'rgba(59,130,246,0.1)', color: '#3B82F6', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Sparkles size={9} /> AI</span>}
        {entry.source === 'user' && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'hsl(250 80% 96%)', color: 'hsl(250 60% 50%)' }}>✏ Your idea</span>}
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
      {entry.cta && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>CTA</div>
          <div style={{ fontSize: 13, color: 'var(--foreground)' }}>{entry.cta}</div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <CopyButton text={entry.hook} />
        <Button variant="secondary" size="sm" onClick={() => onEdit(entry)} style={{ gap: 6 }}><Pencil size={12} /> Edit</Button>
        <button onClick={() => onDelete(entry.id)} style={{ background: 'transparent', border: '1px solid hsl(0 72% 51% / 0.3)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: 'hsl(0 72% 51%)', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </div>
  )
}

function PostedDetail({ reels, onClose }: { reels: PostedReel[]; onClose: () => void }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginTop: 12, position: 'relative' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', fontSize: 18, lineHeight: 1, padding: '2px 6px', borderRadius: 4, fontFamily: 'inherit' }}>×</button>
      {reels.length > 1 && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>{reels.length} videos posted this day</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {reels.map((reel, i) => (
          <div key={reel.reel_id} style={reels.length > 1 ? { paddingTop: i > 0 ? 16 : 0, borderTop: i > 0 ? '1px solid var(--border)' : 'none' } : undefined}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {reel.thumbnail_url && <img src={reel.thumbnail_url} alt="Reel thumbnail" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }}>✓ Posted {reel.date}</span>
                  {reel.permalink && <a href={reel.permalink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}><ExternalLink size={11} /> View on Instagram</a>}
                </div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}><Eye size={13} style={{ color: 'var(--muted-foreground)' }} /> {fmtNum(reel.views)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}><Heart size={13} style={{ color: 'var(--muted-foreground)' }} /> {fmtNum(reel.likes)}</div>
                </div>
                {(reel.transcript || reel.caption) && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{reel.transcript ? 'Script' : 'Caption'}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{reel.transcript || reel.caption}</div>
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

interface Props { profileId: string; reels: PostedReel[] }
type Selected = { type: 'planned'; entry: PlannedEntry } | { type: 'posted'; reels: PostedReel[] }

export default function CalendarClient({ profileId, reels }: Props) {
  const isMobile = useIsMobile()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [planned, setPlanned] = useState<PlannedEntry[]>([])
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [clearingAI, setClearingAI] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [selected, setSelected] = useState<Selected | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(isMobile ? 'list' : 'grid')
  const [postsPerWeek, setPostsPerWeek] = useState(5)
  const [error, setError] = useState('')
  const [editModal, setEditModal] = useState<{ entry: PlannedEntry | null; date: string; dayName: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const plannedByDate: Record<string, PlannedEntry> = {}
  planned.forEach(e => { plannedByDate[e.date] = e })

  const reelsByDate: Record<string, PostedReel[]> = {}
  reels.forEach(r => { if (!r.date) return; if (!reelsByDate[r.date]) reelsByDate[r.date] = []; reelsByDate[r.date].push(r) })

  const fetchPlanned = useCallback(async (month: Date) => {
    setFetching(true); setSelected(null); setError('')
    try {
      const res = await fetch(`/api/generate-calendar?profileId=${profileId}&month=${toMonthParam(month)}`)
      const data = await res.json()
      setPlanned(Array.isArray(data.calendar) ? data.calendar : [])
    } catch { setPlanned([]) }
    finally { setFetching(false) }
  }, [profileId])

  useEffect(() => { fetchPlanned(currentMonth) }, [currentMonth, fetchPlanned])

  async function handleGenerate() {
    setLoading(true); setError(''); setSelected(null)
    try {
      const res = await fetch('/api/generate-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, month: toMonthParam(currentMonth), postsPerWeek }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to generate calendar'); return }
      if (Array.isArray(data.calendar)) setPlanned(data.calendar)
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setLoading(false) }
  }

  async function handleClearAI() {
    setClearingAI(true); setConfirmClear(false)
    // Optimistic — keep only user entries
    setPlanned(prev => prev.filter(e => e.source === 'user'))
    setSelected(null)
    try {
      await fetch('/api/generate-calendar', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, month: toMonthParam(currentMonth), clearAI: true }),
      })
    } catch {}
    finally { setClearingAI(false) }
  }

  async function handleSave(entry: Partial<PlannedEntry> & { date: string; day: string }) {
    setSaving(true)
    const isNew = !entry.id || !planned.some(p => p.id === entry.id)
    const newEntry: PlannedEntry = {
      id: entry.id || Math.random().toString(36).slice(2),
      date: entry.date, day: entry.day,
      format: entry.format ?? 'RAW STORY', hook: entry.hook ?? '',
      angle: entry.angle ?? '', cta: entry.cta ?? 'DM CULT',
      pillar: entry.pillar ?? '', source: (entry.source ?? 'user') as 'ai' | 'user',
    }
    if (isNew) setPlanned(prev => [...prev, newEntry].sort((a, b) => a.date.localeCompare(b.date)))
    else setPlanned(prev => prev.map(p => p.id === newEntry.id ? newEntry : p))
    if (selected?.type === 'planned' && selected.entry.id === newEntry.id) setSelected({ type: 'planned', entry: newEntry })
    setEditModal(null)
    try {
      const res = await fetch('/api/generate-calendar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, month: toMonthParam(currentMonth), entry: newEntry }),
      })
      const data = await res.json()
      if (Array.isArray(data.entries)) setPlanned(data.entries)
    } catch {}
    finally { setSaving(false) }
  }

  async function handleDelete(entryId: string) {
    if (!entryId) return
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
    } catch {}
  }

  function openEdit(entry: PlannedEntry) { setEditModal({ entry, date: entry.date, dayName: entry.day || getDayName(entry.date) }) }
  function openAdd(dateStr: string) { setEditModal({ entry: null, date: dateStr, dayName: getDayName(dateStr) }) }
  function prevMonth() { setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)) }
  function nextMonth() { setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)) }

  const today = toISODate(new Date())
  const weeks = getMonthDays(currentMonth)
  const monthStr = toMonthParam(currentMonth)
  const monthReels = reels.filter(r => r.date?.startsWith(monthStr))
  const aiCount = planned.filter(e => e.source !== 'user').length
  const userCount = planned.filter(e => e.source === 'user').length

  const allDates = new Set([...Object.keys(plannedByDate), ...monthReels.map(r => r.date)])
  const listItems = [...allDates].sort().map(date => ({
    date,
    posted: reelsByDate[date] ?? [],
    plan: plannedByDate[date] ?? null,
  }))

  // Days in month
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()

  return (
    <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: 1400, margin: '0 auto' }}>
      <PageHeader
        title="Content Calendar"
        description="Plan your month, track what you've posted, and stay on target."
      />

      {/* Month stats */}
      {!isMobile && (
        <MonthStats
          planned={planned.length}
          posted={monthReels.length}
          totalDays={daysInMonth}
          postsPerWeek={postsPerWeek}
          aiCount={aiCount}
        />
      )}

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 4px', height: 38 }}>
          <button onClick={prevMonth} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '6px 8px', display: 'flex', alignItems: 'center', borderRadius: 6 }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', minWidth: 148, textAlign: 'center' }}>
            {formatMonthLabel(currentMonth)}
          </span>
          <button onClick={nextMonth} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '6px 8px', display: 'flex', alignItems: 'center', borderRadius: 6 }}>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Posts/week */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px 0 10px', height: 38 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)' }}>Posts/week:</span>
          {[3, 5, 7].map(n => (
            <button key={n} onClick={() => setPostsPerWeek(n)} style={{
              background: postsPerWeek === n ? 'var(--foreground)' : 'transparent',
              color: postsPerWeek === n ? 'var(--background)' : 'var(--muted-foreground)',
              border: 'none', borderRadius: 6, width: 30, height: 26,
              fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
            }}>{n}</button>
          ))}
        </div>

        {/* Generate */}
        <Button variant="primary" onClick={handleGenerate} disabled={loading} style={{ gap: 6 }}>
          {loading ? (
            <><span style={{ display: 'inline-block', width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Generating…</>
          ) : (
            <><Sparkles size={14} />Plan this month</>
          )}
        </Button>

        {/* Add idea */}
        <Button variant="secondary" onClick={() => openAdd(today.startsWith(monthStr) ? today : monthStr + '-01')} style={{ gap: 6 }}>
          <Plus size={14} /> Add idea
        </Button>

        {/* Clear AI — only shown when there are AI entries */}
        {aiCount > 0 && (
          confirmClear ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'hsl(0 50% 96%)', border: '1px solid hsl(0 72% 51% / 0.3)', borderRadius: 8, padding: '4px 10px', fontSize: 12 }}>
              <span style={{ color: 'hsl(0 72% 40%)', fontWeight: 600 }}>Remove {aiCount} AI suggestions?</span>
              <button
                onClick={handleClearAI}
                disabled={clearingAI}
                style={{ background: 'hsl(0 72% 51%)', color: '#fff', border: 'none', borderRadius: 5, padding: '3px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {clearingAI ? 'Clearing…' : 'Yes, remove them'}
              </button>
              <button onClick={() => setConfirmClear(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'hsl(0 72% 51%)', fontFamily: 'inherit', fontSize: 12 }}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              title="Removes AI-generated suggestions only. Your own ideas are kept."
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'transparent', border: '1px solid hsl(0 72% 51% / 0.35)',
                borderRadius: 8, padding: '0 12px', height: 38,
                color: 'hsl(0 72% 51%)', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'hsl(0 72% 51% / 0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Trash2 size={13} />
              Clear AI plan <span style={{ opacity: 0.6, fontWeight: 500 }}>({aiCount})</span>
            </button>
          )
        )}

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
      <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          { color: 'rgba(255,255,255,0.5)', label: 'Posted' },
          { color: 'var(--accent)', label: 'AI planned' },
          { color: 'hsl(250 60% 55%)', label: 'Your idea' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted-foreground)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
            {label}
          </div>
        ))}
        {userCount > 0 && <span style={{ fontSize: 12, color: 'var(--muted-foreground)', marginLeft: 4 }}>· {userCount} of your own ideas are always kept when clearing</span>}
      </div>

      {error && (
        <div style={{ background: 'hsl(0 50% 96%)', border: '1px solid hsl(0 72% 51% / 0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'hsl(0 72% 51%)', marginBottom: 16 }}>
          {error}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .cal-cell { position: relative; }
        .cal-cell-actions { opacity: 0; transition: opacity 0.12s; }
        .cal-cell:hover .cal-cell-actions { opacity: 1; }
        .cal-cell-add { opacity: 0; transition: opacity 0.12s; }
        .cal-cell:hover .cal-cell-add { opacity: 1; }
        .cal-list-actions { opacity: 0; transition: opacity 0.12s; }
        .cal-list-row:hover .cal-list-actions { opacity: 1; }
      `}</style>

      {/* ── Grid view ─────────────────────────────────────────────────────── */}
      {viewMode === 'grid' && (
        <>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
              {DAY_HEADERS.map(h => (
                <div key={h} style={{ padding: '10px 0', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  {h}
                </div>
              ))}
            </div>

            {/* Weeks — each row, every cell is exactly CELL_HEIGHT px */}
            {weeks.map((week, wi) => (
              <div
                key={wi}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gridAutoRows: `${CELL_HEIGHT}px`,
                  borderBottom: wi < weeks.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                {week.days.map((day, di) => {
                  if (!day) {
                    return (
                      <div
                        key={di}
                        style={{
                          height: CELL_HEIGHT,
                          background: 'rgba(0,0,0,0.15)',
                          borderRight: di < 6 ? '1px solid var(--border)' : 'none',
                        }}
                      />
                    )
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
                  const isAIEntry = plan?.source === 'ai' || (plan && !plan.source)

                  function handleClick(e: React.MouseEvent) {
                    const target = e.target as HTMLElement
                    if (target.closest('.cal-cell-actions') || target.closest('.cal-cell-add')) return
                    if (dayReels.length > 0) setSelected(isSelected && selected?.type === 'posted' ? null : { type: 'posted', reels: dayReels })
                    else if (plan) setSelected(isSelected && selected?.type === 'planned' ? null : { type: 'planned', entry: plan })
                  }

                  return (
                    <div
                      key={di}
                      className="cal-cell"
                      onClick={handleClick}
                      style={{
                        height: CELL_HEIGHT,
                        padding: '7px 8px',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        background: isSelected
                          ? 'hsl(220 90% 56% / 0.08)'
                          : dayReels.length > 0 ? 'rgba(255,255,255,0.02)' : 'var(--card)',
                        cursor: (dayReels.length > 0 || plan) ? 'pointer' : 'default',
                        borderRight: di < 6 ? '1px solid var(--border)' : 'none',
                        borderTop: isToday ? '2px solid var(--accent)' : undefined,
                        borderLeft: isUserEntry
                          ? '3px solid hsl(250 60% 55%)'
                          : isAIEntry ? '3px solid var(--accent)'
                          : dayReels.length > 0 ? '3px solid rgba(255,255,255,0.3)'
                          : undefined,
                        transition: 'background 0.12s',
                        opacity: isPast && dayReels.length === 0 && !plan ? 0.4 : 1,
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {/* Date row */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 5, flexShrink: 0 }}>
                        <span style={{
                          fontSize: isToday ? 12 : 11, fontWeight: isToday ? 800 : 500,
                          color: isToday ? 'var(--accent)' : 'var(--muted-foreground)',
                          lineHeight: 1,
                        }}>
                          {isToday ? '● ' : ''}{day.getDate()}
                        </span>

                        {/* Hover actions */}
                        {plan && dayReels.length === 0 && (
                          <div className="cal-cell-actions" style={{ display: 'flex', gap: 2 }}>
                            <button onClick={e => { e.stopPropagation(); openEdit(plan) }} style={{ background: 'var(--muted)', border: 'none', borderRadius: 4, padding: '2px 4px', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center' }}>
                              <Pencil size={9} />
                            </button>
                            <button onClick={e => { e.stopPropagation(); handleDelete(plan.id) }} style={{ background: 'hsl(0 72% 96%)', border: 'none', borderRadius: 4, padding: '2px 4px', cursor: 'pointer', color: 'hsl(0 72% 51%)', display: 'flex', alignItems: 'center' }}>
                              <Trash2 size={9} />
                            </button>
                          </div>
                        )}
                        {!plan && dayReels.length === 0 && !isPast && (
                          <div className="cal-cell-add">
                            <button onClick={e => { e.stopPropagation(); openAdd(dateStr) }} style={{ background: 'var(--muted)', border: 'none', borderRadius: 4, padding: '2px 4px', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center' }}>
                              <Plus size={9} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Cell content — fixed area so it never stretches the cell */}
                      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                        {/* Posted reels */}
                        {dayReels.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <div style={{ display: 'flex', gap: 2 }}>
                              {dayReels.slice(0, 2).map((reel) => (
                                reel.thumbnail_url ? (
                                  <img key={reel.reel_id} src={reel.thumbnail_url} alt="" style={{ flex: 1, height: 56, objectFit: 'cover', borderRadius: 4, minWidth: 0 }} />
                                ) : (
                                  <div key={reel.reel_id} style={{ flex: 1, height: 56, borderRadius: 4, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📹</div>
                                )
                              ))}
                              {dayReels.length > 2 && (
                                <div style={{ width: 20, height: 56, borderRadius: 4, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>+{dayReels.length - 2}</div>
                              )}
                            </div>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                              <Eye size={8} style={{ verticalAlign: 'middle', marginRight: 2 }} />
                              {fmtNum(dayReels.reduce((a, r) => a + (r.views ?? 0), 0))}
                            </div>
                          </div>
                        )}

                        {/* Planned entry */}
                        {dayReels.length === 0 && plan && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <FormatBadge format={plan.format} small />
                              {isUserEntry && <span style={{ fontSize: 7, color: 'hsl(250 60% 55%)' }}>✏</span>}
                              {isAIEntry && <Sparkles size={8} style={{ color: 'var(--accent)', opacity: 0.7, flexShrink: 0 }} />}
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--foreground)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {plan.hook}
                            </div>
                          </div>
                        )}

                        {/* Empty future day hint */}
                        {dayReels.length === 0 && !plan && isFuture && (
                          <div className="cal-cell-add" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 10, color: 'var(--muted-foreground)', opacity: 0.4 }}>—</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Detail panel */}
          {selected?.type === 'posted' && <PostedDetail reels={selected.reels} onClose={() => setSelected(null)} />}
          {selected?.type === 'planned' && (
            <PlannedDetail entry={selected.entry} onClose={() => setSelected(null)} onEdit={openEdit} onDelete={handleDelete} />
          )}
        </>
      )}

      {/* ── List view ──────────────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        fetching ? (
          <Card style={{ padding: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3].map(i => <div key={i} style={{ height: 24, borderRadius: 6, background: 'var(--muted)', animation: 'pulse-skeleton 1.5s ease-in-out infinite', width: i === 1 ? '60%' : i === 2 ? '80%' : '40%' }} />)}
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
              const isAIEntry = plan?.source === 'ai' || (plan && !plan.source)
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
                      border: `1px solid ${isSelDate ? 'var(--accent)' : 'var(--border)'}`,
                      borderLeft: plan && posted.length === 0
                        ? `3px solid ${isUserEntry ? 'hsl(250 60% 55%)' : 'var(--accent)'}`
                        : posted.length > 0 ? '3px solid rgba(255,255,255,0.3)' : undefined,
                      borderRadius: 8, padding: '12px 16px',
                      cursor: (posted.length > 0 || plan) ? 'pointer' : 'default',
                      transition: 'border-color 0.15s',
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                    }}
                  >
                    {firstReel?.thumbnail_url && (
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <img src={firstReel.thumbnail_url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                        {posted.length > 1 && <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--accent)', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{posted.length}</span>}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)' }}>{date}</span>
                        {posted.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }}>✓ Posted{posted.length > 1 ? ` · ${posted.length} videos` : ''}</span>}
                        {plan && posted.length === 0 && <FormatBadge format={plan.format} />}
                        {isAIEntry && posted.length === 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: 'rgba(59,130,246,0.1)', color: '#3B82F6', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Sparkles size={8} /> AI</span>}
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

                    {plan && posted.length === 0 && (
                      <div className="cal-list-actions" style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => openEdit(plan)} style={{ background: 'var(--muted)', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}>
                          <Pencil size={12} /> Edit
                        </button>
                        <button onClick={() => handleDelete(plan.id)} style={{ background: 'transparent', border: '1px solid hsl(0 72% 51% / 0.3)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'hsl(0 72% 51%)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}>
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {isSelDate && selected?.type === 'posted' && <PostedDetail reels={selected.reels} onClose={() => setSelected(null)} />}
                  {isSelDate && selected?.type === 'planned' && (
                    <PlannedDetail entry={selected.entry} onClose={() => setSelected(null)} onEdit={openEdit} onDelete={handleDelete} />
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
