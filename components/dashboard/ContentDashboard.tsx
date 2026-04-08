'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TrendingUp, Zap, ChevronDown, ChevronUp, ExternalLink, BarChart2, FileText, CheckCircle, AlertTriangle, Lock, MessageCircle, HelpCircle, Lightbulb, Play, Eye, Heart, Users, Sparkles, Globe } from 'lucide-react'
import type { WeeklyReport, TrendingTopic, TopHook, ClientReel } from '@/lib/types'
import { Card, Badge, SectionLabel } from '@/components/ui'
import CompetitorManager from '@/components/dashboard/CompetitorManager'

// ─── types ───────────────────────────────────────────────────────────────────

interface Props {
  report: WeeklyReport | null
  reels: ClientReel[]
  profileId?: string
  contentAnalysisUnlocksAt?: string | null
  commentAnalysisUnlocksAt?: string | null
}

interface CommentQuestion {
  question: string
  frequency: string
  content_idea: string
}

interface CommentAnalysis {
  consensus: string
  top_emotions: string[]
  common_questions: CommentQuestion[]
  objections_or_doubts: string[]
  content_opportunities: string[]
  audience_insight: string
}

interface ContentAnalysis {
  headline: string
  content_score: number
  posts_this_period: number
  avg_views: number
  top_format: string
  format_verdict: string
  top_hooks: string[]
  what_is_working: string[]
  what_is_not_working: string[]
  pattern_insight: string
  this_week_actions: string[]
  hook_recommendations: string[]
}

// ─── markdown renderer ────────────────────────────────────────────────────────

function renderMd(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 style="color:var(--foreground);font-size:13px;font-weight:700;margin:16px 0 5px;letter-spacing:-0.1px;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="color:var(--foreground);font-size:15px;font-weight:700;margin:20px 0 8px;letter-spacing:-0.2px;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="color:var(--foreground);font-size:17px;font-weight:800;margin:0 0 10px;letter-spacing:-0.3px;">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--foreground);font-weight:700;">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[-•*] (.+)$/gm, '<li style="margin:3px 0;padding-left:4px;">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul style="padding-left:16px;margin:6px 0;list-style:disc;">$&</ul>')
    .replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid var(--border);margin:16px 0;">')
    .replace(/\n\n/g, '</p><p style="margin:6px 0;line-height:1.65;">')
}

// ─── content pillars from reels ───────────────────────────────────────────────

function deriveContentPillars(reels: ClientReel[]) {
  const groups: Record<string, { views: number[]; hooks: string[] }> = {}
  for (const r of reels) {
    const fmt = r.format_type
    if (!fmt) continue
    if (!groups[fmt]) groups[fmt] = { views: [], hooks: [] }
    groups[fmt].views.push(r.views ?? 0)
    if (r.hook) groups[fmt].hooks.push(r.hook)
  }
  return Object.entries(groups)
    .map(([fmt, { views, hooks }]) => ({
      fmt,
      count: views.length,
      avgViews: Math.round(views.reduce((a, b) => a + b, 0) / views.length),
      maxViews: Math.max(...views),
      topHook: hooks.sort(() => Math.random() - 0.5)[0] ?? null,
    }))
    .sort((a, b) => b.avgViews - a.avgViews)
}

function fmtLabel(fmt: string) {
  return fmt.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function pillarColor(idx: number): string {
  const colors = ['var(--accent)', 'hsl(142 71% 35%)', 'hsl(38 92% 40%)', 'hsl(270 60% 55%)', 'hsl(195 80% 40%)']
  return colors[idx % colors.length]
}

// ─── empty state ──────────────────────────────────────────────────────────────

function EmptyIntel() {
  return (
    <Card style={{ padding: '36px 24px', textAlign: 'center' }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: 'hsl(220 90% 56% / 0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 14px', color: 'var(--accent)',
      }}>
        <TrendingUp size={20} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginBottom: 6 }}>
        No intel report yet
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.6, maxWidth: 340, margin: '0 auto' }}>
        The weekly content intelligence report is generated every Monday at 9am.
        Check back then — it'll show what's trending, top hooks, and what to post this week.
      </div>
    </Card>
  )
}

// ─── main ─────────────────────────────────────────────────────────────────────

