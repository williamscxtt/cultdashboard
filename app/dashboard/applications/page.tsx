'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeekRow {
  week: string
  total: number
  qualified: number
  payment: number
  disqualified: number
}

interface BarItem {
  label: string
  count: number
}

interface RecentApp {
  id: string
  created_at: string
  name: string
  email: string
  instagram_handle: string | null
  phone: string | null
  status: string
  investment_amount: string | null
  wants: string | null
  creator_type: string | null
}

interface FunnelStep {
  step: number
  label: string
  sessions: number
}

interface CheckoutStats {
  modal_open: number
  stripe_monthly: number
  stripe_biannual: number
}

interface Analytics {
  total: number
  qualified: number
  paymentTier: number
  disqualified: number
  weeklyTrend: WeekRow[]
  investmentBreakdown: BarItem[]
  creatorTypes: BarItem[]
  wantsBreakdown: BarItem[]
  funnelSteps: FunnelStep[]
  recent: RecentApp[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(n: number, total: number) {
  if (!total) return '0'
  return Math.round((n / total) * 100) + '%'
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) +
    ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function fmtWeek(iso: string) {
  const d = new Date(iso + 'T00:00:00Z')
  const end = new Date(d); end.setUTCDate(end.getUTCDate() + 6)
  const fmt = (x: Date) => x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  return `${fmt(d)} – ${fmt(end)}`
}

const STATUS_COLORS: Record<string, string> = {
  pending:      '#22c55e',
  payment_tier: '#3B82F6',
  disqualified: 'rgba(255,255,255,0.25)',
}
const STATUS_LABELS: Record<string, string> = {
  pending:      'Qualified',
  payment_tier: 'Payment tier',
  disqualified: 'Disqualified',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatTile({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: color ?? 'var(--foreground)', letterSpacing: '-1px', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

function HBar({ label, count, max, color = '#3B82F6' }: { label: string; count: number; max: number; color?: string }) {
  const w = max > 0 ? (count / max) * 100 : 0
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 36px', gap: 10, alignItems: 'center' }}>
      <div style={{ fontSize: 13, color: 'var(--foreground)', fontWeight: 500 }}>{label}</div>
      <div style={{ height: 7, borderRadius: 999, background: 'var(--muted)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${w}%`, borderRadius: 999, background: color, transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', textAlign: 'right' }}>{count}</div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ApplicationsPage() {
  const router = useRouter()
  const [data, setData] = useState<Analytics | null>(null)
  const [checkoutStats, setCheckoutStats] = useState<CheckoutStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data: p }) => {
        if (p?.role !== 'admin') { router.push('/dashboard'); return }

        // Fetch applications analytics + checkout events in parallel
        Promise.all([
          fetch('/api/admin/applications').then(r => r.json()),
          supabase.from('checkout_events').select('event_type'),
        ]).then(([appData, { data: evts }]) => {
          setData(appData)
          if (evts) {
            const stats: CheckoutStats = { modal_open: 0, stripe_monthly: 0, stripe_biannual: 0 }
            evts.forEach(e => {
              if (e.event_type === 'modal_open') stats.modal_open++
              else if (e.event_type === 'stripe_monthly') stats.stripe_monthly++
              else if (e.event_type === 'stripe_biannual') stats.stripe_biannual++
            })
            setCheckoutStats(stats)
          }
          setLoading(false)
        }).catch(() => { setError('Failed to load analytics'); setLoading(false) })
      })
    })
  }, [router])

  if (loading) return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
        {[1,2,3,4].map(i => <div key={i} style={{ height: 96, borderRadius: 12, background: 'var(--muted)', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[1,2,3,4].map(i => <div key={i} style={{ height: 96, borderRadius: 12, background: 'var(--muted)', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />)}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  )

  if (error) return (
    <div style={{ padding: 24, color: 'var(--muted-foreground)', fontSize: 14 }}>{error}</div>
  )

  if (!data) return null

  const maxInv = data.investmentBreakdown.length ? Math.max(...data.investmentBreakdown.map(b => b.count)) : 1
  const maxType = data.creatorTypes.length ? Math.max(...data.creatorTypes.map(b => b.count)) : 1
  const maxFunnel = data.funnelSteps.length ? Math.max(...data.funnelSteps.map(f => f.sessions)) : 1

  return (
    <div className="dash-page" style={{ padding: '24px 16px 60px', maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.5px', margin: 0 }}>
          Applications
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted-foreground)', margin: '4px 0 0' }}>
          {data.total} total submissions since the form launched
        </p>
      </div>

      {/* Stat tiles */}
      <div className="apps-stat-tiles" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <style>{`
          @media (max-width: 640px) {
            .apps-stat-tiles { grid-template-columns: repeat(2, 1fr) !important; }
            .apps-two-col { grid-template-columns: 1fr !important; }
          }
        `}</style>
        <StatTile label="Total" value={data.total} />
        <StatTile label="Qualified" value={data.qualified} sub={pct(data.qualified, data.total) + ' of total'} color="#22c55e" />
        <StatTile label="Payment tier" value={data.paymentTier} sub={pct(data.paymentTier, data.total) + ' of total'} color="#3B82F6" />
        <StatTile label="Disqualified" value={data.disqualified} sub={pct(data.disqualified, data.total) + ' of total'} color="rgba(255,255,255,0.35)" />
      </div>

      {/* Checkout funnel */}
      {checkoutStats && (() => {
        const totalStripe = checkoutStats.stripe_monthly + checkoutStats.stripe_biannual
        const convRate = checkoutStats.modal_open > 0 ? Math.round((totalStripe / checkoutStats.modal_open) * 100) : 0
        return (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              Checkout funnel
            </div>
            <div className="apps-stat-tiles" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <StatTile label="Checkout opens" value={checkoutStats.modal_open} sub="Clicked 'Get Access'" />
              <StatTile label="Stripe clicks" value={totalStripe} sub={`${checkoutStats.stripe_monthly} monthly · ${checkoutStats.stripe_biannual} biannual`} color="#3B82F6" />
              <StatTile label="Monthly clicks" value={checkoutStats.stripe_monthly} sub={pct(checkoutStats.stripe_monthly, checkoutStats.modal_open) + ' of opens'} color="#60a5fa" />
              <StatTile label="Conversion rate" value={convRate + '%'} sub="Stripe clicks ÷ modal opens" color={convRate >= 30 ? '#22c55e' : convRate >= 10 ? '#f59e0b' : '#ef4444'} />
            </div>
          </div>
        )
      })()}

      {/* Two-col layout */}
      <div className="apps-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Weekly trend */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 20px 8px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Weekly trend
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px 68px 56px 76px', gap: 4, paddingBottom: 8, borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
              {['Week', 'Total', 'Qualified', 'Payment', 'Disqual.'].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: h === 'Week' ? 'left' : 'right' }}>{h}</div>
              ))}
            </div>
            {data.weeklyTrend.map((row, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1fr 50px 68px 56px 76px', gap: 4,
                padding: '9px 0', borderBottom: i < data.weeklyTrend.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{fmtWeek(row.week)}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', textAlign: 'right' }}>{row.total}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#22c55e', textAlign: 'right' }}>{row.qualified}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#3B82F6', textAlign: 'right' }}>{row.payment}</div>
                <div style={{ fontSize: 13, color: 'var(--muted-foreground)', textAlign: 'right' }}>{row.disqualified}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Investment breakdown */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Investment answers
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.investmentBreakdown.map((b, i) => (
              <HBar key={i} label={b.label} count={b.count} max={maxInv}
                color={b.label === 'Not right now' ? 'rgba(255,255,255,0.2)' : b.label.includes('500 or below') ? '#f59e0b' : '#3B82F6'}
              />
            ))}
          </div>

          {data.creatorTypes.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 24, marginBottom: 14 }}>
                Creator type
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.creatorTypes.map((b, i) => (
                  <HBar key={i} label={{ coach: 'Coaching / Service', creator: 'Pure Creator', both: 'Both' }[b.label] ?? b.label}
                    count={b.count} max={maxType} color="#8B5CF6"
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Funnel steps + Recent */}
      <div className="apps-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Step funnel */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Form funnel (step drop-off)
          </div>
          {data.funnelSteps.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>Tracking active from today</div>
              <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.6 }}>
                Each time someone starts the apply form we now track which step they reach. Drop-off data will appear here as new sessions come in.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              {data.funnelSteps.map((f, i) => {
                const dropPct = i > 0 && data.funnelSteps[0].sessions > 0
                  ? Math.round((f.sessions / data.funnelSteps[0].sessions) * 100)
                  : 100
                return (
                  <div key={f.step}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>Step {f.step}: {f.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: dropPct >= 70 ? '#22c55e' : dropPct >= 40 ? '#f59e0b' : '#ef4444' }}>
                        {f.sessions} ({dropPct}%)
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 999, background: 'var(--muted)' }}>
                      <div style={{
                        height: '100%', borderRadius: 999,
                        background: dropPct >= 70 ? '#22c55e' : dropPct >= 40 ? '#f59e0b' : '#ef4444',
                        width: `${maxFunnel > 0 ? (f.sessions / maxFunnel) * 100 : 0}%`,
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Wants breakdown */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            What they want
          </div>
          {data.wantsBreakdown.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Not enough data yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.wantsBreakdown.map((b, i) => (
                <HBar key={i}
                  label={b.label === 'coaching' ? 'Coaching from Will' : b.label === 'dashboard' ? 'Dashboard only' : b.label}
                  count={b.count}
                  max={Math.max(...data.wantsBreakdown.map(x => x.count))}
                  color={b.label === 'coaching' ? '#22c55e' : '#3B82F6'}
                />
              ))}
            </div>
          )}

          {/* Qualification rate explainer */}
          <div style={{ marginTop: 24, padding: '14px 16px', borderRadius: 10, background: 'var(--muted)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>How outcomes work</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { dot: '#22c55e', label: 'Qualified', desc: '£500+ budget, wants coaching → Slack ping' },
                { dot: '#3B82F6', label: 'Payment tier', desc: '£500 or below, or wants dashboard only' },
                { dot: 'rgba(255,255,255,0.2)', label: 'Disqualified', desc: '"Not right now" on investment' },
              ].map(({ dot, label, desc }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0, marginTop: 3 }} />
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)' }}>{label}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted-foreground)', marginLeft: 6 }}>{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* All applications */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            All applications ({data.recent.length})
          </div>
        </div>
        <div className="table-wrap" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Date', 'Name', '@Instagram', 'Investment', 'Wants', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recent.map((app, i) => (
                <tr key={app.id} style={{ borderBottom: i < data.recent.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{fmtDate(app.created_at)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap' }}>{app.name || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                    {app.instagram_handle ? `@${app.instagram_handle.replace(/^@/, '')}` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--foreground)', whiteSpace: 'nowrap' }}>{app.investment_amount || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                    {app.wants === 'coaching' ? 'Coaching' : app.wants === 'dashboard' ? 'Dashboard' : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
                      background: `${STATUS_COLORS[app.status] ?? 'rgba(255,255,255,0.1)'}20`,
                      color: STATUS_COLORS[app.status] ?? 'var(--muted-foreground)',
                      border: `1px solid ${STATUS_COLORS[app.status] ?? 'var(--border)'}40`,
                    }}>
                      {STATUS_LABELS[app.status] ?? app.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
