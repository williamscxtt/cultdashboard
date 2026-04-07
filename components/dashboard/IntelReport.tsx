'use client'
import type { WeeklyReport, TrendingTopic, TopHook } from '@/lib/types'
import { Card, Badge } from '@/components/ui'

interface Props {
  report: WeeklyReport
}

function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 style="color:var(--foreground);font-size:14px;font-weight:700;margin:18px 0 6px;letter-spacing:-0.2px;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="color:var(--foreground);font-size:16px;font-weight:700;margin:22px 0 8px;letter-spacing:-0.3px;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="color:var(--foreground);font-size:18px;font-weight:700;margin:0 0 10px;letter-spacing:-0.3px;">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[-*] (.+)$/gm, '<li style="margin:4px 0;color:var(--muted-foreground);">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul style="padding-left:18px;margin:8px 0;">$&</ul>')
    .replace(/\n\n/g, '</p><p style="margin:8px 0;color:var(--muted-foreground);line-height:1.7;">')
    .replace(/^(.+)$(?!<\/[hup])/gm, '<p style="margin:8px 0;color:var(--muted-foreground);line-height:1.7;">$1</p>')
}

export default function IntelReport({ report }: Props) {
  const weekLabel = new Date(report.week_start).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const trendingTopics: TrendingTopic[] = Array.isArray(report.trending_topics)
    ? report.trending_topics
    : []

  const topHooks: TopHook[] = Array.isArray(report.top_hooks)
    ? report.top_hooks
    : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header card */}
      <Card style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>Weekly Intel Report</div>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>Week of {weekLabel}</div>
        </div>
        <Badge variant="accent">LATEST</Badge>
      </Card>

      {/* Trending topics */}
      {trendingTopics.length > 0 && (
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.2px' }}>Trending Topics</div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>High-performing topics this week</div>
          </div>
          {trendingTopics.map((t, idx) => (
            <div key={idx} style={{
              padding: '14px 20px',
              borderBottom: idx < trendingTopics.length - 1 ? '1px solid var(--border)' : 'none',
              borderLeft: '3px solid var(--accent)',
              display: 'flex', alignItems: 'center', gap: 20,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{t.topic}</div>
                {t.accounts && t.accounts.length > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>{t.accounts.join(', ')}</div>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                {t.views?.toLocaleString() ?? '—'} views
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Top hooks */}
      {topHooks.length > 0 && (
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.2px' }}>Top Hooks</div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>Best-performing opening lines this week</div>
          </div>
          {topHooks.map((hook, idx) => (
            <div key={idx} style={{
              padding: '14px 20px',
              borderBottom: idx < topHooks.length - 1 ? '1px solid var(--border)' : 'none',
              display: 'flex', alignItems: 'flex-start', gap: 14,
            }}>
              <div style={{
                fontSize: 16, fontWeight: 700, color: 'var(--border)',
                minWidth: 24, flexShrink: 0, lineHeight: 1.4,
              }}>
                {idx + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.4, marginBottom: 5 }}>
                  &ldquo;{hook.hook}&rdquo;
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{hook.account}</span>
                  <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                    {hook.views?.toLocaleString()} views
                  </span>
                  {hook.url && (
                    <a
                      href={hook.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, color: 'var(--muted-foreground)', textDecoration: 'none' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--foreground)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)' }}
                    >
                      View reel →
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Full report markdown */}
      {report.report_md && (
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', marginBottom: 14, letterSpacing: '-0.2px' }}>Full Report</div>
          <div
            style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--muted-foreground)', fontFamily: 'monospace' }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(report.report_md) }}
          />
        </Card>
      )}
    </div>
  )
}
