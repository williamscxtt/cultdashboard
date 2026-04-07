'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TrendingUp, Zap, ChevronDown, ChevronUp, ExternalLink, BarChart2, FileText } from 'lucide-react'
import type { WeeklyReport, TrendingTopic, TopHook, ClientReel } from '@/lib/types'
import { Card, Badge, SectionLabel } from '@/components/ui'

// ─── types ───────────────────────────────────────────────────────────────────

interface Props {
  report: WeeklyReport | null
  reels: ClientReel[]
}

// ─── markdown renderer ────────────────────────────────────────────────────────

function renderMd(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 style="color:var(--foreground);font-size:13px;font-weight:700;margin:16px 0 5px;letter-spacing:-0.1px;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="color:var(--foreground);font-size:15px;font-weight:700;margin:20px 0 8px;letter-spacing:-0.2px;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="color:var(--foreground);font-size:17px;font-weight:800;margin:0 0 10px;letter-spacing:-0.3px;">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--foreground);font-weight:700;">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[-•*] (.+)$/gm, '<li style="margin:3px 0;padding-left:4px;">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul style="padding-left:16px;margin:6px 0;list-style:disc;">$&</ul>')
    .replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid var(--border);margin:16px 0;">')
    .replace(/\n\n/g, '</p><p style="margin:6px 0;line-height:1.65;">')
}

// ─── content pillars from reels ───────────────────────────────────────────────

function deriveContentPillars(reels: ClientReel[]) {
  const groups: Record<string, { views: number[]; hooks: string[] }> = {}
  for (const r of reels) {
    const fmt = r.format_type
    if (!fmt) continue
    if (!groups[fmt]) groups[fmt] = { views: [], hooks: [] }
    groups[fmt].views.push(r.views ?? 0)
    if (r.hook) groups[fmt].hooks.push(r.hook)
  }
  return Object.entries(groups)
    .map(([fmt, { views, hooks }]) => ({
      fmt,
      count: views.length,
      avgViews: Math.round(views.reduce((a, b) => a + b, 0) / views.length),
      maxViews: Math.max(...views),
      topHook: hooks.sort(() => Math.random() - 0.5)[0] ?? null,
    }))
    .sort((a, b) => b.avgViews - a.avgViews)
}

function fmtLabel(fmt: string) {
  return fmt.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function pillarColor(idx: number): string {
  const colors = ['var(--accent)', 'hsl(142 71% 35%)', 'hsl(38 92% 40%)', 'hsl(270 60% 55%)', 'hsl(195 80% 40%)']
  return colors[idx % colors.length]
}

// ─── empty state ──────────────────────────────────────────────────────────────

function EmptyIntel() {
  return (
    <Card style={{ padding: '36px 24px', textAlign: 'center' }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: 'hsl(220 90% 56% / 0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 14px', color: 'var(--accent)',
      }}>
        <TrendingUp size={20} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginBottom: 6 }}>
        No intel report yet
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.6, maxWidth: 340, margin: '0 auto' }}>
        The weekly content intelligence report is generated every Monday at 9am.
        Check back then — it'll show what's trending, top hooks, and what to post this week.
      </div>
    </Card>
  )
}

// ─── main ─────────────────────────────────────────────────────────────────────

