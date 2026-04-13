'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'
import { Button, SectionLabel, PageHeader, Spinner } from '@/components/ui'
import { TaskProgress } from '@/components/ui/task-progress'
import CompetitorManager from '@/components/dashboard/CompetitorManager'
import WeeklyPackage from '@/components/dashboard/WeeklyPackage'
import ContentInsights from '@/components/dashboard/ContentInsights'
import { useIsMobile } from '@/lib/use-mobile'

interface Props {
  profileId: string
}

export default function ContentStudio({ profileId }: Props) {
  const [scraping, setScraping] = useState(false)
  const [scrapeMsg, setScrapeMsg] = useState<string | null>(null)
  const [scrapeOk, setScrapeOk] = useState(false)
  const isMobile = useIsMobile()

  async function handleScrape() {
    setScraping(true)
    setScrapeMsg(null)
    setScrapeOk(false)
    try {
      const res = await fetch('/api/competitors/scrape', { method: 'POST' })
      // Guard against HTML error pages (500s) which would throw on .json()
      const text = await res.text()
      let json: Record<string, unknown> = {}
      try { json = JSON.parse(text) } catch { /* non-JSON — likely 500 HTML */ }

      if (!res.ok) {
        if (res.status === 503) {
          setScrapeMsg('Apify not configured — add APIFY_API_TOKEN to Vercel env vars.')
        } else if (json.error === 'no_competitors') {
          setScrapeMsg('Add competitor accounts below before scraping.')
        } else {
          const msg = (json.message || json.error) as string | undefined
          setScrapeMsg(msg || `Scrape failed (status ${res.status}).`)
          toast.error(msg || `Scrape failed (${res.status})`)
        }
      } else {
        const added   = (json.added   as number) ?? 0
        const updated = (json.updated as number) ?? 0
        const parts = [`${json.accounts_scraped} accounts scraped`]
        if (added > 0)   parts.push(`${added} new reel${added !== 1 ? 's' : ''} added`)
        if (updated > 0) parts.push(`${updated} existing updated`)
        if (added === 0 && updated === 0) parts.push('no new reels found')
        const msg = parts.join(' · ')
        setScrapeMsg(msg)
        setScrapeOk(true)
        toast.success(msg)

        // Fire-and-forget background jobs after scrape completes
        fetch('/api/competitors/insight/refresh-all', { method: 'POST' }).catch(() => {})
        fetch('/api/competitors/transcribe', { method: 'POST' }).catch(() => {})
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error'
      setScrapeMsg(`Scrape failed: ${msg}`)
      toast.error(`Scrape failed: ${msg}`)
    } finally {
      setScraping(false)
    }
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: isMobile ? '12px 12px 60px' : '0 0 60px' }}>
      <PageHeader
        title="Content Studio"
        description="AI-powered insights from your reels, plus competitor intelligence and weekly scripts."
      />

      {/* ── AI Content Insights ───────────────────────────────────────── */}
      <ContentInsights profileId={profileId} />

      {/* ── Competitors ───────────────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <SectionLabel style={{ marginBottom: 0 }}>My Competitors</SectionLabel>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleScrape}
            disabled={scraping}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {scraping
              ? <><Spinner size={12} /> Scraping...</>
              : <><RefreshCw size={12} /> Scrape Now</>
            }
          </Button>
        </div>

        <TaskProgress
          active={scraping}
          estimatedMs={90000}
          label="Scraping competitor accounts…"
          sublabel="Apify is pulling the latest reels"
        />

        {scrapeMsg && !scraping && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13,
            background: scrapeOk ? 'rgba(74, 222, 128, 0.08)' : 'rgba(255,255,255,0.04)',
            color: scrapeOk ? 'rgba(74, 222, 128, 0.9)' : 'var(--muted-foreground)',
            border: `1px solid ${scrapeOk ? 'rgba(74, 222, 128, 0.2)' : 'var(--border)'}`,
          }}>
            {scrapeMsg}
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
