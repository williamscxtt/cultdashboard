'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  RefreshCw, TrendingUp, TrendingDown,
  Play, Eye, Heart, MessageCircle, Bookmark, Zap, ExternalLink,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts'
import { Card } from '@/components/ui'
import type { ClientReel, FollowerSnapshot } from '@/lib/types'

// ─── Instagram icon ───────────────────────────────────────────────────────────
function IgIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="5" stroke={color} strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke={color} strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.2" fill={color} />
    </svg>
  )
}

function YouTubeIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" stroke="currentColor" strokeWidth="2" />
      <polygon points="9.75,15.02 15.5,12 9.75,8.98 9.75,15.02" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

function TikTokIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  )
}

// ─── constants ────────────────────────────────────────────────────────────────
const TIME_RANGES = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '1m', days: 30 },
  { label: '3m', days: 90 },
  { label: '1y', days: 365 },
]

const IG_GRADIENTS = [
  'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)',
  'linear-gradient(135deg,#405de6,#5851db,#833ab4)',
  'linear-gradient(135deg,#fd1d1d,#fcb045)',
  'linear-gradient(135deg,#833ab4,#405de6)',
  'linear-gradient(135deg,#f77737,#e1306c)',
  'linear-gradient(135deg,#5851db,#833ab4)',
]

const tooltipStyle = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--foreground)',
  fontSize: 12,
  boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function pct(curr: number, prev: number): number | null {
  if (prev === 0) return null
  return Math.round(((curr - prev) / prev) * 100)
}

function filterByDays(reels: ClientReel[], days: number, offset = 0): ClientReel[] {
  const now = Date.now()
  const end = now - offset * days * 86_400_000
  const start = end - days * 86_400_000
  return reels.filter(r => {
    const t = new Date(r.date).getTime()
    return t >= start && t < end
  })
}

// ─── sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const pts = data.map((v, i) => ({ i, v }))
  if (pts.length < 2) return null
  return (
    <ResponsiveContainer width={80} height={36}>
      <AreaChart data={pts} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <defs>
          <linearGradient id={`sg-${color.replace(/[^a-z]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone" dataKey="v"
          stroke={color} strokeWidth={1.5}
          fill={`url(#sg-${color.replace(/[^a-z]/gi, '')})`}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, change, sparkData, accentColor = 'var(--accent)', nullLabel = 'no prior data',
}: {
  label: string; value: string; change: number | null; sparkData: number[]; accentColor?: string; nullLabel?: string
}) {
  const up = change !== null && change >= 0
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '20px 20px 16px',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex', flexDirection: 'column', gap: 0,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)',
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {label}
        </span>
        <Sparkline data={sparkData} color={accentColor} />
      </div>
      <div style={{
        fontSize: 30, fontWeight: 800, color: 'var(--foreground)',
        letterSpacing: '-0.5px', lineHeight: 1.1, marginBottom: 8,
      }}>
        {value}
      </div>
      {change !== null ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 3,
          fontSize: 12, fontWeight: 600,
          color: up ? 'hsl(142 50% 45%)' : 'hsl(0 65% 50%)',
        }}>
          {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {up ? '+' : ''}{change}%
          <span style={{ fontWeight: 400, color: 'var(--muted-foreground)', marginLeft: 2 }}>
            vs prev period
          </span>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{nullLabel}</div>
      )}
    </div>
  )
}

// ─── chart toggle button ──────────────────────────────────────────────────────
function Toggle({
  options, value, onChange,
}: {
  options: string[]; value: string; onChange: (v: string) => void
}) {
  return (
    <div style={{
      display: 'flex', gap: 2, background: 'var(--muted)', borderRadius: 6, padding: 2,
    }}>
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)} style={{
          padding: '3px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
          fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
          background: value === opt ? 'var(--card)' : 'transparent',
          color: value === opt ? 'var(--foreground)' : 'var(--muted-foreground)',
          transition: 'all 0.15s',
        }}>
          {opt}
        </button>
      ))}
    </div>
  )
}

// ─── chart section header ─────────────────────────────────────────────────────
function ChartHeader({
  title, sub, toggle,
}: {
  title: string; sub: string; toggle?: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.3px', lineHeight: 1 }}>
          {sub}
        </div>
      </div>
      {toggle}
    </div>
  )
}

