'use client'

import { useState } from 'react'
import { Card } from '@/components/ui'
import { toast } from 'sonner'

interface LeadMagnetIdea {
  title: string
  concept: string
  why_it_works: string
  comment_keyword?: string
  caption_cta?: string
  reel_angle?: string
  // legacy field — kept for backward compat
  promotion_strategy?: string
  outline: string[]
}

interface LeadMagnetGeneratorProps {
  profileId: string
}

export default function LeadMagnetGenerator({ profileId }: LeadMagnetGeneratorProps) {
  const [ideas, setIdeas] = useState<LeadMagnetIdea[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [generatingContent, setGeneratingContent] = useState<string | null>(null)
  const [generatedContent, setGeneratedContent] = useState<Record<string, string>>({})
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null)
  const [expandedOutlines, setExpandedOutlines] = useState<Set<string>>(new Set())
  const [copiedContent, setCopiedContent] = useState<string | null>(null)
  const [copiedCta, setCopiedCta] = useState<string | null>(null)

  function copyCta(title: string, text: string) {
    navigator.clipboard.writeText(text)
    setCopiedCta(title)
    setTimeout(() => setCopiedCta(null), 2000)
  }

  function PromotionBlock({ idea }: { idea: LeadMagnetIdea }) {
    const isCopied = copiedCta === idea.title
    const ctaText = idea.caption_cta || idea.promotion_strategy || ''
    return (
      <div style={{
        marginBottom: 14,
        borderRadius: 8,
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '8px 14px',
          background: 'var(--muted)',
          borderBottom: '1px solid var(--border)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
          color: 'var(--muted-foreground)',
        }}>
          📣 How to Promote
        </div>

        <div style={{ padding: '12px 14px', background: 'var(--card)', display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
          {/* Keyword badge */}
          {idea.comment_keyword && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, minWidth: 70 }}>Keyword</span>
              <span style={{
                padding: '3px 10px',
                borderRadius: 4,
                background: 'var(--foreground)',
                color: 'var(--background)',
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '0.05em',
                fontFamily: 'monospace',
              }}>
                {idea.comment_keyword}
              </span>
            </div>
          )}

          {/* Caption CTA — copyable */}
          {ctaText && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, marginBottom: 5 }}>Caption CTA</div>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '9px 12px',
                borderRadius: 7,
                background: 'var(--muted)',
                border: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5, flex: 1 }}>{ctaText}</span>
                <button
                  onClick={() => copyCta(idea.title, ctaText)}
                  style={{
                    flexShrink: 0,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: `1px solid ${isCopied ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`,
                    background: isCopied ? 'rgba(34,197,94,0.08)' : 'transparent',
                    color: isCopied ? 'hsl(142 71% 45%)' : 'var(--muted-foreground)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap' as const,
                  }}
                >
                  {isCopied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Reel angle */}
          {idea.reel_angle && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, marginBottom: 4 }}>Reel to post</div>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>{idea.reel_angle}</div>
            </div>
          )}
        </div>
      </div>
    )
  }

  async function generateIdeas() {
    setLoading(true)
    try {
      const res = await fetch('/api/lead-magnet-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, action: 'ideas' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate ideas')
      setIdeas(data.ideas)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate ideas')
    } finally {
      setLoading(false)
    }
  }

  async function generateContent(idea: LeadMagnetIdea) {
    setGeneratingContent(idea.title)
    try {
      const res = await fetch('/api/lead-magnet-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          action: 'generate',
          title: idea.title,
          concept: idea.concept,
          outline: idea.outline,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate content')
      setGeneratedContent(prev => ({ ...prev, [idea.title]: data.content }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate content')
    } finally {
      setGeneratingContent(null)
    }
  }

  function getClaudePrompt(idea: LeadMagnetIdea): string {
    return `Write a lead magnet PDF called "${idea.title}" for a coaching Instagram creator.

Concept: ${idea.concept}

Sections to cover:
${idea.outline.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Write in a direct, no-fluff coaching voice. Each section 150-250 words. End with a soft CTA to DM the creator for more.`
  }

  function copyPrompt(idea: LeadMagnetIdea) {
    navigator.clipboard.writeText(getClaudePrompt(idea))
    setCopiedPrompt(idea.title)
    setTimeout(() => setCopiedPrompt(null), 2000)
  }

  function copyContent(title: string) {
    navigator.clipboard.writeText(generatedContent[title] || '')
    setCopiedContent(title)
    setTimeout(() => setCopiedContent(null), 2000)
  }

  function toggleOutline(title: string) {
    setExpandedOutlines(prev => {
      const next = new Set(prev)
      next.has(title) ? next.delete(title) : next.add(title)
      return next
    })
  }

  return (
    <div style={{ marginTop: 32 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>
          Lead Magnet Generator
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>
          Turn your expertise into a free resource your exact ICP will DM for.
        </div>
      </div>

      {/* Generate button */}
      <Card style={{ padding: '16px 20px', marginBottom: 16 }}>
        <button
          onClick={generateIdeas}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            background: loading ? 'var(--muted)' : 'var(--accent)',
            color: loading ? 'var(--muted-foreground)' : '#fff',
            fontSize: 13,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
        >
          {loading ? (
            <>
              <span style={{ display: 'inline-block', animation: 'lmSpin 1s linear infinite' }}>◌</span>
              Analysing your profile...
            </>
          ) : (
            <>✨ Generate Ideas</>
          )}
        </button>
        {ideas && !loading && (
          <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--muted-foreground)' }}>
            {ideas.length} ideas generated — click Generate again to refresh
          </span>
        )}
      </Card>

      {/* Ideas */}
      {ideas && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {ideas.map((idea) => {
            const isOutlineExpanded = expandedOutlines.has(idea.title)
            const isGeneratingThis = generatingContent === idea.title
            const hasContent = !!generatedContent[idea.title]
            const isCopiedPrompt = copiedPrompt === idea.title
            const isCopiedContent = copiedContent === idea.title

            return (
              <Card key={idea.title} style={{ padding: 0, overflow: 'hidden' }}>
                {/* Card header */}
                <div style={{ padding: '18px 20px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', marginBottom: 8, lineHeight: 1.4 }}>
                    {idea.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.65, marginBottom: 10 }}>
                    {idea.concept}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)', fontStyle: 'italic', lineHeight: 1.55, marginBottom: 14 }}>
                    {idea.why_it_works}
                  </div>

                  {/* Promotion block */}
                  {(idea.comment_keyword || idea.caption_cta || idea.reel_angle || idea.promotion_strategy) && (
                    <PromotionBlock idea={idea} />
                  )}

                  {/* Outline toggle */}
                  <button
                    onClick={() => toggleOutline(idea.title)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'transparent',
                      color: 'var(--muted-foreground)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      marginBottom: 14,
                    }}
                  >
                    {isOutlineExpanded ? '▲' : '▼'} {isOutlineExpanded ? 'Hide' : 'Show'} outline
                  </button>

                  {isOutlineExpanded && (
                    <div style={{
                      marginBottom: 14,
                      background: 'var(--muted)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      border: '1px solid var(--border)',
                    }}>
                      {idea.outline.map((section, i) => (
                        <div key={i} style={{
                          display: 'flex',
                          gap: 10,
                          fontSize: 12,
                          color: 'var(--foreground)',
                          lineHeight: 1.55,
                          marginBottom: i < idea.outline.length - 1 ? 8 : 0,
                        }}>
                          <span style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: 'var(--foreground)',
                            color: 'var(--background)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: 800,
                            flexShrink: 0,
                            marginTop: 1,
                          }}>{i + 1}</span>
                          <span>{section}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => copyPrompt(idea)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '7px 14px',
                        borderRadius: 7,
                        border: `1px solid ${isCopiedPrompt ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`,
                        background: isCopiedPrompt ? 'rgba(34,197,94,0.08)' : 'var(--muted)',
                        color: isCopiedPrompt ? 'hsl(142 71% 45%)' : 'var(--muted-foreground)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 0.15s',
                      }}
                    >
                      {isCopiedPrompt ? '✓ Copied!' : '📋 Copy Claude Prompt'}
                    </button>

                    <button
                      onClick={() => generateContent(idea)}
                      disabled={isGeneratingThis}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '7px 14px',
                        borderRadius: 7,
                        border: 'none',
                        background: isGeneratingThis ? 'var(--muted)' : 'var(--accent)',
                        color: isGeneratingThis ? 'var(--muted-foreground)' : '#fff',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: isGeneratingThis ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 0.15s',
                        opacity: isGeneratingThis ? 0.7 : 1,
                      }}
                    >
                      {isGeneratingThis ? (
                        <><span style={{ display: 'inline-block', animation: 'lmSpin 1s linear infinite' }}>◌</span> Generating...</>
                      ) : (
                        <>⚡ {hasContent ? 'Regenerate Content' : 'Generate Content'}</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Generated content */}
                {hasContent && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', background: 'var(--muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        Generated Content
                      </span>
                      <button
                        onClick={() => copyContent(idea.title)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: `1px solid ${isCopiedContent ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`,
                          background: isCopiedContent ? 'rgba(34,197,94,0.08)' : 'transparent',
                          color: isCopiedContent ? 'hsl(142 71% 45%)' : 'var(--muted-foreground)',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'all 0.15s',
                        }}
                      >
                        {isCopiedContent ? '✓ Copied!' : 'Copy all'}
                      </button>
                    </div>
                    <textarea
                      readOnly
                      value={generatedContent[idea.title]}
                      style={{
                        width: '100%',
                        minHeight: 280,
                        padding: '12px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--card)',
                        color: 'var(--foreground)',
                        fontSize: 13,
                        fontFamily: 'inherit',
                        lineHeight: 1.7,
                        resize: 'vertical',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <style>{`@keyframes lmSpin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
