'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'
import { Button, SectionLabel, PageHeader, Spinner } from '@/components/ui'
import CompetitorManager from '@/components/dashboard/CompetitorManager'
import WeeklyPackage from '@/components/dashboard/WeeklyPackage'
import ContentInsights from '@/components/dashboard/ContentInsights'
import { useIsMobile } from '@/lib/use-mobile'

interface Props {
  profileId: string
}

type StepStatus = 'pending' | 'running' | 'done' | 'error'

interface Step {
  id: string
  label: string
  sublabel: string
  status: StepStatus
  detail?: string
}

export default function ContentStudio({ profileId }: Props) {
  const [analysing, setAnalysing] = useState(false)
  const [steps, setSteps] = useState<Step[]>([])
  const [elapsedSec, setElapsedSec] = useState(0)
  const startRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (analysing) {
      startRef.current = Date.now()
      timerRef.current = setInterval(() => {
        setElapsedSec(Math.floor((Date.now() - (startRef.current ?? Date.now())) / 1000))
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [analysing])

  function setStepStatus(id: string, status: StepStatus, detail?: string) {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status, ...(detail !== undefined ? { detail } : {}) } : s))
  }

  async function handleAnalyse() {
    setAnalysing(true)
    setElapsedSec(0)
    setSteps([
      { id: 'scrape',     label: 'Pulling competitor reels',  sublabel: 'Apify scrapes the last 7 days for each account',  status: 'running' },
      { id: 'transcribe', label: 'Transcribing videos',       sublabel: 'OpenAI Whisper converts audio to text',           status: 'pending' },
      { id: 'insights',   label: 'Refreshing insights',       sublabel: 'Claude analyses each account\'s content patterns', status: 'pending' },
    ])

    try {
      // ── Step 1: Scrape ─────────────────────────────────────────────
      const scrapeRes = await fetch('/api/competitors/scrape', { method: 'POST' })
      const scrapeText = await scrapeRes.text()
      let scrapeJson: Record<string, unknown> = {}
      try { scrapeJson = JSON.parse(scrapeText) } catch { /* non-JSON 500 */ }

      if (!scrapeRes.ok) {
        const msg = scrapeRes.status === 503 ? 'Apify not configured — add APIFY_API_TOKEN to Vercel env vars'
          : scrapeJson.error === 'no_competitors' ? 'No competitor accounts tracked yet'
          : ((scrapeJson.message || scrapeJson.error) as string | undefined) ?? `Failed (${scrapeRes.status})`
        setStepStatus('scrape', 'error', msg)
        toast.error(msg)
        setAnalysing(false)
        return
      }

      const reelsAdded = (scrapeJson.added as number) ?? 0
      setStepStatus('scrape', 'done', `${scrapeJson.accounts_scraped} accounts · ${reelsAdded} reel${reelsAdded !== 1 ? 's' : ''} added`)

      // ── Step 2: Transcribe (loop batches of 30 until done) ─────────
      setStepStatus('transcribe', 'running', 'Starting…')
      let totalTranscribed = 0
      for (let batch = 0; batch < 10; batch++) {
        const res = await fetch('/api/competitors/transcribe', { method: 'POST' })
        if (!res.ok) break
        const json = await res.json() as { transcribed?: number; skipped?: number; total?: number }
        totalTranscribed += json.transcribed ?? 0
        setStepStatus('transcribe', 'running', `${totalTranscribed} transcribed…`)
        if ((json.total ?? 0) < 30) break
      }
      setStepStatus('transcribe', 'done', `${totalTranscribed} reel${totalTranscribed !== 1 ? 's' : ''} transcribed`)

      // ── Step 3: Refresh insights (fire-and-forget) ─────────────────
      setStepStatus('insights', 'running', 'Queuing…')
      fetch('/api/competitors/insight/refresh-all', { method: 'POST' }).catch(() => {})
      await new Promise(r => setTimeout(r, 1500))
      setStepStatus('insights', 'done', 'Running in background')

      toast.success('Analysis complete — scripts are ready to generate')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error'
      toast.error(`Analysis failed: ${msg}`)
    } finally {
      setAnalysing(false)
    }
  }

  const fmt = (s: number) => s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: isMobile ? '12px 12px 60px' : '0 0 60px' }}>
      <PageHeader
        title="Content Studio"
        description="AI-powered insights from your reels, plus competitor intelligence and weekly scripts."
      />

      {/* ── AI Content Insights ──────────────────────────────────────── */}
      <ContentInsights profileId={profileId} />

      {/* ── Competitors ──────────────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <SectionLabel style={{ marginBottom: 0 }}>My Competitors</SectionLabel>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleAnalyse}
            disabled={analysing}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {analysing
              ? <><Spinner size={12} /> Analysing…</>
              : <><RefreshCw size={12} /> Analyse</>}
          </Button>
        </div>

        {/* ── Multi-step progress panel ─────────────────────────────── */}
        {steps.length > 0 && (
          <div style={{
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 14,
            background: 'rgba(255,255,255,0.02)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>
                {analysing ? 'Analysing competitors…' : 'Analysis complete'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>
                {analysing ? fmt(elapsedSec) : `Done in ${fmt(elapsedSec)}`}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {steps.map(step => (
                <div key={step.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flexShrink: 0, marginTop: 1 }}>
                    <StepIcon status={step.status} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 12,
                      fontWeight: step.status === 'running' ? 600 : 500,
                      color: step.status === 'pending' ? 'var(--muted-foreground)'
                        : step.status === 'error' ? 'rgba(239,68,68,0.9)'
                        : 'var(--foreground)',
                    }}>
                      {step.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>
                      {step.detail ?? step.sublabel}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {analysing && (
              <div style={{
                marginTop: 14, paddingTop: 12,
                borderTop: '1px solid var(--border)',
                fontSize: 11, color: 'var(--muted-foreground)',
              }}>
                This takes around 10 minutes. Keep this tab open.
              </div>
            )}
          </div>
        )}

        <CompetitorManager />
      </section>

      {/* ── Weekly Package ────────────────────────────────────────────── */}
      <section>
        <div style={{ marginBottom: 14 }}>
          <SectionLabel>This Week&apos;s Scripts</SectionLabel>
        </div>
        <WeeklyPackage profileId={profileId} embedded />
      </section>
    </div>
  )
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'done') {
    return (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="rgba(74,222,128,0.12)" stroke="rgba(74,222,128,0.6)" strokeWidth="1.5" />
        <path d="M8 12l3 3 5-5" stroke="rgba(74,222,128,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (status === 'running') {
    return (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
        style={{ animation: 'spin 0.7s linear infinite' }}>
        <circle cx="12" cy="12" r="10" stroke="var(--accent)" strokeWidth="2" strokeOpacity="0.2" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </svg>
    )
  }
  if (status === 'error') {
    return (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="rgba(239,68,68,0.5)" strokeWidth="1.5" />
        <path d="M12 8v4m0 4h.01" stroke="rgba(239,68,68,0.8)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  // pending
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="var(--border)" strokeWidth="1.5" />
    </svg>
  )
}
