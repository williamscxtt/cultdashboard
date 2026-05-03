'use client'

import { useState, useEffect } from 'react'
import { Zap, Copy, Check, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Hook {
  format: string
  hook: string
}

// ─── Format badge colours ─────────────────────────────────────────────────────
const FORMAT_COLORS: Record<string, { bg: string; text: string }> = {
  'Bold Claim':  { bg: 'rgba(239,68,68,0.12)',  text: '#f87171' },
  'Story Open':  { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa' },
  'Question':    { bg: 'rgba(168,85,247,0.12)',  text: '#c084fc' },
  'Stat Hook':   { bg: 'rgba(34,197,94,0.12)',   text: '#4ade80' },
  'Trend-jack':  { bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24' },
}

const EMOTION_OPTIONS = ['curiosity', 'aspiration', 'controversy', 'fear', 'entertainment'] as const
type Emotion = typeof EMOTION_OPTIONS[number]

const EMOTION_LABELS: Record<Emotion, string> = {
  curiosity:     'Curiosity',
  aspiration:    'Aspiration',
  controversy:   'Controversy',
  fear:          'Fear / urgency',
  entertainment: 'Entertainment',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function HookLabPage() {
  const [profileId, setProfileId] = useState('')
  const [topic, setTopic] = useState('')
  const [emotion, setEmotion] = useState<Emotion>('curiosity')
  const [hooks, setHooks] = useState<Hook[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [isCreator, setIsCreator] = useState(false)
  const [nicheHint, setNicheHint] = useState('')

  useEffect(() => {
    fetch('/api/effective-profile')
      .then(r => r.json())
      .then(({ profileId: pid }) => {
        if (!pid) return
        setProfileId(pid)
        // Fetch profile for hint
        fetch(`/api/profile?id=${pid}`)
          .then(r => r.json())
          .then(({ profile }) => {
            if (!profile) return
            setIsCreator(profile.user_type === 'creator')
            const intro = profile.intro_structured ?? {}
            const niche =
              intro.content_niche || intro.specific_niche ||
              profile.niche || ''
            if (niche) setNicheHint(String(niche).slice(0, 60))
          })
          .catch(() => {})
      })
  }, [])

  async function generate() {
    if (!topic.trim()) return
    setLoading(true)
    setError('')
    setHooks([])

    try {
      const res = await fetch('/api/hook-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, topic, emotion }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setHooks(data.hooks ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function copyHook(hook: string, i: number) {
    await navigator.clipboard.writeText(hook)
    setCopiedIndex(i)
    toast.success('Hook copied')
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  function useAsScript(hook: string) {
    // Store in sessionStorage for Script Generator to pick up
    sessionStorage.setItem('prefill_hook', hook)
    window.location.href = '/dashboard/content'
  }

  // Group hooks by format for display
  const grouped: Record<string, Hook[]> = {}
  for (const h of hooks) {
    if (!grouped[h.format]) grouped[h.format] = []
    grouped[h.format].push(h)
  }
  const formats = ['Bold Claim', 'Story Open', 'Question', 'Stat Hook', 'Trend-jack']

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={16} color="#fbbf24" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.4px', margin: 0 }}>
            Hook Lab
          </h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.5 }}>
          Generate 20 scroll-stopping hooks tailored to your niche.
          {isCreator ? ' Hooks are tuned to your creator style and audience.' : ' Hooks are built around your offer and audience pain points.'}
        </p>
      </div>

      {/* Input card */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 24, marginBottom: 24,
      }}>
        {/* Topic input */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 8 }}>
            What&apos;s your topic?
          </label>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && generate()}
            placeholder={nicheHint ? `e.g. ${nicheHint.split(' ').slice(0, 4).join(' ')}…` : 'e.g. Why most people never hit 10K followers'}
            style={{ width: '100%', fontSize: 15 }}
          />
          {nicheHint && (
            <p style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 5 }}>
              Based on your niche: <em>{nicheHint}</em>
            </p>
          )}
        </div>

        {/* Emotion selector */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 8 }}>
            Target emotion
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EMOTION_OPTIONS.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setEmotion(e)}
                style={{
                  padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: `1.5px solid ${emotion === e ? 'var(--accent)' : 'var(--border)'}`,
                  background: emotion === e ? 'hsl(var(--accent-hsl, 25 100% 55%) / 0.1)' : 'transparent',
                  color: emotion === e ? 'var(--accent)' : 'var(--muted-foreground)',
                  cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                }}
              >
                {EMOTION_LABELS[e]}
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
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
              Generating 20 hooks…
            </>
          ) : (
            <>
              <Zap size={15} />
              Generate 20 Hooks
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
      {hooks.length > 0 && (
        <div>
          {/* Summary bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>
              {hooks.length} hooks generated
            </div>
            <button
              onClick={generate}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--muted-foreground)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'background 0.12s, color 0.12s',
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

          {/* Hooks grouped by format */}
          {formats.map(format => {
            const group = grouped[format] ?? []
            if (!group.length) return null
            const color = FORMAT_COLORS[format] ?? { bg: 'var(--muted)', text: 'var(--muted-foreground)' }
            return (
              <div key={format} style={{ marginBottom: 24 }}>
                {/* Format header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 99,
                    background: color.bg, color: color.text,
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                  }}>
                    {format}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>

                {/* Hook cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.map((h, groupIdx) => {
                    const globalIdx = hooks.indexOf(h)
                    return (
                      <div
                        key={groupIdx}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '14px 16px',
                          background: 'var(--card)', border: '1px solid var(--border)',
                          borderRadius: 9,
                          transition: 'border-color 0.12s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
                      >
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--foreground)', lineHeight: 1.5 }}>
                          &ldquo;{h.hook}&rdquo;
                        </span>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button
                            onClick={() => copyHook(h.hook, globalIdx)}
                            title="Copy hook"
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '6px 12px', borderRadius: 7,
                              border: '1px solid var(--border)', background: 'transparent',
                              color: copiedIndex === globalIdx ? '#4ade80' : 'var(--muted-foreground)',
                              fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              fontFamily: 'inherit', transition: 'all 0.12s',
                            }}
                          >
                            {copiedIndex === globalIdx ? <Check size={12} /> : <Copy size={12} />}
                            {copiedIndex === globalIdx ? 'Copied' : 'Copy'}
                          </button>
                          <button
                            onClick={() => useAsScript(h.hook)}
                            title="Use as script hook"
                            style={{
                              padding: '6px 12px', borderRadius: 7,
                              border: '1px solid var(--border)', background: 'transparent',
                              color: 'var(--muted-foreground)',
                              fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              fontFamily: 'inherit', transition: 'all 0.12s',
                            }}
                            onMouseEnter={e => {
                              const el = e.currentTarget as HTMLElement
                              el.style.background = 'rgba(255,255,255,0.06)'
                              el.style.color = 'var(--foreground)'
                            }}
                            onMouseLeave={e => {
                              const el = e.currentTarget as HTMLElement
                              el.style.background = 'transparent'
                              el.style.color = 'var(--muted-foreground)'
                            }}
                          >
                            Use this →
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {hooks.length === 0 && !loading && (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 12,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Zap size={22} color="#fbbf24" />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)', margin: '0 0 6px' }}>
            Enter a topic and generate 20 hooks
          </p>
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)', margin: 0 }}>
            Hooks are tailored to your niche, audience, and brand voice.
          </p>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
