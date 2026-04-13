'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, Button, Badge, PageHeader, SectionLabel } from '@/components/ui'
import { CheckCircle2, AlertTriangle, ArrowRight, Copy, ChevronDown, ChevronUp, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { useIsMobile } from '@/lib/use-mobile'
import OfferBuilder from '@/components/dashboard/OfferBuilder'
import StoryGenerator from '@/components/dashboard/StoryGenerator'

interface AuditScores {
  profile_pic: number
  name_username: number
  bio: number
  link: number
  highlights: number
  pinned_posts: number
}

interface AuditFeedback {
  what_works: string
  what_to_fix: string
  action: string
}

interface AuditAnalysis {
  scores: AuditScores
  overall_score: number
  verdict: string
  feedback: Record<string, AuditFeedback>
  bio_rewrite: string
  detailed_bio_analysis: string
  highlight_suggestions: string[]
  priority_fixes: string[]
}

interface AuditHistoryItem {
  id: string
  ig_username: string | null
  overall_score: number
  verdict: string
  created_at: string
  analysis: AuditAnalysis
}

const ELEMENT_LABELS: Record<string, string> = {
  profile_pic: 'Profile Picture',
  name_username: 'Name & Username',
  bio: 'Bio',
  link: 'Link in Bio',
  highlights: 'Highlights',
  pinned_posts: 'Pinned Posts',
}

function scoreColor(score: number) {
  if (score >= 8) return 'rgba(255,255,255,0.5)'
  if (score >= 7) return 'var(--accent)'
  if (score >= 5) return 'rgba(255,255,255,0.35)'
  return 'hsl(0 72% 51%)'
}

function verdictBadge(verdict: string): 'success' | 'accent' | 'warning' | 'error' {
  if (verdict === 'Excellent') return 'success'
  if (verdict === 'Good') return 'accent'
  if (verdict === 'Needs Work') return 'warning'
  return 'error'
}

type Tab = 'audit' | 'offer' | 'story'

const TABS: { id: Tab; label: string }[] = [
  { id: 'audit', label: 'Profile Audit' },
  { id: 'offer', label: 'Offer Builder' },
  { id: 'story', label: 'Story Generator' },
]

export default function ProfileAuditPage() {
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState<Tab>('audit')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [audit, setAudit] = useState<AuditAnalysis | null>(null)
  const [auditId, setAuditId] = useState<string | null>(null)
  const [history, setHistory] = useState<AuditHistoryItem[]>([])
  const [userId, setUserId] = useState('')
  const [expandedElements, setExpandedElements] = useState<Set<string>>(new Set())
  const [loadingHistory, setLoadingHistory] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/effective-profile').then(r => r.json()).then(({ profileId }) => {
      if (profileId) {
        setUserId(profileId)
        loadHistory(profileId)
      }
    })
  }, [])

  const loadHistory = useCallback(async (uid: string) => {
    setLoadingHistory(true)
    const res = await fetch(`/api/profile-audit?profileId=${uid}`)
    const data = await res.json()
    if (data.audits) setHistory(data.audits)
    setLoadingHistory(false)
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setScreenshot(file)
    const reader = new FileReader()
    reader.onload = (ev) => setScreenshotPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function removeScreenshot() {
    setScreenshot(null)
    setScreenshotPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleAudit() {
    if (!userId) { toast.error('Not logged in — please refresh'); return }
    setLoading(true)
    setAudit(null)
    setAuditId(null)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 55000)

    try {
      const formData = new FormData()
      formData.append('profileId', userId)
      if (screenshot) formData.append('screenshot', screenshot)

      const res = await fetch('/api/profile-audit', { method: 'POST', body: formData, signal: controller.signal })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Audit failed')
        return
      }
      if (!data.analysis) {
        toast.error('No analysis returned — try again')
        return
      }

      setAudit(data.analysis)
      setAuditId(data.id)
      loadHistory(userId)
      toast.success('Audit complete')
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        toast.error('Audit timed out — the AI is taking too long. Try with a smaller screenshot.')
      } else {
        toast.error('Network error — please try again')
      }
    } finally {
      clearTimeout(timeout)
      setLoading(false)
    }
  }

  function toggleElement(key: string) {
    setExpandedElements(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function loadHistoryAudit(item: AuditHistoryItem) {
    setAudit(item.analysis)
    setAuditId(item.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const canAudit = !loading && screenshot !== null

  return (
    <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: 800, margin: '0 auto' }}>
      <PageHeader
        title="Profile Tools"
        description="Audit your Instagram profile, build your offer, and generate story sequences."
      />

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 24,
        background: 'var(--muted)',
        borderRadius: 10,
        padding: 4,
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: isMobile ? '8px 6px' : '9px 16px',
              borderRadius: 7,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: isMobile ? 12 : 13,
              fontWeight: 600,
              transition: 'all 0.15s',
              background: activeTab === tab.id ? 'var(--card)' : 'transparent',
              color: activeTab === tab.id ? 'var(--foreground)' : 'var(--muted-foreground)',
              boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Audit tab */}
      {activeTab === 'audit' && (
        <>
          {/* Input card */}
          <Card style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 8 }}>
                Profile Screenshot
              </label>
              {screenshotPreview ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img
                    src={screenshotPreview}
                    alt="Profile screenshot"
                    style={{ maxHeight: 280, borderRadius: 8, border: '1px solid var(--border)', display: 'block' }}
                  />
                  <button
                    onClick={removeScreenshot}
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                      width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: 'white',
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed var(--border)', borderRadius: 10,
                    padding: '32px 24px', textAlign: 'center', cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
                >
                  <Upload size={24} style={{ color: 'var(--muted-foreground)', margin: '0 auto 10px', display: 'block' }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 4 }}>Upload your Instagram profile screenshot</div>
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>On your phone: open Instagram → your profile → take a screenshot → upload here</div>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
            </div>

            <Button onClick={handleAudit} disabled={!canAudit} style={{ width: '100%', marginTop: 4 }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span>
                  Analysing profile...
                </span>
              ) : 'Run Audit'}
            </Button>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </Card>

          {/* Results */}
          {audit && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Overall score */}
              <Card style={{ padding: isMobile ? 16 : 24 }}>
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: isMobile ? 16 : 0 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Overall Score</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 52, fontWeight: 900, color: scoreColor(audit.overall_score), lineHeight: 1 }}>
                        {audit.overall_score.toFixed(1)}
                      </span>
                      <span style={{ fontSize: 18, color: 'var(--muted-foreground)' }}>/10</span>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <Badge variant={verdictBadge(audit.verdict)}>{audit.verdict}</Badge>
                    </div>
                  </div>
                  {/* Score bars */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: isMobile ? '100%' : undefined, minWidth: isMobile ? undefined : 200 }}>
                    {Object.entries(audit.scores).map(([key, score]) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--muted-foreground)', width: isMobile ? 90 : 100, textAlign: 'right', flexShrink: 0 }}>{ELEMENT_LABELS[key]}</span>
                        <div style={{ flex: 1, height: 5, background: 'var(--muted)', borderRadius: 3 }}>
                          <div style={{ height: '100%', borderRadius: 3, background: scoreColor(score), width: `${score * 10}%`, transition: 'width 0.5s ease' }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor(score), width: 18 }}>{score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Element-by-element breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <SectionLabel>Element Breakdown</SectionLabel>
                {Object.entries(audit.scores).map(([key, score]) => {
                  const fb = audit.feedback?.[key]
                  const isExpanded = expandedElements.has(key)
                  return (
                    <Card key={key} style={{ padding: 0, overflow: 'hidden' }}>
                      <button
                        onClick={() => toggleElement(key)}
                        style={{
                          width: '100%', padding: '14px 16px',
                          display: 'flex', alignItems: 'center', gap: 12,
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          fontFamily: 'inherit', textAlign: 'left',
                        }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: scoreColor(score) }}>{score}</span>
                        </div>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{ELEMENT_LABELS[key]}</span>
                        {isExpanded ? <ChevronUp size={15} style={{ color: 'var(--muted-foreground)' }} /> : <ChevronDown size={15} style={{ color: 'var(--muted-foreground)' }} />}
                      </button>
                      {isExpanded && fb && (
                        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--border)' }}>
                          {fb.what_works && (
                            <div style={{ display: 'flex', gap: 10, paddingTop: 14 }}>
                              <CheckCircle2 size={15} style={{ color: 'rgba(255,255,255,0.5)', flexShrink: 0, marginTop: 1 }} />
                              <span style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.6 }}>{fb.what_works}</span>
                            </div>
                          )}
                          {fb.what_to_fix && (
                            <div style={{ display: 'flex', gap: 10 }}>
                              <AlertTriangle size={15} style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0, marginTop: 1 }} />
                              <span style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.6 }}>{fb.what_to_fix}</span>
                            </div>
                          )}
                          {fb.action && (
                            <div style={{ display: 'flex', gap: 10, background: 'hsl(220 90% 56% / 0.06)', borderRadius: 8, padding: '10px 12px' }}>
                              <ArrowRight size={15} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
                              <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, lineHeight: 1.6 }}>{fb.action}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>

              {/* Priority fixes */}
              <Card style={{ padding: 20 }}>
                <div style={{ marginBottom: 12 }}><SectionLabel>Priority Fixes</SectionLabel></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {audit.priority_fixes.map((fix, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13 }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                        background: i === 0 ? 'var(--foreground)' : 'var(--muted)',
                        color: i === 0 ? 'var(--background)' : 'var(--muted-foreground)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700,
                      }}>{i + 1}</span>
                      <span style={{ color: 'var(--foreground)', lineHeight: 1.6, fontWeight: i === 0 ? 600 : 400 }}>{fix}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Bio rewrite */}
              <Card style={{ padding: 20, borderLeft: '3px solid var(--accent)', borderRadius: '0 10px 10px 0' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Your New Bio</div>
                {audit.detailed_bio_analysis && (
                  <div style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.6, marginBottom: 14 }}>{audit.detailed_bio_analysis}</div>
                )}
                <div style={{
                  fontSize: 15, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.6,
                  background: 'var(--muted)', borderRadius: 8, padding: '12px 14px', marginBottom: 12,
                }}>
                  {audit.bio_rewrite}
                </div>
                <Button size="sm" onClick={() => { navigator.clipboard.writeText(audit.bio_rewrite); toast.success('Bio copied') }}>
                  <Copy size={13} style={{ marginRight: 6 }} /> Copy Bio
                </Button>
              </Card>

              {/* Highlight suggestions */}
              {audit.highlight_suggestions?.length > 0 && (
                <Card style={{ padding: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 12 }}>Suggested Highlight Names</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {audit.highlight_suggestions.map((s, i) => (
                      <span key={i} style={{
                        fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 999,
                        background: 'var(--foreground)', color: 'var(--background)',
                      }}>{s}</span>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Audit History */}
          {(history.length > 0 || loadingHistory) && (
            <div style={{ marginTop: 32 }}>
              <div style={{ marginBottom: 12 }}><SectionLabel>Audit History</SectionLabel></div>
              {loadingHistory ? (
                <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Loading...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {history.map(item => (
                    <button
                      key={item.id}
                      onClick={() => loadHistoryAudit(item)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
                        background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
                        padding: '12px 16px', cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>
                          {item.ig_username ? `@${item.ig_username}` : 'Profile Audit'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                          {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: scoreColor(item.overall_score) }}>
                          {item.overall_score?.toFixed(1)}
                        </span>
                        <Badge variant={verdictBadge(item.verdict)}>{item.verdict}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Offer Builder tab */}
      {activeTab === 'offer' && userId && (
        <OfferBuilder profileId={userId} />
      )}
      {activeTab === 'offer' && !userId && (
        <div style={{ fontSize: 13, color: 'var(--muted-foreground)', padding: 24, textAlign: 'center' }}>Loading...</div>
      )}

      {/* Story Generator tab */}
      {activeTab === 'story' && userId && (
        <StoryGenerator profileId={userId} />
      )}
      {activeTab === 'story' && !userId && (
        <div style={{ fontSize: 13, color: 'var(--muted-foreground)', padding: 24, textAlign: 'center' }}>Loading...</div>
      )}
    </div>
  )
}
