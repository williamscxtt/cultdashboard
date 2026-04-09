'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Sparkles, RefreshCw, Eye, Heart, MessageCircle,
  ChevronDown, ChevronUp, Play, ExternalLink, Lightbulb,
  TrendingUp, Target, Zap, AlertTriangle, CheckCircle,
  Copy, Info,
} from 'lucide-react'
import { Card, Button, SectionLabel, PageHeader, Spinner, Badge } from '@/components/ui'
import CompetitorManager from '@/components/dashboard/CompetitorManager'
import type { ClientReel } from '@/lib/types'

// ─── types ────────────────────────────────────────────────────────────────────

interface BigHit {
  account: string
  hook: string
  views: number
  why_it_worked: string
  premise: string
  niche_adaptation: string
  replication_angle: string
}

interface Script {
  day: string
  format: string
  hook: string
  script: string
  caption: string
  cta: string
}

interface IntelReport {
  headline: string
  own_performance: string
  top_format: string
  format_insight: string
  top_hooks: string[]
  what_is_working: string[]
  big_hits: BigHit[]
  content_gaps: string[]
  weekly_verdict: string
  scripts: Script[]
}

interface Props {
  profileId: string
  recentReels: ClientReel[]
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtK(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return String(n)
}

function formatTag(fmt: string | null): string {
  return fmt ?? 'Unknown'
}

// ─── Reel Card (own content) ──────────────────────────────────────────────────

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
        {formatTag(reel.format_type)}
      </div>
      <p style={{
        fontSize: 13, fontWeight: 600, color: 'var(--foreground)',
        lineHeight: 1.45, marginBottom: 10,
        overflow: 'hidden', display: '-webkit-box',
        WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
        margin: '0 0 10px',
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

// ─── Big Hit Card ─────────────────────────────────────────────────────────────

function BigHitCard({ hit, index }: { hit: BigHit; index: number }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        background: 'var(--muted)',
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 999, flexShrink: 0,
          background: 'var(--accent)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'white',
        }}>
          {index + 1}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.04em', marginBottom: 4 }}>
            {hit.account} · {fmtK(hit.views)} views
          </div>
          <p style={{
            fontSize: 14, fontWeight: 700, color: 'var(--foreground)',
            lineHeight: 1.4, margin: 0,
          }}>
            &ldquo;{hit.hook}&rdquo;
          </p>
        </div>
      </div>

      {/* Why it worked */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
          Why it worked
        </div>
        <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.6, margin: 0 }}>
          {hit.why_it_worked}
        </p>
      </div>

      {/* Expand/collapse detailed analysis */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', background: 'transparent', border: 'none',
          cursor: 'pointer', color: 'var(--accent)', fontSize: 13, fontWeight: 600,
          fontFamily: 'inherit',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Target size={13} />
          How to replicate this for your niche
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          {/* Premise */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Play size={10} /> The Premise
            </div>
            <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.6, margin: 0 }}>
              {hit.premise}
            </p>
          </div>

