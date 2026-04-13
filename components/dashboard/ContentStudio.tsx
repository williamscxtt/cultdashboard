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
      const json = await res.json()
      if (!res.ok) {
        if (res.status === 503) {
          setScrapeMsg('Apify not configured — add APIFY_API_TOKEN to Vercel env vars.')
        } else if (json.error === 'no_competitors') {
          setScrapeMsg('Add competitor accounts below before scraping.')
        } else {
          setScrapeMsg(json.message || json.error || 'Scrape failed.')
        }
      } else {
        setScrapeMsg(`Scraped ${json.accounts_scraped} accounts — ${json.added} new reels added.`)
        setScrapeOk(true)
        toast.success(`Scraped ${json.accounts_scraped} accounts — ${json.added} new reels added`)
      }
    } catch {
      setScrapeMsg('Network error — scrape failed.')
      toast.error('Scrape failed')
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
