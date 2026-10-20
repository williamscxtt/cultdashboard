'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'
import { Button, PageHeader, Spinner } from '@/components/ui'
import CompetitorManager from '@/components/dashboard/CompetitorManager'
import WeeklyPackage from '@/components/dashboard/WeeklyPackage'
import { useIsMobile } from '@/lib/use-mobile'
import { dashboardRequest } from '@/lib/dashboard-request'

interface Props {
  profileId: string
}

type Phase = 'idle' | 'scraping' | 'transcribing' | 'generating' | 'done' | 'error'

const PHASE_LABELS: Record<Phase, string> = {
  idle: '',
  scraping: 'Pulling competitor reels…',
  transcribing: 'Transcribing videos…',
  generating: 'Writing your scripts…',
  done: 'Done!',
  error: 'Something went wrong',
}

export default function ContentStudio({ profileId }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [phaseDetail, setPhaseDetail] = useState('')
  const [elapsedSec, setElapsedSec] = useState(0)
  const [packageKey, setPackageKey] = useState(0)
  const startRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isMobile = useIsMobile()

  const running = phase !== 'idle' && phase !== 'done' && phase !== 'error'

  useEffect(() => {
    if (running) {
      startRef.current = Date.now()
      timerRef.current = setInterval(() => {
        setElapsedSec(Math.floor((Date.now() - (startRef.current ?? Date.now())) / 1000))
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [running])

  const fmt = (s: number) => s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`

  async function handleGenerate() {
    setPhase('scraping')
    setPhaseDetail('Fetching the last 7 days of competitor Reels…')
    setElapsedSec(0)

    try {
      // ── Step 1: Scrape ────────────────────────────────────────────────────
      const scrapeJson = await dashboardRequest<{ added?: number; accounts_scraped?: number; warning?: string }>(
        '/api/competitors/scrape', { method: 'POST' }, 295_000)
      if (scrapeJson.warning) toast.warning(scrapeJson.warning)

      const reelsAdded = (scrapeJson.added as number) ?? 0
      setPhaseDetail(
        `${scrapeJson.accounts_scraped} accounts · ${reelsAdded} reel${reelsAdded !== 1 ? 's' : ''} scraped`
      )

      // ── Step 2: Transcribe ────────────────────────────────────────────────
      setPhase('transcribing')
      setPhaseDetail('Starting transcription…')
      let totalTranscribed = 0
      for (let batch = 0; batch < 10; batch++) {
        const json = await dashboardRequest<{ transcribed?: number; total?: number; skipped?: number }>(
          '/api/competitors/transcribe', { method: 'POST' }, 295_000)
        totalTranscribed += json.transcribed ?? 0
        setPhaseDetail(`${totalTranscribed} reels transcribed…`)
        if (!json.transcribed && json.skipped) throw new Error('The videos could not be transcribed right now. Please try again later.')
        if ((json.total ?? 0) < 30 || !json.transcribed) break
      }

      // ── Step 3: Generate ──────────────────────────────────────────────────
      setPhase('generating')
      setPhaseDetail('Writing your scripts from the saved competitor content…')

      const genJson = await dashboardRequest<{ script_count?: number }>('/api/weekly-package/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      }, 295_000)

      const scriptCount = genJson.script_count ?? 7
      setPhase('done')
      setPhaseDetail(`${scriptCount} scripts ready · ${totalTranscribed} reels transcribed`)
      setPackageKey(k => k + 1)
      toast.success("This week's content is ready!")
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error'
      toast.error(`Failed: ${msg}`)
      setPhase('error')
      setPhaseDetail(msg)
    }
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: isMobile ? '12px 12px 60px' : '0 0 60px' }}>
      <PageHeader
        title="Content Studio"
        description="Add your competitor accounts below, then generate this week's intel and scripts in one click."
      />

      {/* Competitor manager */}
      <div style={{ marginBottom: 24 }}>
        <CompetitorManager />
      </div>

      {/* ── Generate CTA ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        padding: '24px 20px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        marginBottom: 32,
      }}>
        <Button
          size="lg"
          variant="primary"
          onClick={handleGenerate}
          disabled={running}
          style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 264, justifyContent: 'center' }}
        >
          {running
            ? <><Spinner size={14} /> {PHASE_LABELS[phase]}</>
            : <><Sparkles size={14} /> Generate This Week&apos;s Content</>
          }
        </Button>

        {/* Status text */}
        {(running || phase === 'done' || phase === 'error') ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{
              fontSize: 12,
              color: phase === 'error'
                ? 'rgba(239,68,68,0.9)'
                : phase === 'done'
                ? 'hsl(142 71% 45%)'
                : 'var(--foreground)',
              fontWeight: (phase === 'done' || phase === 'error') ? 600 : 400,
            }}>
              {phaseDetail}
            </div>
            {running && (
              <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(elapsedSec)} elapsed · Keep this tab open
              </div>
            )}
            {phase === 'done' && (
              <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                Finished in {fmt(elapsedSec)}
              </div>
            )}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0, textAlign: 'center', maxWidth: 420 }}>
            Scrapes competitors · transcribes videos · generates 7 personalised scripts — all in one go.
            Takes ~10–15 minutes.
          </p>
        )}
      </div>

      {/* ── Weekly Package output ─────────────────────────────────────────── */}
      <WeeklyPackage profileId={profileId} embedded key={packageKey} />

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
