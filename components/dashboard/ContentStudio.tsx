'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  RefreshCw, Eye, Heart, MessageCircle,
  Info, Zap,
} from 'lucide-react'
import { Card, Button, SectionLabel, PageHeader, Spinner } from '@/components/ui'
import CompetitorManager from '@/components/dashboard/CompetitorManager'
import type { ClientReel } from '@/lib/types'
import Link from 'next/link'

interface Props {
  profileId: string
  recentReels: ClientReel[]
}

function fmtK(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return String(n)
}

function OwnReelCard({ reel }: { reel: ClientReel }) {
  return (
    <div style={{
      background: 'var(--muted)',
      borderRadius: 10,
      padding: '14px 16px',
      minWidth: 220,
      maxWidth: 260,
      flexShrink: 0,
      border: '1px solid var(--border)',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: 'var(--accent)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 8,
      }}>
        {reel.format_type ?? 'Unknown'}
      </div>
      <p style={{
        fontSize: 13, fontWeight: 600, color: 'var(--foreground)',
        lineHeight: 1.45, margin: '0 0 10px',
        overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
      }}>
        {reel.hook || reel.caption?.slice(0, 120) || '(no hook)'}
      </p>
      <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--muted-foreground)' }}>
          <Eye size={11} /> {fmtK(reel.views ?? 0)}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--muted-foreground)' }}>
          <Heart size={11} /> {fmtK(reel.likes ?? 0)}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--muted-foreground)' }}>
          <MessageCircle size={11} /> {reel.comments ?? 0}
        </span>
      </div>
      {reel.date && (
        <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 6 }}>
          {new Date(reel.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      )}
    </div>
  )
}

export default function ContentStudio({ recentReels }: Props) {
  const [scraping, setScraping] = useState(false)
  const [scrapeMsg, setScrapeMsg] = useState<string | null>(null)
  const [scrapeOk, setScrapeOk] = useState(false)

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const last7 = recentReels.filter(r => r.date && new Date(r.date) >= sevenDaysAgo)

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
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 0 60px' }}>
      <PageHeader
        title="Content Studio"
        description="Manage your competitor accounts and review your recent content. Generate scripts on the This Week page."
      />

      {/* ── Your Last 7 Days ──────────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <SectionLabel>Your Last 7 Days</SectionLabel>
          {last7.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
              {last7.length} reel{last7.length !== 1 ? 's' : ''} · {fmtK(last7.reduce((s, r) => s + (r.views ?? 0), 0))} views total
            </span>
          )}
        </div>

        {last7.length === 0 ? (
          <Card style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted-foreground)', fontSize: 13 }}>
              <Info size={15} />
              No reels found in the last 7 days. Data syncs every Monday — check back after Will&apos;s weekly run.
            </div>
          </Card>
        ) : (
          <div style={{
            display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4,
            scrollbarWidth: 'thin',
          }}>
            {last7.map(reel => (
              <OwnReelCard key={reel.id} reel={reel} />
            ))}
          </div>
        )}
      </section>

      {/* ── Competitors ───────────────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <SectionLabel>My Competitors</SectionLabel>
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

        {scrapeMsg && (
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

      {/* ── Generate CTA ──────────────────────────────────────────────── */}
      <section>
        <Card style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', marginBottom: 4 }}>
              Ready to generate this week&apos;s scripts?
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
              Uses your onboarding data, brand voice, content history, and competitor intelligence.
            </div>
          </div>
          <Link href="/dashboard/scripts" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <Button variant="primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={13} /> This Week →
            </Button>
          </Link>
        </Card>
      </section>
    </div>
  )
}
