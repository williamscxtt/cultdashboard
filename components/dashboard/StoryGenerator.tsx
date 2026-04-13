'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Sparkles, BookOpen, ChevronDown, ChevronUp,
  Copy, Check, Trash2, RefreshCw, ArrowLeft,
  Star, Lock, Play,
} from 'lucide-react'
import { Card, Button } from '@/components/ui'
import { useIsMobile } from '@/lib/use-mobile'
import { toast } from 'sonner'

// ── Types ─────────────────────────────────────────────────────────────────────

interface StorySlide {
  number: number
  background: string
  text: string
  purpose: string
}

interface StorySequence {
  id: string
  profile_id: string
  sequence_type: string
  day_of_week: string | null
  cta_type: string
  slides: StorySlide[]
  week_label: string | null
  created_at: string
}

interface StoryProfile {
  story_transformation: string
  story_mechanism_name: string
  story_best_client_result: string
  story_avg_views: string
  story_primary_keyword: string
  story_secondary_keyword: string
  story_lead_magnet: string
}

// ── Weekly schedule (reference only, no colors) ───────────────────────────────

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

interface DaySchedule {
  label: string
  sequenceType: string
  ctaType: 'none' | 'hard' | 'soft'
  purpose: string
}

function getIsoWeekNumber(): number {
  const now = new Date()
  const jan4 = new Date(now.getFullYear(), 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  return Math.floor((now.getTime() - startOfWeek1.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
}

function getWeeklySchedule(): Record<DayKey, DaySchedule> {
  const isQaWeek = getIsoWeekNumber() % 2 === 1
  return {
    monday:    { label: '7-Slide Conversion',       sequenceType: 'timeline-hard',         ctaType: 'hard',  purpose: 'Drive DMs to your main offer' },
    tuesday:   { label: 'Day-in-Life',               sequenceType: 'day-in-life',           ctaType: 'none',  purpose: 'Build views + trust' },
    wednesday: { label: 'Timeline Value',            sequenceType: 'timeline-value',        ctaType: 'none',  purpose: 'Authority + education' },
    thursday:  { label: 'Client Results',            sequenceType: 'client-results-soft',   ctaType: 'soft',  purpose: 'Drive DMs to free resource' },
    friday:    { label: 'Client Result Stacking',    sequenceType: 'client-results-none',   ctaType: 'none',  purpose: 'Social proof + FOMO' },
    saturday:  { label: 'Day-in-Life',               sequenceType: 'day-in-life',           ctaType: 'none',  purpose: 'Authenticity + relatability' },
    sunday:    { label: isQaWeek ? 'Q&A' : 'No Structure', sequenceType: isQaWeek ? 'qa' : 'no-structure', ctaType: 'none', purpose: 'Relatability + connection' },
  }
}

const DAYS: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS: Record<DayKey, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
}

const SEQUENCE_OPTIONS = [
  { value: 'timeline-hard',         label: '7-Slide Conversion',         ctaType: 'hard'  as const },
  { value: 'timeline-soft',         label: 'Timeline (Soft CTA)',        ctaType: 'soft'  as const },
  { value: 'timeline-value',        label: 'Timeline Value (No CTA)',    ctaType: 'none'  as const },
  { value: 'day-in-life',           label: 'Day-in-Life',                ctaType: 'none'  as const },
  { value: 'client-results-soft',   label: 'Client Results (Soft CTA)',  ctaType: 'soft'  as const },
  { value: 'client-results-none',   label: 'Client Results (No CTA)',    ctaType: 'none'  as const },
  { value: 'qa',                    label: 'Q&A',                        ctaType: 'none'  as const },
  { value: 'no-structure',          label: 'No Structure / Evergreen',   ctaType: 'none'  as const },
  { value: 'story-launch',          label: 'Story Launch (once/month)',  ctaType: 'hard'  as const },
]

const SEQUENCE_TYPE_LABELS: Record<string, string> = {
  'timeline-hard':       '7-Slide Conversion',
  'timeline-soft':       'Timeline (Soft CTA)',
  'timeline-value':      'Timeline Value',
  'day-in-life':         'Day-in-Life',
  'client-results-soft': 'Client Results (Soft CTA)',
  'client-results-none': 'Client Results',
  'qa':                  'Q&A',
  'no-structure':        'No Structure',
  'story-launch':        'Story Launch',
  'start-here':          'Start Here',
}

// ── Required fields check ─────────────────────────────────────────────────────

const REQUIRED_STORY_FIELDS: (keyof StoryProfile)[] = [
  'story_transformation', 'story_mechanism_name', 'story_best_client_result',
  'story_primary_keyword', 'story_secondary_keyword', 'story_lead_magnet',
]

const FIELD_LABELS: Partial<Record<keyof StoryProfile, string>> = {
  story_transformation:    'Transformation story',
  story_mechanism_name:    'Mechanism / system name',
  story_best_client_result:'Best client result',
  story_primary_keyword:   'Primary CTA keyword',
  story_secondary_keyword: 'Secondary CTA keyword',
  story_lead_magnet:       'Lead magnet description',
}

function getMissingFields(sp: StoryProfile): string[] {
  return REQUIRED_STORY_FIELDS.filter(k => !sp[k]?.trim()).map(k => FIELD_LABELS[k] ?? k)
}

// ── CTA badge ─────────────────────────────────────────────────────────────────

function CtaBadge({ type }: { type: string }) {
  if (type === 'hard') return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', color: 'var(--foreground)', letterSpacing: '0.05em', border: '1px solid var(--border)' }}>HARD CTA</span>
  )
  if (type === 'soft') return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', color: 'var(--muted-foreground)', letterSpacing: '0.05em', border: '1px solid var(--border)' }}>SOFT CTA</span>
  )
  return null
}

