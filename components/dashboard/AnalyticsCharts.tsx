'use client'
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { ClientReel } from '@/lib/types'
import { Card, EmptyState } from '@/components/ui'
import { BarChart2 } from 'lucide-react'

interface Props {
  reels: ClientReel[]
  formatGroups: Record<string, number[]>
}

const DUMMY_FOLLOWER_DATA = Array.from({ length: 12 }, (_, i) => ({
  month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
  followers: 0,
}))

const tooltipStyle = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--foreground)',
  fontSize: 12,
  boxShadow: 'none',
}

export default function AnalyticsCharts({ reels, formatGroups }: Props) {
  const formatData = Object.entries(formatGroups)
    .map(([fmt, views]) => ({
      format: fmt || 'Unknown',
      avgViews: Math.round(views.reduce((a, b) => a + b, 0) / views.length),
      count: views.length,
    }))
    .sort((a, b) => b.avgViews - a.avgViews)

  const maxViews = formatData.length ? Math.max(...formatData.map(d => d.avgViews)) : 0

  const topReels = [...reels]
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 10)
    .map((r, idx) => ({
      rank: idx + 1,
      hook: r.hook || r.caption?.slice(0, 60) || '(no hook)',
      views: r.views,
      likes: r.likes,
      date: r.date ? new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—',
    }))

  if (topReels.length === 0 && formatData.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<BarChart2 size={20} />}
          title="No data yet"
          description="Run the weekly scraper to populate your analytics data."
        />
      </Card>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Follower growth — placeholder */}
      <Card style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.2px' }}>Follower Growth</div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>Monthly follower count</div>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 600,
            padding: '2px 8px', borderRadius: 999,
            background: 'rgba(255,255,255,0.35)', color: 'rgba(255,255,255,0.35)',
          }}>
            Connect Instagram to unlock
          </span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={DUMMY_FOLLOWER_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" stroke="var(--border)" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
            <YAxis stroke="var(--border)" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="followers" stroke="var(--accent)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Format performance */}
      {formatData.length > 0 && (
        <Card style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.2px' }}>Format Performance</div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>Average views per content format</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={formatData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="format" stroke="var(--border)" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
              <YAxis stroke="var(--border)" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [typeof v === 'number' ? v.toLocaleString() : v, 'Avg Views']}
              />
              <Bar dataKey="avgViews" radius={[4, 4, 0, 0]}>
                {formatData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.avgViews === maxViews ? 'var(--accent)' : 'var(--border)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Top reels table */}
      {topReels.length > 0 && (
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.2px' }}>Top Reels</div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>Your best performing content</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['#', 'Hook', 'Views', 'Likes', 'Date'].map(h => (
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
                {topReels.map((r) => (
                  <tr key={r.rank} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted-foreground)', fontWeight: 700 }}>{r.rank}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--foreground)', maxWidth: 320 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.hook}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>
                      {(r.views ?? 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted-foreground)' }}>
                      {(r.likes ?? 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted-foreground)' }}>{r.date}</td>
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
