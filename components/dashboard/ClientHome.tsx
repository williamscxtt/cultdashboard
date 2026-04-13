'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Link2, BarChart2, Calendar, FileText, Bot, ArrowRight, Loader2,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { Profile, ClientReel } from '@/lib/types'
import { Card, StatCard, Badge, Button, PageHeader, SectionLabel } from '@/components/ui'

// ─── helpers ────────────────────────────────────────────────────────────────

const tooltipStyle = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--foreground)',
  fontSize: 12,
  boxShadow: 'none',
}

function formatBadgeVariant(fmt: string | null): 'accent' | 'success' | 'warning' | 'default' | 'muted' {
  if (!fmt) return 'muted'
  const map: Record<string, 'accent' | 'success' | 'warning' | 'default'> = {
    tutorial: 'accent',
    story_time: 'success',
    rant: 'warning',
    talking_head: 'default',
  }
  return map[fmt] ?? 'default'
}

function deriveStats(reels: ClientReel[]) {
  const totalReels = reels.length
  const avgViews = totalReels
    ? Math.round(reels.reduce((a, r) => a + (r.views ?? 0), 0) / totalReels)
    : 0

  const bestHookReel = [...reels].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))[0]
  const bestHook = bestHookReel?.hook
    ? bestHookReel.hook.slice(0, 48) + (bestHookReel.hook.length > 48 ? '…' : '')
    : '—'

  const formatGroups: Record<string, number[]> = {}
  reels.forEach(r => {
    if (r.format_type) {
      if (!formatGroups[r.format_type]) formatGroups[r.format_type] = []
      formatGroups[r.format_type].push(r.views ?? 0)
    }
  })
  const topFormat = Object.entries(formatGroups)
    .map(([fmt, views]) => ({ fmt, avg: views.reduce((a, b) => a + b, 0) / views.length }))
    .sort((a, b) => b.avg - a.avg)[0]?.fmt ?? '—'

  const viewsOverTime = [...reels]
    .filter(r => r.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-30)
    .map(r => ({
      date: new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      views: r.views ?? 0,
    }))

  const formatData = Object.entries(formatGroups)
    .map(([fmt, views]) => ({
      format: fmt,
      avgViews: Math.round(views.reduce((a, b) => a + b, 0) / views.length),
      count: views.length,
    }))
    .sort((a, b) => b.avgViews - a.avgViews)

  const maxAvgViews = formatData.length ? Math.max(...formatData.map(d => d.avgViews)) : 0

  const topReels = [...reels]
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 20)

  return { totalReels, avgViews, bestHook, topFormat, viewsOverTime, formatData, maxAvgViews, topReels }
}

// ─── quick actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'Weekly Scripts', href: '/dashboard/scripts', icon: FileText, description: "This week's content" },
  { label: 'Content Calendar', href: '/dashboard/calendar', icon: Calendar, description: 'Plan your schedule' },
  { label: 'Reel Copy Tool', href: '/dashboard/copy', icon: BarChart2, description: 'Hook & caption writer' },
  { label: 'Ask Will AI', href: '/dashboard/ai', icon: Bot, description: 'Get personalized coaching' },
]

// ─── sync steps ───────────────────────────────────────────────────────────────

const SYNC_STEPS = [
  'Fetching your reels',
  'Transcribing audio',
  'Analysing content',
  'Building your dashboard',
]

// ─── props ────────────────────────────────────────────────────────────────────

interface Props {
  profile: Profile
  initialReels: ClientReel[]
}

// ─── state 1: no instagram ────────────────────────────────────────────────────

