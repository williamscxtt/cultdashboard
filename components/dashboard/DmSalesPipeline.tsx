'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Trash2, ChevronRight, X, Save, Lightbulb, Phone, AlertCircle, Clock } from 'lucide-react'
import { Card, Button, PageHeader } from '@/components/ui'

// ─── types ────────────────────────────────────────────────────────────────────

interface Lead {
  id: string
  profile_id: string
  lead_name: string | null
  source: string | null
  contact_info: string | null
  stage: string | null
  call_booked: boolean | null
  call_completed: boolean | null
  closed: boolean | null
  deal_value: number | null
  revenue: number | null
  call_date: string | null
  call_time: string | null
  how_booked: string | null
  pre_call_notes: string | null
  live_call_notes: string | null
  pain_points: string | null
  objections: string | null
  outcome_notes: string | null
  follow_up_date: string | null
  follow_up_note: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

const STAGES = [
  { key: 'Call Booked',  color: 'hsl(220 90% 56%)',  label: 'Call Booked' },
  { key: 'On Call',      color: '#3B82F6',  label: 'On Call' },
  { key: 'No Show',      color: 'hsl(0 60% 55%)',    label: 'No Show' },
  { key: 'Follow Up',    color: 'rgba(255,255,255,0.35)',   label: 'Follow Up' },
  { key: 'Offer Made',   color: 'hsl(200 70% 50%)',  label: 'Offer Made' },
  { key: 'Closed Won',   color: 'rgba(255,255,255,0.5)',  label: 'Closed Won 🎉' },
  { key: 'Closed Lost',  color: 'hsl(0 40% 55%)',    label: 'Closed Lost' },
]

const FILTERS = ['All', 'Needs Follow Up', 'Calls This Week', 'Open Deals', 'Closed Won', 'Closed Lost']

function stageColor(stage: string | null) {
  return STAGES.find(s => s.key === stage)?.color ?? 'var(--muted-foreground)'
}

function isOverdue(lead: Lead): boolean {
  if (!lead.follow_up_date) return false
  if (['Closed Won', 'Closed Lost'].includes(lead.stage ?? '')) return false
  return new Date(lead.follow_up_date) < new Date()
}

function isThisWeek(dateStr: string | null): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return d >= monday && d <= sunday
}

// ─── stat card ────────────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: color ?? 'var(--foreground)' }}>{value}</div>
    </div>
  )
}

// ─── new lead form ────────────────────────────────────────────────────────────

function NewLeadForm({ onSave, onClose }: { onSave: (data: Partial<Lead>) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState({
    lead_name: '', contact_info: '', source: '', stage: 'Call Booked',
    deal_value: '', call_date: '', call_time: '', how_booked: '', notes: '',
  })
  const [saving, setSaving] = useState(false)

  function s(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 10px', fontSize: 13, boxSizing: 'border-box',
    background: 'var(--background)', border: '1px solid var(--border)',
    borderRadius: 6, color: 'var(--foreground)', fontFamily: 'inherit', outline: 'none',
  }
  const lbl = (t: string) => <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 4 }}>{t}</label>

  return (
    <Card style={{ padding: 20, marginBottom: 16, borderColor: 'var(--accent)', borderWidth: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>New Lead</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}><X size={16} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>{lbl('Name')}<input style={inp} value={form.lead_name} onChange={s('lead_name')} placeholder="John Smith" /></div>
        <div>{lbl('Contact (IG / phone)')}<input style={inp} value={form.contact_info} onChange={s('contact_info')} placeholder="@handle" /></div>
        <div>{lbl('Source')}<input style={inp} value={form.source} onChange={s('source')} placeholder="Reel, Story, Referral..." /></div>
        <div>{lbl('How booked?')}<input style={inp} value={form.how_booked} onChange={s('how_booked')} placeholder="Calendly, DM, etc." /></div>
        <div>
          {lbl('Stage')}
          <select style={inp} value={form.stage} onChange={s('stage')}>
            {STAGES.map(st => <option key={st.key} value={st.key}>{st.label}</option>)}
          </select>
        </div>
        <div>{lbl('Deal Value (£)')}<input style={inp} value={form.deal_value} onChange={s('deal_value')} type="number" placeholder="7000" /></div>
        <div>{lbl('Call Date')}<input type="date" style={inp} value={form.call_date} onChange={s('call_date')} /></div>
        <div>{lbl('Call Time')}<input type="time" style={inp} value={form.call_time} onChange={s('call_time')} /></div>
      </div>
      <div style={{ marginBottom: 12 }}>
        {lbl('Notes')}
        <textarea rows={2} style={{ ...inp, resize: 'vertical' }} value={form.notes} onChange={s('notes')} placeholder="Any context before the call..." />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" disabled={saving} onClick={async () => {
          setSaving(true)
          try {
            await onSave({
              lead_name: form.lead_name || null,
              contact_info: form.contact_info || null,
              source: form.source || null,
              stage: form.stage,
              deal_value: form.deal_value ? Number(form.deal_value) : null,
              call_date: form.call_date || null,
              call_time: form.call_time || null,
              how_booked: form.how_booked || null,
              notes: form.notes || null,
            })
          } finally { setSaving(false) }
        }} style={{ gap: 6 }}>
          <Plus size={13} /> {saving ? 'Adding…' : 'Add Lead'}
        </Button>
      </div>
    </Card>
  )
}

