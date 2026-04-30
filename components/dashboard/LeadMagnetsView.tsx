'use client'

import { useState, useMemo } from 'react'
import { Download, ChevronDown, ChevronUp, Search, ExternalLink, Magnet, ArrowUpRight } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Submission {
  id: string
  tool: string
  name: string
  email: string | null
  phone: string | null
  answers: Record<string, string> | null
  offer_json: Record<string, unknown> | null
  created_at: string
}

interface OfferOutput {
  one_liner?: string
  bio_headline?: string
  target_avatar?: string
  core_promise?: string
  unique_mechanism?: string
  value_stack?: Array<{ name: string; description: string; perceived_value: string }>
  guarantee?: string
  who_its_for?: string
  who_its_not_for?: string
  urgency_angle?: string
  objection_crushers?: Array<{ objection: string; response: string }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
  'offer-builder': 'Offer Builder',
  'profile-audit': 'Profile Audit',
}

// Tools that are live — add new ones here as they're built
const LIVE_TOOLS: Array<{ key: string; label: string; description: string; url: string }> = [
  {
    key: 'offer-builder',
    label: 'Offer Builder',
    description: 'Builds a Precision Offer Blueprint from 9 wizard questions.',
    url: '/offer-builder',
  },
]

function toolLabel(tool: string) {
  return TOOL_LABELS[tool] ?? tool
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function exportCSV(submissions: Submission[]) {
  const headers = ['ID', 'Tool', 'Name', 'Email', 'Phone', 'Created At', 'One Liner', 'Bio Headline', 'Target Avatar']
  const rows = submissions.map(s => {
    const offer = s.offer_json as OfferOutput | null
    return [
      s.id,
      toolLabel(s.tool),
      s.name,
      s.email ?? '',
      s.phone ?? '',
      fmtDate(s.created_at),
      offer?.one_liner ?? '',
      offer?.bio_headline ?? '',
      offer?.target_avatar ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`)
  })
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lead-magnets-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AnswerRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, fontSize: 12, lineHeight: 1.6 }}>
      <span style={{ color: 'var(--muted-foreground)', flexShrink: 0, minWidth: 160, fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ color: 'var(--foreground)' }}>{value || '—'}</span>
    </div>
  )
}

const ANSWER_LABELS: Record<string, string> = {
  skills:           'Skills & expertise',
  content_direction:'Content direction',
  own_story:        'Their story',
  who_to_help:      'Who to help',
  dream_result:     'Dream result',
  format_idea:      'Format & price idea',
}

function ExpandedRow({ sub }: { sub: Submission }) {
  const offer = sub.offer_json as OfferOutput | null
  const answers = sub.answers

  return (
    <div style={{
      padding: '16px 20px 20px',
      borderTop: '1px solid var(--border)',
      background: 'var(--muted)',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 24,
    }}>
      {/* Left: wizard answers */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)', marginBottom: 10 }}>
          Wizard Answers
        </div>
        {answers
          ? Object.entries(ANSWER_LABELS).map(([key, label]) => (
            <AnswerRow key={key} label={label} value={answers[key] ?? ''} />
          ))
          : <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>No answers recorded</span>
        }
      </div>

      {/* Right: generated offer */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)', marginBottom: 10 }}>
          Generated Offer
        </div>
        {offer ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {offer.one_liner && (
              <OfferField label="One Liner" value={offer.one_liner} accent />
            )}
            {offer.bio_headline && (
              <OfferField label="Bio Headline" value={offer.bio_headline} />
            )}
            {offer.target_avatar && (
              <OfferField label="Target Avatar" value={offer.target_avatar} />
            )}
            {offer.core_promise && (
              <OfferField label="Core Promise" value={offer.core_promise} />
            )}
            {offer.unique_mechanism && (
              <OfferField label="Unique Mechanism" value={offer.unique_mechanism} />
            )}
            {offer.guarantee && (
              <OfferField label="Guarantee" value={offer.guarantee} />
            )}
            {offer.urgency_angle && (
              <OfferField label="Urgency" value={offer.urgency_angle} />
            )}
            {offer.value_stack && offer.value_stack.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 4 }}>Value Stack</div>
                {offer.value_stack.map((item, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--foreground)', marginBottom: 3, lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600 }}>{item.name}</span>
                    {item.perceived_value && (
                      <span style={{ color: 'var(--muted-foreground)', marginLeft: 6 }}>({item.perceived_value})</span>
                    )}
                    {item.description && (
                      <span style={{ color: 'var(--muted-foreground)', display: 'block', fontSize: 11 }}>{item.description}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {offer.objection_crushers && offer.objection_crushers.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 4 }}>Objection Crushers</div>
                {offer.objection_crushers.map((oc, i) => (
                  <div key={i} style={{ fontSize: 12, marginBottom: 4, lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{oc.objection}</span>
                    <span style={{ color: 'var(--muted-foreground)', display: 'block', fontSize: 11 }}>{oc.response}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>No offer data</span>
        )}
      </div>
    </div>
  )
}

function OfferField({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 2 }}>{label}</div>
      <div style={{
        fontSize: 12,
        color: accent ? 'var(--foreground)' : 'var(--foreground)',
        fontWeight: accent ? 600 : 400,
        lineHeight: 1.6,
        background: accent ? 'rgba(255,255,255,0.04)' : 'transparent',
        padding: accent ? '6px 8px' : 0,
        borderRadius: accent ? 6 : 0,
        border: accent ? '1px solid var(--border)' : 'none',
      }}>
        {value}
      </div>
    </div>
  )
}

function ToolBadge({ tool }: { tool: string }) {
  const colors: Record<string, string> = {
    'offer-builder': 'rgba(99,102,241,0.15)',
    'profile-audit': 'rgba(34,197,94,0.12)',
  }
  const textColors: Record<string, string> = {
    'offer-builder': 'hsl(239 84% 67%)',
    'profile-audit': 'hsl(142 71% 45%)',
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 20,
      fontSize: 11, fontWeight: 700,
      background: colors[tool] ?? 'var(--muted)',
      color: textColors[tool] ?? 'var(--muted-foreground)',
    }}>
      {toolLabel(tool)}
    </span>
  )
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '12px 16px',
      minWidth: 100,
    }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  initialSubmissions: Submission[]
}

export default function LeadMagnetsView({ initialSubmissions }: Props) {
  const [search, setSearch] = useState('')
  const [toolFilter, setToolFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const tools = useMemo(() => {
    const set = new Set(initialSubmissions.map(s => s.tool))
    return Array.from(set).sort()
  }, [initialSubmissions])

  const filtered = useMemo(() => {
    return initialSubmissions.filter(s => {
      if (toolFilter !== 'all' && s.tool !== toolFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const offer = s.offer_json as OfferOutput | null
        return (
          s.name.toLowerCase().includes(q) ||
          (s.email ?? '').toLowerCase().includes(q) ||
          (s.phone ?? '').toLowerCase().includes(q) ||
          (offer?.one_liner ?? '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [initialSubmissions, toolFilter, search])

  // Stats
  const totalLeads = initialSubmissions.length
  const withEmail = initialSubmissions.filter(s => s.email).length
  const withPhone = initialSubmissions.filter(s => s.phone).length
  const byTool = tools.reduce((acc, t) => {
    acc[t] = initialSubmissions.filter(s => s.tool === t).length
    return acc
  }, {} as Record<string, number>)

  // ── Styles ──────────────────────────────────────────────────────────────────

  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    height: 30, padding: '0 11px', borderRadius: 7,
    border: '1px solid var(--border)', background: 'transparent',
    fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)',
    cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
    transition: 'all 0.12s',
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Magnet size={18} style={{ color: 'var(--accent)' }} />
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--foreground)', fontFamily: 'var(--font-display)', margin: 0 }}>
              Lead Magnets
            </h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)', margin: 0 }}>
            {totalLeads} submission{totalLeads !== 1 ? 's' : ''} · all tools
          </p>
        </div>

        <button
          onClick={() => exportCSV(filtered)}
          style={{ ...base, border: 'none', background: 'var(--accent)', color: 'white' }}
        >
          <Download size={12} />
          Export CSV{filtered.length !== totalLeads ? ` (${filtered.length})` : ''}
        </button>
      </div>

      {/* Live tools */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)', marginBottom: 8 }}>
          Live Tools
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {LIVE_TOOLS.map(tool => (
            <a
              key={tool.key}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                textDecoration: 'none',
                transition: 'border-color 0.12s, background 0.12s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'var(--accent)'
                el.style.background = 'rgba(255,255,255,0.03)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'var(--border)'
                el.style.background = 'var(--card)'
              }}
            >
              <Magnet size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.2px', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {tool.label}
                  <ArrowUpRight size={11} style={{ color: 'var(--muted-foreground)' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 1 }}>{tool.description}</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard label="Total leads" value={totalLeads} />
        <StatCard label="With email" value={withEmail} />
        <StatCard label="With phone" value={withPhone} />
        {Object.entries(byTool).map(([t, count]) => (
          <StatCard key={t} label={toolLabel(t)} value={count} />
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 320 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, phone, one liner…"
            style={{
              width: '100%', height: 30, paddingLeft: 30, paddingRight: 10,
              borderRadius: 7, border: '1px solid var(--border)',
              background: 'var(--card)', color: 'var(--foreground)',
              fontSize: 12, fontFamily: 'inherit', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Tool filter */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', ...tools] as string[]).map(t => (
            <button
              key={t}
              onClick={() => setToolFilter(t)}
              style={{
                ...base,
                background: toolFilter === t ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: toolFilter === t ? 'var(--foreground)' : 'var(--muted-foreground)',
                borderColor: toolFilter === t ? 'rgba(255,255,255,0.15)' : 'var(--border)',
              }}
            >
              {t === 'all' ? 'All tools' : toolLabel(t)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 130px 180px 130px 140px 30px',
          gap: 0,
          padding: '8px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--muted)',
        }}>
          {['Name', 'Tool', 'Email / Phone', 'One Liner', 'Date', ''].map((h, i) => (
            <div key={i} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-foreground)' }}>
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>
            {initialSubmissions.length === 0
              ? 'No submissions yet. Share the lead magnet page to start collecting leads.'
              : 'No results match your filters.'}
          </div>
        ) : (
          filtered.map(sub => {
            const isOpen = expandedId === sub.id
            const offer = sub.offer_json as OfferOutput | null

            return (
              <div key={sub.id} style={{ borderBottom: '1px solid var(--border)' }}>
                {/* Main row */}
                <div
                  onClick={() => setExpandedId(isOpen ? null : sub.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 130px 180px 130px 140px 30px',
                    gap: 0,
                    padding: '10px 16px',
                    cursor: 'pointer',
                    background: isOpen ? 'rgba(255,255,255,0.02)' : 'transparent',
                    alignItems: 'center',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)' }}
                  onMouseLeave={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  {/* Name */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.2px' }}>{sub.name}</div>
                  </div>

                  {/* Tool */}
                  <div><ToolBadge tool={sub.tool} /></div>

                  {/* Contact */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {sub.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{sub.email}</span>
                        <a
                          href={`mailto:${sub.email}`}
                          onClick={e => e.stopPropagation()}
                          style={{ color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center' }}
                        >
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    )}
                    {sub.phone && (
                      <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{sub.phone}</span>
                    )}
                    {!sub.email && !sub.phone && (
                      <span style={{ fontSize: 11, color: 'var(--muted-foreground)', opacity: 0.5 }}>—</span>
                    )}
                  </div>

                  {/* One liner snippet */}
                  <div style={{
                    fontSize: 11, color: 'var(--muted-foreground)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    paddingRight: 8,
                  }}>
                    {offer?.one_liner ?? '—'}
                  </div>

                  {/* Date */}
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                    {fmtDate(sub.created_at)}
                  </div>

                  {/* Expand */}
                  <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--muted-foreground)' }}>
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen && <ExpandedRow sub={sub} />}
              </div>
            )
          })
        )}
      </div>

      {/* Footer count */}
      {filtered.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted-foreground)', textAlign: 'right' }}>
          Showing {filtered.length} of {totalLeads} submissions
        </div>
      )}
    </div>
  )
}
