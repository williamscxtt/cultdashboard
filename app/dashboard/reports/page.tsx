'use client'
import { useState, useEffect, useCallback } from 'react'
import { Card, Button, PageHeader, SectionLabel } from '@/components/ui'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { CheckCircle, AlertTriangle, ChevronRight, Trash2 } from 'lucide-react'

interface Profile {
  id: string
  name: string
  ig_username: string | null
  role: string
}

interface ReportMetrics {
  posts_count: number
  avg_views: number
  top_reel_views: number
  engagement_rate: number
  follower_change: number
}

interface ReportData {
  week_summary: string
  metrics: ReportMetrics
  what_worked: string[]
  what_needs_work: string[]
  coach_feedback: string
  next_week_focus: string[]
  health_status: 'green' | 'amber' | 'red'
  health_reason: string
}

interface ProgressReport {
  id: string
  profile_id: string
  week_start: string
  report_data: ReportData
  created_at: string
}

const HEALTH_COLORS = {
  green: 'hsl(142 71% 45%)',
  amber: 'hsl(43 96% 56%)',
  red:   'hsl(0 72% 51%)',
}

const HEALTH_LABELS = {
  green: 'On Track',
  amber: 'Slipping',
  red:   'At Risk',
}

function formatWeek(dateStr: string) {
  // dateStr is the 7-days-ago anchor; show it as "Apr 6 – Apr 13" style
  const from = new Date(dateStr + 'T00:00:00Z')
  const to = new Date(dateStr + 'T00:00:00Z')
  to.setUTCDate(to.getUTCDate() + 7)
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  return `${fmt(from)} – ${fmt(to)}`
}

function fmtNum(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '12px 10px',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 9, fontWeight: 700,
        color: 'var(--muted-foreground)',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        whiteSpace: 'nowrap',
        marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 22, fontWeight: 800,
        color: 'var(--foreground)',
        letterSpacing: '-0.5px',
        lineHeight: 1,
        fontFamily: 'var(--font-display)',
      }}>
        {value}
      </div>
    </div>
  )
}

