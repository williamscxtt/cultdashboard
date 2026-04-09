'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronUp, Copy, Check, Zap, TrendingUp, Users, RefreshCw, Clock } from 'lucide-react'
import { Card, Button, PageHeader, GeneratingState } from '@/components/ui'
import { toast } from 'sonner'

interface WeeklyScript {
  id: string
  profile_id: string
  week_start: string
  scripts_md: string
  script_count: number
  created_at: string
}

interface ParsedReel {
  number: number
  day: string
  format: string
  hook: string
  script: string
  caption: string
  cta: string
  raw: string
}

interface ParsedPackage {
  weekLabel: string
  intelSection: string
  whatsPopping: string[]
  performanceNote: string
  accountsToWatch: string
  reels: ParsedReel[]
}

// ── Markdown parser — mirrors ScriptCards.tsx but with full intel extraction ──

function parsePackage(md: string, weekStart: string): ParsedPackage {
  const weekLabel = new Date(weekStart + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  // Split off intel section and accounts-to-watch
  const firstReelIdx = md.search(/\n###\s*🎬\s*Reel\s*1/)
  const intelRaw = firstReelIdx > 0 ? md.slice(0, firstReelIdx) : ''
  const reelsRaw = firstReelIdx > 0 ? md.slice(firstReelIdx) : md

  const accountsMarker = reelsRaw.search(/\n###\s*Accounts to Watch/)
  const accountsToWatch = accountsMarker > 0 ? reelsRaw.slice(accountsMarker).replace(/^###\s*Accounts to Watch[^\n]*\n/, '').trim() : ''

  // Extract "What's Popping" bullets
  const poppingMatch = intelRaw.match(/###\s*What['']s Popping[^\n]*\n([\s\S]*?)(\n###|$)/)
  const whatsPopping = poppingMatch
    ? poppingMatch[1].split('\n').map(l => l.replace(/^[-•*]\s*/, '').trim()).filter(l => l.length > 5)
    : []

  // Extract "Performance Last Week"
  const perfMatch = intelRaw.match(/###\s*Performance Last Week[^\n]*\n([\s\S]*?)(\n###|---|\n\n\n|$)/)
  const performanceNote = perfMatch ? perfMatch[1].trim() : ''

  // Parse individual reels
  const reelBlocks = reelsRaw.split(/\n###\s*🎬\s*Reel\s*\d+/).filter(Boolean)
  const reels: ParsedReel[] = []

  for (let i = 0; i < reelBlocks.length; i++) {
    const block = reelBlocks[i]
    if (accountsMarker > 0 && i === reelBlocks.length - 1 && block.includes('Accounts to Watch')) {
      break
    }

    // Parse header: "— Monday | FORMAT TYPE"
    const headerMatch = block.match(/^[^\n]*—\s*([A-Za-z]+)\s*[|·]\s*([^\n]+)/)
    const day = headerMatch?.[1]?.trim() || `Day ${i + 1}`
    const format = headerMatch?.[2]?.trim() || 'unknown'

    const hookMatch = block.match(/\*\*Hook:\*\*\s*([^\n]+)/)
    const hook = hookMatch?.[1]?.trim() || ''

    const scriptMatch = block.match(/\*\*Script:\*\*\s*([\s\S]*?)(?=\*\*Caption:|$)/)
    const script = scriptMatch?.[1]?.trim() || ''

    const captionMatch = block.match(/\*\*Caption:\*\*\s*([\s\S]*?)(?=\*\*CTA:|---\s*$|$)/)
    const caption = captionMatch?.[1]?.trim() || ''

    const ctaMatch = block.match(/\*\*CTA:\*\*\s*([^\n]+)/)
    const cta = ctaMatch?.[1]?.trim() || ''

    if (hook || script) {
      reels.push({ number: i + 1, day, format, hook, script, caption, cta, raw: block })
    }
  }

  return { weekLabel, intelSection: intelRaw.trim(), whatsPopping, performanceNote, accountsToWatch, reels }
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
      background: copied ? 'rgba(255,255,255,0.55)' : 'var(--muted)',
      color: copied ? '#fff' : 'var(--foreground)',
      border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s',
    }}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

// ── Reel script card ──────────────────────────────────────────────────────────

const DAY_COLORS = [
  'hsl(220 90% 56%)', 'hsl(270 60% 55%)', 'rgba(255,255,255,0.55)',
  'rgba(255,255,255,0.35)', 'hsl(0 65% 50%)', 'hsl(195 80% 45%)', 'hsl(310 60% 50%)',
]

function ReelCard({ reel, index }: { reel: ParsedReel; index: number }) {
  const [open, setOpen] = useState(false)
  const accent = DAY_COLORS[index % DAY_COLORS.length]
  const copyText = [
    reel.hook,
    '',
    reel.script,
    reel.caption ? `\nCaption:\n${reel.caption}` : '',
    reel.cta ? `\nCTA: ${reel.cta}` : '',
  ].filter(Boolean).join('\n')

  return (
    <div style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 10 }}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', background: 'var(--card)',
          border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
        }}
      >
        <span style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: accent, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800,
        }}>
          {reel.day.slice(0, 2).toUpperCase()}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 2 }}>
            {reel.day} · <span style={{ textTransform: 'capitalize' }}>{reel.format}</span>
          </div>
          <div style={{
            fontSize: 13, fontWeight: 600, color: 'var(--foreground)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4,
          }}>
            &ldquo;{reel.hook}&rdquo;
          </div>
        </div>
        {open
          ? <ChevronUp size={14} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
          : <ChevronDown size={14} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
        }
      </button>

      {/* Expanded */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--background)' }}>
          {/* Hook */}
          <div style={{ padding: '14px 16px 0' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
              Hook
            </div>
            <div style={{
              fontSize: 15, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.4,
              paddingLeft: 12, borderLeft: `3px solid ${accent}`, marginBottom: 16,
            }}>
              &ldquo;{reel.hook}&rdquo;
            </div>
          </div>

          {/* Script */}
          {reel.script && (
            <div style={{ padding: '0 16px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                Full Script
              </div>
              <div style={{
                whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--foreground)',
                lineHeight: 1.75, background: 'var(--muted)', borderRadius: 8,
                padding: '12px 14px',
              }}>
                {reel.script}
              </div>
            </div>
          )}

          {/* Caption */}
          {reel.caption && (
            <div style={{ padding: '0 16px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                Caption
              </div>
              <div style={{
                fontSize: 12, color: 'var(--foreground)', lineHeight: 1.65,
                background: 'var(--muted)', borderRadius: 8, padding: '10px 14px',
              }}>
                {reel.caption}
              </div>
            </div>
          )}

          {/* CTA + copy */}
          <div style={{ padding: '0 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {reel.cta && (
              <div style={{
                display: 'inline-flex', padding: '4px 10px', borderRadius: 20,
                background: `${accent}18`, fontSize: 11, fontWeight: 600, color: accent,
              }}>
                CTA: {reel.cta}
              </div>
            )}
            <div style={{ marginLeft: 'auto' }}>
              <CopyButton text={copyText} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function WeeklyPackage({ profileId }: { profileId: string }) {
  const [packages, setPackages] = useState<WeeklyScript[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [intelOpen, setIntelOpen] = useState(true)

  const loadPackages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/weekly-package/generate?profileId=${profileId}`)
      const data = await res.json()
      if (data.packages) {
        setPackages(data.packages)
        setActiveIdx(0)
      }
    } catch {
      toast.error('Failed to load packages')
    } finally {
      setLoading(false)
    }
  }, [profileId])

  useEffect(() => { loadPackages() }, [loadPackages])

  async function handleGenerate() {
    setGenerating(true)
    toast.info('Generating your weekly package — this takes about 30–60 seconds…')
    try {
      const res = await fetch('/api/weekly-package/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      toast.success(`Weekly package ready — ${data.script_count} scripts generated`)
      await loadPackages()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const active = packages[activeIdx]
  const parsed = active ? parsePackage(active.scripts_md, active.week_start) : null

  // Current week start
  const now = new Date()
  const diff = now.getDay() === 0 ? 6 : now.getDay() - 1
  const thisMonday = new Date(now)
  thisMonday.setDate(now.getDate() - diff)
  const thisWeekStart = thisMonday.toISOString().split('T')[0]
  const hasThisWeek = packages.some(p => p.week_start === thisWeekStart)

  return (
    <div style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <PageHeader
          title="Weekly Content Package"
          description="Your personalised weekly intel report + 7 reel scripts, generated from your reels, competitor data, and brand voice."
        />
        <Button
          onClick={handleGenerate}
          disabled={generating}
          variant="primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
        >
          {generating
            ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
            : <><Zap size={13} /> {hasThisWeek ? 'Regenerate This Week' : 'Generate This Week\'s Package'}</>
          }
        </Button>
      </div>

      {generating && (
        <Card style={{ marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
          <GeneratingState
            label="Generating your weekly package…"
            sub="Analysing your reels, competitor data, and brand voice. This takes 30–60 seconds."
          />
        </Card>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: 56, background: 'var(--muted)', borderRadius: 10,
              backgroundImage: 'linear-gradient(90deg, var(--muted) 25%, hsl(0 5% 16%) 50%, var(--muted) 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite linear',
            }} />
          ))}
        </div>
      ) : !generating && packages.length === 0 ? (
        <Card style={{ padding: 56, textAlign: 'center' }}>
          <Zap size={28} style={{ color: 'var(--accent)', margin: '0 auto 16px', display: 'block' }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)', marginBottom: 8 }}>
            No packages yet
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
            Click &ldquo;Generate This Week&rsquo;s Package&rdquo; to create your first personalised weekly content plan, using your reel data, competitor intelligence, and brand voice.
          </div>
          <Button onClick={handleGenerate} disabled={generating} variant="primary">
            {generating ? 'Generating…' : 'Generate Now'}
          </Button>
        </Card>
      ) : !generating ? (
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, alignItems: 'flex-start' }}>

          {/* History sidebar */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Past Packages
            </div>
            {packages.map((pkg, i) => {
              const label = new Date(pkg.week_start + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
              const isThisWeek = pkg.week_start === thisWeekStart
              const isActive = i === activeIdx
              return (
                <button
                  key={pkg.id}
                  onClick={() => setActiveIdx(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '9px 10px', borderRadius: 8,
                    border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                    background: isActive ? 'var(--muted)' : 'transparent',
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    marginBottom: 2,
                  }}
                >
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: isThisWeek ? 'var(--accent)' : 'var(--muted-foreground)',
                  }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>
                      {isThisWeek ? 'This week' : `w/c ${label}`}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>
                      {pkg.script_count} scripts
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Main content */}
          {parsed && (
            <div>
              {/* Week header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>
                  Week of {parsed.weekLabel}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted-foreground)' }}>
                  <Clock size={11} />
                  {new Date(active.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Intel section */}
              <Card style={{ marginBottom: 16, overflow: 'hidden' }}>
                <button
                  onClick={() => setIntelOpen(o => !o)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrendingUp size={14} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>Weekly Intelligence Report</span>
                  </div>
                  {intelOpen ? <ChevronUp size={14} style={{ color: 'var(--muted-foreground)' }} /> : <ChevronDown size={14} style={{ color: 'var(--muted-foreground)' }} />}
                </button>

                {intelOpen && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '16px 18px' }}>
                    {/* What's Popping */}
                    {parsed.whatsPopping.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                          What&rsquo;s Popping This Week
                        </div>
                        {parsed.whatsPopping.map((p, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 6 }} />
                            <span style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.55 }}>{p}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Performance note */}
                    {parsed.performanceNote && (
                      <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 8, background: 'var(--muted)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                          Performance Last Week
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.65, whiteSpace: 'pre-line' }}>
                          {parsed.performanceNote}
                        </div>
                      </div>
                    )}

                    {/* Accounts to watch */}
                    {parsed.accountsToWatch && (
                      <div style={{ padding: '12px 14px', borderRadius: 8, background: 'hsl(220 90% 56% / 0.07)', borderLeft: '3px solid var(--accent)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <Users size={11} style={{ color: 'var(--accent)' }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                            Accounts to Watch
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.65, whiteSpace: 'pre-line' }}>
                          {parsed.accountsToWatch}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* 7 Scripts */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)', marginBottom: 12, letterSpacing: '-0.2px' }}>
                  Your {parsed.reels.length} Scripts This Week
                </div>
                <style>{`
                  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                `}</style>
                {parsed.reels.map((reel, i) => (
                  <ReelCard key={i} reel={reel} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
