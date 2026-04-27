import type { Profile, ClientReel } from '@/lib/types'

interface WeeklyLogRow {
  id: string
  date?: string | null
  week_start?: string | null
  reels_posted?: number | null
  avg_reel_views?: number | null
  avg_views?: number | null
  followers_total?: number | null
  followers_end?: number | null
  calls_booked?: number | null
  calls_taken?: number | null
  clients_signed?: number | null
  clients_closed?: number | null
  revenue?: number | null
  biggest_win?: string | null
  biggest_bottleneck?: string | null
  bottleneck?: string | null
  message_for_will?: string | null
  message_to_will?: string | null
  message_read?: boolean | null
}

interface DmSaleRow {
  id: string
  lead_name?: string | null
  stage?: string | null
  call_booked?: boolean | null
  call_completed?: boolean | null
  closed?: boolean | null
  revenue?: number | null
  deal_value?: number | null
  date?: string | null
}

interface Props {
  profile: Profile
  reels: ClientReel[]
  weeklyLogs: WeeklyLogRow[]
  dmSales: DmSaleRow[]
}

function fmt(n: number | null | undefined, fallback = '—') {
  if (n == null) return fallback
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString()
}

function engRate(arr: ClientReel[]) {
  const views = arr.reduce((a, r) => a + (r.views ?? 0), 0)
  if (!views) return '—'
  const eng = arr.reduce((a, r) => a + (r.likes ?? 0) + (r.comments ?? 0), 0)
  return `${((eng / views) * 100).toFixed(1)}%`
}

