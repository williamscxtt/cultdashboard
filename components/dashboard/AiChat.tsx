'use client'
import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Send } from 'lucide-react'

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
  "What's working right now in my niche?",
  "How do I convert followers to clients?",
]

function ThinkingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 5, height: 5, borderRadius: '50%',
            background: 'var(--muted-foreground)',
            display: 'inline-block',
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </span>
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

  return (
    <div style={{ display: 'flex', height: '100%', flex: 1, background: 'var(--background)' }}>
      {/* Left suggestions panel */}
      <div style={{
        width: 180, minWidth: 180,
        background: 'var(--card)', borderRight: '1px solid var(--border)',
        padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <div style={{
          fontSize: 10, fontWeight: 600, color: 'var(--muted-foreground)',
          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8,
          padding: '0 6px',
        }}>
          Ask Will
        </div>
        {SUGGESTED_QUESTIONS.map(q => (
          <button
            key={q}
            onClick={() => { setInput(q); inputRef.current?.focus() }}
            disabled={loading}
            style={{
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: 6, padding: '7px 10px',
              fontSize: 11, fontWeight: 500, color: 'var(--muted-foreground)',
              textAlign: 'left', cursor: loading ? 'not-allowed' : 'pointer',
              lineHeight: 1.5, transition: 'background 0.1s, color 0.1s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => {
              if (!loading) {
                (e.currentTarget as HTMLElement).style.background = 'var(--muted)'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--foreground)'
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)'
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Main chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          background: 'var(--card)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--foreground)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: 'var(--background)', flexShrink: 0,
          }}>
            W
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>Ask Will AI</div>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
              Powered by Will&apos;s coaching frameworks
            </div>
          </div>
          <span style={{
            marginLeft: 'auto', fontSize: 10, fontWeight: 600,
            background: 'hsl(220 90% 56% / 0.1)', color: 'var(--accent)',
            padding: '2px 8px', borderRadius: 999,
          }}>
            BETA
          </span>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13, marginTop: 40 }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>💬</div>
              Ask Will anything about growing your brand on Instagram.
              <br />
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)', opacity: 0.7 }}>
                Use the suggestions on the left, or type your own.
              </span>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              {msg.role === 'assistant' && (
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--foreground)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: 'var(--background)',
                  flexShrink: 0, marginTop: 2,
                }}>
                  W
                </div>
              )}

              <div style={{
                maxWidth: '72%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                background: msg.role === 'user' ? 'var(--foreground)' : 'var(--card)',
                color: msg.role === 'user' ? 'var(--background)' : 'var(--foreground)',
                fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap',
                border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--foreground)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: 'var(--background)', flexShrink: 0,
              }}>
                W
              </div>
              <div style={{
                padding: '10px 14px', borderRadius: '4px 14px 14px 14px',
                background: 'var(--card)', border: '1px solid var(--border)',
                fontSize: 12, color: 'var(--muted-foreground)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                Will is thinking <ThinkingDots />
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: 'hsl(0 50% 96%)', border: '1px solid hsl(0 70% 90%)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'hsl(0 72% 51%)' }}>
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div style={{
          padding: '14px 20px',
          background: 'var(--card)', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 10, alignItems: 'flex-end',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Will anything... (Enter to send, Shift+Enter for new line)"
            rows={1}
            style={{
              flex: 1, resize: 'none', maxHeight: 120,
              lineHeight: 1.5, height: 'auto',
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            style={{
              background: loading || !input.trim() ? 'var(--muted)' : 'var(--foreground)',
              color: loading || !input.trim() ? 'var(--muted-foreground)' : 'var(--background)',
              border: 'none', borderRadius: 6, padding: '10px 14px',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s', flexShrink: 0, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center',
            }}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