// ─── lead panel (slide-in detail) ─────────────────────────────────────────────

function LeadPanel({ lead, onUpdate, onClose, onDelete }: {
  lead: Lead
  onUpdate: (id: string, fields: Partial<Lead>) => void
  onClose: () => void
  onDelete: (id: string) => void
}) {
  const [liveNotes, setLiveNotes] = useState(lead.live_call_notes ?? '')
  const [preNotes, setPreNotes] = useState(lead.pre_call_notes ?? '')
  const [painPoints, setPainPoints] = useState(lead.pain_points ?? '')
  const [objections, setObjections] = useState(lead.objections ?? '')
  const [outcome, setOutcome] = useState(lead.outcome_notes ?? '')
  const [followUpDate, setFollowUpDate] = useState(lead.follow_up_date?.slice(0, 10) ?? '')
  const [followUpNote, setFollowUpNote] = useState(lead.follow_up_note ?? '')
  const [dealValue, setDealValue] = useState(lead.deal_value != null ? String(lead.deal_value) : '')
  const [stage, setStage] = useState(lead.stage ?? 'Call Booked')
  const [saving, setSaving] = useState(false)
  const [savedIdea, setSavedIdea] = useState(false)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-save live notes every 10s
  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      if (liveNotes !== lead.live_call_notes) {
        fetch('/api/dm-sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: lead.id, live_call_notes: liveNotes }),
        })
      }
    }, 10000)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [liveNotes, lead.id, lead.live_call_notes])

  async function handleSave() {
    setSaving(true)
    const updates: Partial<Lead> = {
      stage, pre_call_notes: preNotes || null, live_call_notes: liveNotes || null,
      pain_points: painPoints || null, objections: objections || null,
      outcome_notes: outcome || null, follow_up_date: followUpDate || null,
      follow_up_note: followUpNote || null,
      deal_value: dealValue ? Number(dealValue) : null,
    }
    const res = await fetch('/api/dm-sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lead.id, ...updates }),
    })
    if (res.ok) {
      const { lead: updated } = await res.json()
      onUpdate(lead.id, updated)
    }
    setSaving(false)
  }

  async function saveToIdeaBank() {
    if (!painPoints.trim()) return
    await fetch('/api/idea-bank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idea: painPoints,
        title: `Pain point from ${lead.lead_name || 'lead'}`,
        content_type: 'Proof',
        priority: 'High',
        status: 'Idea',
      }),
    })
    setSavedIdea(true)
    setTimeout(() => setSavedIdea(false), 3000)
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 10px', fontSize: 13, boxSizing: 'border-box',
    background: 'var(--background)', border: '1px solid var(--border)',
    borderRadius: 6, color: 'var(--foreground)', fontFamily: 'inherit', outline: 'none',
  }
  const lbl = (t: string) => <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{t}</div>

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, zIndex: 50,
      background: 'var(--card)', borderLeft: '1px solid var(--border)',
      overflowY: 'auto', padding: 24, boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--foreground)', marginBottom: 4 }}>
            {lead.lead_name || 'Lead'}
          </div>
          {lead.contact_info && <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{lead.contact_info}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { if (confirm('Delete this lead?')) onDelete(lead.id) }} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}><Trash2 size={14} /></button>
          <button onClick={onClose} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}><X size={16} /></button>
        </div>
      </div>

      {/* Stage */}
      <div style={{ marginBottom: 16 }}>
        {lbl('Stage')}
        <select style={inp} value={stage} onChange={e => setStage(e.target.value)}>
          {STAGES.map(st => <option key={st.key} value={st.key}>{st.label}</option>)}
        </select>
      </div>

      {/* Deal value */}
      <div style={{ marginBottom: 16 }}>
        {lbl('Deal Value (£)')}
        <input type="number" style={inp} value={dealValue} onChange={e => setDealValue(e.target.value)} placeholder="7000" />
      </div>

      {/* Pre-call notes */}
      <div style={{ marginBottom: 16 }}>
        {lbl('Pre-call Research')}
        <textarea rows={3} style={{ ...inp, resize: 'vertical' }} value={preNotes} onChange={e => setPreNotes(e.target.value)} placeholder="Research before the call — their content, offer, pain points..." />
      </div>

      {/* Live call notes */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Live Call Notes
          </span>
          <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>(auto-saves)</span>
        </div>
        <textarea rows={5} style={{ ...inp, resize: 'vertical', borderColor: 'var(--accent)' }} value={liveNotes} onChange={e => setLiveNotes(e.target.value)} placeholder="Type during the call — what are they saying, what's coming up..." />
      </div>

      {/* Pain points */}
      <div style={{ marginBottom: 4 }}>
        {lbl('Pain Points (exact words they used)')}
        <textarea rows={3} style={{ ...inp, resize: 'vertical' }} value={painPoints} onChange={e => setPainPoints(e.target.value)} placeholder="'I post every day but nobody's buying'..." />
      </div>
      <button
        onClick={saveToIdeaBank}
        disabled={!painPoints.trim() || savedIdea}
        style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
          fontSize: 11, fontWeight: 600, borderRadius: 6, border: '1px solid var(--border)',
          background: savedIdea ? 'rgba(255,255,255,0.15)' : 'var(--muted)',
          color: savedIdea ? 'rgba(255,255,255,0.5)' : 'var(--muted-foreground)',
          cursor: painPoints.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
          marginBottom: 16,
        }}
      >
        <Lightbulb size={11} />
        {savedIdea ? 'Saved to Idea Bank!' : 'Save as Content Idea'}
      </button>

      {/* Objections */}
      <div style={{ marginBottom: 16 }}>
        {lbl('Objections')}
        <textarea rows={2} style={{ ...inp, resize: 'vertical' }} value={objections} onChange={e => setObjections(e.target.value)} placeholder="'I can't afford it', 'Need to think about it'..." />
      </div>

      {/* Outcome */}
      <div style={{ marginBottom: 16 }}>
        {lbl('Outcome / Notes')}
        <textarea rows={2} style={{ ...inp, resize: 'vertical' }} value={outcome} onChange={e => setOutcome(e.target.value)} placeholder="What happened, next steps..." />
      </div>

      {/* Follow-up */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div>
          {lbl('Follow-up Date')}
          <input type="date" style={inp} value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
        </div>
        <div>
          {lbl('Follow-up Action')}
          <input style={inp} value={followUpNote} onChange={e => setFollowUpNote(e.target.value)} placeholder="Send voice note, check in..." />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} style={{ width: '100%', gap: 6 }}>
        <Save size={13} /> {saving ? 'Saving…' : 'Save'}
      </Button>
    </div>
  )
}

