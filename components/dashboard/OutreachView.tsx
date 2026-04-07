'use client'
import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Copy, Sparkles, ChevronDown, ChevronUp, Save, X } from 'lucide-react'
import { Card, Button, PageHeader, SectionLabel, EmptyState } from '@/components/ui'

interface OutreachEntry {
  id: string
  date: string
  platform: string
  dms_sent: number
  responses: number
  qualified_leads: number
  notes: string | null
}

interface SavedReply {
  id: string
  label: string | null
  reply_text: string
  conversation_stage: string | null
  original_message: string | null
  created_at: string
}

const PLATFORMS = ['Instagram', 'TikTok', 'LinkedIn', 'Twitter/X', 'YouTube', 'Other']
const STAGES = ['Initial contact', 'Follow up', 'Booking a call', 'Objection', 'Closing', 'Post-call']

function StatBadge({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '14px 16px', flex: 1, minWidth: 100,
    }}>
      <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, marginBottom: 4, letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--foreground)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function OutreachView({
  initialEntries,
  initialReplies,
}: {
  initialEntries: OutreachEntry[]
  initialReplies: SavedReply[]
}) {
  const [entries, setEntries] = useState<OutreachEntry[]>(initialEntries)
  const [replies, setReplies] = useState<SavedReply[]>(initialReplies)
  const [tab, setTab] = useState<'log' | 'replies' | 'generator'>('log')

  // Log form
  const [showLogForm, setShowLogForm] = useState(false)
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split('T')[0])
  const [logPlatform, setLogPlatform] = useState('Instagram')
  const [logSent, setLogSent] = useState('')
  const [logResponses, setLogResponses] = useState('')
  const [logLeads, setLogLeads] = useState('')
  const [logNotes, setLogNotes] = useState('')
  const [logSaving, setLogSaving] = useState(false)

  // Reply form
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyLabel, setReplyLabel] = useState('')
  const [replyText, setReplyText] = useState('')
  const [replyStage, setReplyStage] = useState('')
  const [replySaving, setReplySaving] = useState(false)

  // AI generator
  const [genMessage, setGenMessage] = useState('')
  const [genStage, setGenStage] = useState('Initial contact')
  const [genContext, setGenContext] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedReply, setGeneratedReply] = useState('')

  // Stats
  const last7Days = entries.filter(e => {
    const d = new Date(e.date)
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7)
    return d >= cutoff
  })
  const totalSent = last7Days.reduce((s, e) => s + (e.dms_sent || 0), 0)
  const totalResponses = last7Days.reduce((s, e) => s + (e.responses || 0), 0)
  const totalLeads = last7Days.reduce((s, e) => s + (e.qualified_leads || 0), 0)
  const responseRate = totalSent > 0 ? Math.round((totalResponses / totalSent) * 100) : 0

  async function handleLogSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLogSaving(true)
    try {
      const res = await fetch('/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: logDate,
          platform: logPlatform,
          dms_sent: Number(logSent) || 0,
          responses: Number(logResponses) || 0,
          qualified_leads: Number(logLeads) || 0,
          notes: logNotes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to save'); return }
      setEntries(prev => [data.entry, ...prev])
      setShowLogForm(false)
      setLogSent(''); setLogResponses(''); setLogLeads(''); setLogNotes('')
      toast.success('Outreach logged')
    } catch { toast.error('Network error') }
    finally { setLogSaving(false) }
  }

  async function handleDeleteEntry(id: string) {
    try {
      const res = await fetch('/api/outreach', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      if (!res.ok) { toast.error('Failed to delete'); return }
      setEntries(prev => prev.filter(e => e.id !== id))
      toast.success('Deleted')
    } catch { toast.error('Network error') }
  }

  async function handleSaveReply(e: React.FormEvent) {
    e.preventDefault()
    if (!replyText.trim()) { toast.error('Reply text is required'); return }
    setReplySaving(true)
    try {
      const res = await fetch('/api/outreach/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reply_text: replyText.trim(),
          label: replyLabel.trim() || null,
          conversation_stage: replyStage || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to save'); return }
      setReplies(prev => [data.reply, ...prev])
      setShowReplyForm(false); setReplyLabel(''); setReplyText(''); setReplyStage('')
      toast.success('Reply template saved')
    } catch { toast.error('Network error') }
    finally { setReplySaving(false) }
  }

  async function handleDeleteReply(id: string) {
    try {
      const res = await fetch('/api/outreach/replies', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      if (!res.ok) { toast.error('Failed to delete'); return }
      setReplies(prev => prev.filter(r => r.id !== id))
      toast.success('Deleted')
    } catch { toast.error('Network error') }
  }

  async function handleGenerate() {
    if (!genMessage.trim()) { toast.error('Paste their message first'); return }
    setGenerating(true)
    setGeneratedReply('')
    try {
      const res = await fetch('/api/outreach/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incomingMessage: genMessage, stage: genStage, context: genContext }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Generation failed'); return }
      setGeneratedReply(data.reply)
    } catch { toast.error('Network error') }
    finally { setGenerating(false) }
  }

  function saveGeneratedReply() {
    setReplyText(generatedReply)
    setReplyStage(genStage)
    setShowReplyForm(true)
    setTab('replies')
  }

  const tabs: { key: 'log' | 'replies' | 'generator'; label: string }[] = [
    { key: 'log', label: 'Daily Log' },
    { key: 'replies', label: `Templates${replies.length > 0 ? ` (${replies.length})` : ''}` },
    { key: 'generator', label: 'AI Reply Generator' },
  ]

  return (
    <div style={{ padding: '24px', maxWidth: 860, margin: '0 auto' }}>
      <PageHeader title="Outreach" description="Log your daily DMs, generate replies, and save your best templates." />

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatBadge label="DMs SENT (7D)" value={totalSent} />
        <StatBadge label="RESPONSES (7D)" value={totalResponses} />
        <StatBadge label="QUALIFIED LEADS (7D)" value={totalLeads} />
        <StatBadge label="RESPONSE RATE" value={`${responseRate}%`} sub="last 7 days" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '9px 16px', background: 'transparent', border: 'none',
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab === t.key ? 'var(--accent)' : 'var(--muted-foreground)',
              fontWeight: tab === t.key ? 700 : 500, fontSize: 13, cursor: 'pointer',
              fontFamily: 'inherit', marginBottom: -1,
              transition: 'color 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Daily Log tab ─────────────────────────────────────────────────────── */}
      {tab === 'log' && (
        <div>
          {!showLogForm ? (
            <Button onClick={() => setShowLogForm(true)} size="sm" style={{ marginBottom: 16 }}>
              <Plus size={14} style={{ marginRight: 6 }} /> Log Today&apos;s Outreach
            </Button>
          ) : (
            <Card style={{ padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <SectionLabel>New Entry</SectionLabel>
                <button onClick={() => setShowLogForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleLogSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Date</label>
                    <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Platform</label>
                    <select value={logPlatform} onChange={e => setLogPlatform(e.target.value)} style={{ width: '100%' }}>
                      {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>DMs Sent</label>
                    <input type="number" min="0" value={logSent} onChange={e => setLogSent(e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Responses</label>
                    <input type="number" min="0" value={logResponses} onChange={e => setLogResponses(e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Qualified Leads</label>
                    <input type="number" min="0" value={logLeads} onChange={e => setLogLeads(e.target.value)} placeholder="0" />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Notes (optional)</label>
                  <textarea value={logNotes} onChange={e => setLogNotes(e.target.value)} placeholder="Any notes about today's outreach..." rows={2} style={{ resize: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button type="submit" size="sm" disabled={logSaving}>{logSaving ? 'Saving…' : 'Save Entry'}</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setShowLogForm(false)}>Cancel</Button>
                </div>
              </form>
            </Card>
          )}

          {entries.length === 0 ? (
            <EmptyState
              icon={<Plus size={18} />}
              title="No outreach logged yet"
              description="Log your daily DM activity to track response rates and qualified leads over time."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {entries.map(entry => {
                const rate = entry.dms_sent > 0 ? Math.round((entry.responses / entry.dms_sent) * 100) : 0
                return (
                  <Card key={entry.id} style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 80 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>
                          {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{entry.platform}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 16, flex: 1, flexWrap: 'wrap' }}>
                        {[
                          { label: 'Sent', value: entry.dms_sent },
                          { label: 'Responses', value: entry.responses },
                          { label: 'Leads', value: entry.qualified_leads },
                          { label: 'Rate', value: `${rate}%` },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <div style={{ fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)' }}>{value}</div>
                          </div>
                        ))}
                      </div>
                      {entry.notes && (
                        <div style={{ width: '100%', fontSize: 12, color: 'var(--muted-foreground)', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                          {entry.notes}
                        </div>
                      )}
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 4, flexShrink: 0 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Templates tab ─────────────────────────────────────────────────────── */}
      {tab === 'replies' && (
        <div>
          {!showReplyForm ? (
            <Button onClick={() => setShowReplyForm(true)} size="sm" style={{ marginBottom: 16 }}>
              <Plus size={14} style={{ marginRight: 6 }} /> Save New Template
            </Button>
          ) : (
            <Card style={{ padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <SectionLabel>New Template</SectionLabel>
                <button onClick={() => { setShowReplyForm(false); setReplyLabel(''); setReplyText(''); setReplyStage('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleSaveReply} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Label</label>
                    <input type="text" value={replyLabel} onChange={e => setReplyLabel(e.target.value)} placeholder="e.g. Price objection reply" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Stage</label>
                    <select value={replyStage} onChange={e => setReplyStage(e.target.value)} style={{ width: '100%' }}>
                      <option value="">Any stage</option>
                      {STAGES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Reply Text</label>
                  <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Write your reply template..." rows={4} style={{ resize: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button type="submit" size="sm" disabled={replySaving}>{replySaving ? 'Saving…' : 'Save Template'}</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => { setShowReplyForm(false); setReplyLabel(''); setReplyText(''); setReplyStage('') }}>Cancel</Button>
                </div>
              </form>
            </Card>
          )}

          {replies.length === 0 ? (
            <EmptyState
              icon={<Save size={18} />}
              title="No saved templates yet"
              description="Save your best DM replies here so you can copy them quickly in any conversation."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {replies.map(reply => (
                <Card key={reply.id} style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        {reply.label && (
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)' }}>{reply.label}</span>
                        )}
                        {reply.conversation_stage && (
                          <span style={{
                            fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                            padding: '2px 6px', borderRadius: 4,
                            background: 'hsl(220 90% 56% / 0.1)', color: 'var(--accent)',
                          }}>
                            {reply.conversation_stage}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{reply.reply_text}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => { navigator.clipboard.writeText(reply.reply_text); toast.success('Copied') }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 5 }}
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteReply(reply.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 5 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── AI Generator tab ──────────────────────────────────────────────────── */}
      {tab === 'generator' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card style={{ padding: 20 }}>
            <div style={{ marginBottom: 14 }}><SectionLabel>Generate a Reply</SectionLabel></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Their Message</label>
                <textarea
                  value={genMessage}
                  onChange={e => setGenMessage(e.target.value)}
                  placeholder="Paste the message they sent you..."
                  rows={3}
                  style={{ resize: 'none' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Conversation Stage</label>
                  <select value={genStage} onChange={e => setGenStage(e.target.value)} style={{ width: '100%' }}>
                    {STAGES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Extra Context (optional)</label>
                  <input
                    type="text"
                    value={genContext}
                    onChange={e => setGenContext(e.target.value)}
                    placeholder="e.g. They follow me for 3 months"
                  />
                </div>
              </div>
              <Button onClick={handleGenerate} disabled={generating || !genMessage.trim()} style={{ alignSelf: 'flex-start' }}>
                <Sparkles size={14} style={{ marginRight: 6 }} />
                {generating ? 'Generating…' : 'Generate Reply'}
              </Button>
            </div>
          </Card>

          {generatedReply && (
            <Card style={{ padding: 20, borderLeft: '3px solid var(--accent)', borderRadius: '0 10px 10px 0' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Generated Reply</div>
              <div style={{ fontSize: 14, color: 'var(--foreground)', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 14 }}>{generatedReply}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="sm" onClick={() => { navigator.clipboard.writeText(generatedReply); toast.success('Copied') }}>
                  <Copy size={13} style={{ marginRight: 5 }} /> Copy
                </Button>
                <Button size="sm" variant="secondary" onClick={saveGeneratedReply}>
                  <Save size={13} style={{ marginRight: 5 }} /> Save as Template
                </Button>
                <Button size="sm" variant="secondary" onClick={handleGenerate}>
                  Regenerate
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
