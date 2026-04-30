'use client'

import { useState, useEffect } from 'react'
import { List, Copy, Download, RefreshCw, Check } from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Episode {
  episode: number
  title: string
  hook: string
  key_point: string
  recommended_length: string
  cta: string
}

interface SeriesPlan {
  series_title: string
  series_hook: string
  episodes: Episode[]
}

type SeriesGoal = 'followers' | 'leads' | 'revenue' | 'views'

const GOAL_OPTIONS: { value: SeriesGoal; label: string; desc: string }[] = [
  { value: 'followers',  label: 'Grow audience',    desc: 'Reach + follows' },
  { value: 'leads',      label: 'Generate leads',   desc: 'DMs + enquiries' },
  { value: 'revenue',    label: 'Drive sales',       desc: 'Conversions' },
  { value: 'views',      label: 'Maximise views',   desc: 'Watch time + shares' },
]

const LENGTH_COLOR: Record<string, string> = {
  '15s': '#60a5fa',
  '30s': '#4ade80',
  '60s': '#fbbf24',
  '90s': '#f87171',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SeriesPlannerPage() {
  const [profileId, setProfileId] = useState('')
  const [topic, setTopic] = useState('')
  const [episodes, setEpisodes] = useState(5)
  const [goal, setGoal] = useState<SeriesGoal>('followers')
  const [series, setSeries] = useState<SeriesPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/effective-profile')
      .then(r => r.json())
      .then(({ profileId: pid }) => { if (pid) setProfileId(pid) })
  }, [])

  async function generate() {
    if (!topic.trim()) return
    setLoading(true)
    setError('')
    setSeries(null)

    try {
      const res = await fetch('/api/series-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, topic, episodes, goal }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setSeries(data.series ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function exportCSV() {
    if (!series) return
    const rows = [
      ['Episode', 'Title', 'Hook', 'Key Point', 'Length', 'CTA'],
      ...series.episodes.map(ep => [
        String(ep.episode),
        ep.title,
        ep.hook,
        ep.key_point,
        ep.recommended_length,
        ep.cta,
      ]),
    ]
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${series.series_title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded')
  }

  async function copyAll() {
    if (!series) return
    const text = [
      `${series.series_title}`,
      `${series.series_hook}`,
      '',
      ...series.episodes.map(ep =>
        `Ep ${ep.episode}: ${ep.title}\nHook: "${ep.hook}"\nKey point: ${ep.key_point}\nLength: ${ep.recommended_length}\nCTA: ${ep.cta}`
      ),
    ].join('\n\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ padding: '24px', maxWidth: 860, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <List size={16} color="#c084fc" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.4px', margin: 0 }}>
            Series Planner
          </h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.5 }}>
          Plan a full content series — challenges, mini-series, or edu-threads.
          Get episode titles, hooks, key points, and CTAs in one go.
        </p>
      </div>

      {/* Input card */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 24, marginBottom: 24,
      }}>
        {/* Topic */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 8 }}>
            Series topic or theme
          </label>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && generate()}
            placeholder="e.g. How I went from 0 to 10K followers in 90 days"
            style={{ width: '100%', fontSize: 15 }}
          />
        </div>

        {/* Episodes + Goal */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Episode count */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 8 }}>
              Number of episodes
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={() => setEpisodes(e => Math.max(3, e - 1))}
                style={{
                  width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--foreground)', fontSize: 18,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'inherit',
                }}
              >
                −
              </button>
              <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--foreground)', minWidth: 28, textAlign: 'center' }}>
                {episodes}
              </span>
              <button
                type="button"
                onClick={() => setEpisodes(e => Math.min(30, e + 1))}
                style={{
                  width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--foreground)', fontSize: 18,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'inherit',
                }}
              >
                +
              </button>
              <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>episodes (3–30)</span>
            </div>
          </div>

          {/* Goal */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 8 }}>
              Series goal
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {GOAL_OPTIONS.map(g => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGoal(g.value)}
                  style={{
                    padding: '7px 10px', borderRadius: 7, textAlign: 'left',
                    border: `1.5px solid ${goal === g.value ? 'var(--accent)' : 'var(--border)'}`,
                    background: goal === g.value ? 'hsl(var(--accent-hsl, 25 100% 55%) / 0.1)' : 'transparent',
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: goal === g.value ? 'var(--accent)' : 'var(--foreground)' }}>
                    {g.label}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted-foreground)', marginTop: 1 }}>{g.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Generate */}
        <button
          onClick={generate}
          disabled={loading || !topic.trim()}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', height: 46, borderRadius: 9, border: 'none',
            background: loading || !topic.trim() ? 'var(--muted)' : 'var(--accent)',
            color: loading || !topic.trim() ? 'var(--muted-foreground)' : 'white',
            fontSize: 15, fontWeight: 700,
            cursor: loading || !topic.trim() ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', transition: 'background 0.15s',
          }}
        >
          {loading ? (
            <>
              <span style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
              Planning {episodes}-episode series…
            </>
          ) : (
            <>
              <List size={15} />
              Plan {episodes}-Episode Series
            </>
          )}
        </button>

        {error && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'hsl(0 50% 96%)', border: '1px solid hsl(0 70% 88%)', fontSize: 13, color: 'hsl(0 72% 45%)' }}>
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {series && (
        <div>
          {/* Series header card */}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 20, marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(168,85,247,0.8)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  Series
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--foreground)', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
                  {series.series_title}
                </h2>
                <p style={{ fontSize: 13, color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.5 }}>
                  {series.series_hook}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={copyAll}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'transparent',
                    color: copied ? '#4ade80' : 'var(--muted-foreground)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 0.12s',
                  }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied' : 'Copy all'}
                </button>
                <button
                  onClick={exportCSV}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'transparent',
                    color: 'var(--muted-foreground)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 0.12s',
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
                  <Download size={13} />
                  Export CSV
                </button>
                <button
                  onClick={generate}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'transparent',
                    color: 'var(--muted-foreground)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 0.12s',
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
                  <RefreshCw size={13} />
                  Regenerate
                </button>
              </div>
            </div>
          </div>

          {/* Episode cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {series.episodes.map(ep => {
              const lenColor = Object.entries(LENGTH_COLOR).find(([k]) => ep.recommended_length.includes(k))?.[1] ?? 'var(--muted-foreground)'
              return (
                <div
                  key={ep.episode}
                  style={{
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '16px 20px',
                    display: 'grid', gridTemplateColumns: '40px 1fr', gap: '0 16px',
                    transition: 'border-color 0.12s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
                >
                  {/* Episode number */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 9,
                    background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, color: '#c084fc',
                    flexShrink: 0, marginTop: 2,
                  }}>
                    {ep.episode}
                  </div>

                  {/* Episode content */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>
                        {ep.title}
                      </span>
                      <span style={{
                        padding: '2px 8px', borderRadius: 99,
                        background: `${lenColor}18`, color: lenColor,
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                        flexShrink: 0,
                      }}>
                        {ep.recommended_length}
                      </span>
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginRight: 6 }}>Hook:</span>
                      <span style={{ fontSize: 13, color: 'var(--foreground)' }}>&ldquo;{ep.hook}&rdquo;</span>
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginRight: 6 }}>Key point:</span>
                      <span style={{ fontSize: 13, color: 'var(--foreground)' }}>{ep.key_point}</span>
                    </div>

                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 6,
                      background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)',
                    }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(96,165,250,0.9)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>CTA</span>
                      <span style={{ fontSize: 12, color: 'var(--foreground)' }}>{ep.cta}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!series && !loading && (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 12,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <List size={22} color="#c084fc" />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)', margin: '0 0 6px' }}>
            Plan your next content series
          </p>
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)', margin: 0 }}>
            Enter a topic, choose your episode count and goal, and get a complete episode plan.
          </p>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
