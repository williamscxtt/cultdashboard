'use client'

import { founderOverview, type FounderStatistics } from '@/lib/founder-statistics'

import type { WeeklyAnalysisReport } from '@/lib/weekly-analysis'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  RefreshCw, TrendingUp, TrendingDown,
  Play, Eye, Heart, MessageCircle, Bookmark, Zap, ExternalLink,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts'
import { Card } from '@/components/ui'
import { useSyncProgress } from '@/components/dashboard/SyncProgress'
import { instagramSyncFeedback } from '@/lib/instagram-sync-feedback'
import { dashboardRequest } from '@/lib/dashboard-request'
import { useIsMobile } from '@/lib/use-mobile'
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
  'linear-gradient(135deg,rgba(255,255,255,0.5),rgba(255,255,255,0.6),rgba(255,255,255,0.2))',
  'linear-gradient(135deg,rgba(255,255,255,0.3),rgba(255,255,255,0.35),rgba(255,255,255,0.5))',
  'linear-gradient(135deg,rgba(255,255,255,0.6),rgba(255,255,255,0.2))',
  'linear-gradient(135deg,rgba(255,255,255,0.5),rgba(255,255,255,0.3))',
  'linear-gradient(135deg,rgba(255,255,255,0.4),rgba(255,255,255,0.75))',
  'linear-gradient(135deg,rgba(255,255,255,0.35),rgba(255,255,255,0.5))',
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

// ─── animated number (count-up) ──────────────────────────────────────────────
function AnimatedValue({ value }: { value: string }) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (prevRef.current === value) return
    if (!/\d/.test(value)) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      prevRef.current = value
      setDisplay(value)
      return
    }
    // Parse numbers like "17.3M", "1.4K", "123"
    const parse = (s: string) => {
      const m = s.match(/([\d.]+)([MKmk]?)/)
      if (!m) return { n: 0, suffix: '', prefix: '' }
      const n = parseFloat(m[1])
      const mult = m[2]?.toUpperCase() === 'M' ? 1e6 : m[2]?.toUpperCase() === 'K' ? 1e3 : 1
      return { n: n * mult, suffix: m[2] || '', prefix: s.replace(m[0], '') }
    }
    const from = parse(prevRef.current)
    const to = parse(value)
    const start = performance.now()
    const dur = 600
    function fmt(n: number): string {
      if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
      if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
      return Math.round(n).toLocaleString()
    }
    function tick(now: number) {
      const t = Math.min((now - start) / dur, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      const cur = from.n + (to.n - from.n) * ease
      setDisplay(fmt(cur))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else { setDisplay(value); prevRef.current = value }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value])

  return <>{display}</>
}

// ─── stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, change, sparkData, accentColor = '#3B82F6', nullLabel = 'no prior data', delay = 0,
}: {
  label: string; value: string; change: number | null; sparkData: number[]; accentColor?: string; nullLabel?: string; delay?: number
}) {
  const up = change !== null && change >= 0
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay }}
      style={{
        background: `linear-gradient(135deg, ${accentColor}22 0%, ${accentColor}0E 45%, transparent 100%)`,
        border: `1px solid ${accentColor}50`,
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: `0 0 40px ${accentColor}1A, 0 2px 12px rgba(0,0,0,0.18)`,
      }}
    >
      {/* Ambient glow top-right */}
      <div style={{
        position: 'absolute', top: -30, right: -20, width: 130, height: 130,
        background: accentColor, opacity: 0.15, borderRadius: '50%',
        filter: 'blur(38px)', pointerEvents: 'none',
      }} />

      <div style={{ padding: '20px 20px 18px', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: accentColor,
            textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.85, whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {label}
          </span>
          <Sparkline data={sparkData} color={accentColor} />
        </div>

        <div style={{
          fontSize: 34, fontWeight: 800, color: 'var(--foreground)',
          letterSpacing: '-1px', lineHeight: 1, marginBottom: 12,
          fontFamily: 'var(--font-display)',
        }}>
          <AnimatedValue value={value} />
        </div>

        {change !== null ? (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 700,
            background: up ? 'var(--change-positive-bg)' : 'var(--change-negative-bg)',
            border: `1px solid ${up ? 'var(--change-positive-border)' : 'var(--change-negative-border)'}`,
            color: up ? 'var(--change-positive-text)' : 'var(--change-negative-text)',
            padding: '3px 8px', borderRadius: 6,
          }}>
            {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {up ? '+' : ''}{change}%
            <span style={{ fontWeight: 500, opacity: 0.65, marginLeft: 1 }}>prev period</span>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontStyle: 'italic' }}>{nullLabel}</div>
        )}
      </div>
    </motion.div>
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
          {title}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.4px', lineHeight: 1, fontFamily: 'var(--font-display)' }}>
          {sub}
        </div>
      </div>
      {toggle}
    </div>
  )
}

