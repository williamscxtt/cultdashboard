'use client'
import { useState, useEffect, useCallback } from 'react'
import { Card, Button, PageHeader, SectionLabel, StatCard } from '@/components/ui'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { CheckCircle, AlertTriangle, ChevronRight } from 'lucide-react'

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
  green: 'rgba(255,255,255,0.12)',
  amber: 'rgba(255,255,255,0.35)',
  red:   'hsl(0 72% 51%)',
}

const HEALTH_LABELS = {
  green: 'On Track',
  amber: 'Slipping',
  red:   'At Risk',
}

function formatWeek(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `Week of ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
}

function fmtNum(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: healthColor, flexShrink: 0,
            boxShadow: `0 0 6px ${healthColor}`,
          }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: healthColor }}>
            {HEALTH_LABELS[d.health_status]}
          </span>
          <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>— {d.health_reason}</span>
        </div>
      </div>

      {/* Week summary */}
      <Card style={{ padding: '16px 20px', borderLeft: `3px solid var(--accent)` }}>
        <p style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--foreground)', lineHeight: 1.7 }}>
          &ldquo;{d.week_summary}&rdquo;
        </p>
      </Card>

      {/* Metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        <StatCard label="Posts" value={d.metrics.posts_count} />
        <StatCard label="Avg Views" value={fmtNum(d.metrics.avg_views)} />
        <StatCard label="Top Reel" value={fmtNum(d.metrics.top_reel_views)} />
        <StatCard label="Engagement" value={`${d.metrics.engagement_rate}%`} />
        <StatCard
          label="Followers"
          value={d.metrics.follower_change >= 0 ? `+${fmtNum(d.metrics.follower_change)}` : fmtNum(d.metrics.follower_change)}
        />
      </div>

      {/* What worked / Needs work */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card style={{ padding: 18, background: 'rgba(255,255,255,0.5)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#3B82F6', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            What Worked
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.what_worked.map((point, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <CheckCircle size={14} style={{ color: '#3B82F6', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5 }}>{point}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ padding: 18, background: 'rgba(255,255,255,0.35)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.35)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Needs Work
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.what_needs_work.map((point, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <AlertTriangle size={14} style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5 }}>{point}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Coach feedback */}
      <Card style={{ padding: 20, background: 'var(--foreground)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--background)', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
          Coach Notes — Use in your check-in
        </div>
        <p style={{ fontSize: 14, color: 'var(--background)', lineHeight: 1.75 }}>
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
      // Week start = most recent Monday
      const now = new Date()
      const day = now.getDay()
      const diff = (day === 0 ? 6 : day - 1)
      const monday = new Date(now)
      monday.setDate(now.getDate() - diff)
      const weekStart = monday.toISOString().split('T')[0]

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: selectedClientId, weekStart }),
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
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
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
                const healthColor = HEALTH_COLORS[r.report_data?.health_status] || HEALTH_COLORS.green
                return (
                  <button
                    key={r.id}
                    onClick={() => setActiveReport(r)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                      background: isActive ? 'var(--muted)' : 'transparent',
                      border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                      fontFamily: 'inherit', textAlign: 'left', width: '100%',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--muted)' }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
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
                    <ChevronRight size={12} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
                  </button>
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