function NotConnected() {
  return (
    <div style={{
      minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'hsl(220 90% 56% / 0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          color: 'var(--accent)',
        }}>
          <Link2 size={28} />
        </div>

        <h1 style={{
          fontSize: 26, fontWeight: 700, color: 'var(--foreground)',
          letterSpacing: '-0.4px', marginBottom: 10,
        }}>
          Connect your Instagram
        </h1>
        <p style={{ fontSize: 15, color: 'var(--muted-foreground)', lineHeight: 1.6, marginBottom: 28 }}>
          Sync your account to unlock analytics, weekly scripts, and AI coaching.
        </p>

        <a href="/api/auth/instagram" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: 36 }}>
          <Button size="lg" style={{ gap: 8, paddingLeft: 28, paddingRight: 28 }}>
            <Link2 size={16} />
            Connect Instagram
          </Button>
        </a>

        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '20px 24px', textAlign: 'left',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14,
          }}>
            What you unlock
          </div>
          {[
            ['Analytics', 'Views, likes, engagement across all your reels'],
            ['Weekly Scripts', '5 custom reel scripts every Monday'],
            ['AI Coaching', 'Ask Will anything about your content strategy'],
            ['Profile Audit', 'Hook analysis, format breakdown, growth tips'],
          ].map(([title, desc]) => (
            <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--accent)', marginTop: 6, flexShrink: 0,
              }} />
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{title}</span>
                <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}> — {desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── state 2: syncing ─────────────────────────────────────────────────────────

function Syncing({ activeStep }: { activeStep: number }) {
  return (
    <div style={{
      minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ maxWidth: 400, textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'hsl(220 90% 56% / 0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          color: 'var(--accent)',
        }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
        </div>

        <h1 style={{
          fontSize: 22, fontWeight: 700, color: 'var(--foreground)',
          letterSpacing: '-0.3px', marginBottom: 8,
        }}>
          Syncing your Instagram&hellip;
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 32 }}>
          This takes about 30 seconds — hang tight.
        </p>

        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '20px 24px', textAlign: 'left',
        }}>
          {SYNC_STEPS.map((step, i) => {
            const done = i < activeStep
            const active = i === activeStep
            return (
              <div key={step} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 0',
                borderBottom: i < SYNC_STEPS.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done
                    ? 'rgba(255,255,255,0.5)'
                    : active
                    ? 'hsl(220 90% 56% / 0.1)'
                    : 'var(--muted)',
                  transition: 'background 0.3s',
                }}>
                  {done ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : active ? (
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: 'var(--accent)',
                      animation: 'pulse 1.5s ease-in-out infinite',
                    }} />
                  ) : (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--border)' }} />
                  )}
                </div>
                <span style={{
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  color: done
                    ? '#3B82F6'
                    : active
                    ? 'var(--foreground)'
                    : 'var(--muted-foreground)',
                  transition: 'color 0.3s',
                }}>
                  {step}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  )
}

// ─── state 3: rich dashboard ──────────────────────────────────────────────────