function ContentAnalysisPanel({ analysis }: { analysis: ContentAnalysis }) {
  const scoreColor = analysis.content_score >= 75 ? 'hsl(142 71% 35%)' : analysis.content_score >= 50 ? 'hsl(38 92% 45%)' : 'hsl(0 65% 50%)'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Score + headline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 12, flexShrink: 0,
          background: `${scoreColor}18`, border: `2px solid ${scoreColor}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 800, color: scoreColor,
        }}>
          {analysis.content_score}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.4 }}>
            {analysis.headline}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 3 }}>
            {analysis.posts_this_period} reels · avg {(analysis.avg_views ?? 0).toLocaleString()} views · best format: {analysis.top_format}
          </div>
        </div>
      </div>

      {/* Format verdict */}
      <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.6, margin: 0, paddingLeft: 12, borderLeft: '3px solid var(--accent)' }}>
        {analysis.format_verdict}
      </p>

      {/* What's working / not working */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'hsl(142 50% 45%)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>What&apos;s working</div>
          {analysis.what_is_working?.map((point, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 5 }}>
              <CheckCircle size={12} style={{ color: 'hsl(142 50% 45%)', flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.5 }}>{point}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'hsl(38 92% 45%)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Needs work</div>
          {analysis.what_is_not_working?.map((point, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 5 }}>
              <AlertTriangle size={12} style={{ color: 'hsl(38 92% 45%)', flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.5 }}>{point}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pattern insight */}
      {analysis.pattern_insight && (
        <Card style={{ padding: '12px 16px', background: 'var(--foreground)', borderRadius: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--background)', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Key pattern</div>
          <p style={{ fontSize: 13, color: 'var(--background)', lineHeight: 1.6, margin: 0 }}>{analysis.pattern_insight}</p>
        </Card>
      )}

      {/* This week's actions */}
      {analysis.this_week_actions?.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>This week&apos;s actions</div>
          {analysis.this_week_actions.map((action, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6 }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                background: 'var(--accent)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, marginTop: 1,
              }}>{i + 1}</span>
              <span style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.5 }}>{action}</span>
            </div>
          ))}
        </div>
      )}

      {/* Hook recommendations */}
      {analysis.hook_recommendations?.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Hook ideas to try</div>
          {analysis.hook_recommendations.map((hook, i) => (
            <div key={i} style={{
              fontSize: 12, color: 'var(--foreground)', lineHeight: 1.5,
              padding: '6px 10px', borderRadius: 6, marginBottom: 5,
              background: 'var(--muted)', fontStyle: 'italic',
            }}>
              &ldquo;{hook}&rdquo;
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CommentAnalysisPanel({ analysis }: { analysis: CommentAnalysis }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Consensus */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
          General Consensus
        </div>
        <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.65, margin: 0, paddingLeft: 12, borderLeft: '3px solid var(--accent)' }}>
          {analysis.consensus}
        </p>
      </div>

      {/* Top emotions */}
      {analysis.top_emotions?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {analysis.top_emotions.map((e, i) => (
            <span key={i} style={{
              fontSize: 12, padding: '3px 10px', borderRadius: 20,
              background: 'var(--muted)', color: 'var(--foreground)', fontWeight: 500,
            }}>{e}</span>
          ))}
        </div>
      )}

      {/* Common questions */}
      {analysis.common_questions?.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
            <HelpCircle size={12} style={{ color: 'hsl(220 90% 56%)' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'hsl(220 90% 56%)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Common Questions
            </span>
          </div>
          {analysis.common_questions.map((q, i) => (
            <div key={i} style={{
              marginBottom: 10, padding: '10px 12px', borderRadius: 8,
              background: 'var(--muted)', borderLeft: '3px solid hsl(220 90% 56%)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.45, marginBottom: 4 }}>
                &ldquo;{q.question}&rdquo;
                <span style={{
                  marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 10,
                  background: q.frequency === 'high' ? 'hsl(0 65% 50% / 0.15)' : 'var(--border)',
                  color: q.frequency === 'high' ? 'hsl(0 65% 50%)' : 'var(--muted-foreground)',
                  fontWeight: 600,
                }}>{q.frequency}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                <Lightbulb size={11} style={{ color: 'hsl(38 92% 45%)', flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 11, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
                  Video idea: {q.content_idea}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Objections */}
      {analysis.objections_or_doubts?.filter(Boolean).length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'hsl(38 92% 45%)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            Objections / Doubts
          </div>
          {analysis.objections_or_doubts.map((obj, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 5 }}>
              <AlertTriangle size={11} style={{ color: 'hsl(38 92% 45%)', flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.5 }}>{obj}</span>
            </div>
          ))}
        </div>
      )}

      {/* Content opportunities */}
      {analysis.content_opportunities?.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'hsl(142 50% 45%)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            Content Opportunities
          </div>
          {analysis.content_opportunities.map((opp, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                background: 'hsl(142 50% 45%)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, marginTop: 1,
              }}>{i + 1}</span>
              <span style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.5 }}>{opp}</span>
            </div>
          ))}
        </div>
      )}

      {/* Audience insight */}
      {analysis.audience_insight && (
        <Card style={{ padding: '12px 16px', background: 'var(--foreground)', borderRadius: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--background)', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
            Audience Insight
          </div>
          <p style={{ fontSize: 13, color: 'var(--background)', lineHeight: 1.6, margin: 0 }}>{analysis.audience_insight}</p>
        </Card>
      )}
    </div>
  )
}

export default function ContentDashboard({ report, reels, profileId, contentAnalysisUnlocksAt, commentAnalysisUnlocksAt }: Props) {
  const [reportExpanded, setReportExpanded] = useState(false)
  const [analysing, setAnalysing] = useState(false)
  const [contentAnalysis, setContentAnalysis] = useState<ContentAnalysis | null>(null)
  const [analysisUnlocksAt, setAnalysisUnlocksAt] = useState<string | null>(contentAnalysisUnlocksAt ?? null)
  const [commentAnalysing, setCommentAnalysing] = useState(false)
  const [commentAnalysis, setCommentAnalysis] = useState<CommentAnalysis | null>(null)
  const [commentUnlocksAt, setCommentUnlocksAt] = useState<string | null>(commentAnalysisUnlocksAt ?? null)
  const [commentError, setCommentError] = useState<string | null>(null)

  // Competitor intel state
  const [competitorHandles, setCompetitorHandles] = useState<string[]>([])
  const [topCompReels, setTopCompReels] = useState<Array<{ account: string; views: number; hook: string; format_type: string }>>([])
  const [intelReport, setIntelReport] = useState<{
    headline: string; top_format: string; format_insight: string;
    top_hooks: string[]; what_is_working: string[]; content_gaps: string[];
    post_ideas: string[]; weekly_verdict: string;
  } | null>(null)
  const [generatingIntel, setGeneratingIntel] = useState(false)
  const [intelError, setIntelError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/competitor-intel')
      .then(r => r.json())
      .then(d => {
        if (d.reels) setTopCompReels(d.reels.slice(0, 8))
        if (d.competitors) setCompetitorHandles(d.competitors)
      })
      .catch(() => {})
  }, [])

  async function handleGenerateIntel() {
    setGeneratingIntel(true)
    setIntelError(null)
    try {
      const res = await fetch('/api/competitor-intel', { method: 'POST' })
      const data = await res.json()
      if (data.error === 'no_competitors') {
        setIntelError('Add at least one competitor below to generate intelligence.')
      } else if (data.error === 'no_data') {
        setIntelError('No competitor reel data yet — data is collected every Monday. Check back then.')
      } else if (data.error) {
        setIntelError(data.error)
      } else if (data.report) {
        setIntelReport(data.report)
      }
    } catch { setIntelError('Network error') }
    setGeneratingIntel(false)
  }

  const analysisAvailable = !analysisUnlocksAt || new Date(analysisUnlocksAt) <= new Date()

  async function handleContentAnalysis() {
    if (!profileId || !analysisAvailable || analysing) return
    setAnalysing(true)
    try {
      const res = await fetch('/api/content/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      })
      const data = await res.json()
      if (data.error && data.error !== 'locked') {
        console.error('Content analysis error:', data.error)
      } else if (data.analysis) {
        setContentAnalysis(data.analysis)
        setAnalysisUnlocksAt(data.unlocks_at ?? null)
      }
    } catch { /* silently fail */ }
    setAnalysing(false)
  }

  const commentAvailable = !commentUnlocksAt || new Date(commentUnlocksAt) <= new Date()

  async function handleCommentAnalysis() {
    if (!profileId || !commentAvailable || commentAnalysing) return
    setCommentAnalysing(true)
    setCommentError(null)
    try {
      const res = await fetch('/api/content/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      })
      const data = await res.json()
      if (data.error === 'no_comments') {
        setCommentError('No comment data yet — sync your Instagram first to collect comments.')
      } else if (data.error && data.error !== 'locked') {
        setCommentError(data.error)
      } else if (data.analysis) {
        setCommentAnalysis(data.analysis)
        setCommentUnlocksAt(data.unlocks_at ?? null)
      }
    } catch { setCommentError('Network error') }
    setCommentAnalysing(false)
  }

  const commentUnlockLabel = commentUnlocksAt
    ? new Date(commentUnlocksAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    : null

  const unlockDate = analysisUnlocksAt ? new Date(analysisUnlocksAt) : null
  const unlockLabel = unlockDate
    ? unlockDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null

  const pillars = deriveContentPillars(reels)
  const maxPillarViews = pillars.length ? Math.max(...pillars.map(p => p.avgViews)) : 1

  const trendingTopics: TrendingTopic[] = report
    ? (Array.isArray(report.trending_topics) ? report.trending_topics : [])
    : []

  const topHooks: TopHook[] = report
    ? (Array.isArray(report.top_hooks) ? report.top_hooks : [])
    : []

  const weekLabel = report
    ? new Date(report.week_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.4px', marginBottom: 4 }}>
            Content Intelligence
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
            {weekLabel ? `Week of ${weekLabel} · ` : ''}What&rsquo;s working in your space + your content breakdown
          </p>
        </div>
        <Link href="/dashboard/scripts" style={{ textDecoration: 'none' }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 7, border: '1px solid var(--border)',
            background: 'var(--card)', color: 'var(--foreground)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <FileText size={14} />
            View This Week&rsquo;s Scripts
          </button>
        </Link>
      </div>

      {/* ── Intel section ── */}
      {!report ? <EmptyIntel /> : (
        <div style={{ display: 'grid', gridTemplateColumns: trendingTopics.length || topHooks.length ? '1fr 380px' : '1fr', gap: 16, marginBottom: 20 }}>

          {/* Left: What's Popping + Full Report */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Intel overview card */}
            {report.report_md && (
              <Card style={{ overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.2px' }}>
                        Weekly Intelligence
                      </div>
                      <Badge variant="accent">NEW</Badge>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 1 }}>
                      What&rsquo;s working right now + your performance last week
                    </div>
                  </div>
                </div>

                {/* Show the intel section of the report (before scripts) */}
                <div style={{ padding: '16px 20px' }}>
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.65,
                      color: 'var(--muted-foreground)',
                      maxHeight: reportExpanded ? 'none' : 360,
                      overflow: reportExpanded ? 'visible' : 'hidden',
                      position: 'relative',
                    }}
                    dangerouslySetInnerHTML={{ __html: renderMd(report.report_md) }}
                  />
                  {!reportExpanded && (
                    <div style={{
                      position: 'relative', height: 60, marginTop: -60,
                      background: 'linear-gradient(transparent, var(--card))',
                      pointerEvents: 'none',
                    }} />
                  )}
                  <button
                    onClick={() => setReportExpanded(e => !e)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, marginTop: 12,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, color: 'var(--accent)', padding: 0,
                      fontFamily: 'inherit',
                    }}
                  >
                    {reportExpanded ? <><ChevronUp size={14} /> Show less</> : <><ChevronDown size={14} /> Read full report</>}
                  </button>
                </div>
              </Card>
            )}
          </div>

          {/* Right: Trending topics + Top hooks */}
          {(trendingTopics.length > 0 || topHooks.length > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Trending topics */}
              {trendingTopics.length > 0 && (
                <Card style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <TrendingUp size={13} style={{ color: 'var(--accent)' }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>Trending This Week</span>
                    </div>
                  </div>
                  {trendingTopics.slice(0, 8).map((t, idx) => (
                    <div key={idx} style={{
                      padding: '10px 16px',
                      borderBottom: idx < trendingTopics.slice(0, 8).length - 1 ? '1px solid var(--border)' : 'none',
                      borderLeft: '3px solid var(--accent)',
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.4 }}>{t.topic}</div>
                      {(t.views > 0 || (t.accounts && t.accounts.length > 0)) && (
                        <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>
                          {t.views > 0 && `${t.views.toLocaleString()} views`}
                          {t.views > 0 && t.accounts?.length > 0 && ' · '}
                          {t.accounts?.slice(0, 2).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </Card>
              )}

              {/* Top hooks */}
              {topHooks.length > 0 && (
                <Card style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Zap size={13} style={{ color: 'var(--accent)' }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>Top Hooks</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 1 }}>Best-performing openers this week</div>
                  </div>
                  {topHooks.slice(0, 10).map((hook, idx) => (
                    <div key={idx} style={{
                      padding: '10px 16px',
                      borderBottom: idx < topHooks.slice(0, 10).length - 1 ? '1px solid var(--border)' : 'none',
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--border)', minWidth: 16, flexShrink: 0, lineHeight: 1.5 }}>
                        {idx + 1}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.4, fontWeight: 500 }}>
                          &ldquo;{hook.hook}&rdquo;
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                          {hook.account && (
                            <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>@{hook.account}</span>
                          )}
                          {hook.views > 0 && (
                            <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
                              {hook.views.toLocaleString()}
                            </span>
                          )}
                          {hook.url && (
                            <a href={hook.url} target="_blank" rel="noopener noreferrer"
                              style={{ color: 'var(--muted-foreground)', lineHeight: 1 }}>
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Weekly Content Analysis ── */}
      {profileId && (
        <div style={{ marginBottom: 20 }}>
          <Card style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '16px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: contentAnalysis ? '1px solid var(--border)' : 'none',
              flexWrap: 'wrap', gap: 12,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <Zap size={14} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>
                    My Content Breakdown
                  </span>
                  {!analysisAvailable && <Badge variant="muted">Locked</Badge>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                  {analysisAvailable
                    ? 'AI analysis of your last 30 days of content — available once per week'
                    : `Next analysis available ${unlockLabel}`}
                </div>
              </div>
              <button
                onClick={handleContentAnalysis}
                disabled={!analysisAvailable || analysing}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: analysisAvailable ? 'var(--accent)' : 'var(--muted)',
                  color: analysisAvailable ? '#fff' : 'var(--muted-foreground)',
                  fontSize: 13, fontWeight: 600, cursor: analysisAvailable && !analysing ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', transition: 'opacity 0.15s',
                  opacity: analysing ? 0.6 : 1,
                }}
              >
                {!analysisAvailable ? <Lock size={13} /> : <Zap size={13} />}
                {analysing ? 'Analysing…' : contentAnalysis ? 'Re-run Analysis' : 'Generate My Breakdown'}
              </button>
            </div>

            {contentAnalysis && (
              <div style={{ padding: '20px 20px' }}>
                <ContentAnalysisPanel analysis={contentAnalysis} />
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Comment Intelligence ── */}
      {profileId && (
        <div style={{ marginBottom: 20 }}>
          <Card style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '16px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: commentAnalysis ? '1px solid var(--border)' : 'none',
              flexWrap: 'wrap', gap: 12,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <MessageCircle size={14} style={{ color: 'hsl(220 90% 56%)' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>
                    Comment Intelligence
                  </span>
                  {!commentAvailable && <Badge variant="muted">Locked</Badge>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                  {commentAvailable
                    ? 'What your audience is saying, asking, and thinking — available once per week'
                    : `Next analysis available ${commentUnlockLabel}`}
                </div>
              </div>
              <button
                onClick={handleCommentAnalysis}
                disabled={!commentAvailable || commentAnalysing}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: commentAvailable ? 'hsl(220 90% 56%)' : 'var(--muted)',
                  color: commentAvailable ? '#fff' : 'var(--muted-foreground)',
                  fontSize: 13, fontWeight: 600, cursor: commentAvailable && !commentAnalysing ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', transition: 'opacity 0.15s',
                  opacity: commentAnalysing ? 0.6 : 1,
                }}
              >
                {!commentAvailable ? <Lock size={13} /> : <MessageCircle size={13} />}
                {commentAnalysing ? 'Analysing…' : commentAnalysis ? 'Re-run Analysis' : 'Analyse My Comments'}
              </button>
            </div>

            {commentError && (
              <div style={{ padding: '12px 20px', fontSize: 13, color: 'hsl(38 92% 45%)', background: 'hsl(38 92% 45% / 0.08)' }}>
                {commentError}
              </div>
            )}

            {commentAnalysis && (
              <div style={{ padding: '20px 20px' }}>
                <CommentAnalysisPanel analysis={commentAnalysis} />
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Content Pillars ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <SectionLabel>Your Content Pillars</SectionLabel>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: -8 }}>
              Format performance from your synced reels
            </div>
          </div>
          {reels.length > 0 && (
            <Link href="/dashboard/analytics" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
              View full analytics →
            </Link>
          )}
        </div>

        {pillars.length === 0 ? (
          <Card style={{ padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, color: 'var(--muted-foreground)' }}>
              <BarChart2 size={24} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>No content data yet</div>
            <div style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
              Connect your Instagram and sync your reels to see your content pillar breakdown.
            </div>
          </Card>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {pillars.map((p, idx) => (
              <Card key={p.fmt} style={{ padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
                {/* Accent bar */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  background: pillarColor(idx),
                }} />

                {/* Format label + count */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.1px',
                    textTransform: 'capitalize',
                  }}>
                    {fmtLabel(p.fmt)}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, background: 'var(--muted)',
                    color: 'var(--muted-foreground)', padding: '2px 6px', borderRadius: 4,
                  }}>
                    {p.count} reel{p.count !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Stats */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.5px', lineHeight: 1 }}>
                    {p.avgViews >= 1000 ? `${(p.avgViews / 1000).toFixed(1)}k` : p.avgViews.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>
                    avg views · max {p.maxViews >= 1000 ? `${(p.maxViews / 1000).toFixed(0)}k` : p.maxViews.toLocaleString()}
                  </div>
                </div>

                {/* Performance bar */}
                <div style={{ height: 4, background: 'var(--muted)', borderRadius: 2, marginBottom: 10 }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    width: `${(p.avgViews / maxPillarViews) * 100}%`,
                    background: pillarColor(idx),
                    transition: 'width 0.4s ease',
                  }} />
                </div>

                {/* Top hook */}
                {p.topHook && (
                  <div style={{
                    fontSize: 11, color: 'var(--muted-foreground)', lineHeight: 1.5,
                    borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    &ldquo;{p.topHook}&rdquo;
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Top reels by format ── */}
      {reels.length > 0 && (
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.2px' }}>Your Best Hooks</div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>Top-performing opening lines from your reels</div>
          </div>
          <div>
            {reels
              .filter(r => r.hook && r.views)
              .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
              .slice(0, 8)
              .map((r, idx) => (
                <div key={r.id || r.reel_id || idx} style={{
                  padding: '12px 20px',
                  borderBottom: idx < 7 ? '1px solid var(--border)' : 'none',
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  transition: 'background 0.1s',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--muted)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--border)', minWidth: 20, flexShrink: 0, lineHeight: 1.4 }}>
                    {idx + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.4, fontWeight: 500, marginBottom: 4 }}>
                      &ldquo;{r.hook}&rdquo;
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>
                        {(r.views ?? 0).toLocaleString()} views
                      </span>
                      {r.format_type && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, background: 'var(--muted)',
                          color: 'var(--muted-foreground)', padding: '1px 6px', borderRadius: 4,
                          textTransform: 'capitalize',
                        }}>
                          {r.format_type.replace(/_/g, ' ')}
                        </span>
                      )}
                      {r.date && (
                        <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                          {new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      {r.permalink && (
                        <a href={r.permalink} target="_blank" rel="noopener noreferrer"
                          style={{ color: 'var(--muted-foreground)', lineHeight: 1 }}>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* ── Niche Intelligence ── */}
      <div style={{ marginTop: 20 }}>
        <Card style={{ overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 12,
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <Globe size={14} style={{ color: 'hsl(270 60% 55%)' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>Niche Intelligence</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                Track competitors and get weekly insights on what&apos;s winning in your niche
              </div>
            </div>
            <button
              onClick={handleGenerateIntel}
              disabled={generatingIntel}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: 'hsl(270 60% 55%)',
                color: '#fff',
                fontSize: 13, fontWeight: 600,
                cursor: generatingIntel ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', opacity: generatingIntel ? 0.6 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              <Sparkles size={13} />
              {generatingIntel ? 'Generating…' : intelReport ? 'Regenerate Intel' : 'Generate Weekly Intel'}
            </button>
          </div>

          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Competitor Manager */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                Your Tracked Competitors
              </div>
              <CompetitorManager />
            </div>

            {/* Error state */}
            {intelError && (
              <div style={{
                padding: '10px 14px', borderRadius: 8,
                background: 'hsl(38 92% 45% / 0.08)', border: '1px solid hsl(38 92% 45% / 0.2)',
                fontSize: 13, color: 'hsl(38 92% 40%)',
              }}>
                {intelError}
              </div>
            )}

            {/* Top competitor reels (before intel generated) */}
            {!intelReport && topCompReels.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                  Top Competitor Reels This Period
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {topCompReels.map((r, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 8, background: 'var(--muted)',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: 'hsl(270 60% 55% / 0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: 'hsl(270 60% 55%)',
                      }}>{i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 2 }}>
                          @{r.account}
                          {r.format_type && (
                            <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 500, color: 'var(--muted-foreground)' }}>
                              {r.format_type.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          &ldquo;{r.hook || '(no hook captured)'}&rdquo;
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700, color: 'var(--foreground)', flexShrink: 0 }}>
                        <Eye size={11} style={{ color: 'var(--muted-foreground)' }} />
                        {r.views >= 1000 ? `${(r.views / 1000).toFixed(0)}k` : r.views.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
                  Hit &ldquo;Generate Weekly Intel&rdquo; above for a full AI analysis of what&apos;s winning in your niche.
                </div>
              </div>
            )}

            {/* Intel Report */}
            {intelReport && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Headline */}
                <div style={{
                  padding: '14px 16px', borderRadius: 10,
                  background: 'hsl(270 60% 55% / 0.08)', border: '1px solid hsl(270 60% 55% / 0.2)',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'hsl(270 60% 55%)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
                    This Week&apos;s Verdict
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.55, margin: 0 }}>
                    {intelReport.headline}
                  </p>
                </div>

                {/* Format + insight */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--muted)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Best Format</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', marginBottom: 4 }}>{intelReport.top_format}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>{intelReport.format_insight}</div>
                  </div>
                  <div style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--muted)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Top Hooks to Study</div>
                    {intelReport.top_hooks?.map((h, i) => (
                      <div key={i} style={{ fontSize: 11, color: 'var(--foreground)', fontStyle: 'italic', marginBottom: 5, lineHeight: 1.5 }}>
                        &ldquo;{h}&rdquo;
                      </div>
                    ))}
                  </div>
                </div>

                {/* What's working + content gaps */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'hsl(142 50% 45%)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>What&apos;s Working</div>
                    {intelReport.what_is_working?.map((w, i) => (
                      <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
                        <CheckCircle size={11} style={{ color: 'hsl(142 50% 45%)', flexShrink: 0, marginTop: 2 }} />
                        <span style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.5 }}>{w}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'hsl(220 90% 56%)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Content Gaps You Can Own</div>
                    {intelReport.content_gaps?.map((g, i) => (
                      <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
                        <Zap size={11} style={{ color: 'hsl(220 90% 56%)', flexShrink: 0, marginTop: 2 }} />
                        <span style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.5 }}>{g}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Post ideas */}
                {intelReport.post_ideas?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'hsl(38 92% 45%)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                      Reel Ideas for You This Week
                    </div>
                    {intelReport.post_ideas.map((idea, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, padding: '10px 14px', borderRadius: 8, background: 'var(--muted)' }}>
                        <span style={{
                          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                          background: 'hsl(38 92% 45%)', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700, marginTop: 1,
                        }}>{i + 1}</span>
                        <span style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.55 }}>{idea}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Verdict */}
                <Card style={{ padding: '14px 16px', background: 'var(--foreground)', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--background)', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                    This Week&apos;s Focus
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--background)', lineHeight: 1.65, margin: 0 }}>{intelReport.weekly_verdict}</p>
                </Card>
              </div>
            )}

            {/* Empty state — no competitors yet */}
            {competitorHandles.length === 0 && !intelError && (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <Users size={20} style={{ color: 'var(--muted-foreground)', margin: '0 auto 10px' }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 4 }}>
                  No competitors tracked yet
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
                  Add accounts above to start tracking what&apos;s working in your niche.
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

    </div>
  )
}