export default function ContentDashboard({ report, reels }: Props) {
  const [reportExpanded, setReportExpanded] = useState(false)

  const pillars = deriveContentPillars(reels)
  const maxPillarViews = pillars.length ? Math.max(...pillars.map(p => p.avgViews)) : 1

  const trendingTopics: TrendingTopic[] = report
    ? (Array.isArray(report.trending_topics) ? report.trending_topics : [])
    : []

  const topHooks: TopHook[] = report
    ? (Array.isArray(report.top_hooks) ? report.top_hooks : [])
    : []

  const weekLabel = report
    ? new Date(report.week_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.4px', marginBottom: 4 }}>
            Content Intelligence
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
            {weekLabel ? `Week of ${weekLabel} · ` : ''}What&rsquo;s working in your space + your content breakdown
          </p>
        </div>
        <Link href="/dashboard/scripts" style={{ textDecoration: 'none' }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 7, border: '1px solid var(--border)',
            background: 'var(--card)', color: 'var(--foreground)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <FileText size={14} />
            View This Week&rsquo;s Scripts
          </button>
        </Link>
      </div>

      {/* ── Intel section ── */}
      {!report ? <EmptyIntel /> : (
        <div style={{ display: 'grid', gridTemplateColumns: trendingTopics.length || topHooks.length ? '1fr 380px' : '1fr', gap: 16, marginBottom: 20 }}>

          {/* Left: What's Popping + Full Report */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Intel overview card */}
            {report.report_md && (
              <Card style={{ overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.2px' }}>
                        Weekly Intelligence
                      </div>
                      <Badge variant="accent">NEW</Badge>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 1 }}>
                      What&rsquo;s working right now + your performance last week
                    </div>
                  </div>
                </div>

                {/* Show the intel section of the report (before scripts) */}
                <div style={{ padding: '16px 20px' }}>
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.65,
                      color: 'var(--muted-foreground)',
                      maxHeight: reportExpanded ? 'none' : 360,
                      overflow: reportExpanded ? 'visible' : 'hidden',
                      position: 'relative',
                    }}
                    dangerouslySetInnerHTML={{ __html: renderMd(report.report_md) }}
                  />
                  {!reportExpanded && (
                    <div style={{
                      position: 'relative', height: 60, marginTop: -60,
                      background: 'linear-gradient(transparent, var(--card))',
                      pointerEvents: 'none',
                    }} />
                  )}
                  <button
                    onClick={() => setReportExpanded(e => !e)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, marginTop: 12,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, color: 'var(--accent)', padding: 0,
                      fontFamily: 'inherit',
                    }}
                  >
                    {reportExpanded ? <><ChevronUp size={14} /> Show less</> : <><ChevronDown size={14} /> Read full report</>}
                  </button>
                </div>
              </Card>
            )}
          </div>

          {/* Right: Trending topics + Top hooks */}
          {(trendingTopics.length > 0 || topHooks.length > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Trending topics */}
              {trendingTopics.length > 0 && (
                <Card style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <TrendingUp size={13} style={{ color: 'var(--accent)' }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>Trending This Week</span>
                    </div>
                  </div>
                  {trendingTopics.slice(0, 8).map((t, idx) => (
                    <div key={idx} style={{
                      padding: '10px 16px',
                      borderBottom: idx < trendingTopics.slice(0, 8).length - 1 ? '1px solid var(--border)' : 'none',
                      borderLeft: '3px solid var(--accent)',
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.4 }}>{t.topic}</div>
                      {(t.views > 0 || (t.accounts && t.accounts.length > 0)) && (
                        <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>
                          {t.views > 0 && `${t.views.toLocaleString()} views`}
                          {t.views > 0 && t.accounts?.length > 0 && ' · '}
                          {t.accounts?.slice(0, 2).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </Card>
              )}

              {/* Top hooks */}
              {topHooks.length > 0 && (
                <Card style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Zap size={13} style={{ color: 'var(--accent)' }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>Top Hooks</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 1 }}>Best-performing openers this week</div>
                  </div>
                  {topHooks.slice(0, 10).map((hook, idx) => (
                    <div key={idx} style={{
                      padding: '10px 16px',
                      borderBottom: idx < topHooks.slice(0, 10).length - 1 ? '1px solid var(--border)' : 'none',
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--border)', minWidth: 16, flexShrink: 0, lineHeight: 1.5 }}>
                        {idx + 1}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.4, fontWeight: 500 }}>
                          &ldquo;{hook.hook}&rdquo;
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                          {hook.account && (
                            <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>@{hook.account}</span>
                          )}
                          {hook.views > 0 && (
                            <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
                              {hook.views.toLocaleString()}
                            </span>
                          )}
                          {hook.url && (
                            <a href={hook.url} target="_blank" rel="noopener noreferrer"
                              style={{ color: 'var(--muted-foreground)', lineHeight: 1 }}>
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Content Pillars ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <SectionLabel>Your Content Pillars</SectionLabel>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: -8 }}>
              Format performance from your synced reels
            </div>
          </div>
          {reels.length > 0 && (
            <Link href="/dashboard/analytics" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
              View full analytics →
            </Link>
          )}
        </div>

        {pillars.length === 0 ? (
          <Card style={{ padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, color: 'var(--muted-foreground)' }}>
              <BarChart2 size={24} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>No content data yet</div>
            <div style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
              Connect your Instagram and sync your reels to see your content pillar breakdown.
            </div>
          </Card>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {pillars.map((p, idx) => (
              <Card key={p.fmt} style={{ padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
                {/* Accent bar */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  background: pillarColor(idx),
                }} />

                {/* Format label + count */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.1px',
                    textTransform: 'capitalize',
                  }}>
                    {fmtLabel(p.fmt)}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, background: 'var(--muted)',
                    color: 'var(--muted-foreground)', padding: '2px 6px', borderRadius: 4,
                  }}>
                    {p.count} reel{p.count !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Stats */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.5px', lineHeight: 1 }}>
                    {p.avgViews >= 1000 ? `${(p.avgViews / 1000).toFixed(1)}k` : p.avgViews.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>
                    avg views · max {p.maxViews >= 1000 ? `${(p.maxViews / 1000).toFixed(0)}k` : p.maxViews.toLocaleString()}
                  </div>
                </div>

                {/* Performance bar */}
                <div style={{ height: 4, background: 'var(--muted)', borderRadius: 2, marginBottom: 10 }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    width: `${(p.avgViews / maxPillarViews) * 100}%`,
                    background: pillarColor(idx),
                    transition: 'width 0.4s ease',
                  }} />
                </div>

                {/* Top hook */}
                {p.topHook && (
                  <div style={{
                    fontSize: 11, color: 'var(--muted-foreground)', lineHeight: 1.5,
                    borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    &ldquo;{p.topHook}&rdquo;
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Top reels by format ── */}
      {reels.length > 0 && (
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.2px' }}>Your Best Hooks</div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>Top-performing opening lines from your reels</div>
          </div>
          <div>
            {reels
              .filter(r => r.hook && r.views)
              .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
              .slice(0, 8)
              .map((r, idx) => (
                <div key={r.id || r.reel_id || idx} style={{
                  padding: '12px 20px',
                  borderBottom: idx < 7 ? '1px solid var(--border)' : 'none',
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  transition: 'background 0.1s',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--muted)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--border)', minWidth: 20, flexShrink: 0, lineHeight: 1.4 }}>
                    {idx + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.4, fontWeight: 500, marginBottom: 4 }}>
                      &ldquo;{r.hook}&rdquo;
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>
                        {(r.views ?? 0).toLocaleString()} views
                      </span>
                      {r.format_type && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, background: 'var(--muted)',
                          color: 'var(--muted-foreground)', padding: '1px 6px', borderRadius: 4,
                          textTransform: 'capitalize',
                        }}>
                          {r.format_type.replace(/_/g, ' ')}
                        </span>
                      )}
                      {r.date && (
                        <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                          {new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      {r.permalink && (
                        <a href={r.permalink} target="_blank" rel="noopener noreferrer"
                          style={{ color: 'var(--muted-foreground)', lineHeight: 1 }}>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}

    </div>
  )
}