// ─── chart card wrapper ───────────────────────────────────────────────────────
function ChartCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay }}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '22px 22px 16px',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Bypasses Recharts ResponsiveContainer, which has a known bug on iOS Safari
 * where ResizeObserver fires with width=0. Instead we measure the container
 * directly with getBoundingClientRect and only render the chart once we have
 * a real width.
 */
function MeasuredChart({ height, children }: { height: number; children: (width: number) => React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const measure = () => {
      const w = el.getBoundingClientRect().width
      if (w > 0) setWidth(w)
    }

    measure()

    // Re-measure on resize (orientation change, window resize)
    const ro = new ResizeObserver(measure)
    ro.observe(el)

    // Also listen for window resize as a fallback for iOS
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  return (
    <div ref={ref} style={{ width: '100%', height }}>
      {width > 0 && children(width)}
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
  Exceptional: '#3B82F6',
  Strong:      'var(--foreground)',
  Average:     'var(--muted-foreground)',
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
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>What worked</div>
          {analysis.what_worked.map((point, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--foreground)', lineHeight: 1.5, paddingLeft: 10, borderLeft: '2px solid var(--border)', marginBottom: 4 }}>
              {point}
            </div>
          ))}
        </div>
      )}

      {/* What to improve */}
      {analysis.what_to_improve?.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Improve</div>
          {analysis.what_to_improve.map((point, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--foreground)', lineHeight: 1.5, paddingLeft: 10, borderLeft: '2px solid var(--border)', marginBottom: 4 }}>
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
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Stronger hook</div>
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
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 10px 30px rgba(0,0,0,0.25), 0 0 0 1px rgba(139,92,246,0.15)' }}
      transition={{ duration: 0.15 }}
      style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 14, overflow: 'hidden', cursor: 'default',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', fontSize: 12, color: 'var(--muted-foreground)' }}>
              <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(59, 130, 246, 0.3)', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              Analysing with AI…
            </div>
          ) : analysis ? (
            <AnalysisPanel analysis={analysis} />
          ) : null}
        </div>
      )}
    </motion.div>
  )
}

// ─── weekly analysis ──────────────────────────────────────────────────────────
type WeeklyAnalysisData = WeeklyAnalysisReport

