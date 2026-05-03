'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Copy, Check, Zap, TrendingUp, Users, RefreshCw,
  Clock, Pencil, X, Save,
} from 'lucide-react'
import { Card, Button, PageHeader, GeneratingState } from '@/components/ui'
import { TaskProgress } from '@/components/ui/task-progress'
import { useIsMobile } from '@/lib/use-mobile'
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

interface PoppingItem {
  insight: string
  account?: string
  hook?: string
  views?: string
}

interface AccountWatchItem {
  handle: string
  description: string
}

interface ParsedPackage {
  weekLabel: string
  intelSection: string
  whatsPopping: PoppingItem[]
  performanceNote: string
  accountsToWatch: AccountWatchItem[]
  reels: ParsedReel[]
}

// ── Markdown parser ───────────────────────────────────────────────────────────

function parsePackage(md: string, weekStart: string): ParsedPackage {
  const weekLabel = new Date(weekStart + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const firstReelIdx = md.search(/\n###\s*🎬\s*Reel\s*1/)
  const intelRaw = firstReelIdx > 0 ? md.slice(0, firstReelIdx) : ''
  const reelsRaw = firstReelIdx > 0 ? md.slice(firstReelIdx) : md

  const accountsMarker = reelsRaw.search(/\n###\s*Accounts to Watch/)
  const accountsRaw = accountsMarker > 0
    ? reelsRaw.slice(accountsMarker).replace(/^###\s*Accounts to Watch[^\n]*\n/, '').trim()
    : ''
  const accountsToWatch: AccountWatchItem[] = []
  if (accountsRaw) {
    // Parse bullet points like: "• @handle — Description text..." or "- @handle — ..."
    // Also handles "Accounts to Watch This Week" header line
    const lines = accountsRaw.split('\n')
    let current: AccountWatchItem | null = null
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || /^accounts to watch/i.test(trimmed)) continue
      // New bullet starting with @handle
      const bulletMatch = trimmed.match(/^[-•*]\s*@([\w.]+)\s*[—–-]\s*([\s\S]+)/)
      if (bulletMatch) {
        if (current) accountsToWatch.push(current)
        current = { handle: bulletMatch[1], description: bulletMatch[2].trim() }
        continue
      }
      // Continuation line (no bullet, no @)
      if (current && trimmed && !trimmed.startsWith('-') && !trimmed.startsWith('•')) {
        current.description += ' ' + trimmed
      }
    }
    if (current) accountsToWatch.push(current)
  }

  const poppingMatch = intelRaw.match(/###\s*What['']s Popping[^\n]*\n([\s\S]*?)(\n###|$)/)
  const whatsPopping: PoppingItem[] = []
  if (poppingMatch) {
    const lines = poppingMatch[1].split('\n')
    let current: PoppingItem | null = null
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const sourceMatch = trimmed.match(/^Source:\s*@([\w.]+)\s*[—–-]\s*"([^"]+)"\s*\(?([\d,k]+\s*views?)\)?/i)
      if (sourceMatch && current) {
        current.account = sourceMatch[1]; current.hook = sourceMatch[2]; current.views = sourceMatch[3]
        continue
      }
      const bulletText = trimmed.replace(/^[-•*]\s*/, '').trim()
      if (bulletText.length > 5) {
        if (current) whatsPopping.push(current)
        current = { insight: bulletText }
      }
    }
    if (current) whatsPopping.push(current)
  }

  const perfMatch = intelRaw.match(/###\s*Performance Last Week[^\n]*\n([\s\S]*?)(\n###|---|\n\n\n|$)/)
  const performanceNote = perfMatch ? perfMatch[1].trim() : ''

  // Capture reel headers (format lives on the ### line itself) before splitting
  const reelHeaderPattern = /###\s*🎬\s*Reel\s*\d+\s*[|·]?\s*([^\n]*)/g
  const reelFormats: string[] = []
  let hm
  while ((hm = reelHeaderPattern.exec(reelsRaw)) !== null) {
    reelFormats.push((hm[1]?.trim() || '').replace(/^\[|\]$/g, '').trim())
  }

  const reelBlocks = reelsRaw.split(/\n###\s*🎬\s*Reel\s*\d+[^\n]*/).filter(Boolean)
  const reels: ParsedReel[] = []

  for (let i = 0; i < reelBlocks.length; i++) {
    const accountsIdx = reelBlocks[i].search(/\n###\s*Accounts to Watch/)
    const block = accountsIdx > 0 ? reelBlocks[i].slice(0, accountsIdx) : reelBlocks[i]
    if (!block.trim()) continue

    const day = `Day ${i + 1}`
    const format = reelFormats[i] || 'unknown'

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

// ── Inline markdown renderer ─────────────────────────────────────────────────

function renderMd(text: string): string {
  return text
    .replace(/^#{1,6}\s+(.+)$/gm, '$1')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--foreground);font-weight:700;">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[-•] (.+)$/gm, '<li style="margin:3px 0;padding-left:4px;">$1</li>')
    .replace(/(<li[^>]*>.*?<\/li>\n?)+/g, '<ul style="padding-left:16px;margin:6px 0;list-style:disc;">$&</ul>')
    .replace(/\n\n/g, '</p><p style="margin:6px 0;line-height:1.7;">')
    .replace(/\n/g, '<br/>')
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
      background: copied ? 'rgba(74,222,128,0.12)' : 'var(--muted)',
      color: copied ? '#4ade80' : 'var(--foreground)',
      border: `1px solid ${copied ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
      cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
    }}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied!' : label}
    </button>
  )
}

// ── Script card ────────────────────────────────────────────────────────────────

const DAY_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899',
  '#F59E0B', '#10B981', '#06B6D4', '#EF4444',
]

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  borderRadius: 7, border: '1px solid var(--border)',
  background: 'var(--background)', color: 'var(--foreground)',
  fontSize: 13, fontFamily: 'inherit', lineHeight: 1.5,
  outline: 'none', boxSizing: 'border-box',
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: 120,
}

function ScriptCard({
  reel, index, packageId, profileId, onSaved,
}: {
  reel: ParsedReel
  index: number
  packageId: string
  profileId: string
  onSaved: (index: number, updates: Partial<ParsedReel>) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editHook, setEditHook] = useState(reel.hook)
  const [editScript, setEditScript] = useState(reel.script)
  const [editCaption, setEditCaption] = useState(reel.caption)
  const [saving, setSaving] = useState(false)
  const accent = DAY_COLORS[index % DAY_COLORS.length]

  // Keep local state in sync if parent data refreshes
  useEffect(() => {
    if (!editing) {
      setEditHook(reel.hook)
      setEditScript(reel.script)
      setEditCaption(reel.caption)
    }
  }, [reel.hook, reel.script, reel.caption, editing])

  const copyText = [
    reel.hook, '',
    reel.script,
    reel.caption ? `\nCaption:\n${reel.caption}` : '',
    reel.cta ? `CTA: ${reel.cta}` : '',
  ].filter(Boolean).join('\n')

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/weekly-package/edit-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId, profileId, reelIndex: index,
          hook: editHook, script: editScript, caption: editCaption,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      onSaved(index, { hook: editHook, script: editScript, caption: editCaption })
      setEditing(false)
      toast.success('Script saved')
    } catch {
      toast.error('Failed to save — try again')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setEditHook(reel.hook)
    setEditScript(reel.script)
    setEditCaption(reel.caption)
    setEditing(false)
  }

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      {/* Accent bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${accent}66)`, flexShrink: 0 }} />

      {/* Header */}
      <div style={{
        padding: '16px 20px 14px',
        borderBottom: '1px solid var(--border)',
        background: `${accent}06`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: `${accent}18`, border: `1px solid ${accent}30`,
            color: accent, fontSize: 13, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {String(index + 1).padStart(2, '0')}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.2 }}>{reel.day}</div>
            <div style={{
              fontSize: 10, color: accent, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.07em',
            }}>
              {reel.format}
            </div>
          </div>
          {editing && (
            <div style={{
              marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 8px',
              borderRadius: 20, background: 'rgba(59,130,246,0.12)',
              color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Editing
            </div>
          )}
        </div>

        {/* Hook */}
        <div style={{ marginBottom: 2 }}>
          <div style={{
            fontSize: 9, fontWeight: 700, color: accent,
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
          }}>
            Hook
          </div>
          {editing ? (
            <input
              value={editHook}
              onChange={e => setEditHook(e.target.value)}
              style={inputStyle}
              placeholder="Hook text..."
            />
          ) : (
            <div style={{
              fontSize: 14, fontWeight: 700, color: 'var(--foreground)',
              lineHeight: 1.45, fontStyle: 'italic',
              paddingLeft: 12, borderLeft: `3px solid ${accent}`,
            }}>
              &ldquo;{reel.hook}&rdquo;
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Script */}
        {(reel.script || editing) && (
          <div>
            <div style={{
              fontSize: 9, fontWeight: 700, color: 'var(--muted-foreground)',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7,
            }}>
              Script
            </div>
            {editing ? (
              <textarea
                value={editScript}
                onChange={e => setEditScript(e.target.value)}
                style={{ ...textareaStyle, minHeight: 200 }}
                placeholder="Full script..."
              />
            ) : (
              <div
                style={{
                  fontSize: 13, color: 'var(--foreground)', lineHeight: 1.75,
                  overflowWrap: 'break-word', wordBreak: 'break-word',
                }}
                dangerouslySetInnerHTML={{ __html: renderMd(reel.script) }}
              />
            )}
          </div>
        )}

        {/* Caption */}
        {(reel.caption || editing) && (
          <div>
            <div style={{
              fontSize: 9, fontWeight: 700, color: 'var(--muted-foreground)',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7,
            }}>
              Caption
            </div>
            {editing ? (
              <textarea
                value={editCaption}
                onChange={e => setEditCaption(e.target.value)}
                style={{ ...textareaStyle, minHeight: 80 }}
                placeholder="Instagram caption..."
              />
            ) : (
              <div
                style={{
                  fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.65,
                  overflowWrap: 'break-word', wordBreak: 'break-word',
                }}
                dangerouslySetInnerHTML={{ __html: renderMd(reel.caption) }}
              />
            )}
          </div>
        )}

        {/* CTA */}
        {reel.cta && !editing && (
          <div style={{
            alignSelf: 'flex-start', padding: '4px 12px', borderRadius: 20,
            background: `${accent}12`, fontSize: 11, fontWeight: 600, color: accent,
            border: `1px solid ${accent}25`,
          }}>
            CTA: {reel.cta}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 20px', borderTop: '1px solid var(--border)',
        display: 'flex', gap: 8, alignItems: 'center',
        background: 'rgba(255,255,255,0.01)',
      }}>
        {editing ? (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 7, border: 'none',
                background: '#3B82F6', color: '#fff', fontSize: 12, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                opacity: saving ? 0.7 : 1, transition: 'opacity 0.15s',
              }}
            >
              <Save size={12} />
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              onClick={handleCancel}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 7,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--muted-foreground)', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <X size={12} />
              Cancel
            </button>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginLeft: 4 }}>
              AI will learn from your edits
            </div>
          </>
        ) : (
          <>
            <CopyButton text={copyText} />
            <button
              onClick={() => setEditing(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 7,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--muted-foreground)', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--foreground)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
            >
              <Pencil size={12} />
              Edit script
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function WeeklyPackage({ profileId, embedded }: { profileId: string; embedded?: boolean }) {
  const [packages, setPackages] = useState<WeeklyScript[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [intelOpen, setIntelOpen] = useState(true)
  // Local reel overrides so edits are reflected immediately without refetch
  const [reelOverrides, setReelOverrides] = useState<Record<number, Partial<ParsedReel>>>({})
  const isMobile = useIsMobile()

  const loadPackages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/weekly-package/generate?profileId=${profileId}`)
      const data = await res.json()
      if (data.packages) {
        setPackages(data.packages)
        setActiveIdx(0)
        setReelOverrides({})
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

  function handleReelSaved(index: number, updates: Partial<ParsedReel>) {
    setReelOverrides(prev => ({ ...prev, [index]: { ...(prev[index] ?? {}), ...updates } }))
  }

  const active = packages[activeIdx]
  const parsedBase = active ? parsePackage(active.scripts_md, active.week_start) : null

  // Merge in any local edits
  const parsed: ParsedPackage | null = parsedBase
    ? {
        ...parsedBase,
        reels: parsedBase.reels.map((r, i) =>
          reelOverrides[i] ? { ...r, ...reelOverrides[i] } : r,
        ),
      }
    : null

  const now = new Date()
  const diff = now.getDay() === 0 ? 6 : now.getDay() - 1
  const thisMonday = new Date(now)
  thisMonday.setDate(now.getDate() - diff)
  const thisWeekStart = thisMonday.toISOString().split('T')[0]
  const hasThisWeek = packages.some(p => p.week_start === thisWeekStart)
  const isStale = !!active && active.week_start < thisWeekStart

  return (
    <div style={embedded ? {} : { padding: isMobile ? '12px' : '24px' }}>
      {!embedded && (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <PageHeader
            title="Weekly Content Package"
            description="Your personalised weekly intel + 7 reel scripts, built from competitor data and your brand voice."
          />
          <Button
            onClick={handleGenerate}
            disabled={generating}
            variant="primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', width: isMobile ? '100%' : undefined, justifyContent: isMobile ? 'center' : undefined }}
          >
            {generating
              ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
              : <><Zap size={13} /> {hasThisWeek ? 'Regenerate This Week' : 'Generate This Week\'s Package'}</>
            }
          </Button>
        </div>
      )}

      {!embedded && (
        <>
          <TaskProgress active={generating} estimatedMs={120000} label="Generating your weekly package…" sublabel="Syncing your account, then generating scripts" />
          {generating && (
            <Card style={{ marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
              <GeneratingState label="Generating your weekly package…" sub="Analysing your reels, competitor data, and brand voice. This takes 30–60 seconds." />
            </Card>
          )}
        </>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              height: 280, background: 'var(--muted)', borderRadius: 14,
              backgroundImage: 'linear-gradient(90deg, var(--muted) 25%, hsl(0 5% 16%) 50%, var(--muted) 75%)',
              backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite linear',
            }} />
          ))}
        </div>
      ) : !generating && packages.length === 0 ? (
        <Card style={{ padding: embedded ? '32px 24px' : 56, textAlign: 'center' }}>
          <Zap size={28} style={{ color: 'var(--accent)', margin: '0 auto 16px', display: 'block' }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginBottom: 8 }}>No packages yet</div>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)', maxWidth: 380, margin: '0 auto', marginBottom: embedded ? 0 : 24 }}>
            {embedded
              ? 'Click "Generate This Week\'s Content" above to scrape your competitors and generate your 7 scripts in one go.'
              : 'Click "Generate This Week\'s Package" to create your first personalised weekly content plan.'}
          </div>
          {!embedded && (
            <Button onClick={handleGenerate} disabled={generating} variant="primary" style={{ marginTop: 8 }}>
              {generating ? 'Generating…' : 'Generate Now'}
            </Button>
          )}
        </Card>
      ) : !generating && parsed ? (
        <div>
          {/* History strip + week info */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', flexShrink: 0 }}>
              {packages.map((pkg, i) => {
                const label = new Date(pkg.week_start + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                const isThisWeek = pkg.week_start === thisWeekStart
                const isActive = i === activeIdx
                return (
                  <button
                    key={pkg.id}
                    onClick={() => { setActiveIdx(i); setReelOverrides({}) }}
                    style={{
                      padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                      border: isActive ? '1.5px solid rgba(59,130,246,0.5)' : '1px solid var(--border)',
                      background: isActive ? 'rgba(59,130,246,0.08)' : 'var(--card)',
                      color: isActive ? '#60a5fa' : 'var(--muted-foreground)',
                      cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                      transition: 'all 0.15s',
                    }}
                  >
                    {isThisWeek ? 'This week' : `w/c ${label}`}
                    {isThisWeek && <span style={{ marginLeft: 5, width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', verticalAlign: 'middle' }} />}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted-foreground)', marginLeft: 4 }}>
              <Clock size={11} />
              {new Date(active.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
            {isStale && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                background: 'hsl(43 96% 56% / 0.12)', color: 'hsl(43 75% 45%)',
                border: '1px solid hsl(43 96% 56% / 0.3)', textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Out of date
              </span>
            )}
          </div>

          {/* Intel section */}
          {(parsed.whatsPopping.length > 0 || parsed.performanceNote || parsed.accountsToWatch) && (
            <Card style={{ marginBottom: 24, overflow: 'hidden' }}>
              <button
                onClick={() => setIntelOpen(o => !o)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: isMobile ? '12px 14px' : '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>Weekly Intelligence Report</span>
                  <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                    {parsed.whatsPopping.length > 0 && `${parsed.whatsPopping.length} insights`}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{intelOpen ? '▲' : '▼'}</span>
              </button>

              {intelOpen && (
                <div style={{ borderTop: '1px solid var(--border)', padding: isMobile ? '14px' : '20px 24px' }}>

                  {/* What's Popping — 2-col grid of insight items */}
                  {parsed.whatsPopping.length > 0 && (
                    <div style={{ marginBottom: parsed.performanceNote || parsed.accountsToWatch.length > 0 ? 24 : 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                        What&rsquo;s Popping
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                        gap: 10,
                      }}>
                        {parsed.whatsPopping.map((p, i) => (
                          <div key={i} style={{
                            padding: '10px 14px', borderRadius: 8,
                            background: 'var(--muted)', border: '1px solid var(--border)',
                            borderLeft: '2px solid var(--accent)',
                          }}>
                            <div style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.6, marginBottom: p.account ? 6 : 0 }}
                              dangerouslySetInnerHTML={{ __html: renderMd(p.insight) }} />
                            {p.account && (
                              <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
                                @{p.account}{p.views && ` · ${p.views}`}{p.hook && ` — "${p.hook.slice(0, 60)}${p.hook.length > 60 ? '…' : ''}"`}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Your Performance — full width */}
                  {parsed.performanceNote && (
                    <div style={{ marginBottom: parsed.accountsToWatch.length > 0 ? 24 : 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                        Your Performance
                      </div>
                      <div style={{
                        padding: '12px 16px', borderRadius: 8,
                        background: 'var(--muted)', border: '1px solid var(--border)',
                        fontSize: 12, color: 'var(--foreground)', lineHeight: 1.7,
                      }}
                        dangerouslySetInnerHTML={{ __html: renderMd(parsed.performanceNote) }} />
                    </div>
                  )}

                  {/* Accounts to Watch — 2-col grid of account items */}
                  {parsed.accountsToWatch.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 12 }}>
                        <Users size={10} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Accounts to Watch
                        </span>
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                        gap: 10,
                      }}>
                        {parsed.accountsToWatch.map((a, i) => (
                          <div key={i} style={{
                            padding: '10px 14px', borderRadius: 8,
                            background: 'var(--muted)', border: '1px solid var(--border)',
                            borderLeft: '2px solid var(--accent)',
                          }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)', marginBottom: 4 }}>
                              @{a.handle}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
                              {a.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Scripts grid */}
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 16, flexWrap: 'wrap', gap: 8,
            }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.3px' }}>
                  Your {parsed.reels.length} Scripts This Week
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>
                  Click &ldquo;Edit script&rdquo; on any card to rewrite it — AI learns from your changes
                </div>
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: 16,
              alignItems: 'start',
            }}>
              {parsed.reels.map((reel, i) => (
                <ScriptCard
                  key={i}
                  reel={reel}
                  index={i}
                  packageId={active.id}
                  profileId={profileId}
                  onSaved={handleReelSaved}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>
    </div>
  )
}