// ─── main ────────────────────────────────────────────────────────────────────

interface Props { initialLeads: Lead[] }

export default function DmSalesPipeline({ initialLeads }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [showForm, setShowForm] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [activeFilter, setActiveFilter] = useState('All')

  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Stats
  const callsThisMonth = leads.filter(l => l.created_at?.startsWith(thisMonth)).length
  const overdueFollowUps = leads.filter(isOverdue).length
  const openDeals = leads.filter(l => !['Closed Won', 'Closed Lost'].includes(l.stage ?? '')).length
  const closedWon = leads.filter(l => l.stage === 'Closed Won')
  const totalClosed = leads.filter(l => l.stage === 'Closed Won' || l.stage === 'Closed Lost').length
  const closeRate = totalClosed > 0 ? Math.round((closedWon.length / totalClosed) * 100) : 0
  const closedRevenue = closedWon.reduce((s, l) => s + (l.revenue ?? l.deal_value ?? 0), 0)

  // Filter
  const filtered = leads.filter(l => {
    if (activeFilter === 'All') return true
    if (activeFilter === 'Needs Follow Up') return isOverdue(l)
    if (activeFilter === 'Calls This Week') return isThisWeek(l.call_date)
    if (activeFilter === 'Open Deals') return !['Closed Won', 'Closed Lost'].includes(l.stage ?? '')
    if (activeFilter === 'Closed Won') return l.stage === 'Closed Won'
    if (activeFilter === 'Closed Lost') return l.stage === 'Closed Lost'
    return true
  })

  async function addLead(data: Partial<Lead>) {
    const res = await fetch('/api/dm-sales', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    })
    if (!res.ok) { alert((await res.json()).error); return }
    const { lead } = await res.json()
    setLeads(prev => [lead, ...prev])
    setShowForm(false)
  }

  function updateLead(id: string, fields: Partial<Lead>) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...fields } : l))
    if (selectedLead?.id === id) setSelectedLead(prev => prev ? { ...prev, ...fields } : prev)
  }

  async function deleteLead(id: string) {
    await fetch('/api/dm-sales', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setLeads(prev => prev.filter(l => l.id !== id))
    setSelectedLead(null)
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto', paddingRight: selectedLead ? 444 : 24 }}>
      <PageHeader
        title="DM Sales"
        description="Track every lead from first message to closed deal."
        action={
          <Button size="sm" onClick={() => setShowForm(true)} style={{ gap: 6 }}>
            <Plus size={13} /> Add Lead
          </Button>
        }
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <Stat label="Leads This Month" value={callsThisMonth} />
        <Stat label="Overdue Follow-ups" value={overdueFollowUps} color={overdueFollowUps > 0 ? 'rgba(255,255,255,0.35)' : undefined} />
        <Stat label="Open Deals" value={openDeals} />
        <Stat label="Close Rate" value={`${closeRate}%`} color={closeRate >= 50 ? 'rgba(255,255,255,0.5)' : undefined} />
      </div>

      {/* Closed revenue */}
      {closedRevenue > 0 && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16,
          padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.15)',
          fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.09)',
        }}>
          £{closedRevenue.toLocaleString()} closed revenue
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setActiveFilter(f)} style={{
            padding: '5px 12px', borderRadius: 6, border: `1px solid ${activeFilter === f ? 'var(--accent)' : 'var(--border)'}`,
            background: activeFilter === f ? 'hsl(var(--accent-hsl, 25 100% 55%) / 0.1)' : 'var(--card)',
            color: activeFilter === f ? 'var(--accent)' : 'var(--muted-foreground)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {f}
            {f === 'Needs Follow Up' && overdueFollowUps > 0 && (
              <span style={{ marginLeft: 6, background: 'rgba(255,255,255,0.35)', color: '#fff', borderRadius: 9999, fontSize: 10, fontWeight: 700, padding: '0 5px' }}>
                {overdueFollowUps}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* New lead form */}
      {showForm && <NewLeadForm onSave={addLead} onClose={() => setShowForm(false)} />}

      {/* Lead list */}
      {filtered.length === 0 ? (
        <Card style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginBottom: 6 }}>
            {activeFilter === 'All' ? 'No leads yet' : `No ${activeFilter} leads`}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
            {activeFilter === 'All' ? 'Add your first lead above.' : 'Change filter to see other leads.'}
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(lead => {
            const overdue = isOverdue(lead)
            const thisWeekCall = isThisWeek(lead.call_date)
            const color = stageColor(lead.stage)
            const isSelected = selectedLead?.id === lead.id

            return (
              <div
                key={lead.id}
                onClick={() => setSelectedLead(isSelected ? null : lead)}
                style={{
                  background: overdue ? 'hsl(38 90% 50% / 0.04)' : 'var(--card)',
                  border: `1px solid ${isSelected ? 'var(--accent)' : overdue ? 'hsl(38 90% 50% / 0.4)' : 'var(--border)'}`,
                  borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 14,
                  transition: 'border-color 0.15s',
                }}
              >
                {/* Stage dot */}
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />

                {/* Name + contact */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>{lead.lead_name || 'Unnamed'}</span>
                    {lead.contact_info && <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{lead.contact_info}</span>}
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: `${color}22`, color }}>{lead.stage}</span>
                    {lead.deal_value != null && <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>£{lead.deal_value.toLocaleString()}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {lead.source && <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{lead.source}</span>}
                    {lead.call_date && (
                      <span style={{ fontSize: 11, color: thisWeekCall ? 'var(--accent)' : 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Phone size={10} /> {lead.call_date}{lead.call_time ? ` · ${lead.call_time}` : ''}
                      </span>
                    )}
                    {overdue && (
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>
                        <AlertCircle size={10} /> Follow-up overdue
                      </span>
                    )}
                    {lead.follow_up_date && !overdue && (
                      <span style={{ fontSize: 11, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={10} /> Follow-up {new Date(lead.follow_up_date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight size={14} style={{ color: 'var(--muted-foreground)', flexShrink: 0, transform: isSelected ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>
            )
          })}
        </div>
      )}

      {/* Lead detail panel */}
      {selectedLead && (
        <LeadPanel
          lead={selectedLead}
          onUpdate={updateLead}
          onClose={() => setSelectedLead(null)}
          onDelete={deleteLead}
        />
      )}
    </div>
  )
}
