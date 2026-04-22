'use client'

import { useState, useRef } from 'react'
import { FileText, Download, Loader2, Plus, Trash2, ChevronDown, ChevronUp, Map } from 'lucide-react'
import { Card, EmptyState } from '@/components/ui'

interface TranscriptEntry {
  id: string
  label: string
  content: string
  added_at: string
}

interface Props {
  profileId: string
  profileName: string
  roadmapGeneratedAt: string | null
  callTranscripts: TranscriptEntry[]
}

export default function RoadmapPanel({
  profileId,
  profileName,
  roadmapGeneratedAt,
  callTranscripts: initialTranscripts,
}: Props) {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>(initialTranscripts ?? [])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Transcript add state
  const [addingTranscript, setAddingTranscript] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newContent, setNewContent] = useState('')
  const [savingTranscript, setSavingTranscript] = useState(false)
  const [transcriptError, setTranscriptError] = useState<string | null>(null)

  // Roadmap state
  const [generatedAt, setGeneratedAt] = useState<string | null>(roadmapGeneratedAt)
  const [generating, setGenerating] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  async function handleAddTranscript() {
    if (!newContent.trim()) return
    setSavingTranscript(true)
    setTranscriptError(null)
    try {
      const res = await fetch('/api/admin/call-transcripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, label: newLabel.trim() || undefined, content: newContent.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save transcript')
      setTranscripts(prev => [...prev, data.entry])
      setNewLabel('')
      setNewContent('')
      setAddingTranscript(false)
    } catch (err) {
      setTranscriptError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSavingTranscript(false)
    }
  }

  async function handleDeleteTranscript(id: string) {
    try {
      await fetch('/api/admin/call-transcripts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, id }),
      })
      setTranscripts(prev => prev.filter(t => t.id !== id))
    } catch {
      // silent — worst case page refresh shows correct state
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch('/api/admin/roadmap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setGeneratedAt(data.generated_at)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/admin/roadmap/download?profileId=${profileId}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Download failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${profileName.replace(/\s+/g, '_')}_90_Day_Roadmap.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--muted-foreground)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginBottom: 6,
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--muted)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    color: 'var(--foreground)',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Call Transcripts ── */}
      <Card style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', fontFamily: 'var(--font-display)', letterSpacing: '-0.3px' }}>
              Call Transcripts
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>
              Paste Fathom transcripts to feed into roadmap generation.
            </div>
          </div>
          {!addingTranscript && (
            <button
              onClick={() => setAddingTranscript(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 7,
                background: 'var(--muted)', border: '1px solid var(--border)',
                color: 'var(--foreground)', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <Plus size={12} />
              Add Transcript
            </button>
          )}
        </div>

        {/* Add form */}
        {addingTranscript && (
          <div style={{ background: 'var(--muted)', borderRadius: 10, padding: 16, marginBottom: 16, border: '1px solid var(--border)' }}>
            <div style={{ marginBottom: 12 }}>
              <div style={labelStyle}>Label (optional)</div>
              <input
                type="text"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="e.g. Onboarding Call — 21 Apr 2026"
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={labelStyle}>Transcript</div>
              <textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder="Paste raw transcript text here…"
                rows={10}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
              />
            </div>
            {transcriptError && (
              <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 8 }}>{transcriptError}</div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleAddTranscript}
                disabled={savingTranscript || !newContent.trim()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 7,
                  background: '#3B82F6', border: 'none',
                  color: '#fff', fontSize: 12, fontWeight: 600,
                  cursor: savingTranscript || !newContent.trim() ? 'not-allowed' : 'pointer',
                  opacity: savingTranscript || !newContent.trim() ? 0.6 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {savingTranscript ? <Loader2 size={12} className="animate-spin" /> : null}
                {savingTranscript ? 'Saving…' : 'Save Transcript'}
              </button>
              <button
                onClick={() => { setAddingTranscript(false); setNewLabel(''); setNewContent(''); setTranscriptError(null) }}
                style={{
                  padding: '7px 12px', borderRadius: 7,
                  background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--muted-foreground)', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Transcript list */}
        {transcripts.length === 0 && !addingTranscript ? (
          <EmptyState
            icon={<FileText size={18} />}
            title="No transcripts yet"
            description="Add a Fathom call transcript to improve roadmap quality."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {transcripts.map(t => (
              <div key={t.id} style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--muted)', cursor: 'pointer' }}
                  onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                >
                  <FileText size={13} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                      {new Date(t.added_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}{t.content.length.toLocaleString()} chars
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {expandedId === t.id ? <ChevronUp size={13} style={{ color: 'var(--muted-foreground)' }} /> : <ChevronDown size={13} style={{ color: 'var(--muted-foreground)' }} />}
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteTranscript(t.id) }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--muted-foreground)', display: 'flex' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {expandedId === t.id && (
                  <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'pre-wrap', maxHeight: 320, overflowY: 'auto', lineHeight: 1.6 }}>
                    {t.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── 90-Day Roadmap ── */}
      <Card style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', fontFamily: 'var(--font-display)', letterSpacing: '-0.3px' }}>
              90-Day Roadmap
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>
              {generatedAt
                ? `Generated ${new Date(generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
                : 'Not generated yet. Takes ~30 seconds.'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 7,
                background: generatedAt ? 'var(--muted)' : '#3B82F6',
                border: generatedAt ? '1px solid var(--border)' : 'none',
                color: generatedAt ? 'var(--foreground)' : '#fff',
                fontSize: 12, fontWeight: 600,
                cursor: generating ? 'not-allowed' : 'pointer',
                opacity: generating ? 0.7 : 1,
                fontFamily: 'inherit',
              }}
            >
              {generating ? <Loader2 size={12} className="animate-spin" /> : <Map size={12} />}
              {generating ? 'Generating…' : generatedAt ? 'Regenerate' : 'Generate Roadmap'}
            </button>

            {generatedAt && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 7,
                  background: '#3B82F6', border: 'none',
                  color: '#fff', fontSize: 12, fontWeight: 600,
                  cursor: downloading ? 'not-allowed' : 'pointer',
                  opacity: downloading ? 0.7 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                {downloading ? 'Downloading…' : 'Download .docx'}
              </button>
            )}
          </div>
        </div>

        {generateError && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#fef2f2', borderRadius: 8, fontSize: 12, color: '#dc2626', border: '1px solid #fecaca' }}>
            {generateError}
          </div>
        )}

        {generating && (
          <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--muted)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Loader2 size={14} className="animate-spin" style={{ color: '#3B82F6' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>Building roadmap…</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
              Claude is reading {profileName.split(' ')[0]}&apos;s profile, top reels{transcripts.length > 0 ? `, and ${transcripts.length} call transcript${transcripts.length > 1 ? 's' : ''}` : ''} to build a personalised 90-day plan. This takes about 30 seconds.
            </div>
          </div>
        )}

        {!generatedAt && !generating && (
          <div style={{ marginTop: 16 }}>
            <EmptyState
              icon={<Map size={18} />}
              title="No roadmap yet"
              description={`Add any call transcripts above, then click Generate to build ${profileName.split(' ')[0]}'s personalised 90-day plan.`}
            />
          </div>
        )}
      </Card>
    </div>
  )
}