// ─── reel analysis panel ──────────────────────────────────────────────────────
interface ReelAnalysis {
  verdict: string
  score: number
  hook_score: number
  performance_context: string
  what_worked: string[]
  what_to_improve: string[]
  audience_fit: string
  suggested_hook: string
}

const VERDICT_COLORS: Record<string, string> = {
  Exceptional: 'hsl(142 71% 35%)',
  Strong:      'hsl(142 50% 45%)',
  Average:     'hsl(38 92% 45%)',
  Weak:        'hsl(0 65% 50%)',
  Poor:        'hsl(0 72% 40%)',
}

function AnalysisPanel({ analysis }: { analysis: ReelAnalysis }) {
  const color = VERDICT_COLORS[analysis.verdict] ?? 'var(--muted-foreground)'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Score row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '3px 10px', borderRadius: 20,
          background: `${color}22`, border: `1px solid ${color}55`,
          fontSize: 11, fontWeight: 700, color,
        }}>
          {analysis.verdict} · {analysis.score}/100
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
          Hook: {analysis.hook_score}/100
        </div>
      </div>

      {/* Performance context */}
      <p style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.55, margin: 0, fontStyle: 'italic' }}>
        {analysis.performance_context}
      </p>

      {/* What worked */}
      {analysis.what_worked?.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'hsl(142 50% 45%)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>What worked</div>
          {analysis.what_worked.map((point, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--foreground)', lineHeight: 1.5, paddingLeft: 10, borderLeft: '2px solid hsl(142 50% 45%)', marginBottom: 4 }}>
              {point}
            </div>
          ))}
        </div>
      )}

      {/* What to improve */}
      {analysis.what_to_improve?.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'hsl(38 92% 45%)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Improve</div>
          {analysis.what_to_improve.map((point, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--foreground)', lineHeight: 1.5, paddingLeft: 10, borderLeft: '2px solid hsl(38 92% 45%)', marginBottom: 4 }}>
              {point}
            </div>
          ))}
        </div>
      )}

      {/* Audience fit */}
      {analysis.audience_fit && (
        <p style={{ fontSize: 11, color: 'var(--muted-foreground)', lineHeight: 1.5, margin: 0 }}>
          <strong style={{ color: 'var(--foreground)' }}>Audience fit:</strong> {analysis.audience_fit}
        </p>
      )}

      {/* Suggested hook */}
      {analysis.suggested_hook && (
        <div style={{
          padding: '8px 10px', borderRadius: 6,
          background: 'hsl(220 90% 56% / 0.08)',
          border: '1px solid hsl(220 90% 56% / 0.2)',
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'hsl(220 90% 56%)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Stronger hook</div>
          <div style={{ fontSize: 11, color: 'var(--foreground)', lineHeight: 1.5, fontStyle: 'italic' }}>
            &ldquo;{analysis.suggested_hook}&rdquo;
          </div>
        </div>
      )}
    </div>
  )
}