// ── Copy all slides button ────────────────────────────────────────────────────

function CopyAllBtn({ slides }: { slides: StorySlide[] }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    const text = slides.map(s =>
      `SLIDE ${s.number}\nBackground: ${s.background}\nText: ${s.text}`
    ).join('\n\n---\n\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
      background: copied ? 'rgba(34,197,94,0.1)' : 'var(--muted)',
      color: copied ? 'hsl(142 71% 45%)' : 'var(--muted-foreground)',
      border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
    }}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied!' : 'Copy all slides'}
    </button>
  )
}

// ── Single slide card ─────────────────────────────────────────────────────────

function SlideCard({
  slide, index, onRegen, regenerating, isMobile, isLast,
}: {
  slide: StorySlide
  index: number
  onRegen: (i: number) => void
  regenerating: boolean
  isMobile: boolean
  isLast: boolean
}) {
  const [copied, setCopied] = useState(false)
  const isBlack = slide.background.toLowerCase().includes('black background')

  function copySlide() {
    navigator.clipboard.writeText(slide.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'flex-start',
      paddingBottom: isLast ? 0 : 18,
      borderBottom: isLast ? 'none' : '1px solid var(--border)',
      marginBottom: isLast ? 0 : 18,
    }}>
      {/* Slide number */}
      <div style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        background: isBlack ? '#000' : 'var(--muted)',
        border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 800,
        color: isBlack ? '#fff' : 'var(--muted-foreground)',
      }}>
        {slide.number}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Background direction */}
        <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 6, fontStyle: 'italic' }}>
          📸 {slide.background}
        </div>

        {/* Slide text */}
        <div style={{
          fontSize: 14, fontWeight: 600, color: 'var(--foreground)',
          lineHeight: 1.6, whiteSpace: 'pre-line', marginBottom: 8,
          background: isBlack ? 'hsl(0 0% 5%)' : 'var(--muted)',
          padding: '10px 12px', borderRadius: 8,
          border: isBlack ? '1px solid hsl(0 0% 15%)' : '1px solid var(--border)',
          wordBreak: 'break-word',
        }}>
          {slide.text}
        </div>

        {/* Purpose note */}
        <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 8, lineHeight: 1.5 }}>
          💡 {slide.purpose}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={copySlide} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
            background: copied ? 'rgba(34,197,94,0.1)' : 'transparent',
            color: copied ? 'hsl(142 71% 45%)' : 'var(--muted-foreground)',
            border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {copied ? <Check size={10} /> : <Copy size={10} />}
            {copied ? 'Copied' : 'Copy text'}
          </button>
          <button onClick={() => onRegen(index)} disabled={regenerating} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
            background: 'transparent', color: 'var(--muted-foreground)',
            border: '1px solid var(--border)',
            cursor: regenerating ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            opacity: regenerating ? 0.5 : 1,
          }}>
            <RefreshCw size={10} style={regenerating ? { animation: 'spin 1s linear infinite' } : {}} />
            Redo slide
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StoryGenerator({ profileId }: { profileId: string }) {
  const isMobile = useIsMobile()
  const p = isMobile ? '16px' : '20px 24px'

  const [storyProfile, setStoryProfile] = useState<StoryProfile | null>(null)
  const [sequences, setSequences] = useState<StorySequence[]>([])
  const [loading, setLoading] = useState(true)

  // View: 'planner' | 'sequence' | 'saved'
  const [view, setView] = useState<'planner' | 'sequence' | 'saved'>('planner')

  // Generation state
  const [generating, setGenerating] = useState(false)
  const [generatingDay, setGeneratingDay] = useState<string | null>(null)
  const [currentSlides, setCurrentSlides] = useState<StorySlide[] | null>(null)
  const [currentSeqType, setCurrentSeqType] = useState('')
  const [currentCtaType, setCurrentCtaType] = useState('')
  const [currentDayOfWeek, setCurrentDayOfWeek] = useState('')
  const [currentSeqId, setCurrentSeqId] = useState<string | null>(null)
  const [regeneratingSlide, setRegeneratingSlide] = useState<number | null>(null)
  const [currentBrief, setCurrentBrief] = useState('')

  // Start Here
  const [generatingStartHere, setGeneratingStartHere] = useState(false)

  // Custom generator form
  const [customBrief, setCustomBrief] = useState('')
  const [customType, setCustomType] = useState('timeline-hard')
  const [customCta, setCustomCta] = useState<'none' | 'hard' | 'soft'>('hard')
  const [generatingCustom, setGeneratingCustom] = useState(false)

  // Weekly schedule expand
  const [scheduleExpanded, setScheduleExpanded] = useState(false)

  // Saved sequences
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedSaved, setExpandedSaved] = useState<Set<string>>(new Set())

  const weeklySchedule = getWeeklySchedule()
  const missingFields = storyProfile ? getMissingFields(storyProfile) : REQUIRED_STORY_FIELDS.map(() => '')
  const isLocked = !storyProfile || missingFields.length > 0

  const avgViews = parseInt(storyProfile?.story_avg_views || '0', 10)
  const launchWarning = avgViews > 0 && avgViews < 500

  // Sync ctaType when sequence type changes
  function handleTypeChange(val: string) {
    setCustomType(val)
    const opt = SEQUENCE_OPTIONS.find(o => o.value === val)
    if (opt) setCustomCta(opt.ctaType)
  }

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/story-generator?profileId=${profileId}`)
      const data = await res.json()
      setStoryProfile(data.storyProfile)
      setSequences(data.sequences || [])
    } catch { toast.error('Failed to load story data') }
    finally { setLoading(false) }
  }, [profileId])

  useEffect(() => { loadData() }, [loadData])

  // ── Generate a sequence ──────────────────────────────────────────────────
  async function generate(sequenceType: string, ctaType: string, dayOfWeek?: string, brief?: string) {
    setGenerating(true)
    setGeneratingDay(dayOfWeek || null)
    setCurrentSlides(null)
    try {
      const res = await fetch('/api/story-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId, action: 'generate', sequenceType, ctaType,
          dayOfWeek: dayOfWeek || null,
          customBrief: brief || '',
          week_label: `Week of ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
        }),
      })
      const text = await res.text()
      let data: { slides?: StorySlide[]; sequenceId?: string; error?: string }
      try { data = JSON.parse(text) } catch { throw new Error(text.slice(0, 120)) }
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setCurrentSlides(data.slides!)
      setCurrentSeqType(sequenceType)
      setCurrentCtaType(ctaType)
      setCurrentDayOfWeek(dayOfWeek || '')
      setCurrentSeqId(data.sequenceId || null)
      setCurrentBrief(brief || '')
      setView('sequence')
      loadData()
      toast.success('Sequence generated!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
      setGeneratingDay(null)
    }
  }

  // ── Regenerate a single slide ────────────────────────────────────────────
  async function regenSlide(slideIndex: number) {
    if (!currentSlides) return
    setRegeneratingSlide(slideIndex)
    try {
      const res = await fetch('/api/story-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId, action: 'regen-slide',
          sequenceType: currentSeqType, ctaType: currentCtaType,
          customBrief: currentBrief,
          slideIndex, existingSlides: currentSlides,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCurrentSlides(prev => prev!.map((s, i) => i === slideIndex ? { ...data.slide, number: s.number } : s))
      toast.success('Slide refreshed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setRegeneratingSlide(null)
    }
  }

  // ── Delete saved sequence ────────────────────────────────────────────────
  async function deleteSequence(id: string) {
    if (!confirm('Delete this sequence?')) return
    setDeletingId(id)
    try {
      const res = await fetch('/api/story-generator', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error('Delete failed')
      setSequences(prev => prev.filter(s => s.id !== id))
      toast.success('Deleted')
    } catch { toast.error('Delete failed') }
    finally { setDeletingId(null) }
  }

  if (loading) {
    return (
      <div style={{ marginTop: 32 }}>
        {[1, 2, 3].map(i => (
          <Card key={i} style={{ padding: p, marginBottom: 10 }}>
            <div style={{ height: 14, width: '40%', background: 'var(--muted)', borderRadius: 4, marginBottom: 8 }} />
            <div style={{ height: 11, width: '65%', background: 'var(--muted)', borderRadius: 4 }} />
          </Card>
        ))}
      </div>
    )
  }

  // ── Locked gate ──────────────────────────────────────────────────────────
  if (isLocked) {
    return (
      <div style={{ marginTop: 32 }}>
        <Card style={{ padding: isMobile ? '20px 16px' : '28px 32px', textAlign: 'center' }}>
          <Lock size={24} style={{ color: 'var(--muted-foreground)', margin: '0 auto 14px', display: 'block' }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginBottom: 8 }}>
            Complete Your Story Profile First
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 20, lineHeight: 1.65, maxWidth: 420, margin: '0 auto 20px' }}>
            Fill in the <strong>Story Profile</strong> section in your Onboarding Hub to unlock the Story Generator.
          </div>
          {missingFields.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20, textAlign: 'left', maxWidth: 320, margin: '0 auto 20px' }}>
              {missingFields.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted-foreground)' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'hsl(0 84% 60%)', flexShrink: 0 }} />
                  {f}
                </div>
              ))}
            </div>
          )}
          <Button variant="primary" onClick={() => window.location.href = '/dashboard/onboarding'}>
            Go to Onboarding Hub
          </Button>
        </Card>
      </div>
    )
  }

  // ── Sequence view ─────────────────────────────────────────────────────────
  if (view === 'sequence' && currentSlides) {
    return (
      <div style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setView('planner')} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--muted-foreground)', fontSize: 12, fontFamily: 'inherit', padding: 0,
            }}>
              <ArrowLeft size={13} /> Back
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>
              {SEQUENCE_TYPE_LABELS[currentSeqType] || currentSeqType}
            </span>
            <CtaBadge type={currentCtaType} />
            {currentDayOfWeek && (
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)', textTransform: 'capitalize' }}>{currentDayOfWeek}</span>
            )}
          </div>
        </div>

        {currentBrief && (
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 14, padding: '8px 12px', borderRadius: 7, background: 'var(--muted)', border: '1px solid var(--border)', fontStyle: 'italic' }}>
            &ldquo;{currentBrief}&rdquo;
          </div>
        )}

        <Card style={{ padding: p, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-foreground)' }}>
              {currentSlides.length} slides
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <CopyAllBtn slides={currentSlides} />
              <button
                onClick={() => generate(currentSeqType, currentCtaType, currentDayOfWeek || undefined, currentBrief)}
                disabled={generating}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                  background: 'var(--muted)', color: 'var(--muted-foreground)',
                  border: '1px solid var(--border)', cursor: generating ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', opacity: generating ? 0.5 : 1,
                }}
              >
                <RefreshCw size={11} style={generating ? { animation: 'spin 1s linear infinite' } : {}} />
                Regenerate all
              </button>
            </div>
          </div>

          {currentSlides.map((slide, i) => (
            <SlideCard
              key={i}
              slide={slide}
              index={i}
              onRegen={regenSlide}
              regenerating={regeneratingSlide === i}
              isMobile={isMobile}
              isLast={i === currentSlides.length - 1}
            />
          ))}
        </Card>

        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ── Saved sequences view ──────────────────────────────────────────────────
  if (view === 'saved') {
    return (
      <div style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button onClick={() => setView('planner')} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted-foreground)', fontSize: 12, fontFamily: 'inherit', padding: 0,
          }}>
            <ArrowLeft size={13} /> Back
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>
            Saved Sequences ({sequences.length})
          </span>
        </div>

        {sequences.length === 0 ? (
          <Card style={{ padding: p, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>No saved sequences yet.</div>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sequences.map(seq => {
              const isExpanded = expandedSaved.has(seq.id)
              return (
                <Card key={seq.id} style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>
                            {SEQUENCE_TYPE_LABELS[seq.sequence_type] || seq.sequence_type}
                          </span>
                          <CtaBadge type={seq.cta_type} />
                          {seq.day_of_week && (
                            <span style={{ fontSize: 11, color: 'var(--muted-foreground)', textTransform: 'capitalize' }}>{seq.day_of_week}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 6 }}>
                          {new Date(seq.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {' · '}{seq.slides.length} slides
                        </div>
                        {!isExpanded && seq.slides[0] && (
                          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.5, fontStyle: 'italic' }}>
                            &ldquo;{seq.slides[0].text.split('\n')[0].slice(0, 80)}...&rdquo;
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => {
                            setCurrentSlides(seq.slides)
                            setCurrentSeqType(seq.sequence_type)
                            setCurrentCtaType(seq.cta_type)
                            setCurrentDayOfWeek(seq.day_of_week || '')
                            setCurrentSeqId(seq.id)
                            setCurrentBrief('')
                            setView('sequence')
                          }}
                          style={{
                            padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            background: 'var(--accent)', color: '#fff', border: 'none',
                            cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >
                          View
                        </button>
                        <button
                          onClick={() => setExpandedSaved(prev => { const next = new Set(prev); next.has(seq.id) ? next.delete(seq.id) : next.add(seq.id); return next })}
                          style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--muted-foreground)' }}
                        >
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                        <button
                          onClick={() => deleteSequence(seq.id)}
                          disabled={deletingId === seq.id}
                          style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'hsl(0 72% 51%)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px', background: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {seq.slides.map((slide, i) => (
                        <div key={i} style={{ borderLeft: '2px solid var(--border)', paddingLeft: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', marginBottom: 3 }}>Slide {slide.number}</div>
                          <div style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.55, whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{slide.text}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Planner view (default) ────────────────────────────────────────────────
  return (
    <div style={{ marginTop: 32 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>Story Generator</div>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>
            Describe what you want — we&apos;ll write the whole sequence
          </div>
        </div>
        {sequences.length > 0 && (
          <button onClick={() => setView('saved')} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            background: 'var(--muted)', color: 'var(--muted-foreground)',
            border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <BookOpen size={12} /> Saved ({sequences.length})
          </button>
        )}
      </div>

      {/* ── PRIMARY: Custom generator ───────────────────────────────────── */}
      <Card style={{ padding: p, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', marginBottom: 14 }}>
          Generate a Story Sequence
        </div>

        {/* Brief textarea */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            What&apos;s this sequence about?
          </label>
          <textarea
            value={customBrief}
            onChange={e => setCustomBrief(e.target.value)}
            placeholder="e.g. I want to showcase how Jake went from 0 to £8k/month in 6 weeks using my system. Hard CTA at the end to DM me."
            rows={3}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--input)',
              color: 'var(--foreground)', fontSize: 13, fontFamily: 'inherit',
              lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box',
            }}
          />
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 5 }}>
            Optional but makes it much more specific. Describe the angle, result, or topic to build around.
          </div>
        </div>

        {/* Type + CTA row */}
        <div style={{ display: 'flex', gap: 10, flexDirection: isMobile ? 'column' : 'row', marginBottom: 14 }}>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Sequence type
            </label>
            <select
              value={customType}
              onChange={e => handleTypeChange(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input)', color: 'var(--foreground)', fontSize: 13, fontFamily: 'inherit' }}
            >
              {SEQUENCE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              CTA type
            </label>
            <select
              value={customCta}
              onChange={e => setCustomCta(e.target.value as 'none' | 'hard' | 'soft')}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input)', color: 'var(--foreground)', fontSize: 13, fontFamily: 'inherit' }}
            >
              <option value="hard">Hard CTA (DM keyword)</option>
              <option value="soft">Soft CTA (free resource)</option>
              <option value="none">No CTA</option>
            </select>
          </div>
        </div>

        {/* Story Launch warning */}
        {customType === 'story-launch' && launchWarning && (
          <div style={{ marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
              Story Launches work best with 500+ story views. Keep building your audience first — this will hit harder when you&apos;re ready. You can still generate it now.
            </span>
          </div>
        )}

        <Button
          variant="primary"
          disabled={generatingCustom}
          onClick={async () => {
            setGeneratingCustom(true)
            await generate(customType, customCta, undefined, customBrief)
            setGeneratingCustom(false)
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 7 }}
        >
          {generatingCustom
            ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
            : <><Sparkles size={12} /> Generate Sequence</>
          }
        </Button>
      </Card>

      {/* ── Start Here Highlight ────────────────────────────────────────── */}
      <Card style={{ padding: p, marginBottom: 16, border: '1px solid var(--border)', background: 'var(--muted)' }}>
        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 12, flexDirection: isMobile ? 'column' : 'row' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Star size={13} style={{ color: 'var(--muted-foreground)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>Start Here Highlight</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
              Your 10-slide profile highlight — a silent sales pitch for every new visitor. Generate once and pin as your first Highlight.
            </div>
          </div>
          <Button
            variant="secondary"
            disabled={generatingStartHere}
            onClick={async () => {
              setGeneratingStartHere(true)
              await generate('start-here', 'hard', undefined, '')
              setGeneratingStartHere(false)
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            {generatingStartHere
              ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
              : <><Sparkles size={12} /> Generate Start Here</>
            }
          </Button>
        </div>
      </Card>

      {/* ── Weekly schedule (collapsible reference guide) ───────────────── */}
      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 4 }}>
        <button
          onClick={() => setScheduleExpanded(v => !v)}
          style={{
            width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', background: 'transparent', border: 'none',
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>Weekly Posting Schedule</div>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>
              What to post each day — tap a day to generate that sequence
            </div>
          </div>
          {scheduleExpanded ? <ChevronUp size={15} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} /> : <ChevronDown size={15} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />}
        </button>

        {scheduleExpanded && (
          <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {DAYS.map(day => {
              const sched = weeklySchedule[day]
              const isGeneratingThisDay = generatingDay === day && generating
              return (
                <div key={day} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                  borderRadius: 8, background: 'transparent',
                }}>
                  <div style={{
                    width: 36, fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)',
                    textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0,
                  }}>
                    {DAY_LABELS[day]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{sched.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{sched.purpose}</div>
                  </div>
                  {sched.ctaType !== 'none' && <CtaBadge type={sched.ctaType} />}
                  <button
                    onClick={() => generate(sched.sequenceType, sched.ctaType, day)}
                    disabled={generating}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: 'var(--muted)', color: isGeneratingThisDay ? 'var(--muted-foreground)' : 'var(--foreground)',
                      border: '1px solid var(--border)',
                      cursor: generating ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', flexShrink: 0,
                      opacity: generating && !isGeneratingThisDay ? 0.4 : 1,
                    }}
                  >
                    {isGeneratingThisDay
                      ? <RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} />
                      : <Play size={10} style={{ fill: 'currentColor' }} />
                    }
                    {isGeneratingThisDay ? '…' : 'Generate'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