function WeeklyAnalysisCard({ analysis, isMobile, updatedDaysAgo }: { analysis: WeeklyAnalysisData; isMobile: boolean; updatedDaysAgo: number | null }) {
  const sections: { key: 'what_worked' | 'what_to_improve' | 'this_week'; label: string; color: string }[] = [
    { key: 'what_worked',    label: 'What worked',    color: '#4ade80' },
    { key: 'what_to_improve', label: 'Improve',       color: 'hsl(38 92% 60%)' },
    { key: 'this_week',      label: 'This week',      color: '#3B82F6' },
  ]
  const hasSections = analysis.what_to_improve || analysis.this_week
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: 0.08 }}
      style={{
        background: 'var(--card)',
        border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: '0 0 30px rgba(59,130,246,0.08), 0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: '1px solid var(--border)',
        background: 'rgba(59,130,246,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Zap size={12} color="#3B82F6" fill="#3B82F6" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '0.02em' }}>
            Weekly Analysis
          </span>
        </div>
        {updatedDaysAgo !== null && (
          <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>
            {analysis._meta.source === 'syncing' ? 'Statistics updating' : analysis._meta.source !== 'ready' ? 'Saved data' : updatedDaysAgo === 0 ? 'Updated today' : `Updated ${updatedDaysAgo}d ago`}
          </span>
        )}
      </div>
      <div style={{ padding: '9px 16px', fontSize: 11, lineHeight: 1.5, color: 'var(--muted-foreground)', borderBottom: '1px solid var(--border)' }}>
        {new Date(`${analysis._meta.period_start}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}
        {' – '}
        {new Date(`${analysis._meta.period_end}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}
        {' · '}{analysis._meta.post_count} posts tracked{' · '}{analysis._meta.active_days}/7 days active
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile || !hasSections ? '1fr' : 'repeat(3, 1fr)',
      }}>
        {sections.map(({ key, label, color }, i) => {
          const text = analysis[key]
          if (!text) return null
          return (
            <div key={key} style={{
              padding: '14px 16px',
              borderRight: (!isMobile && hasSections && i < 2) ? '1px solid var(--border)' : 'none',
              borderBottom: (isMobile && hasSections && i < 2) ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 9, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
              </div>
              <p style={{
                fontSize: 12, color: 'var(--foreground)', lineHeight: 1.65, margin: 0,
                fontWeight: key === 'this_week' ? 600 : 400,
              }}>
                {text}
              </p>
            </div>
          )
        })}
      </div>
    </motion.div>
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
  willFollowerViewRatio?: number | null
}
interface SyncResult { synced: number; total: number; classified?: number; warning?: string; message?: string }

export default function AnalyticsDashboard({ profileId, followersCount, igUsername, followerHistory = [], profileName, dashboardBio, focusThisWeek, willFollowerViewRatio }: Props) {
  const { startSync, updateProgress, finishSync } = useSyncProgress()
  const isMobile = useIsMobile()

  function parseWeeklyReport(raw?: string): WeeklyAnalysisData | null {
    if (!raw) return null
    try {
      const report = JSON.parse(raw)
      return report._meta?.version === 3 && report.what_worked ? report as WeeklyAnalysisData : null
    } catch { return null }
  }
  const [weeklyAnalysis, setWeeklyAnalysis] = useState<WeeklyAnalysisData | null>(() => parseWeeklyReport(focusThisWeek))
  useEffect(() => { setWeeklyAnalysis(parseWeeklyReport(focusThisWeek)) }, [profileId, focusThisWeek])
  const [reels, setReels] = useState<ClientReel[]>([])
  const [founderStatistics, setFounderStatistics] = useState<FounderStatistics | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [hasSynced, setHasSynced] = useState(false)
  const [refreshPending, setRefreshPending] = useState(false)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [libraryVisible, setLibraryVisible] = useState(24)
  const [timeRange, setTimeRange] = useState('1m')
  const [viewsMode, setViewsMode] = useState('Daily')
  const [engMode, setEngMode] = useState('Daily')
  const [contentSort, setContentSort] = useState('Recent')
  const [activePlatform, setActivePlatform] = useState('All')
  // Saved followers: opening Analytics does not start an additional paid read.
  const [localFollowers, setLocalFollowers] = useState<number | null>(followersCount ?? null)
  const refreshInFlight = useRef<string | null>(null)

  const fetchReels = useCallback(async () => {
    if (refreshInFlight.current === profileId) return
    refreshInFlight.current = profileId
    // Render saved readings as soon as they arrive. A delayed status request
    // must not hold the cards in a spinner or hide them on every polling tick.
    const saved = dashboardRequest<{ reels?: ClientReel[]; total?: number; founderStatistics?: FounderStatistics | null }>(
      `/api/instagram/reels?profileId=${profileId}&limit=500&offset=0`)
      .then(data => {
        setReels(data.reels ?? [])
        setTotal(data.total ?? 0)
        setFounderStatistics(data.founderStatistics ?? null)
      }).catch(error => setSyncError(error instanceof Error ? error.message : 'Your saved statistics could not load. Please try again.'))
      .finally(() => setLoading(false))
    const syncStatus = dashboardRequest<{ has_synced?: boolean; last_synced?: string; sync_status?: string; followers?: number; sync_issue?: string }>(
      `/api/instagram/sync?profileId=${profileId}`)
      .then(status => {
        setHasSynced(Boolean(status.has_synced))
        setLastSynced(status.last_synced ?? null)
        setRefreshPending(['queued', 'running'].includes(status.sync_status ?? ''))
        if (status.sync_status === 'succeeded') setSyncResult(previous => previous
          ? { ...previous, message: 'Your daily statistics are up to date.' } : previous)
        if (typeof status.followers === 'number') setLocalFollowers(status.followers)
        if (status.sync_issue) setSyncError(instagramSyncFeedback(status.sync_issue).message)
      }).catch(() => { /* Saved readings remain usable if the separate status check fails. */ })
    await Promise.allSettled([saved, syncStatus])
    if (refreshInFlight.current === profileId) refreshInFlight.current = null
  }, [profileId])

  useEffect(() => { fetchReels() }, [fetchReels])

  useEffect(() => {
    if (!refreshPending) return
    const poll = setInterval(fetchReels, 30_000)
    return () => clearInterval(poll)
  }, [refreshPending, fetchReels])

  // Re-read the report after saved activity/sync completion changes. The API
  // uses a data fingerprint and never requests another paid Instagram scan.
  useEffect(() => {
    if (loading) return
    const controller = new AbortController()
    fetch(`/api/instagram/weekly-analysis?profileId=${profileId}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok) return
        const data = await response.json()
        if (!controller.signal.aborted && data.analysis?._meta?.version === 3) setWeeklyAnalysis(data.analysis)
      }).catch(() => { /* The server-rendered saved-data summary remains available. */ })
    return () => controller.abort()
  }, [profileId, igUsername, loading, lastSynced])

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    setSyncError(null)

    startSync('Checking your daily statistics refresh…')
    try {
      const data = await dashboardRequest<{ synced: number; total: number; warning?: string; message?: string; has_synced?: boolean; error?: string }>('/api/instagram/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, statisticsOnly: true }),
      })

      if (data.error) {
        finishSync()
        setSyncError(instagramSyncFeedback(data.error).message)
      } else {
        setHasSynced(Boolean(data.has_synced))
        setSyncResult({ synced: data.synced, total: data.total, warning: data.warning, message: data.message })
        finishSync()
        // The sync already persists fresh thumbnails; a second scrape adds cost.
        await fetchReels()
      }
    } catch (error) {
      finishSync()
      setSyncError(error instanceof Error ? error.message : 'Network error. Check your connection.')
    } finally {
      setSyncing(false)
    }
  }

  const days = TIME_RANGES.find(t => t.label === timeRange)?.days ?? 30
  const currentReels = useMemo(() => filterByDays(reels, days, 0), [reels, days])
  const prevReels    = useMemo(() => filterByDays(reels, days, 1), [reels, days])
  const combined = useMemo(() => founderStatistics ? founderOverview(founderStatistics, days) : null, [founderStatistics, days])

  // ── aggregate stats ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const available = hasSynced || total > 0
    const viewsKnown = available && (!currentReels.length || currentReels.some(r => r.views != null))
    const engagementsKnown = available && (!currentReels.length || currentReels.some(r => [r.likes, r.comments, r.saves, r.shares].some(n => n != null)))
    // Views + engagement: both filtered to the selected time window so
    // the "vs prev period" delta is a like-for-like comparison.
    // Note: view counts are accumulated totals per reel at last sync —
    // not views received specifically within this window.
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
      views:     { value: viewsKnown ? fmtNum(curViews) : '—', change: viewsKnown ? pct(curViews, prvViews) : null, spark: [...currentReels].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(r => r.views ?? 0) },
      eng:       { value: engagementsKnown ? fmtNum(curEng) : '—', change: engagementsKnown ? pct(curEng, prvEng) : null, spark: currentReels.map(r => (r.likes ?? 0) + (r.comments ?? 0) + (r.saves ?? 0) + (r.shares ?? 0)) },
      followers: { value: localFollowers != null ? fmtNum(localFollowers) : '—', change: followerChange, spark: followerSpark },
    }
  }, [hasSynced, total, currentReels, prevReels, localFollowers, followerHistory, days])

  const headlineViews = combined ? {
    value: combined.views === null ? '—' : fmtNum(combined.views),
    change: combined.views !== null && combined.previousViews !== null ? pct(combined.views, combined.previousViews) : null,
    spark: combined.spark,
  } : stats.views

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
      const fmt = r.format_type ?? 'Unknown'
      g[fmt] = g[fmt] ?? []
      g[fmt].push(r.views ?? 0)
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
  const libraryReelsSorted = useMemo(() => {
    if (contentSort === 'Recent')
      return [...reels].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    if (contentSort === 'Top Views')
      return [...reels].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    return [...reels].sort((a, b) => {
      const ea = (a.likes ?? 0) + (a.comments ?? 0) + (a.saves ?? 0)
      const eb = (b.likes ?? 0) + (b.comments ?? 0) + (b.saves ?? 0)
      return eb - ea
    })
  }, [reels, contentSort])

  const libraryReels = libraryReelsSorted.slice(0, libraryVisible)

  // ── totals for chart sub-labels ───────────────────────────────────────────
  const totalViews   = currentReels.reduce((a, r) => a + (r.views ?? 0), 0)
  const totalEng     = currentReels.reduce((a, r) => a + (r.likes ?? 0) + (r.comments ?? 0) + (r.saves ?? 0) + (r.shares ?? 0), 0)

  // ── engagement breakdown ──────────────────────────────────────────────────
  const engBreakdown = useMemo(() => [
    { label: 'Likes',    value: currentReels.reduce((a, r) => a + (r.likes ?? 0), 0),    color: '#3B82F6' },
    { label: 'Comments', value: currentReels.reduce((a, r) => a + (r.comments ?? 0), 0), color: 'rgba(59,130,246,0.72)' },
    { label: 'Saves',    value: currentReels.reduce((a, r) => a + (r.saves ?? 0), 0),    color: 'rgba(59,130,246,0.50)' },
    { label: 'Shares',   value: currentReels.reduce((a, r) => a + (r.shares ?? 0), 0),   color: 'rgba(59,130,246,0.30)' },
  ], [currentReels])

  // ── follower-to-view ratio (fixed 30-day window for benchmark comparison) ──
  const thirtyDayReels = useMemo(() => filterByDays(reels, 30, 0), [reels])
  const thirtyDayViews = useMemo(
    () => thirtyDayReels.reduce((a, r) => a + (r.views ?? 0), 0),
    [thirtyDayReels]
  )
  const userViewsPerFollower = useMemo(() => {
    const cutoff = Date.now() - 30 * 86400000
    const snaps30 = followerHistory.filter(s => new Date(s.date).getTime() >= cutoff)
    if (snaps30.length < 2 || thirtyDayViews === 0) return null
    const gain = snaps30[snaps30.length - 1].count - snaps30[0].count
    if (gain <= 0) return null
    return Math.round(thirtyDayViews / gain)
  }, [followerHistory, thirtyDayViews])

  if (loading) {
    return (
      <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[...Array(isMobile ? 2 : 4)].map((_, i) => (
            <div key={i} style={{ height: 100, borderRadius: 12, background: 'var(--muted)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {[...Array(isMobile ? 2 : 4)].map((_, i) => (
            <div key={i} style={{ height: 220, borderRadius: 12, background: 'var(--muted)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
      </div>
    )
  }

  return (
    <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: 1400, margin: '0 auto' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        {/* Name + sync row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.5px', margin: 0, lineHeight: 1.1 }}>
              {profileName ? `${profileName}'s Dashboard` : 'Dashboard'}
            </h1>
            <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '4px 0 0' }}>
              {total > 0 ? `${total} reels tracked · Instagram` : igUsername ? 'Waiting for your first Instagram sync' : 'Connect Instagram in Settings to start'}
              {lastSynced && <> · Last synced {new Date(lastSynced).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }} />
        </div>

        {/* Bio */}
        {dashboardBio && (
          <div style={{
            padding: '12px 16px', borderRadius: 10,
            background: 'var(--card)', border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
              About
            </div>
            <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.6, margin: 0 }}>
              {dashboardBio}
            </p>
          </div>
        )}
      </div>

      {/* ── Platform + time filters ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        {/* Platform tabs */}
        <div aria-label="Platforms" style={{ display: 'flex', gap: 6, overflowX: 'auto', maxWidth: '100%', minWidth: 0, width: isMobile ? '100%' : undefined, paddingBottom: 2 }}>
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
                  display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, whiteSpace: 'nowrap',
                  padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: isActive ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  background: isActive ? 'var(--accent)' : 'var(--card)',
                  color: isActive ? '#ffffff' : (enabled ? 'var(--foreground)' : 'var(--muted-foreground)'),
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
          background: 'var(--muted)', color: 'var(--foreground)',
          fontSize: 13, fontWeight: 500, border: '1px solid var(--border)',
        }}>
          {syncResult.message || <>Synced {syncResult.synced} new reel{syncResult.synced !== 1 ? 's' : ''} of {syncResult.total} found.</>}
          {syncResult.classified ? <span style={{ marginLeft: 8 }}>Classified {syncResult.classified} reel{syncResult.classified !== 1 ? 's' : ''}.</span> : null}
          {syncResult.warning && <span style={{ color: 'var(--muted-foreground)', marginLeft: 8 }}>{syncResult.warning}</span>}
        </div>
      )}
      {syncError && (
        <div role="status" style={{
          marginBottom: 16, padding: '10px 14px', borderRadius: 8,
          background: 'var(--change-negative-bg)', color: 'var(--change-negative-text)',
          fontSize: 13, fontWeight: 500, border: '1px solid var(--change-negative-border)',
        }}>
          {syncError}
        </div>
      )}

      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : `repeat(${combined ? 4 : 3},1fr)`, gap: 12, marginBottom: 8 }}>
        <StatCard label="Total Views" value={headlineViews.value} change={headlineViews.change} sparkData={headlineViews.spark} accentColor="#8B5CF6" delay={0} nullLabel={headlineViews.value === '—' ? 'Awaiting statistics' : 'no prior period data'} />
        {combined && <StatCard label="Posts Published" value={combined.posts === null ? '—' : fmtNum(combined.posts)} change={combined.posts !== null && combined.previousPosts !== null ? pct(combined.posts, combined.previousPosts) : null} sparkData={[]} accentColor="#F59E0B" delay={0.03} nullLabel={days > 30 ? 'Complete history unavailable' : 'Awaiting posting history'} />}
        <StatCard label="Engagements" value={stats.eng.value} change={stats.eng.change} sparkData={stats.eng.spark} accentColor="#3B82F6" delay={0.05} nullLabel={stats.eng.value === '—' ? 'Awaiting statistics' : 'no prior period data'} />
        <StatCard
          label="Followers"
          value={stats.followers.value}
          change={stats.followers.change}
          sparkData={stats.followers.spark}
          accentColor="#10B981"
          nullLabel={stats.followers.value === '—' ? 'Awaiting first sync' : 'latest available count'}
          delay={0.1}
        />
      </div>

      {combined && <p style={{ fontSize: 11, color: 'var(--muted-foreground)', margin: '4px 0 12px' }}>Views and posts combine @williamscxtt + @willscottbiz. Engagements and followers are for the account shown.</p>}

      {/* ── Stat definition note ────────────────────────────────────────────── */}
      <div style={{
        marginBottom: 16, padding: '7px 12px', borderRadius: 7,
        background: 'var(--muted)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 500, lineHeight: 1.5 }}>
          <span style={{ color: 'var(--foreground)', fontWeight: 700 }}>What these numbers mean: </span>
          Views and engagements cover reels <em>posted</em> in the selected window — not views received during that window on older content.
          Each reel&apos;s view count is its total accumulated plays at the time of the last sync.
          {' '}&ldquo;vs prev period&rdquo; compares against the equal-length window immediately before.
        </span>
      </div>

      {/* ── Instagram account banner ─────────────────────────────────────────── */}
      {igUsername && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: weeklyAnalysis ? 12 : 16,
          padding: '8px 14px', borderRadius: 8, background: 'var(--muted)',
          fontSize: 12, color: 'var(--muted-foreground)',
        }}>
          <IgIcon size={13} color="var(--muted-foreground)" />
          @{igUsername}
          {localFollowers != null && (
            <span style={{ marginLeft: 4 }}>· {fmtNum(localFollowers)} followers</span>
          )}
        </div>
      )}

      {/* ── Weekly Analysis ──────────────────────────────────────────────────── */}
      {weeklyAnalysis && (
        <WeeklyAnalysisCard
          analysis={weeklyAnalysis}
          isMobile={isMobile}
          updatedDaysAgo={Math.max(0, Math.floor((Date.now() - Date.parse(weeklyAnalysis._meta.generated_at)) / 86400000))}
        />
      )}

      {reels.length > 0 && (
        <>
          {/* ── Charts 2×2 ────────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 12 }}>

            {/* Views Over Time */}
            <ChartCard delay={0.15}>
              <ChartHeader
                title="Views Over Time"
                sub={fmtNum(totalViews)}
                toggle={<Toggle options={['Daily', 'Cumulative']} value={viewsMode} onChange={setViewsMode} />}
              />
              <MeasuredChart height={170}>
                {(w) => (
                  <AreaChart width={w} height={170} data={viewsChart} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="vGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="date" stroke="none" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis stroke="none" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} tickFormatter={(v: number) => fmtNum(v)} width={40} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [typeof v === 'number' ? v.toLocaleString() : String(v), viewsMode + ' Views']} />
                    <Area type="monotone" dataKey={viewsMode} stroke="#3B82F6" strokeWidth={2} fill="url(#vGrad)" dot={false} />
                  </AreaChart>
                )}
              </MeasuredChart>
            </ChartCard>

            {/* Engagements Over Time */}
            <ChartCard delay={0.2}>
              <ChartHeader
                title="Engagements Over Time"
                sub={fmtNum(totalEng)}
                toggle={<Toggle options={['Daily', 'Cumulative']} value={engMode} onChange={setEngMode} />}
              />
              <MeasuredChart height={170}>
                {(w) => (
                  <AreaChart width={w} height={170} data={engChart} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="eGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="date" stroke="none" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis stroke="none" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} tickFormatter={(v: number) => fmtNum(v)} width={40} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [typeof v === 'number' ? v.toLocaleString() : String(v), engMode + ' Engagements']} />
                    <Area type="monotone" dataKey={engMode} stroke="#3B82F6" strokeWidth={2} fill="url(#eGrad)" dot={false} />
                  </AreaChart>
                )}
              </MeasuredChart>
            </ChartCard>

            {/* Engagement Breakdown */}
            <ChartCard delay={0.25}>
              <ChartHeader title="Engagement Breakdown" sub={fmtNum(totalEng) + ' total'} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
                {engBreakdown.map(({ label, value, color }) => {
                  const pctVal = totalEng > 0 ? (value / totalEng) * 100 : 0
                  return (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>{label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color }}>
                          {fmtNum(value)} <span style={{ fontWeight: 500, color: 'var(--muted-foreground)' }}>({pctVal.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <div style={{ height: 5, borderRadius: 999, background: 'var(--muted)', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            borderRadius: 999,
                            background: color,
                            width: `${pctVal}%`,
                            transition: 'width 0.8s ease',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Follower-to-view ratio */}
              {(userViewsPerFollower !== null || (willFollowerViewRatio != null && willFollowerViewRatio > 0)) && (
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    Follower-to-View Ratio · 30 days
                  </div>
                  {userViewsPerFollower !== null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--foreground)' }}>Your page</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)' }}>
                        1 follower per {userViewsPerFollower.toLocaleString()} views
                      </span>
                    </div>
                  )}
                  {willFollowerViewRatio != null && willFollowerViewRatio > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Will&apos;s benchmark</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#3B82F6' }}>
                        1 follower per {Math.round(willFollowerViewRatio).toLocaleString()} views
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Top Reel</div>
                {(() => {
                  const top = [...currentReels].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))[0]
                  if (!top) return <p style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>No reels in this period</p>
                  const avgV = currentReels.length > 1
                    ? Math.round(currentReels.reduce((a, r) => a + (r.views ?? 0), 0) / currentReels.length)
                    : 0
                  const multiplier = avgV > 0 ? ((top.views ?? 0) / avgV) : 0
                  const hookText = top.hook && top.hook.trim().length > 3 ? top.hook.trim() : top.caption?.trim()
                  const topEng = (top.likes ?? 0) + (top.comments ?? 0) + (top.saves ?? 0)
                  const engRate = (top.views ?? 0) > 0 ? ((topEng / (top.views ?? 1)) * 100).toFixed(1) : null
                  return (
                    <div>
                      {/* Views + multiplier */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 24, fontWeight: 800, color: '#3B82F6', letterSpacing: '-0.5px', lineHeight: 1 }}>
                          {fmtNum(top.views ?? 0)}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)' }}>views</span>
                        {multiplier >= 1.2 && (
                          <span style={{
                            fontSize: 11, fontWeight: 700, color: '#22c55e',
                            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                            borderRadius: 5, padding: '1px 6px',
                          }}>
                            {multiplier.toFixed(1)}× avg
                          </span>
                        )}
                      </div>

                      {/* Hook */}
                      {hookText && hookText.length > 3 ? (
                        <p style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.55, margin: '0 0 10px', fontStyle: 'italic', borderLeft: '2px solid #3B82F6', paddingLeft: 8 }}>
                          &ldquo;{hookText.slice(0, 120)}{hookText.length > 120 ? '…' : ''}&rdquo;
                        </p>
                      ) : (
                        <p style={{ fontSize: 11, color: 'var(--muted-foreground)', margin: '0 0 10px', fontStyle: 'italic' }}>Hook not recorded</p>
                      )}

                      {/* Engagement row */}
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                        {[
                          { label: '❤️', value: fmtNum(top.likes ?? 0) },
                          { label: '💬', value: fmtNum(top.comments ?? 0) },
                          { label: '🔖', value: fmtNum(top.saves ?? 0) },
                          ...(engRate ? [{ label: 'eng', value: `${engRate}%` }] : []),
                        ].map(({ label, value }) => (
                          <div key={label} style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                            {label} <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>{value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Format + date */}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {top.format_type && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)',
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                            background: 'var(--muted)', border: '1px solid var(--border)',
                            borderRadius: 4, padding: '2px 6px',
                          }}>
                            {top.format_type.replace(/_/g, ' ')}
                          </span>
                        )}
                        {top.date && (
                          <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>
                            {new Date(top.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </ChartCard>

            {/* Format Performance */}
            <ChartCard delay={0.3}>
              <ChartHeader
                title="Format Performance"
                sub={formatData[0] ? formatData[0].format : '—'}
              />
              {formatData.length > 0 ? (
                <MeasuredChart height={170}>
                  {(w) => (
                    <BarChart width={w} height={170} data={formatData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" stroke="none" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} tickFormatter={(v: number) => fmtNum(v)} />
                      <YAxis type="category" dataKey="format" stroke="none" tick={{ fill: 'var(--muted-foreground)', fontSize: 9 }} width={80} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [typeof v === 'number' ? v.toLocaleString() : String(v), 'Avg Views']} />
                      <Bar dataKey="avgViews" radius={[0, 5, 5, 0]}>
                        {formatData.map((entry, idx) => (
                          <Cell
                            key={idx}
                            fill={entry.avgViews === maxFmtV
                              ? '#3B82F6'
                              : `rgba(146, 129, 247, ${Math.max(0.2, 0.65 - idx * 0.1)})`}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </MeasuredChart>
              ) : (
                <div style={{ height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>No format data yet — sync to classify reels</span>
                </div>
              )}
            </ChartCard>

          </div>

          {/* ── Content Library ───────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.35 }}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              overflow: 'hidden',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{
              padding: '18px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 10,
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.3px' }}>
                Content Library <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted-foreground)' }}>({total})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={handleSync} disabled={syncing} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                height: 32, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--card)', color: 'var(--muted-foreground)',
                fontWeight: 600, fontSize: 12, cursor: syncing ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', opacity: syncing ? 0.6 : 1, transition: 'opacity 0.15s',
              }}>
                <RefreshCw size={12} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
                {syncing ? 'Syncing…' : 'Sync reels'}
              </button>
              <div style={{ display: 'flex', gap: 2, background: 'var(--muted)', borderRadius: 8, padding: 3 }}>
                {(isMobile ? ['Recent', 'Top Views'] : ['Recent', 'Top Views', 'Top Engagement']).map(opt => (
                  <button key={opt} onClick={() => { setContentSort(opt); setLibraryVisible(24) }} style={{
                    padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: isMobile ? 11 : 12, fontWeight: 600, fontFamily: 'inherit',
                    background: contentSort === opt ? 'var(--card)' : 'transparent',
                    color: contentSort === opt ? 'var(--foreground)' : 'var(--muted-foreground)',
                    transition: 'all 0.15s', whiteSpace: 'nowrap',
                    boxShadow: contentSort === opt ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                  }}>
                    {opt}
                  </button>
                ))}
              </div>
              </div>
            </div>

            <div style={{
              padding: isMobile ? 12 : 20,
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(190px, 1fr))',
              gap: 12,
            }}>
              {libraryReels.map((reel, idx) => (
                <ReelCard key={reel.reel_id || reel.id || idx} reel={reel} idx={idx} profileId={profileId} />
              ))}
            </div>

            {libraryVisible < libraryReelsSorted.length && (
              <div style={{ padding: '0 20px 20px', textAlign: 'center' }}>
                <button
                  onClick={() => setLibraryVisible(v => v + 24)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 20px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--muted)',
                    color: 'var(--muted-foreground)', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Load more ({libraryReelsSorted.length - libraryVisible} remaining)
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}

      {reels.length === 0 && !loading && (
        <div style={{
          padding: '60px 24px', textAlign: 'center',
          background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
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