// ─── reel card ────────────────────────────────────────────────────────────────
function ReelCard({ reel, idx, profileId }: { reel: ClientReel; idx: number; profileId?: string }) {
  const [analysing, setAnalysing] = useState(false)
  const [analysis, setAnalysis] = useState<ReelAnalysis | null>(null)
  const [showAnalysis, setShowAnalysis] = useState(false)

  const gradient = IG_GRADIENTS[idx % IG_GRADIENTS.length]
  const hookText = reel.hook || reel.caption?.slice(0, 80) || '(no hook)'
  const date = reel.date
    ? new Date(reel.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
    : ''
  // Construct permalink from reel_id if not stored
  const reelLink = reel.permalink || (reel.reel_id ? `https://www.instagram.com/reel/${reel.reel_id}/` : null)
  const canAnalyse = !!(reel.transcript || reel.caption || reel.hook) && !!profileId

  async function handleAnalyse() {
    if (!canAnalyse || analysing) return
    setShowAnalysis(true)
    setAnalysing(true)
    setAnalysis(null)
    try {
      const res = await fetch('/api/instagram/analyze-reel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reelId: reel.reel_id, profileId }),
      })
      const data = await res.json()
      if (data.analysis) setAnalysis(data.analysis)
    } catch { /* silently fail */ }
    setAnalysing(false)
  }

  const thumbnailInner = (
    <div style={{
      height: 110,
      background: reel.thumbnail_url ? 'transparent' : gradient,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {reel.thumbnail_url && (
        <img
          src={reel.thumbnail_url}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={e => {
            const img = e.currentTarget as HTMLImageElement
            img.style.display = 'none'
            const parent = img.parentElement as HTMLElement
            parent.style.background = gradient
          }}
        />
      )}
      <div style={{
        position: 'absolute', top: 8, left: 8,
        display: 'flex', alignItems: 'center', gap: 4,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        borderRadius: 5, padding: '3px 7px',
        fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: '0.03em',
      }}>
        <IgIcon size={10} color="#fff" /> instagram
      </div>
      {reel.format_type && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          borderRadius: 5, padding: '3px 7px',
          fontSize: 9, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {reel.format_type.replace(/_/g, ' ')}
        </div>
      )}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 34, height: 34, borderRadius: '50%',
        background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Play size={13} fill="#fff" color="#fff" />
      </div>
      <div style={{
        position: 'absolute', bottom: 8, left: 8,
        fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 500,
      }}>
        {date}
      </div>
    </div>
  )

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.15s',
    }}>
      {/* Thumbnail — links to reel */}
      {reelLink ? (
        <a href={reelLink} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none' }}>
          {thumbnailInner}
        </a>
      ) : thumbnailInner}

      {/* Content */}
      <div style={{ padding: '12px 14px' }}>
        <div style={{
          fontSize: 13, color: 'var(--foreground)', fontWeight: 500,
          lineHeight: 1.45, marginBottom: 8,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
        }}>
          {hookText}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--muted-foreground)' }}>
            <Eye size={10} /> {fmtNum(reel.views ?? 0)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--muted-foreground)' }}>
            <Heart size={10} /> {fmtNum(reel.likes ?? 0)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--muted-foreground)' }}>
            <MessageCircle size={10} /> {fmtNum(reel.comments ?? 0)}
          </span>
          {(reel.saves ?? 0) > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--muted-foreground)' }}>
              <Bookmark size={10} /> {fmtNum(reel.saves ?? 0)}
            </span>
          )}
          {reelLink && (
            <a href={reelLink} target="_blank" rel="noopener noreferrer"
              style={{ marginLeft: 'auto', color: 'var(--muted-foreground)', display: 'flex', lineHeight: 1 }}>
              <ExternalLink size={11} />
            </a>
          )}
        </div>

        {/* Analyse button */}
        {canAnalyse && (
          <button
            onClick={handleAnalyse}
            disabled={analysing}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              marginTop: 10, padding: '5px 10px', borderRadius: 6,
              border: '1px solid var(--border)', background: 'var(--muted)',
              color: 'var(--foreground)', fontSize: 11, fontWeight: 600,
              cursor: analysing ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: analysing ? 0.6 : 1,
              transition: 'all 0.15s', width: '100%', justifyContent: 'center',
            }}
            onMouseEnter={e => { if (!analysing) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)' } }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--foreground)' }}
          >
            <Zap size={10} />
            {analysing ? 'Analysing…' : showAnalysis && analysis ? 'Re-analyse' : 'Analyse'}
          </button>
        )}
      </div>

      {/* Analysis panel */}
      {showAnalysis && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px', background: 'var(--muted)' }}>
          {analysing && !analysis ? (
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', textAlign: 'center', padding: '8px 0' }}>
              Analysing with AI…
            </div>
          ) : analysis ? (
            <AnalysisPanel analysis={analysis} />
          ) : null}
        </div>
      )}
    </div>
  )
}

// ─── main export ──────────────────────────────────────────────────────────────
interface Props {
  profileId: string
  followersCount?: number | null
  igUsername?: string | null
  followerHistory?: FollowerSnapshot[]
  profileName?: string
  dashboardBio?: string
  focusThisWeek?: string
}
interface SyncResult { synced: number; total: number; classified?: number; warning?: string }

