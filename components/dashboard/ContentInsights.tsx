'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, RefreshCw, TrendingUp, MessageCircle, Zap, AlertTriangle, Target, Lightbulb } from 'lucide-react'
import { Card, Button, GeneratingState } from '@/components/ui'
import { TaskProgress } from '@/components/ui/task-progress'
import { useIsMobile } from '@/lib/use-mobile'
import { toast } from 'sonner'

interface Insight {
  comment_overview: string | null
  whats_working: Array<{ title: string; stat: string; detail: string }>
  growth_actions: string[]
  content_gaps: string[]
  best_hook_patterns: Array<{ pattern: string; example: string; note: string }>
  avoid: string[]
  phase_focus: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(diff / 86_400_000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  return `${d}d ago`
}

export default function ContentInsights({ profileId }: { profileId: string }) {
  const [insights, setInsights] = useState<Insight | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const isMobile = useIsMobile()

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/content/insights?profileId=${profileId}`)
      const data = await res.json()
      if (data.insights) {
        setInsights(data.insights as Insight)
        setUpdatedAt(data.updated_at)
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [profileId])

  useEffect(() => { load() }, [load])

  async function generate() {
    setGenerating(true)
    toast.info('Analysing your content — this takes about 20 seconds…')
    try {
      const res = await fetch('/api/content/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setInsights(data.insights as Insight)
      setUpdatedAt(data.updated_at)
      toast.success('Insights updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate insights')
    } finally {
      setGenerating(false)
    }
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
        {[180, 140, 120].map((h, i) => (
          <div key={i} style={{
            height: h, borderRadius: 10, background: 'var(--muted)',
            backgroundImage: 'linear-gradient(90deg, var(--muted) 25%, hsl(0 5% 16%) 50%, var(--muted) 75%)',
            backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite linear',
          }} />
        ))}
      </div>
    )
  }

  if (!insights && !generating) {
    return (
      <Card style={{ padding: isMobile ? '20px 16px' : '28px 28px', marginBottom: 32, textAlign: 'center' }}>
        <Sparkles size={28} style={{ color: 'var(--accent)', margin: '0 auto 14px', display: 'block' }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginBottom: 8 }}>
          AI Content Coach
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 24, maxWidth: 380, margin: '0 auto 24px' }}>
          Analyse all your reels, audience comments, and goals to get specific, actionable growth strategies — personalised to you.
        </div>
        <Button onClick={generate} variant="primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={13} /> Generate My Insights
        </Button>
      </Card>
    )
  }

  // ── Generating state ─────────────────────────────────────────────────────
  if (generating) {
    return (
      <div style={{ marginBottom: 32 }}>
        <TaskProgress active estimatedMs={25000} label="Analysing your content…" sublabel="Reading your reels, comments, goals, and past scripts" />
        <Card style={{ marginTop: 12 }}>
          <GeneratingState label="Building your content intelligence report…" sub="This takes about 20 seconds. Claude is reading all your data." />
        </Card>
      </div>
    )
  }

  if (!insights) return null

  // ── Insights UI ──────────────────────────────────────────────────────────
  const p = isMobile ? '16px' : '20px 24px'
  const gap = isMobile ? 12 : 16

  return (
    <div style={{ marginBottom: 32 }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={14} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>AI Content Coach</span>
          {updatedAt && (
            <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>· updated {timeAgo(updatedAt)}</span>
          )}
        </div>
        <button
          onClick={generate}
          disabled={generating}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)',
            background: 'var(--muted)', color: 'var(--muted-foreground)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <RefreshCw size={11} style={generating ? { animation: 'spin 1s linear infinite' } : {}} />
          Refresh
        </button>
      </div>

      {/* Comment overview */}
      {insights.comment_overview && (
        <Card style={{ padding: p, marginBottom: gap, borderLeft: '3px solid var(--accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            <MessageCircle size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              What Your Audience Is Saying
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.65, margin: 0 }}>
            {insights.comment_overview}
          </p>
        </Card>
      )}

      {/* Phase focus / coaching */}
      {insights.phase_focus && (
        <Card style={{ padding: p, marginBottom: gap, background: 'hsl(var(--accent-hsl, 220 90% 56%) / 0.06)', border: '1px solid var(--accent-subtle-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            <Target size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Your Focus Right Now
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.65, margin: 0 }}>
            {insights.phase_focus}
          </p>
        </Card>
      )}

      {/* What's working + Growth actions grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: gap,
        marginBottom: gap,
      }}>

        {/* What's working */}
        {insights.whats_working?.length > 0 && (
          <Card style={{ padding: p, minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
              <TrendingUp size={13} style={{ color: 'hsl(142 71% 45%)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'hsl(142 71% 45%)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                What's Working
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {insights.whats_working.map((item, i) => (
                <div key={i}>
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>{item.title}</span>
                    <span style={{
                      display: 'inline-block', marginLeft: 8,
                      fontSize: 11, fontWeight: 700, color: 'hsl(142 71% 45%)',
                      background: 'rgba(34,197,94,0.1)', padding: '2px 7px', borderRadius: 20,
                      wordBreak: 'break-word', overflowWrap: 'break-word',
                    }}>{item.stat}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.6, margin: 0, wordBreak: 'break-word' }}>{item.detail}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Growth actions */}
        {insights.growth_actions?.length > 0 && (
          <Card style={{ padding: p, minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
              <Zap size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Your Next Moves
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {insights.growth_actions.map((action, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 6, background: 'var(--accent-subtle)',
                    border: '1px solid var(--accent-subtle-border)', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800, color: 'var(--accent)',
                  }}>{i + 1}</div>
                  <p style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.6, margin: 0, minWidth: 0, wordBreak: 'break-word' }}>{action}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Hook patterns + Content gaps + Avoid row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: gap, marginBottom: gap }}>

        {/* Best hook patterns */}
        {insights.best_hook_patterns?.length > 0 && (
          <Card style={{ padding: p, minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
              <Lightbulb size={13} style={{ color: 'hsl(43 96% 56%)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'hsl(43 96% 56%)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Hook Patterns That Work
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {insights.best_hook_patterns.map((h, i) => (
                <div key={i}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', marginBottom: 3, wordBreak: 'break-word' }}>{h.pattern}</div>
                  <div style={{
                    fontSize: 11, color: 'var(--muted-foreground)', fontStyle: 'italic',
                    background: 'var(--muted)', borderRadius: 6, padding: '5px 10px', marginBottom: 4,
                    wordBreak: 'break-word', overflowWrap: 'break-word',
                  }}>
                    &ldquo;{h.example}&rdquo;
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.5, margin: 0, wordBreak: 'break-word' }}>{h.note}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: gap, minWidth: 0 }}>
          {/* Content gaps */}
          {insights.content_gaps?.length > 0 && (
            <Card style={{ padding: p, minWidth: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                <Sparkles size={13} style={{ color: 'hsl(270 60% 65%)', flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'hsl(270 60% 65%)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Untapped Opportunities
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {insights.content_gaps.map((gap, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, minWidth: 0 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'hsl(270 60% 65%)', flexShrink: 0, marginTop: 6 }} />
                    <p style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.6, margin: 0, minWidth: 0, wordBreak: 'break-word' }}>{gap}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Avoid */}
          {insights.avoid?.length > 0 && (
            <Card style={{ padding: p, minWidth: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                <AlertTriangle size={13} style={{ color: 'hsl(0 84% 60%)', flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'hsl(0 84% 60%)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Stop Doing This
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {insights.avoid.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, minWidth: 0 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'hsl(0 84% 60%)', flexShrink: 0, marginTop: 6 }} />
                    <p style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.6, margin: 0, minWidth: 0, wordBreak: 'break-word' }}>{item}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
