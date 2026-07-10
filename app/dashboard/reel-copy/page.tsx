'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { Copy, Bookmark, Trash2, ChevronDown, ChevronUp, Upload, FileAudio, AlignLeft, Link as LinkIcon, History, X, ExternalLink } from 'lucide-react'
import { PageHeader, Card, Button, EmptyState } from '@/components/ui'
import { useIsMobile } from '@/lib/use-mobile'

interface Analysis {
  verdict: string
  overall_score: number
  performance_score: number
  script_quality_score: number
  hook_analysis: string
  pacing_analysis: string
  cta_analysis: string
  key_lessons: string[]
  adaptation_brief: string
  suggested_hook: string
}

interface HistoryEntry {
  id: string
  reel_url: string | null
  verdict: string
  overall_score: number
  performance_score: number
  script_quality_score: number
  adaptation_brief: string | null
  analysis_json: Analysis
  transcript: string | null
  created_at: string
}

interface IdeaBankEntry {
  id: string
  hook: string
  source: string
  created_at: string
}

type Mode = 'url' | 'paste' | 'audio'

const VERDICT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Exceptional: { bg: 'rgba(255,255,255,0.5)', text: 'rgba(255,255,255,0.5)', border: 'rgba(255,255,255,0.5)' },
  Strong:      { bg: 'hsl(220 90% 96%)', text: 'hsl(220 90% 40%)', border: 'hsl(220 70% 85%)' },
  Average:     { bg: 'rgba(255,255,255,0.35)',  text: 'rgba(255,255,255,0.35)',  border: 'rgba(255,255,255,0.35)' },
  Weak:        { bg: 'hsl(25 90% 95%)',  text: 'hsl(25 80% 40%)',  border: 'hsl(25 90% 80%)' },
  Poor:        { bg: 'hsl(0 50% 96%)',   text: 'hsl(0 72% 40%)',   border: 'hsl(0 70% 85%)' },
}

const VERDICT_DOT: Record<string, string> = {
  Exceptional: 'hsl(142 71% 45%)',
  Strong:      'hsl(220 90% 56%)',
  Average:     'var(--muted-foreground)',
  Weak:        'hsl(25 80% 50%)',
  Poor:        'hsl(0 72% 51%)',
}

