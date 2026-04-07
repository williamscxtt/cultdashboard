'use client'

import { useState } from 'react'
import { Save, Plus, CheckCircle, Calendar } from 'lucide-react'
import type { WeeklyLog } from '@/lib/types'
import { Card, Button, PageHeader } from '@/components/ui'

// ─── helpers ──────────────────────────────────────────────────────────────────

function getMonday(d: Date): string {
  const copy = new Date(d)
  const day = copy.getDay()
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1)
  copy.setDate(diff)
  return copy.toISOString().slice(0, 10)
}

function formatWeek(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ─── stat input ───────────────────────────────────────────────────────────────

function StatInput({ label, value, onChange, type = 'number', placeholder = '0' }: {
  label: string; value: string; onChange: (v: string) => void
  type?: 'number' | 'text'; placeholder?: string
}) {
  return (
    <div>
      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 4 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '8px 10px', fontSize: 13,
          background: 'var(--background)', border: '1px solid var(--border)',
          borderRadius: 6, color: 'var(--foreground)', fontFamily: 'inherit',
          outline: 'none', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

function TextArea({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <div>
      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 4 }}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        style={{
          width: '100%', padding: '8px 10px', fontSize: 13,
          background: 'var(--background)', border: '1px solid var(--border)',
          borderRadius: 6, color: 'var(--foreground)', fontFamily: 'inherit',
          outline: 'none', resize: 'vertical', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

// ─── log entry card (read-only) ───────────────────────────────────────────────

function LogCard({ log }: { log: WeeklyLog }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>
          Week of {formatWeek(log.date)}
        </div>
        <button onClick={() => setExpanded(e => !e)} style={{
          fontSize: 12, color: 'var(--muted-foreground)', background: 'none', border: 'none',
          cursor: 'pointer', padding: '4px 8px',
        }}>
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 12 }}>
        {log.reels_posted !== null && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reels</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--foreground)' }}>{log.reels_posted}</div>
          </div>
        )}
        {log.followers_total !== null && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Followers</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--foreground)' }}>{log.followers_total.toLocaleString()}</div>
          </div>
        )}
        {log.avg_reel_views !== null && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Avg Views</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--foreground)' }}>{log.avg_reel_views.toLocaleString()}</div>
          </div>
        )}
        {log.calls_booked !== null && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Calls</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--foreground)' }}>{log.calls_booked}</div>
          </div>
        )}
        {log.clients_signed !== null && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Signed</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{log.clients_signed}</div>
          </div>
        )}
        {log.revenue !== null && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Revenue</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--foreground)' }}>£{log.revenue.toLocaleString()}</div>
          </div>
        )}
        {log.outreach_sent !== null && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Outreach</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--foreground)' }}>{log.outreach_sent}</div>
          </div>
        )}
      </div>

      {expanded && (log.biggest_win || log.biggest_bottleneck || log.message_for_will) && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {log.biggest_win && (
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Biggest Win</div>
              <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.6, margin: 0 }}>{log.biggest_win}</p>
            </div>
          )}
          {log.biggest_bottleneck && (
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Bottleneck</div>
              <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.6, margin: 0 }}>{log.biggest_bottleneck}</p>
            </div>
          )}
          {log.message_for_will && (
            <div>
              <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Message to Will</div>
              <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>&ldquo;{log.message_for_will}&rdquo;</p>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// ─── main ────────────────────────────────────────────────────────────────────

interface Props { profileName: string; logs: WeeklyLog[] }

const thisWeek = getMonday(new Date())

function emptyForm() {
  return {
    date: thisWeek,
    reels_posted: '', followers_total: '', avg_reel_views: '',
    outreach_sent: '', calls_booked: '', clients_signed: '',
    revenue: '', biggest_win: '', biggest_bottleneck: '', message_for_will: '',
  }
}

export default function WeeklyLogView({ profileName, logs }: Props) {
  const [showForm, setShowForm] = useState(logs.length === 0)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  function s(key: keyof typeof form) {
    return (v: string) => setForm(f => ({ ...f, [key]: v }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/weekly-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 3000)
      setShowForm(false)
      setForm(emptyForm())
      window.location.reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const thisWeekLog = logs.find(l => l.date === thisWeek)
  const pastLogs = logs.filter(l => l.date !== thisWeek)

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <PageHeader
        title="Weekly Log"
        description="Track your numbers every week. Honesty over performance."
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {savedMsg && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'hsl(142 71% 35%)', fontWeight: 600 }}>
                <CheckCircle size={14} /> Saved
              </div>
            )}
            {!showForm && (
              <Button size="sm" onClick={() => setShowForm(true)} style={{ gap: 6 }}>
                <Plus size={13} /> Log This Week
              </Button>
            )}
          </div>
        }
      />

      {/* ── Entry form ── */}
      {showForm && (
        <Card style={{ padding: 24, marginBottom: 24, borderColor: 'var(--accent)', borderWidth: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Calendar size={14} color="var(--accent)" />
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>
              Week of {formatWeek(form.date)}
            </div>
          </div>

          {/* Numbers */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              📊 Your Numbers
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
              <StatInput label="Reels Posted" value={form.reels_posted} onChange={s('reels_posted')} />
              <StatInput label="Followers Now" value={form.followers_total} onChange={s('followers_total')} placeholder="e.g. 12450" />
              <StatInput label="Avg Views" value={form.avg_reel_views} onChange={s('avg_reel_views')} placeholder="e.g. 3200" />
              <StatInput label="Outreach Sent" value={form.outreach_sent} onChange={s('outreach_sent')} />
              <StatInput label="Calls Booked" value={form.calls_booked} onChange={s('calls_booked')} />
              <StatInput label="Clients Signed" value={form.clients_signed} onChange={s('clients_signed')} />
              <StatInput label="Revenue (£)" value={form.revenue} onChange={s('revenue')} placeholder="e.g. 3500" />
            </div>
          </div>

          {/* Text fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
            <TextArea label="🏆 Biggest Win This Week" value={form.biggest_win} onChange={s('biggest_win')} placeholder="What are you most proud of this week?" />
            <TextArea label="🧱 Biggest Bottleneck" value={form.biggest_bottleneck} onChange={s('biggest_bottleneck')} placeholder="What held you back? Be honest." />
            <TextArea label="✉️ Message to Will" value={form.message_for_will} onChange={s('message_for_will')} placeholder="Anything you want Will to know this week..." />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} style={{ gap: 6 }}>
              <Save size={13} /> {saving ? 'Saving…' : 'Save Log'}
            </Button>
          </div>
        </Card>
      )}

      {/* ── This week (if logged) ── */}
      {thisWeekLog && !showForm && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            This Week
          </div>
          <LogCard log={thisWeekLog} />
        </div>
      )}

      {/* ── Previous weeks ── */}
      {pastLogs.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Previous Weeks
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pastLogs.map(log => (
              <LogCard key={log.id} log={log} />
            ))}
          </div>
        </div>
      )}

      {logs.length === 0 && !showForm && (
        <Card style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)', marginBottom: 6 }}>No logs yet</div>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 16 }}>Start tracking your weekly numbers to see your progress.</div>
          <Button onClick={() => setShowForm(true)} style={{ gap: 6 }}>
            <Plus size={13} /> Log This Week
          </Button>
        </Card>
      )}
    </div>
  )
}