export default function AnalyticsDashboard({ profileId, followersCount, igUsername, followerHistory = [], profileName, dashboardBio, focusThisWeek }: Props) {
  const [reels, setReels] = useState<ClientReel[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('1m')
  const [viewsMode, setViewsMode] = useState('Daily')
  const [engMode, setEngMode] = useState('Daily')
  const [contentSort, setContentSort] = useState('Recent')
  const [activePlatform, setActivePlatform] = useState('All')

  const fetchReels = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/instagram/reels?profileId=${profileId}&limit=200&offset=0`)
      if (res.ok) {
        const data = await res.json()
        setReels(data.reels ?? [])
        setTotal(data.total ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [profileId])

  useEffect(() => { fetchReels() }, [fetchReels])

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    setSyncError(null)
    try {
      const res = await fetch('/api/instagram/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      })
      const data = await res.json()
      if (data.error) {
        if (data.error === 'token_expired') setSyncError('Instagram session expired. Reconnect in Settings.')
        else if (data.error === 'rate_limited') setSyncError('Rate limit hit. Try again in a few minutes.')
        else setSyncError(data.error)
      } else {
        setSyncResult({ synced: data.synced, total: data.total, warning: data.warning })
        // Auto-refresh thumbnails after every sync
        fetch('/api/instagram/sync', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId }),
        }).catch(() => {})
        await fetchReels()
      }
    } catch {
      setSyncError('Network error. Check your connection.')
    } finally {
      setSyncing(false)
    }
  }

  const days = TIME_RANGES.find(t => t.label === timeRange)?.days ?? 30
  const currentReels = useMemo(() => filterByDays(reels, days, 0), [reels, days])
  const prevReels    = useMemo(() => filterByDays(reels, days, 1), [reels, days])

  // ── aggregate stats ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const curViews  = currentReels.reduce((a, r) => a + (r.views ?? 0), 0)
    const prvViews  = prevReels.reduce((a, r) => a + (r.views ?? 0), 0)
    const curEng    = currentReels.reduce((a, r) => a + (r.likes ?? 0) + (r.comments ?? 0) + (r.saves ?? 0) + (r.shares ?? 0), 0)
    const prvEng    = prevReels.reduce((a, r) => a + (r.likes ?? 0) + (r.comments ?? 0) + (r.saves ?? 0) + (r.shares ?? 0), 0)

    // Follower history: last N days of snapshots
    const fSnap = followerHistory.slice(-days)
    const followerSpark = fSnap.map(s => s.count)
    const followerChange = fSnap.length >= 2
      ? pct(fSnap[fSnap.length - 1].count, fSnap[0].count)
      : null

    return {
      views:     { value: fmtNum(curViews), change: pct(curViews, prvViews),    spark: currentReels.map(r => r.views ?? 0) },
      eng:       { value: fmtNum(curEng),   change: pct(curEng, prvEng),        spark: currentReels.map(r => (r.likes ?? 0) + (r.comments ?? 0) + (r.saves ?? 0) + (r.shares ?? 0)) },
      followers: { value: followersCount != null ? fmtNum(followersCount) : '—', change: followerChange, spark: followerSpark },
    }
  }, [currentReels, prevReels, followersCount, followerHistory, days])

  // ── views over time ───────────────────────────────────────────────────────
  const viewsChart = useMemo(() => {
    const sorted = [...currentReels].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    let cum = 0
    return sorted.map(r => {
      cum += r.views ?? 0
      return {
        date: new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        Daily: r.views ?? 0,
        Cumulative: cum,
      }
    })
  }, [currentReels])

  // ── engagements over time ─────────────────────────────────────────────────
  const engChart = useMemo(() => {
    const sorted = [...currentReels].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    let cum = 0
    return sorted.map(r => {
      const e = (r.likes ?? 0) + (r.comments ?? 0) + (r.saves ?? 0)
      cum += e
      return {
        date: new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        Daily: e,
        Cumulative: cum,
      }
    })
  }, [currentReels])

  // ── format performance ────────────────────────────────────────────────────
  const formatData = useMemo(() => {
    const g: Record<string, number[]> = {}
    currentReels.forEach(r => {
      if (r.format_type) {
        g[r.format_type] = g[r.format_type] ?? []
        g[r.format_type].push(r.views ?? 0)
      }
    })
    return Object.entries(g)
      .map(([fmt, views]) => ({
        format: fmt.replace(/_/g, ' '),
        avgViews: Math.round(views.reduce((a, b) => a + b, 0) / views.length),
        count: views.length,
      }))
      .sort((a, b) => b.avgViews - a.avgViews)
  }, [currentReels])
  const maxFmtV = formatData.length ? Math.max(...formatData.map(d => d.avgViews)) : 0

  // ── content library ───────────────────────────────────────────────────────
  const libraryReels = useMemo(() => {
    const pool = contentSort === 'Recent'
      ? [...reels].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      : contentSort === 'Top Views'
      ? [...reels].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
      : [...reels].sort((a, b) => {
          const ea = (a.likes ?? 0) + (a.comments ?? 0) + (a.saves ?? 0)
          const eb = (b.likes ?? 0) + (b.comments ?? 0) + (b.saves ?? 0)
          return eb - ea
        })
    return pool.slice(0, 24)
  }, [reels, contentSort])

  // ── totals for chart sub-labels ───────────────────────────────────────────
  const totalViews   = currentReels.reduce((a, r) => a + (r.views ?? 0), 0)
  const totalEng     = currentReels.reduce((a, r) => a + (r.likes ?? 0) + (r.comments ?? 0) + (r.saves ?? 0) + (r.shares ?? 0), 0)

  // ── engagement breakdown ──────────────────────────────────────────────────
  const engBreakdown = useMemo(() => [
    { label: 'Likes',    value: currentReels.reduce((a, r) => a + (r.likes ?? 0), 0),    color: '#e1306c' },
    { label: 'Comments', value: currentReels.reduce((a, r) => a + (r.comments ?? 0), 0), color: '#833ab4' },
    { label: 'Saves',    value: currentReels.reduce((a, r) => a + (r.saves ?? 0), 0),    color: '#405de6' },
    { label: 'Shares',   value: currentReels.reduce((a, r) => a + (r.shares ?? 0), 0),   color: '#fcb045' },
  ], [currentReels])

  if (loading) {
    return (
      <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ height: 100, borderRadius: 12, background: 'var(--muted)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ height: 220, borderRadius: 12, background: 'var(--muted)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        {/* Name + sync row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.5px', margin: 0, lineHeight: 1.1 }}>
              {profileName ? `${profileName}'s Dashboard` : 'Dashboard'}
            </h1>
            <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '4px 0 0' }}>
              {total > 0 ? `${total} reels tracked · Instagram` : 'Connect Instagram in Settings to start'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={handleSync} disabled={syncing} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              height: 36, padding: '0 16px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--card)', color: 'var(--foreground)',
              fontWeight: 600, fontSize: 13, cursor: syncing ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: syncing ? 0.6 : 1, transition: 'opacity 0.15s',
            }}>
              <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
              {syncing ? 'Syncing…' : 'Sync Instagram'}
            </button>
          </div>
        </div>

        {/* Bio + weekly focus */}
        {(dashboardBio || focusThisWeek) && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {dashboardBio && (
              <div style={{
                flex: '1 1 300px', padding: '14px 18px', borderRadius: 10,
                background: 'var(--card)', border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  About
                </div>
                <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.6, margin: 0 }}>
                  {dashboardBio}
                </p>
              </div>
            )}
            {focusThisWeek && (
              <div style={{
                flex: '0 1 280px', padding: '14px 18px', borderRadius: 10,
                background: 'hsl(var(--accent-hsl, 25 100% 55%) / 0.08)',
                border: '1px solid hsl(var(--accent-hsl, 25 100% 55%) / 0.25)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  🎯 This Week's Focus
                </div>
                <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
                  {focusThisWeek}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Platform + time filters ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        {/* Platform tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { label: 'All', icon: null, enabled: true },
            { label: 'Instagram', icon: <IgIcon size={13} />, enabled: true },
            { label: 'YouTube', icon: <YouTubeIcon size={13} />, enabled: false },
            { label: 'TikTok', icon: <TikTokIcon size={13} />, enabled: false },
          ].map(({ label, icon, enabled }) => {
            const isActive = activePlatform === label
            return (
              <button
                key={label}
                onClick={() => enabled && setActivePlatform(label)}
                disabled={!enabled}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: isActive ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: isActive ? 'hsl(220 90% 56% / 0.08)' : 'var(--card)',
                  color: enabled ? 'var(--foreground)' : 'var(--muted-foreground)',
                  cursor: enabled ? 'pointer' : 'default',
                  opacity: enabled ? 1 : 0.5,
                  fontFamily: 'inherit', position: 'relative' as const,
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                {icon}
                {label}
                {!enabled && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                    background: 'var(--muted)', color: 'var(--muted-foreground)',
                    padding: '1px 4px', borderRadius: 3, letterSpacing: '0.04em',
                  }}>
                    soon
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Time range */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--muted)', borderRadius: 8, padding: 3 }}>
          {TIME_RANGES.map(({ label }) => (
            <button key={label} onClick={() => setTimeRange(label)} style={{
              padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
              background: timeRange === label ? 'var(--card)' : 'transparent',
              color: timeRange === label ? 'var(--foreground)' : 'var(--muted-foreground)',
              transition: 'all 0.15s', boxShadow: timeRange === label ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Feedback banners ────────────────────────────────────────────────── */}
      {syncResult && (
        <div style={{
          marginBottom: 16, padding: '10px 14px', borderRadius: 8,
          background: 'hsl(142 50% 10%)', color: 'hsl(142 50% 55%)',
          fontSize: 13, fontWeight: 500, border: '1px solid hsl(142 50% 20%)',
        }}>
          Synced {syncResult.synced} new reel{syncResult.synced !== 1 ? 's' : ''} of {syncResult.total} found.
          {syncResult.classified ? <span style={{ marginLeft: 8 }}>Classified {syncResult.classified} reel{syncResult.classified !== 1 ? 's' : ''}.</span> : null}
          {syncResult.warning && <span style={{ color: 'hsl(38 92% 55%)', marginLeft: 8 }}>{syncResult.warning}</span>}
        </div>
      )}
      {syncError && (
        <div style={{
          marginBottom: 16, padding: '10px 14px', borderRadius: 8,
          background: 'hsl(0 50% 10%)', color: 'hsl(0 65% 60%)',
          fontSize: 13, fontWeight: 500, border: '1px solid hsl(0 50% 20%)',
        }}>
          {syncError}
        </div>
      )}

      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
        <StatCard label="Views" value={stats.views.value} change={stats.views.change} sparkData={stats.views.spark} accentColor="hsl(220 90% 56%)" />
        <StatCard label="Engagements" value={stats.eng.value} change={stats.eng.change} sparkData={stats.eng.spark} accentColor="hsl(280 70% 56%)" />
        <StatCard
          label="Followers"
          value={stats.followers.value}
          change={stats.followers.change}
          sparkData={stats.followers.spark}
          accentColor="hsl(38 90% 55%)"
          nullLabel="synced on connect"
        />
      </div>

      {/* ── Instagram account banner ─────────────────────────────────────────── */}
      {igUsername && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
          padding: '8px 14px', borderRadius: 8, background: 'var(--muted)',
          fontSize: 12, color: 'var(--muted-foreground)',
        }}>
          <IgIcon size={13} color="var(--muted-foreground)" />
          @{igUsername}
          {followersCount != null && (
            <span style={{ marginLeft: 4 }}>· {fmtNum(followersCount)} followers</span>
          )}
        </div>
      )}

      {reels.length > 0 && (
        <>
          {/* ── Charts 2×2 ────────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

            {/* Views Over Time */}
            <Card style={{ padding: 20 }}>
              <ChartHeader
                title="Views Over Time"
                sub={fmtNum(totalViews)}
                toggle={<Toggle options={['Daily', 'Cumulative']} value={viewsMode} onChange={setViewsMode} />}
              />
              <ResponsiveContainer width="100%" height={170}>
                <AreaChart data={viewsChart} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="vGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(220 90% 56%)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="hsl(220 90% 56%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" stroke="none" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis stroke="none" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} tickFormatter={(v: number) => fmtNum(v)} width={40} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [typeof v === 'number' ? v.toLocaleString() : String(v), viewsMode + ' Views']} />
                  <Area type="monotone" dataKey={viewsMode} stroke="hsl(220 90% 56%)" strokeWidth={2} fill="url(#vGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Engagements Over Time */}
            <Card style={{ padding: 20 }}>
              <ChartHeader
                title="Engagements Over Time"
                sub={fmtNum(totalEng)}
                toggle={<Toggle options={['Daily', 'Cumulative']} value={engMode} onChange={setEngMode} />}
              />
              <ResponsiveContainer width="100%" height={170}>
                <AreaChart data={engChart} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="eGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(280 70% 56%)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="hsl(280 70% 56%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" stroke="none" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis stroke="none" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} tickFormatter={(v: number) => fmtNum(v)} width={40} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [typeof v === 'number' ? v.toLocaleString() : String(v), engMode + ' Engagements']} />
                  <Area type="monotone" dataKey={engMode} stroke="hsl(280 70% 56%)" strokeWidth={2} fill="url(#eGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Engagement Breakdown */}
            <Card style={{ padding: 20 }}>
              <ChartHeader title="Engagement Breakdown" sub={fmtNum(totalEng) + ' total'} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                {engBreakdown.map(({ label, value, color }) => {
                  const pctVal = totalEng > 0 ? (value / totalEng) * 100 : 0
                  return (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>{label}</span>
                        <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                          {fmtNum(value)} <span style={{ color, fontWeight: 700 }}>({pctVal.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: 'var(--muted)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pctVal}%`, borderRadius: 3, background: color, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Top Reel</div>
                {(() => {
                  const top = [...currentReels].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))[0]
                  if (!top) return null
                  return (
                    <div style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 700, color: 'hsl(220 90% 60%)' }}>{fmtNum(top.views ?? 0)} views</span>
                      {' · '}{top.hook?.slice(0, 60) || top.caption?.slice(0, 60) || '(no hook)'}
                    </div>
                  )
                })()}
              </div>
            </Card>

            {/* Format Performance */}
            <Card style={{ padding: 20 }}>
              <ChartHeader
                title="Format Performance"
                sub={formatData[0] ? formatData[0].format : '—'}
              />
              {formatData.length > 0 ? (
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={formatData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="format" stroke="none" tick={{ fill: 'var(--muted-foreground)', fontSize: 9 }} />
                    <YAxis stroke="none" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} tickFormatter={(v: number) => fmtNum(v)} width={40} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [typeof v === 'number' ? v.toLocaleString() : String(v), 'Avg Views']} />
                    <Bar dataKey="avgViews" radius={[5, 5, 0, 0]}>
                      {formatData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.avgViews === maxFmtV ? 'hsl(38 90% 55%)' : 'var(--border)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>No format data yet — sync to classify reels</span>
                </div>
              )}
            </Card>

          </div>

          {/* ── Content Library ───────────────────────────────────────────── */}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden',
          }}>
            <div style={{
              padding: '18px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 10,
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.3px' }}>
                Content Library <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted-foreground)' }}>({total})</span>
              </div>
              <div style={{ display: 'flex', gap: 2, background: 'var(--muted)', borderRadius: 8, padding: 3 }}>
                {['Recent', 'Top Views', 'Top Engagement'].map(opt => (
                  <button key={opt} onClick={() => setContentSort(opt)} style={{
                    padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                    background: contentSort === opt ? 'var(--card)' : 'transparent',
                    color: contentSort === opt ? 'var(--foreground)' : 'var(--muted-foreground)',
                    transition: 'all 0.15s',
                    boxShadow: contentSort === opt ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                  }}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              padding: 20,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 14,
            }}>
              {libraryReels.map((reel, idx) => (
                <ReelCard key={reel.reel_id || reel.id || idx} reel={reel} idx={idx} profileId={profileId} />
              ))}
            </div>
          </div>
        </>
      )}

      {reels.length === 0 && !loading && (
        <div style={{
          padding: '60px 24px', textAlign: 'center',
          background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)', marginBottom: 8 }}>No reels yet</div>
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)', margin: '0 0 20px' }}>
            Connect your Instagram in Settings, then click Sync.
          </p>
          <button onClick={handleSync} disabled={syncing} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            height: 36, padding: '0 20px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff',
            fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <RefreshCw size={13} />
            {syncing ? 'Syncing…' : 'Sync Instagram'}
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