function RichDashboard({ profile, reels }: { profile: Profile; reels: ClientReel[] }) {
  const { totalReels, avgViews, bestHook, topFormat, viewsOverTime, formatData, maxAvgViews, topReels } = deriveStats(reels)
  const firstName = profile.name?.split(' ')[0] || 'there'

  return (
    <div style={{ padding: '24px', maxWidth: 1024, margin: '0 auto' }}>

      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={profile.ig_username ? `@${profile.ig_username} · ${totalReels} reels synced` : 'Your content dashboard'}
      />

      {/* Row 1: stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Total Reels" value={totalReels.toString()} />
        <StatCard label="Avg Views" value={avgViews.toLocaleString()} sub="across all reels" />
        <StatCard label="Best Hook" value={bestHook} />
        <StatCard label="Top Format" value={topFormat.replace(/_/g, ' ')} sub="by avg views" />
      </div>

      {/* Row 2: charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12, marginBottom: 20 }}>

        {/* Views over time */}
        <Card style={{ padding: 20 }}>
          <SectionLabel>Views Over Time</SectionLabel>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 16 }}>
            Per reel · most recent 30
          </div>
          {viewsOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={viewsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--border)"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="var(--border)"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()}
                  width={36}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: unknown) => [typeof v === 'number' ? v.toLocaleString() : String(v), 'Views']}
                />
                <Line type="monotone" dataKey="views" stroke="var(--accent)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>No date data available</span>
            </div>
          )}
        </Card>

        {/* Format breakdown */}
        <Card style={{ padding: 20 }}>
          <SectionLabel>Format Breakdown</SectionLabel>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 16 }}>
            Avg views by format
          </div>
          {formatData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={formatData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="format"
                  stroke="var(--border)"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                  tickFormatter={(v: string) => v.replace(/_/g, ' ')}
                />
                <YAxis
                  stroke="var(--border)"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()}
                  width={36}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: unknown) => [typeof v === 'number' ? v.toLocaleString() : String(v), 'Avg Views']}
                />
                <Bar dataKey="avgViews" radius={[4, 4, 0, 0]}>
                  {formatData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={entry.avgViews === maxAvgViews ? 'var(--accent)' : 'var(--border)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>No format data yet</span>
            </div>
          )}
        </Card>
      </div>

      {/* Row 3: quick actions */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel>Quick Actions</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {QUICK_ACTIONS.map(({ label, href, icon: Icon, description }) => (
            <Link key={label} href={href} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  padding: '18px 16px', cursor: 'pointer',
                  transition: 'border-color 0.15s, transform 0.1s',
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 10,
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'var(--accent)'
                  el.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'var(--border)'
                  el.style.transform = 'translateY(0)'
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: 'hsl(220 90% 56% / 0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 12, color: 'var(--accent)',
                }}>
                  <Icon size={17} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', marginBottom: 3 }}>
                  {label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
                  {description}
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  marginTop: 12, fontSize: 12, color: 'var(--accent)', fontWeight: 600,
                }}>
                  Open <ArrowRight size={12} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Row 4: recent reels table */}
      {topReels.length > 0 && (
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.2px' }}>
                Recent Reels
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>
                Sorted by views — top {topReels.length}
              </div>
            </div>
            <Link href="/dashboard/analytics" style={{ textDecoration: 'none' }}>
              <Button size="sm" variant="secondary" style={{ gap: 6 }}>
                View all <ArrowRight size={12} />
              </Button>
            </Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Date', 'Hook', 'Views', 'Likes', 'Format'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left',
                      fontSize: 11, color: 'var(--muted-foreground)',
                      fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: '0.06em', whiteSpace: 'nowrap',
                      borderBottom: '1px solid var(--border)',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topReels.map((r, idx) => (
                  <tr
                    key={r.reel_id || r.id || idx}
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td style={{ padding: '11px 16px', fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                      {r.date
                        ? new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
                        : '—'}
                    </td>
                    <td style={{ padding: '11px 16px', maxWidth: 340 }}>
                      <div style={{
                        fontSize: 13, color: 'var(--foreground)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {r.hook || r.caption?.slice(0, 80) || '(no hook)'}
                      </div>
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 13, color: 'var(--accent)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {(r.views ?? 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 13, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                      {(r.likes ?? 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      {r.format_type
                        ? <Badge variant={formatBadgeVariant(r.format_type)}>{r.format_type.replace(/_/g, ' ')}</Badge>
                        : <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── main export ──────────────────────────────────────────────────────────────

export default function ClientHome({ profile, initialReels }: Props) {
  const [reels, setReels] = useState<ClientReel[]>(initialReels)
  const [syncStep, setSyncStep] = useState(0)
  const [hasSynced, setHasSynced] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Determine view state
  const hasIg = Boolean(profile.ig_username)
  const hasReels = reels.length > 0

  // State 2: IG connected, no reels — trigger sync + poll
  useEffect(() => {
    if (!hasIg || hasReels || hasSynced) return

    let stepTimer: ReturnType<typeof setInterval>
    let cancelled = false

    // Kick off sync
    fetch('/api/instagram/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: profile.id }),
    }).catch(() => { /* swallow — polling will catch data when ready */ })

    setHasSynced(true)

    // Animate steps
    let step = 0
    stepTimer = setInterval(() => {
      step += 1
      setSyncStep(s => Math.min(s + 1, SYNC_STEPS.length - 1))
      if (step >= SYNC_STEPS.length - 1) clearInterval(stepTimer)
    }, 7000)

    // Poll for reels
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/instagram/reels?profileId=${profile.id}&limit=100&offset=0`)
        if (res.ok) {
          const data = await res.json()
          if ((data.reels ?? []).length > 0 && !cancelled) {
            clearInterval(pollRef.current!)
            clearInterval(stepTimer)
            setReels(data.reels)
          }
        }
      } catch {
        // ignore transient errors
      }
    }, 3000)

    return () => {
      cancelled = true
      clearInterval(stepTimer)
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [hasIg, hasReels, hasSynced, profile.id])

  // Show connect screen only if no IG AND no reels (reels = was connected before)
  if (!hasIg && !hasReels) return <NotConnected />
  if (hasIg && !hasReels) return <Syncing activeStep={syncStep} />
  return <RichDashboard profile={profile} reels={reels} />
}
