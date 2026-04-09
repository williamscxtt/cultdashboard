'use client'
import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Send, MessageSquare, Sparkles } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const SUGGESTED_QUESTIONS = [
  "Why aren't my reels getting views?",
  "What should I post this week?",
  "How do I write a better hook?",
  "How do I grow faster on Instagram?",
  "How do I convert followers to clients?",
  "What's the best content format for my niche?",
]

function ThinkingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--accent)',
            display: 'inline-block',
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </span>
  )
}

function WillAvatar({ size = 32 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 9, flexShrink: 0,
      background: 'linear-gradient(135deg, var(--accent), hsl(260 80% 56%))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color: 'white',
      boxShadow: '0 2px 8px hsl(220 90% 56% / 0.3)',
    }}>
      W
    </div>
  )
}

export default function AiChat({ profileId, profileName }: { profileId: string; profileName: string }) {
  const searchParams = useSearchParams()
  const prefilledQ = searchParams.get('q')

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState(prefilledQ ?? '')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (prefilledQ) inputRef.current?.focus()
  }, [prefilledQ])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return
    setError(null)

    const userMsg: Message = { role: 'user', content: text.trim(), timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), profileId, sessionId }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Something went wrong')
      }

      const data = await res.json()
      setSessionId(data.sessionId)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
      }])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to get a response')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const canSend = input.trim().length > 0 && !loading

  return (
    <div style={{ display: 'flex', height: '100%', flex: 1, overflow: 'hidden' }}>

      {/* ── Left panel: suggestions ──────────────────────────────────────── */}
      <div style={{
        width: 200, minWidth: 200, flexShrink: 0,
        background: 'var(--card)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        padding: '16px 10px',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, padding: '0 4px' }}>
          <Sparkles size={12} color="var(--accent)" />
          <span style={{
            fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>
            Quick questions
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {SUGGESTED_QUESTIONS.map(q => (
            <button
              key={q}
              onClick={() => { setInput(q); inputRef.current?.focus() }}
              disabled={loading}
              style={{
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 8, padding: '8px 10px',
                fontSize: 11.5, fontWeight: 500, color: 'var(--muted-foreground)',
                textAlign: 'left', cursor: loading ? 'not-allowed' : 'pointer',
                lineHeight: 1.5, transition: 'all 0.12s', fontFamily: 'inherit',
              }}
              onMouseEnter={e => {
                if (!loading) {
                  const el = e.currentTarget as HTMLElement
                  el.style.background = 'hsl(220 90% 56% / 0.06)'
                  el.style.borderColor = 'hsl(220 90% 56% / 0.3)'
                  el.style.color = 'var(--foreground)'
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'transparent'
                el.style.borderColor = 'var(--border)'
                el.style.color = 'var(--muted-foreground)'
              }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main chat ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{
          padding: '12px 20px',
          background: 'var(--card)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <WillAvatar size={32} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.2 }}>
              Ask Will AI
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 1 }}>
              {profileName ? `Personalised for ${profileName}` : 'Powered by Will\'s coaching frameworks'}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'rgba(255,255,255,0.5)',
              boxShadow: '0 0 0 2px rgba(255,255,255,0.15)',
              display: 'inline-block',
            }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#3B82F6' }}>Online</span>
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '24px 20px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {messages.length === 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', flex: 1, textAlign: 'center',
              color: 'var(--muted-foreground)', paddingTop: 48,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'linear-gradient(135deg, var(--accent), hsl(260 80% 56%))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
                boxShadow: '0 4px 16px hsl(220 90% 56% / 0.3)',
              }}>
                <MessageSquare size={24} color="white" />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)', marginBottom: 6 }}>
                Ask Will anything
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 340 }}>
                Get personalised advice on growing your Instagram, writing better content, and converting followers to clients.
              </div>
              <div style={{ fontSize: 11, marginTop: 12, opacity: 0.6 }}>
                Use the questions on the left or type your own below
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
                gap: 8,
                animation: 'slide-up 0.2s ease both',
              }}
            >
              {msg.role === 'assistant' && <WillAvatar size={28} />}

              <div style={{
                maxWidth: '72%',
                padding: '11px 15px',
                borderRadius: msg.role === 'user'
                  ? '14px 4px 14px 14px'
                  : '4px 14px 14px 14px',
                background: msg.role === 'user'
                  ? 'var(--foreground)'
                  : 'var(--card)',
                color: msg.role === 'user'
                  ? 'var(--background)'
                  : 'var(--foreground)',
                fontSize: 13.5, lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                boxShadow: 'var(--shadow-sm)',
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <WillAvatar size={28} />
              <div style={{
                padding: '12px 16px',
                borderRadius: '4px 14px 14px 14px',
                background: 'var(--card)', border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 12, color: 'var(--muted-foreground)',
              }}>
                Will is thinking <ThinkingDots />
              </div>
            </div>
          )}

          {error && (
            <div style={{
              background: 'hsl(0 50% 96%)', border: '1px solid hsl(0 70% 88%)',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, color: 'hsl(0 72% 45%)',
            }}>
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input bar — floating pill */}
        <div style={{ padding: '10px 16px 18px', background: 'var(--background)', flexShrink: 0 }}>
          <div
            style={{
              display: 'flex', alignItems: 'flex-end',
              background: 'var(--card)',
              border: '1.5px solid var(--border)',
              borderRadius: 20,
              boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
              padding: '6px 6px 6px 18px',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocusCapture={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'var(--accent)'
              el.style.boxShadow = '0 4px 24px rgba(0,0,0,0.10), 0 0 0 3px hsl(220 90% 56% / 0.10)'
            }}
            onBlurCapture={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'var(--border)'
              el.style.boxShadow = '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)'
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Will anything…"
              rows={1}
              style={{
                flex: 1, resize: 'none', maxHeight: 140,
                lineHeight: 1.65, padding: '8px 0',
                border: 'none', background: 'transparent',
                fontSize: 14, fontFamily: 'inherit', color: 'var(--foreground)',
                outline: 'none',
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!canSend}
              style={{
                width: 36, height: 36, borderRadius: 14, flexShrink: 0, alignSelf: 'flex-end',
                border: 'none', cursor: canSend ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: canSend
                  ? 'linear-gradient(135deg, var(--accent), hsl(260 80% 56%))'
                  : 'var(--muted)',
                color: canSend ? 'white' : 'var(--muted-foreground)',
                transition: 'all 0.15s',
                boxShadow: canSend ? '0 2px 8px hsl(220 90% 56% / 0.35)' : 'none',
              }}
              onMouseEnter={e => { if (canSend) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = '' }}
            >
              <Send size={14} />
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', textAlign: 'center', marginTop: 6, opacity: 0.55 }}>
            Enter to send · Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  )
}
