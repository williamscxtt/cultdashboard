'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Copy, Bookmark, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { PageHeader, Card, Button, EmptyState } from '@/components/ui'
import { createClient } from '@/lib/supabase'

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

interface IdeaBankEntry {
  id: string
  hook: string
  source: string
  created_at: string
}

type Stage = 'idle' | 'downloading' | 'transcribing' | 'analysing' | 'done' | 'error'

const VERDICT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Exceptional: { bg: 'hsl(142 50% 95%)', text: 'hsl(142 71% 30%)', border: 'hsl(142 50% 80%)' },
  Strong:      { bg: 'hsl(220 90% 96%)', text: 'hsl(220 90% 40%)', border: 'hsl(220 70% 85%)' },
  Average:     { bg: 'hsl(38 90% 95%)',  text: 'hsl(38 80% 35%)',  border: 'hsl(38 90% 75%)' },
  Weak:        { bg: 'hsl(25 90% 95%)',  text: 'hsl(25 80% 40%)',  border: 'hsl(25 90% 80%)' },
  Poor:        { bg: 'hsl(0 50% 96%)',   text: 'hsl(0 72% 40%)',   border: 'hsl(0 70% 85%)' },
}

function scoreColor(score: number) {
  if (score >= 80) return 'hsl(142 71% 36%)'
  if (score >= 65) return 'var(--accent)'
  if (score >= 50) return 'hsl(38 92% 50%)'
  return 'hsl(0 72% 51%)'
}

const STAGES: { key: Stage; label: string }[] = [
  { key: 'downloading',  label: 'Downloading reel...' },
  { key: 'transcribing', label: 'Transcribing audio...' },
  { key: 'analysing',    label: 'Analysing with AI...' },
]

export default function ReelCopyPage() {
  const [url, setUrl] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [transcript, setTranscript] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [showTranscript, setShowTranscript] = useState(false)
  const [ideaBank, setIdeaBank] = useState<IdeaBankEntry[]>([])
  const [userId, setUserId] = useState('')
  const [savingHook, setSavingHook] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
        loadIdeaBank(data.user.id)
      }
    })
  }, [])

  const loadIdeaBank = useCallback(async (uid: string) => {
    const res = await fetch(`/api/idea-bank?profileId=${uid}`)
    const data = await res.json()
    if (data.hooks) setIdeaBank(data.hooks)
  }, [])

  async function handleAnalyze() {
    if (!url.trim()) return
    setAnalysis(null)
    setTranscript('')
    setErrorMsg('')

    // Simulate stage progression (actual stages happen server-side)
    setStage('downloading')
    const stageTimer = setTimeout(() => setStage('transcribing'), 8000)
    const stageTimer2 = setTimeout(() => setStage('analysing'), 20000)

    try {
      const res = await fetch('/api/reel-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), profileId: userId }),
      })

      clearTimeout(stageTimer)
      clearTimeout(stageTimer2)

      const data = await res.json()

      if (!res.ok) {
        setStage('error')
        setErrorMsg(data.error || 'Something went wrong')
        return
      }

      setTranscript(data.transcript || '')
      setAnalysis(data.analysis)
      setStage('done')
    } catch {
      clearTimeout(stageTimer)
      clearTimeout(stageTimer2)
      setStage('error')
      setErrorMsg('Network error — please try again')
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

  const isRunning = stage === 'downloading' || stage === 'transcribing' || stage === 'analysing'
  const verdict = analysis?.verdict ?? ''
  const verdictStyle = VERDICT_COLORS[verdict] ?? VERDICT_COLORS.Average

  return (
    <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
      <PageHeader
        title="Reel Copy Tool"
        description="Paste any reel URL — it gets downloaded, transcribed, and analysed automatically."
      />

      {/* URL input */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="url"
            placeholder="https://www.instagram.com/reel/..."
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !isRunning && handleAnalyze()}
            style={{ flex: 1 }}
            disabled={isRunning}
          />
          <Button onClick={handleAnalyze} disabled={isRunning || !url.trim()}>
            {isRunning ? 'Analyzing...' : 'Analyze'}
          </Button>
        </div>

        {/* Progress indicator */}
        {isRunning && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {STAGES.map(({ key, label }) => {
              const stageIndex = STAGES.findIndex(s => s.key === stage)
              const thisIndex = STAGES.findIndex(s => s.key === key)
              const isActive = key === stage
              const isDone = thisIndex < stageIndex
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isDone ? 'var(--accent)' : isActive ? 'var(--foreground)' : 'var(--muted)',
                    transition: 'background 0.3s',
                  }}>
                    {isDone ? (
                      <span style={{ color: 'white', fontSize: 11 }}>✓</span>
                    ) : isActive ? (
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: 'var(--background)',
                        animation: 'pulse 1s infinite',
                        display: 'block',
                      }} />
                    ) : null}
                  </div>
                  <span style={{
                    fontSize: 13,
                    color: isActive ? 'var(--foreground)' : isDone ? 'var(--muted-foreground)' : 'var(--border)',
                    fontWeight: isActive ? 600 : 400,
                  }}>
                    {label}
                  </span>
                </div>
              )
            })}
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
          </div>
        )}

        {/* Error */}
        {stage === 'error' && (
          <div style={{
            marginTop: 14,
            background: 'hsl(0 50% 96%)', border: '1px solid hsl(0 70% 85%)',
            borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'hsl(0 72% 45%)',
          }}>
            {errorMsg}
          </div>
        )}
      </Card>

      {/* Results */}
      {analysis && stage === 'done' && (
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
          {transcript && (
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
                <div style={{ padding: '0 20px 20px', fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.7, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  {transcript}
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
            Idea Bank <span style={{ color: 'var(--muted-foreground)', fontWeight: 400 }}>({ideaBank.length} saved hooks)</span>
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

      {/* Empty state when idle */}
      {stage === 'idle' && ideaBank.length === 0 && (
        <EmptyState
          icon={<Copy size={18} />}
          title="No reels analysed yet"
          description="Paste any Instagram, TikTok, or YouTube Shorts URL above and hit Analyze."
        />
      )}
    </div>
  )
}