function scoreColor(score: number) {
  if (score >= 80) return 'hsl(142 71% 45%)'
  if (score >= 65) return 'var(--accent)'
  if (score >= 50) return 'hsl(25 80% 50%)'
  return 'hsl(0 72% 51%)'
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function shortUrl(url: string | null) {
  if (!url) return 'Manual'
  try {
    const u = new URL(url)
    const parts = u.pathname.split('/').filter(Boolean)
    return '@' + (parts[0] || 'reel')
  } catch {
    return 'Reel'
  }
}

export default function ReelCopyPage() {
  const isMobile = useIsMobile()
  const [mode, setMode] = useState<Mode>('url')
  const [igUrl, setIgUrl] = useState('')
  const [transcript, setTranscript] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [showTranscript, setShowTranscript] = useState(false)
  const [ideaBank, setIdeaBank] = useState<IdeaBankEntry[]>([])
  const [userId, setUserId] = useState('')
  const [savingHook, setSavingHook] = useState(false)
  const [resultTranscript, setResultTranscript] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // History state
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/effective-profile').then(r => r.json()).then(({ profileId }) => {
      if (profileId) {
        setUserId(profileId)
        loadIdeaBank(profileId)
      }
    })
  }, [])

  const loadIdeaBank = useCallback(async (uid: string) => {
    const res = await fetch(`/api/idea-bank?profileId=${uid}`)
    const data = await res.json()
    if (data.hooks) setIdeaBank(data.hooks)
  }, [])

  const loadHistory = useCallback(async (uid: string) => {
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/reel-analyze?profileId=${uid}`)
      const data = await res.json()
      if (data.analyses) setHistory(data.analyses)
    } catch {
      toast.error('Failed to load history')
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  function openHistory() {
    setShowHistory(true)
    if (userId) loadHistory(userId)
  }

  function loadFromHistory(entry: HistoryEntry) {
    setAnalysis(entry.analysis_json)
    setResultTranscript(entry.transcript ?? '')
    setShowHistory(false)
    setErrorMsg('')
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteHistoryEntry(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/reel-analyze?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setHistory(prev => prev.filter(h => h.id !== id))
      // If currently viewing this analysis, clear it
      toast.success('Removed from history')
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleAnalyze() {
    setAnalysis(null)
    setErrorMsg('')
    setResultTranscript('')
    setLoading(true)

    try {
      let res: Response

      if (mode === 'url') {
        if (!igUrl.trim() || !igUrl.includes('instagram.com')) { toast.error('Paste a valid Instagram reel URL'); setLoading(false); return }
        const formData = new FormData()
        formData.append('ig_url', igUrl.trim())
        formData.append('profileId', userId)
        res = await fetch('/api/reel-analyze', { method: 'POST', body: formData })
      } else if (mode === 'paste') {
        if (!transcript.trim()) { toast.error('Paste a transcript first'); setLoading(false); return }
        res = await fetch('/api/reel-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: transcript.trim(), profileId: userId }),
        })
      } else {
        if (!audioFile) { toast.error('Select an audio file first'); setLoading(false); return }
        const formData = new FormData()
        formData.append('audio', audioFile)
        formData.append('profileId', userId)
        res = await fetch('/api/reel-analyze', { method: 'POST', body: formData })
      }

      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || 'Analysis failed')
        return
      }

      setResultTranscript(data.transcript || transcript)
      setAnalysis(data.analysis)
      // Refresh history count in background
      if (userId) loadHistory(userId)
    } catch {
      setErrorMsg('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  async function saveHook(hook: string) {
    setSavingHook(true)
    try {
      const res = await fetch('/api/idea-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: userId, hook, source: 'reel_copy' }),
      })
      if (res.ok) {
        toast.success('Hook saved to Idea Bank')
        loadIdeaBank(userId)
      }
    } finally {
      setSavingHook(false)
    }
  }

  async function deleteHook(id: string) {
    await fetch(`/api/idea-bank?id=${id}`, { method: 'DELETE' })
    setIdeaBank(prev => prev.filter(h => h.id !== id))
    toast.success('Removed from Idea Bank')
  }

  const verdict = analysis?.verdict ?? ''
  const verdictStyle = VERDICT_COLORS[verdict] ?? VERDICT_COLORS.Average

  // ── History panel ─────────────────────────────────────────────────────────

  if (showHistory) {
    return (
      <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => setShowHistory(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600,
              color: 'var(--muted-foreground)', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <X size={13} /> Close
          </button>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)' }}>
            Analysis History
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted-foreground)' }}>
            {history.length} {history.length === 1 ? 'analysis' : 'analyses'}
          </div>
        </div>

        {historyLoading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted-foreground)', fontSize: 14 }}>
            Loading…
          </div>
        ) : history.length === 0 ? (
          <EmptyState
            icon={<History size={18} />}
            title="No history yet"
            description="Analyses you run will appear here."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map(entry => (
              <Card
                key={entry.id}
                style={{ padding: '14px 16px', cursor: 'pointer' }}
                onClick={() => loadFromHistory(entry)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Verdict dot */}
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: VERDICT_DOT[entry.verdict] ?? 'var(--muted-foreground)',
                  }} />

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>
                        {entry.verdict}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(entry.overall_score) }}>
                        {entry.overall_score}/100
                      </span>
                      {entry.reel_url && (
                        <a
                          href={entry.reel_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--muted-foreground)', textDecoration: 'none' }}
                        >
                          <ExternalLink size={10} />
                          {shortUrl(entry.reel_url)}
                        </a>
                      )}
                      {!entry.reel_url && (
                        <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Manual</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                      {formatDate(entry.created_at)}
                    </div>
                    {entry.adaptation_brief && (
                      <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 5, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {entry.adaptation_brief}
                      </div>
                    )}
                  </div>

                  {/* Score pills */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                    {[
                      { label: 'Perf', score: entry.performance_score },
                      { label: 'Script', score: entry.script_quality_score },
                    ].map(({ label, score }) => (
                      <div key={label} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        background: 'var(--muted)', borderRadius: 6, padding: '4px 8px', minWidth: 40,
                      }}>
                        <span style={{ fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 600 }}>{label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(score) }}>{score}</span>
                      </div>
                    ))}
                    <button
                      onClick={e => { e.stopPropagation(); deleteHistoryEntry(entry.id) }}
                      disabled={deletingId === entry.id}
                      style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: 'var(--muted-foreground)', padding: 6, borderRadius: 6,
                        transition: 'color 0.12s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'hsl(0 72% 51%)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)' }}
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Main view ─────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <PageHeader
          title="Reel Copy Tool"
          description="Drop an Instagram reel link — get a full AI breakdown, personalised adaptation advice, and a rewritten hook for your niche."
        />
        <button
          onClick={openHistory}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 600,
            color: 'var(--muted-foreground)', cursor: 'pointer', fontFamily: 'inherit',
            flexShrink: 0, alignSelf: 'flex-start',
            transition: 'color 0.12s, border-color 0.12s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--foreground)'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--foreground)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
          }}
        >
          <History size={13} />
          History
          {history.length > 0 && (
            <span style={{
              background: 'var(--muted)', borderRadius: 10, padding: '1px 6px',
              fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)',
            }}>
              {history.length}
            </span>
          )}
        </button>
      </div>

      {/* Mode selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
        {([
          { key: 'url' as Mode, icon: <LinkIcon size={14} />, label: isMobile ? 'URL' : 'Instagram URL' },
          { key: 'paste' as Mode, icon: <AlignLeft size={14} />, label: isMobile ? 'Paste' : 'Paste Transcript' },
          { key: 'audio' as Mode, icon: <FileAudio size={14} />, label: isMobile ? 'Audio' : 'Upload Audio' },
        ]).map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => { setMode(key); setAnalysis(null); setErrorMsg('') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              flex: isMobile ? '1 1 auto' : undefined,
              justifyContent: isMobile ? 'center' : undefined,
              border: mode === key ? '2px solid var(--accent)' : '1px solid var(--border)',
              background: mode === key ? 'hsl(220 90% 56% / 0.08)' : 'var(--card)',
              color: mode === key ? 'var(--accent)' : 'var(--muted-foreground)',
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Input card */}
      <Card style={{ marginBottom: 16, padding: 20 }}>
        {mode === 'url' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>
              Instagram Reel URL
            </label>
            <input
              type="url"
              value={igUrl}
              onChange={e => setIgUrl(e.target.value)}
              placeholder="https://www.instagram.com/reel/..."
              style={{ fontSize: 14 }}
            />
            <div style={{
              fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.6,
              padding: '10px 14px', borderRadius: 8, background: 'var(--muted)',
            }}>
              Paste any public Instagram reel link. The AI will transcribe it, score it, and tell you exactly how to adapt it for your niche and voice — or whether it&apos;s even worth adapting at all.
            </div>
          </div>
        ) : mode === 'paste' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>
              Paste the reel script or transcript
            </label>
            <textarea
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              placeholder="Copy the transcript from a reel, or type/paste the script you want to analyse..."
              rows={8}
              style={{ resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>
              Upload audio (MP3, M4A, WAV)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border)', borderRadius: 10,
                padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
            >
              {audioFile ? (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', marginBottom: 4 }}>
                    {audioFile.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                    {(audioFile.size / 1024 / 1024).toFixed(1)} MB — click to change
                  </div>
                </div>
              ) : (
                <>
                  <Upload size={22} style={{ color: 'var(--muted-foreground)', margin: '0 auto 10px', display: 'block' }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 4 }}>Upload audio file</div>
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>MP3, M4A, WAV — max 25MB</div>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              style={{ display: 'none' }}
              onChange={e => setAudioFile(e.target.files?.[0] ?? null)}
            />
            <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.5 }}>
              Audio is transcribed using OpenAI Whisper, then analysed by Claude. Requires OPENAI_API_KEY to be configured.
            </p>
          </div>
        )}

        {errorMsg && (
          <div style={{
            marginTop: 12,
            background: 'hsl(0 50% 96%)', border: '1px solid hsl(0 70% 85%)',
            borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'hsl(0 72% 45%)',
          }}>
            {errorMsg}
          </div>
        )}

        <Button
          onClick={handleAnalyze}
          disabled={loading || (mode === 'url' ? !igUrl.trim() : mode === 'paste' ? !transcript.trim() : !audioFile)}
          style={{ marginTop: 14, width: '100%' }}
        >
          {loading
            ? (mode === 'url' ? 'Fetching & analysing…' : mode === 'audio' ? 'Transcribing & analysing…' : 'Analysing…')
            : 'Analyse Reel'}
        </Button>
      </Card>

      {/* Results */}
      {analysis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Verdict banner */}
          <div style={{
            background: verdictStyle.bg, border: `1px solid ${verdictStyle.border}`,
            borderRadius: 10, padding: '20px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: verdictStyle.text, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Verdict</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: verdictStyle.text }}>{verdict}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 40, fontWeight: 900, color: verdictStyle.text, lineHeight: 1 }}>{analysis.overall_score}</div>
              <div style={{ fontSize: 12, color: verdictStyle.text, opacity: 0.7 }}>out of 100</div>
            </div>
          </div>

          {/* Score row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Performance', score: analysis.performance_score },
              { label: 'Script Quality', score: analysis.script_quality_score },
            ].map(({ label, score }) => (
              <Card key={label} style={{ padding: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', fontWeight: 500, marginBottom: 8 }}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 6, background: 'var(--muted)', borderRadius: 3 }}>
                    <div style={{ height: '100%', borderRadius: 3, background: scoreColor(score), width: `${score}%`, transition: 'width 0.6s ease' }} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor(score), minWidth: 32 }}>{score}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Analysis cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            {[
              { label: 'Hook', content: analysis.hook_analysis },
              { label: 'Pacing', content: analysis.pacing_analysis },
              { label: 'CTA', content: analysis.cta_analysis },
            ].map(({ label, content }) => (
              <Card key={label} style={{ padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.6 }}>{content}</div>
              </Card>
            ))}
          </div>

          {/* Key lessons */}
          <Card style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 12 }}>Key Lessons</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {analysis.key_lessons.map((lesson, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13 }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                  <span style={{ color: 'var(--foreground)', lineHeight: 1.5 }}>{lesson}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Adaptation brief */}
          <Card style={{ padding: 20, borderLeft: '3px solid var(--accent)', borderRadius: '0 10px 10px 0' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Adaptation Brief</div>
            <div style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.7 }}>{analysis.adaptation_brief}</div>
          </Card>

          {/* Suggested hook */}
          <Card style={{ padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Suggested Hook for Your Audience</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.5, marginBottom: 16 }}>
              &ldquo;{analysis.suggested_hook}&rdquo;
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                size="sm"
                onClick={() => { navigator.clipboard.writeText(analysis.suggested_hook); toast.success('Hook copied') }}
              >
                <Copy size={13} style={{ marginRight: 5 }} /> Copy Hook
              </Button>
              <Button
                size="sm"
                onClick={() => saveHook(analysis.suggested_hook)}
                disabled={savingHook}
              >
                <Bookmark size={13} style={{ marginRight: 5 }} /> Save to Idea Bank
              </Button>
            </div>
          </Card>

          {/* Transcript (collapsible) */}
          {resultTranscript && (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                style={{
                  width: '100%', padding: '14px 20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', color: 'var(--foreground)',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600 }}>Transcript</span>
                {showTranscript ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
              {showTranscript && (
                <div style={{ padding: '16px 20px 20px', fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.7, borderTop: '1px solid var(--border)' }}>
                  {resultTranscript}
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Idea Bank */}
      {ideaBank.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 12 }}>
            Saved Hooks <span style={{ color: 'var(--muted-foreground)', fontWeight: 400 }}>({ideaBank.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ideaBank.map(entry => (
              <Card key={entry.id} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5 }}>{entry.hook}</div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => { navigator.clipboard.writeText(entry.hook); toast.success('Copied') }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 4 }}
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => deleteHook(entry.id)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 4 }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!analysis && !loading && ideaBank.length === 0 && (
        <EmptyState
          icon={<Copy size={18} />}
          title="No reels analysed yet"
          description="Paste a reel transcript or upload an audio file to get an AI breakdown."
        />
      )}
    </div>
  )
}