export default function AdminClientOverview({ profile, reels, weeklyLogs, dmSales }: Props) {
  const now = new Date()
  const d30 = new Date(now); d30.setDate(d30.getDate() - 30)
  const d7  = new Date(now); d7.setDate(d7.getDate() - 7)

  const recent30 = reels.filter(r => r.date && new Date(r.date) >= d30)
  const recent7  = reels.filter(r => r.date && new Date(r.date) >= d7)

  const avgViews30 = recent30.length ? Math.round(recent30.reduce((a, r) => a + (r.views ?? 0), 0) / recent30.length) : null
  const avgViews7  = recent7.length  ? Math.round(recent7.reduce((a, r) => a + (r.views ?? 0), 0)  / recent7.length)  : null
  const avgViewsAll = reels.length   ? Math.round(reels.reduce((a, r) => a + (r.views ?? 0), 0)    / reels.length)    : null

  const bestReel = [...recent30].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))[0] ?? null

  // Format breakdown (last 30 reels)
  const formatMap: Record<string, { count: number; totalViews: number }> = {}
  reels.slice(0, 30).forEach(r => {
    const f = r.format_type || 'Unknown'
    if (!formatMap[f]) formatMap[f] = { count: 0, totalViews: 0 }
    formatMap[f].count++
    formatMap[f].totalViews += r.views ?? 0
  })
  const formats = Object.entries(formatMap)
    .map(([fmt, d]) => ({ fmt, avg: Math.round(d.totalViews / d.count), count: d.count }))
    .sort((a, b) => b.avg - a.avg).slice(0, 5)

  const followersDelta = profile.followers_count != null && profile.starting_followers != null
    ? profile.followers_count - profile.starting_followers : null

  const joinDate = profile.date_joined ?? profile.created_at
  const daysActive = Math.floor((now.getTime() - new Date(joinDate).getTime()) / 86400000)

  // Latest check-in
  const log = weeklyLogs[0] ?? null
  const logDate   = log?.week_start ?? log?.date
  const logViews  = log?.avg_views ?? log?.avg_reel_views
  const logWin    = log?.biggest_win
  const logBlock  = log?.biggest_bottleneck ?? log?.bottleneck
  const logMsg    = log?.message_for_will ?? log?.message_to_will

  // DM pipeline
  const openLeads     = dmSales.filter(d => d.stage !== 'closed' && d.stage !== 'lost' && d.stage !== 'won')
  const pendingCalls  = dmSales.filter(d => d.call_booked && !d.call_completed)
  const closedRev     = dmSales.filter(d => d.closed).reduce((a, d) => a + (Number(d.revenue) || Number(d.deal_value) || 0), 0)

  const recentReels = reels.slice(0, 10)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Top stat tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
        <StatTile
          label="Followers"
          value={fmt(profile.followers_count)}
          sub={followersDelta != null ? `${followersDelta >= 0 ? '+' : ''}${followersDelta.toLocaleString()} since joining` : undefined}
          accent={followersDelta != null && followersDelta > 0 ? 'hsl(142 71% 45%)' : undefined}
        />
        <StatTile label="Avg views 30d" value={fmt(avgViews30)} sub={avgViews7 ? `${fmt(avgViews7)} last 7d` : undefined} />
        <StatTile label="Engagement 30d" value={engRate(recent30)} sub={`${recent30.length} reels`} />
        <StatTile label="Reels 30d" value={recent30.length.toString()} sub={`${reels.length} total`} />
        <StatTile label="Phase" value={profile.phase_number ? `Phase ${profile.phase_number}` : (profile.coaching_phase ?? '—')} />
        <StatTile
          label="Days active"
          value={daysActive.toString()}
          sub={new Date(joinDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        />
      </div>

      {/* ── Two-column body ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>

        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Best reel */}
          {bestReel && (
            <Panel label="Best reel — last 30 days">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.45, marginBottom: 6 }}>
                    {bestReel.hook || bestReel.caption?.slice(0, 120) || 'No hook recorded'}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {bestReel.format_type && <Tag>{bestReel.format_type}</Tag>}
                    {bestReel.date && <Tag>{new Date(bestReel.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</Tag>}
                    {bestReel.saves != null && <Tag>💾 {bestReel.saves.toLocaleString()}</Tag>}
                    {bestReel.shares != null && <Tag>↗ {bestReel.shares.toLocaleString()}</Tag>}
                  </div>
                  {bestReel.permalink && (
                    <a href={bestReel.permalink} target="_blank" rel="noopener noreferrer"
                       style={{ display: 'inline-block', marginTop: 8, fontSize: 11, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
                      View on Instagram →
                    </a>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--foreground)', letterSpacing: '-0.04em', lineHeight: 1, fontFamily: 'var(--font-display)' }}>{fmt(bestReel.views)}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 600, marginTop: 2 }}>VIEWS</div>
                </div>
              </div>
            </Panel>
          )}

          {/* Format breakdown */}
          {formats.length > 0 && (
            <Panel label="Format performance (last 30 reels)">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {formats.map((f, i) => {
                  const pct = formats[0].avg > 0 ? Math.round((f.avg / formats[0].avg) * 100) : 0
                  return (
                    <div key={f.fmt}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>{f.fmt}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{fmt(f.avg)} avg · {f.count} reels</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 999, background: 'var(--muted)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 999, background: i === 0 ? '#3b82f6' : 'rgba(59,130,246,0.3)', width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Panel>
          )}

          {/* Recent reels table */}
          {recentReels.length > 0 && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)' }}>
                Recent reels
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Date', 'Hook', 'Format', 'Views', 'Eng.'].map(h => (
                      <th key={h} style={{ padding: '5px 12px', textAlign: 'left', fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentReels.map((r, i) => {
                    const eng = r.views ? (((r.likes ?? 0) + (r.comments ?? 0)) / r.views * 100).toFixed(1) : '—'
                    return (
                      <tr key={r.id} style={{ borderBottom: i < recentReels.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '7px 12px', fontSize: 11, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                          {r.date ? new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                        </td>
                        <td style={{ padding: '7px 12px', fontSize: 12, color: 'var(--foreground)', maxWidth: 240 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.hook || r.caption?.slice(0, 80) || '—'}
                          </div>
                        </td>
                        <td style={{ padding: '7px 12px' }}>
                          {r.format_type ? <Tag>{r.format_type}</Tag> : <span style={{ color: 'var(--muted-foreground)', fontSize: 11 }}>—</span>}
                        </td>
                        <td style={{ padding: '7px 12px', fontSize: 13, fontWeight: 700, color: 'var(--foreground)', whiteSpace: 'nowrap' }}>{fmt(r.views)}</td>
                        <td style={{ padding: '7px 12px', fontSize: 11, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{eng}{eng !== '—' ? '%' : ''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Latest check-in */}
          <Panel label="Latest check-in" aside={logDate ? new Date(logDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : undefined}>
            {log ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                  <MiniStat label="Reels" value={log.reels_posted?.toString() ?? '—'} />
                  <MiniStat label="Avg views" value={fmt(logViews)} />
                  <MiniStat label="Calls booked" value={log.calls_booked?.toString() ?? '—'} />
                  <MiniStat label="Revenue" value={log.revenue ? `£${Number(log.revenue).toLocaleString()}` : '—'} />
                </div>
                {logWin && (
                  <Callout color="green" label="Biggest win">{logWin}</Callout>
                )}
                {logBlock && (
                  <Callout color="amber" label="Bottleneck">{logBlock}</Callout>
                )}
                {logMsg && (
                  <Callout color={log.message_read ? 'muted' : 'blue'} label="Message to you" badge={!log.message_read ? 'UNREAD' : undefined}>
                    {logMsg}
                  </Callout>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)', fontStyle: 'italic' }}>No check-ins submitted yet.</div>
            )}
          </Panel>

          {/* DM pipeline */}
          <Panel label="DM pipeline">
            {dmSales.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                  <MiniStat label="Open leads" value={openLeads.length.toString()} />
                  <MiniStat label="Calls pending" value={pendingCalls.length.toString()} />
                  <MiniStat label="Total logged" value={dmSales.length.toString()} />
                  <MiniStat label="Rev. closed" value={closedRev > 0 ? `£${closedRev.toLocaleString()}` : '—'} />
                </div>
                {openLeads.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Active leads</div>
                    {openLeads.slice(0, 5).map(d => (
                      <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                        <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>{d.lead_name || 'Unknown'}</span>
                        <Tag>{d.stage || 'new'}</Tag>
                      </div>
                    ))}
                    {openLeads.length > 5 && <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4 }}>+{openLeads.length - 5} more</div>}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)', fontStyle: 'italic' }}>No DM pipeline data yet.</div>
            )}
          </Panel>

          {/* All-time summary */}
          <Panel label="All-time">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              <MiniStat label="Total reels" value={reels.length.toString()} />
              <MiniStat label="Avg views" value={fmt(avgViewsAll)} />
              <MiniStat label="Engagement" value={engRate(reels)} />
              <MiniStat label="Niche" value={profile.niche?.split(' ').slice(0, 2).join(' ') ?? '—'} />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Panel({ label, aside, children }: { label: string; aside?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)' }}>{label}</div>
        {aside && <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{aside}</div>}
      </div>
      {children}
    </div>
  )
}

function StatTile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 900, color: accent ?? 'var(--foreground)', letterSpacing: '-0.04em', lineHeight: 1, fontFamily: 'var(--font-display)' }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--muted-foreground)', marginTop: 4, lineHeight: 1.3 }}>{sub}</div>}
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--muted)', borderRadius: 7, padding: '7px 9px' }}>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.03em', fontFamily: 'var(--font-display)' }}>{value}</div>
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: 'var(--muted)', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

const calloutStyles = {
  green: { bg: 'rgba(34,197,94,0.07)',  border: 'rgba(34,197,94,0.18)',  label: 'hsl(142 71% 45%)' },
  amber: { bg: 'rgba(251,191,36,0.07)', border: 'rgba(251,191,36,0.22)', label: 'hsl(43 96% 56%)' },
  blue:  { bg: 'rgba(59,130,246,0.07)', border: 'rgba(59,130,246,0.2)',  label: '#60a5fa' },
  muted: { bg: 'var(--muted)',           border: 'var(--border)',          label: 'var(--muted-foreground)' },
}

function Callout({ color, label, badge, children }: { color: keyof typeof calloutStyles; label: string; badge?: string; children: React.ReactNode }) {
  const s = calloutStyles[color]
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 7, padding: '9px 11px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: s.label }}>{label}</div>
        {badge && <div style={{ fontSize: 9, fontWeight: 700, color: '#3b82f6', background: 'rgba(59,130,246,0.12)', padding: '1px 6px', borderRadius: 4 }}>{badge}</div>}
      </div>
      <div style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.5 }}>{children as string}</div>
    </div>
  )
}
