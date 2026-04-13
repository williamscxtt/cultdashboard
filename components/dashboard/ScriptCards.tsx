'use client'
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Card, Badge } from '@/components/ui'

function renderMd(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--foreground);font-weight:700;">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[-•] (.+)$/gm, '<li style="margin:3px 0;padding-left:4px;">$1</li>')
    .replace(/(<li[^>]*>.*?<\/li>\n?)+/g, '<ul style="padding-left:16px;margin:6px 0;list-style:disc;">$&</ul>')
    .replace(/\n\n/g, '</p><p style="margin:6px 0;line-height:1.65;">')
    .replace(/\n/g, '<br/>')
}

interface ParsedScript {
  day: string
  format: string
  hook: string
  body: string
  caption: string
  cta: string
  ctaType: 'DM' | 'AUDIT' | 'OTHER'
  raw: string
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function parseScripts(md: string): ParsedScript[] {
  const sections = md.split(/(?=###\s*🎬\s*Reel\s*\d+)/g).filter(s => s.trim())

  return sections.map((section, idx) => {
    const headerMatch = section.match(/###\s*🎬\s*Reel\s*\d+\s*[—–-]\s*([^|]+)\|?\s*(.*)?/)
    const day = headerMatch?.[1]?.trim() || DAYS[idx] || `Reel ${idx + 1}`
    const format = headerMatch?.[2]?.trim() || ''

    const hookMatch = section.match(/\*{0,2}(?:Hook|HOOK)\*{0,2}[:\s]*([^\n]+)/i)
    const hook = hookMatch?.[1]?.replace(/^\*+|\*+$/g, '').trim() || ''

    const captionMatch = section.match(/\*{0,2}(?:Caption|CAPTION)\*{0,2}[:\s]*([^\n]+)/i)
    const caption = captionMatch?.[1]?.replace(/^\*+|\*+$/g, '').trim() || ''

    const ctaMatch = section.match(/\*{0,2}(?:CTA|Call to Action)\*{0,2}[:\s]*([^\n]+)/i)
    const ctaRaw = ctaMatch?.[1]?.replace(/^\*+|\*+$/g, '').trim() || ''

    let ctaType: 'DM' | 'AUDIT' | 'OTHER' = 'OTHER'
    if (/DM\s*CULT/i.test(ctaRaw)) ctaType = 'DM'
    else if (/AUDIT/i.test(ctaRaw)) ctaType = 'AUDIT'

    const bodyMatch = section.match(/\*{0,2}(?:Script|SCRIPT)\*{0,2}[:\s]*([\s\S]*?)(?=\*{0,2}(?:Caption|CTA|CAPTION)|$)/i)
    const body = bodyMatch?.[1]?.trim() || section.trim()

    return { day: day.trim(), format: format.trim(), hook, body, caption, cta: ctaRaw, ctaType, raw: section }
  })
}

export default function ScriptCards({ scriptsMd }: { scriptsMd: string }) {
  const scripts = parseScripts(scriptsMd)

  if (scripts.length === 0) {
    return (
      <div style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>
        No scripts found in this week&apos;s file.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {scripts.map((script, idx) => (
        <ScriptCard key={idx} script={script} index={idx} />
      ))}
    </div>
  )
}

function ScriptCard({ script, index }: { script: ParsedScript; index: number }) {
  const [expanded, setExpanded] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(script.raw)
    toast.success('Script copied!')
  }

  const ctaBadgeVariant = script.ctaType === 'DM' ? 'accent' : script.ctaType === 'AUDIT' ? 'warning' : 'muted'

  return (
    <Card style={{ padding: 20 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {script.day}
        </span>
        {script.format && <Badge variant="accent">{script.format}</Badge>}
      </div>

      {/* Hook */}
      {script.hook && (
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.4, paddingTop: 4, marginBottom: 14 }}>
          &ldquo;{script.hook}&rdquo;
        </div>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border)', marginBottom: 12 }} />

      {/* Expand toggle */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--accent)', fontSize: 13, fontWeight: 600,
            padding: 0, fontFamily: 'inherit',
          }}
        >
          View full script →
        </button>
      )}

      {/* Expanded body */}
      {expanded && (
        <div>
          {script.body && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Script
              </div>
              <div
                style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.8 }}
                dangerouslySetInnerHTML={{ __html: renderMd(script.body) }}
              />
            </div>
          )}

          {script.caption && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Caption
              </div>
              <div
                style={{ background: 'var(--muted)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.7 }}
                dangerouslySetInnerHTML={{ __html: renderMd(script.caption) }}
              />
            </div>
          )}

          {/* CTA badge + Copy button row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {script.cta && <Badge variant={ctaBadgeVariant}>{script.cta}</Badge>}
              <button
                onClick={() => setExpanded(false)}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--muted-foreground)', fontSize: 12, fontWeight: 500,
                  padding: 0, fontFamily: 'inherit',
                }}
              >
                Collapse
              </button>
            </div>
            <button
              onClick={handleCopy}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 6,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--foreground)', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.1s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--muted)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <Copy size={12} />
              Copy
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