function ReportView({ report }: { report: ProgressReport }) {
  const d = report.report_data
  const healthColor = HEALTH_COLORS[d.health_status] || HEALTH_COLORS.green

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Week label + health */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
          {formatWeek(report.week_start)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap' }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: healthColor, flexShrink: 0,
            boxShadow: `0 0 6px ${healthColor}`,
          }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: healthColor, whiteSpace: 'nowrap' }}>
            {HEALTH_LABELS[d.health_status]}
          </span>
          <span style={{ fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }}>— {d.health_reason}</span>
        </div>
      </div>

      {/* Week summary */}
      <Card style={{ padding: '16px 20px', borderLeft: `3px solid var(--accent)` }}>
        <p style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--foreground)', lineHeight: 1.7 }}>
          &ldquo;{d.week_summary}&rdquo;
        </p>
      </Card>

      {/* Metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
        <MiniStat label="Posts" value={d.metrics.posts_count} />
        <MiniStat label="Avg Views" value={fmtNum(d.metrics.avg_views)} />
        <MiniStat label="Top Reel" value={fmtNum(d.metrics.top_reel_views)} />
        <MiniStat label="Engagement" value={`${d.metrics.engagement_rate}%`} />
        <MiniStat
          label="Followers ±"
          value={d.metrics.follower_change >= 0 ? `+${fmtNum(d.metrics.follower_change)}` : fmtNum(d.metrics.follower_change)}
        />
      </div>

      {/* What worked / Needs work */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'hsl(142 71% 45%)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            What Worked
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.what_worked.map((point, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <CheckCircle size={14} style={{ color: 'hsl(142 71% 45%)', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5 }}>{point}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'hsl(43 96% 56%)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Needs Work
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.what_needs_work.map((point, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <AlertTriangle size={14} style={{ color: 'hsl(43 96% 56%)', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5 }}>{point}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Coach feedback */}
      <Card style={{ padding: 20, borderLeft: '3px solid var(--accent)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
          Coach Notes — Use in your check-in
        </div>
        <p style={{ fontSize: 14, color: 'var(--foreground)', lineHeight: 1.75 }}>
          {d.coach_feedback}
        </p>
      </Card>

      {/* Next week focus */}
      <Card style={{ padding: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Next Week Focus
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {d.next_week_focus.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%',
                background: 'var(--accent)', color: 'var(--accent-foreground)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1,
              }}>
                {i + 1}
              </span>
              <span style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default function ReportsPage() {
  const [myProfile, setMyProfile] = useState<Profile | null>(null)
  const [clients, setClients] = useState<Profile[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [reports, setReports] = useState<ProgressReport[]>([])
  const [activeReport, setActiveReport] = useState<ProgressReport | null>(null)
  const [generating, setGenerating] = useState(false)
  const [loadingClients, setLoadingClients] = useState(true)
  const [loadingReports, setLoadingReports] = useState(false)
  const [hoveredReportId, setHoveredReportId] = useState<string | null>(null)
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null)

  // Load current user's profile
  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setMyProfile(data as Profile)
    }
    loadProfile()
  }, [])

  // Load client list (admin only — uses service key via API)
  useEffect(() => {
    if (!myProfile || myProfile.role !== 'admin') {
      setLoadingClients(false)
      return
    }
    async function loadClients() {
      try {
        const res = await fetch('/api/reports/clients')
        const json = await res.json()
        setClients(json.clients || [])
      } catch {
        toast.error('Failed to load client list')
      } finally {
        setLoadingClients(false)
      }
    }
    loadClients()
  }, [myProfile])

  const loadReports = useCallback(async (profileId: string) => {
    setLoadingReports(true)
    setReports([])
    setActiveReport(null)
    try {
      const res = await fetch(`/api/reports?profileId=${profileId}`)
      const json = await res.json()
      const rpts: ProgressReport[] = json.reports || []
      setReports(rpts)
      if (rpts.length > 0) setActiveReport(rpts[0])
    } catch {
      toast.error('Failed to load reports')
    } finally {
      setLoadingReports(false)
    }
  }, [])

  useEffect(() => {
    if (selectedClientId) loadReports(selectedClientId)
  }, [selectedClientId, loadReports])

  async function handleGenerate() {
    if (!selectedClientId) {
      toast.error('Select a client first')
      return
    }
    setGenerating(true)
    try {
      // Let the SERVER compute weekStart — avoids all browser timezone issues.
      // The API will use today-7 in UTC (Vercel always runs UTC).
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: selectedClientId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to generate report')

      toast.success('Report generated!')
      // Reload reports for this client
      await loadReports(selectedClientId)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  async function deleteReport(id: string) {
    setDeletingReportId(id)
    try {
      const res = await fetch(`/api/reports?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setReports(prev => {
        const next = prev.filter(r => r.id !== id)
        if (activeReport?.id === id) {
          setActiveReport(next.length > 0 ? next[0] : null)
        }
        return next
      })
      toast.success('Report deleted')
    } catch {
      toast.error('Failed to delete report')
    } finally {
      setDeletingReportId(null)
    }
  }

  // Auth / role guard
  if (!myProfile) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ height: 14, width: 200, background: 'var(--muted)', borderRadius: 4 }} />
      </div>
    )
  }

  if (myProfile.role !== 'admin') {
    return (
      <div style={{ padding: 24, maxWidth: 500 }}>
        <PageHeader title="Progress Reports" />
        <Card style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>Admin only</div>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>This page is only accessible to admins.</div>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      <PageHeader
        title="Progress Reports"
        description="Weekly AI-generated coaching reports for every client. Use these in your check-ins."
      />

      {/* Client selector + generate */}
      <Card style={{ padding: 20, marginBottom: 20 }}>
        <SectionLabel>Select Client</SectionLabel>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <select
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              disabled={loadingClients}
            >
              <option value="">
                {loadingClients ? 'Loading clients...' : '— Select a client —'}
              </option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.ig_username ? ` (@${c.ig_username})` : ''}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating || !selectedClientId}
          >
            {generating ? 'Generating...' : 'Generate This Week\'s Report'}
          </Button>
        </div>
      </Card>

      {selectedClientId && (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, alignItems: 'flex-start' }}>
          {/* History sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
              Report History
            </div>
            {loadingReports ? (
              [1, 2, 3].map(i => (
                <div key={i} style={{ height: 52, background: 'var(--muted)', borderRadius: 8 }} />
              ))
            ) : reports.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--muted-foreground)', padding: '12px 0' }}>
                No reports yet. Generate one above.
              </div>
            ) : (
              reports.map(r => {
                const isActive = activeReport?.id === r.id
                const isHovered = hoveredReportId === r.id
                const isDeleting = deletingReportId === r.id
                const healthColor = HEALTH_COLORS[r.report_data?.health_status] || HEALTH_COLORS.green
                return (
                  <div
                    key={r.id}
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setHoveredReportId(r.id)}
                    onMouseLeave={() => setHoveredReportId(null)}
                  >
                    <button
                      onClick={() => setActiveReport(r)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                        background: isActive ? 'var(--muted)' : isHovered ? 'var(--muted)' : 'transparent',
                        border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                        fontFamily: 'inherit', textAlign: 'left', width: '100%',
                        transition: 'background 0.15s',
                        paddingRight: isHovered ? 36 : 12,
                      }}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: healthColor, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {formatWeek(r.week_start)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                          {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      {!isHovered && <ChevronRight size={12} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />}
                    </button>
                    {isHovered && (
                      <button
                        onClick={e => { e.stopPropagation(); deleteReport(r.id) }}
                        disabled={isDeleting}
                        title="Delete report"
                        style={{
                          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 24, height: 24, borderRadius: 6, cursor: 'pointer',
                          background: 'transparent', border: 'none', padding: 0,
                          color: isDeleting ? 'var(--muted-foreground)' : 'hsl(0 72% 51%)',
                          transition: 'color 0.15s',
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Report content */}
          <div>
            {loadingReports ? (
              <Card style={{ padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Loading reports...</div>
              </Card>
            ) : activeReport ? (
              <ReportView report={activeReport} />
            ) : (
              <Card style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>No report selected</div>
                <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
                  Generate a report or select one from the history.
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {!selectedClientId && (
        <Card style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>Select a client to get started</div>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
            Choose a client above, then generate or view their weekly progress reports.
          </div>
        </Card>
      )}
    </div>
  )
}