          {/* Niche adaptation */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Lightbulb size={10} /> Adapt it to your niche
            </div>
            <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.6, margin: 0 }}>
              {hit.niche_adaptation}
            </p>
          </div>

          {/* Replication angle */}
          <div style={{
            background: 'rgba(var(--accent-rgb, 124,58,237), 0.06)',
            border: '1px solid rgba(var(--accent-rgb, 124,58,237), 0.15)',
            borderRadius: 8, padding: '10px 14px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Zap size={10} /> Use this hook today
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
              &ldquo;{hit.replication_angle}&rdquo;
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Script Card ──────────────────────────────────────────────────────────────

function ScriptCard({ script, index }: { script: Script; index: number }) {
  const [expanded, setExpanded] = useState(index === 0)
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const text = `🎙️ HOOK:\n${script.hook}\n\n📝 SCRIPT:\n${script.script}\n\n📱 CAPTION:\n${script.caption}\n\n💬 CTA: ${script.cta}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Script copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
      background: 'var(--card)',
    }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', background: expanded ? 'var(--muted)' : 'transparent',
          border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: expanded ? 'var(--accent)' : 'var(--muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: expanded ? 'white' : 'var(--foreground)',
          transition: 'background 0.15s, color 0.15s',
        }}>
          {script.day.slice(0, 3).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>
              {script.day}
            </span>
            <Badge variant="default" style={{ fontSize: 10 }}>
              {script.format}
            </Badge>
          </div>
          <p style={{
            fontSize: 13, color: 'var(--muted-foreground)', margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            &ldquo;{script.hook}&rdquo;
          </p>
        </div>
        {expanded ? <ChevronUp size={14} color="var(--muted-foreground)" /> : <ChevronDown size={14} color="var(--muted-foreground)" />}
      </button>

      {expanded && (
        <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
          {/* Hook */}
          <div style={{
            background: 'var(--muted)', borderRadius: 8, padding: '10px 14px', marginBottom: 14,
            borderLeft: '3px solid var(--accent)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
              Hook (first 3 seconds)
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.4, margin: 0 }}>
              &ldquo;{script.hook}&rdquo;
            </p>
          </div>

          {/* Script body */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Full Script
            </div>
            <pre style={{
              fontSize: 13, color: 'var(--foreground)', lineHeight: 1.7,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
              fontFamily: 'inherit',
            }}>
              {script.script}
            </pre>
          </div>

          {/* Caption */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Instagram Caption
            </div>
            <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.6, margin: 0 }}>
              {script.caption}
            </p>
          </div>

          {/* CTA + copy button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{
              background: 'var(--muted)', borderRadius: 6, padding: '6px 12px',
              fontSize: 12, fontWeight: 600, color: 'var(--foreground)',
            }}>
              📣 {script.cta}
            </div>
            <button
              onClick={handleCopy}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 7, padding: '6px 12px', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)',
                fontFamily: 'inherit', transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'var(--muted)'
                el.style.color = 'var(--foreground)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'transparent'
                el.style.color = 'var(--muted-foreground)'
              }}
            >
              {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy script'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ContentStudio({ profileId, recentReels }: Props) {
  const [generating, setGenerating] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [report, setReport] = useState<IntelReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scrapeMsg, setScrapeMsg] = useState<string | null>(null)

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const last7 = recentReels.filter(r => r.date && new Date(r.date) >= sevenDaysAgo)

  async function handleScrape() {
    setScraping(true)
    setScrapeMsg(null)
    try {
      const res = await fetch('/api/competitors/scrape', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        if (res.status === 503) {
          setScrapeMsg('⚠️ Apify not configured yet — ask Will to add APIFY_API_TOKEN to Vercel env vars.')
        } else if (json.error === 'no_competitors') {
          setScrapeMsg('Add some competitor accounts below before scraping.')
        } else {
          setScrapeMsg(`Scrape error: ${json.message || json.error}`)
        }
      } else {
        setScrapeMsg(`✅ Done! ${json.added ?? 0} new reels added from ${json.accounts_scraped ?? 0} accounts.`)
        toast.success(`Scraped ${json.accounts_scraped} accounts — ${json.added} new reels added`)
      }
    } catch {
      setScrapeMsg('Network error — scrape failed.')
      toast.error('Scrape failed')
    } finally {
      setScraping(false)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/competitor-intel', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        if (json.error === 'no_competitors') {
          setError('Add at least one competitor account below, then scrape their content first.')
        } else if (json.error === 'no_data') {
          setError('No competitor reel data yet — click "Scrape Now" to pull their latest content.')
        } else {
          setError(json.error || 'Failed to generate brief.')
        }
        return
      }
      setReport(json.report)
    } catch {
      setError('Network error — please try again.')
      toast.error('Failed to generate brief')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 0 60px' }}>
      <PageHeader
        title="Content Studio"
        description="Competitor intelligence + your weekly brief + 7 ready-to-shoot scripts"
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
            padding: '10px 14px', borderRadius: 8, marginBottom: 12,
            background: scrapeMsg.startsWith('✅') ? 'hsl(142 60% 95%)' : 'hsl(48 96% 95%)',
            color: scrapeMsg.startsWith('✅') ? 'hsl(142 60% 30%)' : 'hsl(32 95% 30%)',
            fontSize: 13, border: `1px solid ${scrapeMsg.startsWith('✅') ? 'hsl(142 60% 85%)' : 'hsl(48 96% 80%)'}`,
          }}>
            {scrapeMsg}
          </div>
        )}

        <CompetitorManager />
      </section>

      {/* ── Generate Weekly Brief ─────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <Card style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ marginBottom: 8 }}>
            <Sparkles size={28} color="var(--accent)" />
          </div>
          <h2 style={{
            fontSize: 17, fontWeight: 800, color: 'var(--foreground)',
            letterSpacing: '-0.3px', margin: '0 0 8px',
          }}>
            Generate Your Weekly Brief
          </h2>
          <p style={{
            fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.65,
            margin: '0 0 20px', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto',
          }}>
            AI analyses your competitors&apos; top reels — finding viral hooks, premises, and how to adapt them
            to your niche — then writes 7 daily scripts in your voice.
          </p>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, padding: '10px 24px' }}
          >
            {generating
              ? <><Spinner size={14} /> Analysing competitors...</>
              : <><Sparkles size={14} /> Generate Weekly Brief</>
            }
          </Button>

          {error && (
            <div style={{
              marginTop: 14, padding: '10px 14px', borderRadius: 8,
              background: 'hsl(0 50% 96%)', color: 'hsl(0 72% 40%)',
              fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
            }}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </Card>
      </section>

      {/* ── Report Output ─────────────────────────────────────────────── */}
      {report && (
        <>
          {/* Headline + verdict */}
          <section style={{ marginBottom: 24 }}>
            <Card style={{ padding: '20px 24px' }}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: 'var(--accent)',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <TrendingUp size={13} /> This Week&apos;s Pulse
              </div>
              <h3 style={{
                fontSize: 18, fontWeight: 800, color: 'var(--foreground)',
                letterSpacing: '-0.3px', margin: '0 0 14px',
              }}>
                {report.headline}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.7, margin: '0 0 16px' }}>
                {report.own_performance}
              </p>
              <div style={{
                background: 'var(--muted)', borderRadius: 8, padding: '12px 16px',
                borderLeft: '3px solid var(--accent)',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  Weekly Verdict
                </div>
                <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.65, margin: 0 }}>
                  {report.weekly_verdict}
                </p>
              </div>
            </Card>
          </section>

          {/* Top Format + What's Working */}
          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <Card style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Winning Format
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--foreground)', marginBottom: 8 }}>
                {report.top_format}
              </div>
              <p style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.6, margin: 0 }}>
                {report.format_insight}
              </p>
            </Card>

            <Card style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                What&apos;s Working
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, listStyle: 'disc' }}>
                {report.what_is_working?.map((item, i) => (
                  <li key={i} style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.6, marginBottom: 4 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </section>

          {/* Top Hooks */}
          {report.top_hooks?.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <Card style={{ padding: '18px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                  Top Hooks from Competitors
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {report.top_hooks.map((hook, i) => (
                    <div key={i} style={{
                      background: 'var(--muted)', borderRadius: 8, padding: '10px 14px',
                      fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5,
                      borderLeft: '3px solid var(--accent)',
                      fontWeight: 600,
                    }}>
                      &ldquo;{hook}&rdquo;
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          )}

          {/* Big Hits */}
          {report.big_hits?.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <SectionLabel style={{ marginBottom: 14 }}>Competitor Big Hits — Steal These Ideas</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {report.big_hits.map((hit, i) => (
                  <BigHitCard key={i} hit={hit} index={i} />
                ))}
              </div>
            </section>
          )}

          {/* Content Gaps */}
          {report.content_gaps?.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <Card style={{ padding: '18px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Lightbulb size={12} /> Content Gaps — Your Opportunity
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {report.content_gaps.map((gap, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      fontSize: 13, color: 'var(--foreground)', lineHeight: 1.6,
                    }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: 999, background: 'var(--muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, fontSize: 11, fontWeight: 700, color: 'var(--accent)',
                        marginTop: 1,
                      }}>
                        {i + 1}
                      </span>
                      {gap}
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          )}

          {/* Scripts */}
          {report.scripts?.length > 0 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <SectionLabel>This Week&apos;s Scripts</SectionLabel>
                <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                  {report.scripts.length} scripts · Mon–Sun
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {report.scripts.map((script, i) => (
                  <ScriptCard key={i} script={script} index={i} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
