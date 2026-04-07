'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--background)' }}>
      {/* Left — brand */}
      <div style={{ width: 400, background: 'var(--foreground)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 48px', flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--background)', letterSpacing: '-0.5px', marginBottom: 12 }}>
          CULT <span style={{ color: 'var(--accent)' }}>Dashboard</span>
        </div>
        <p style={{ color: 'hsl(0 0% 60%)', fontSize: 13, lineHeight: 1.7, marginBottom: 32 }}>
          Your personal brand command centre. Scripts, analytics, and AI coaching — all in one place.
        </p>
        {['Weekly AI-generated reel scripts', 'Competitor intelligence', 'Instagram analytics', 'Ask Will AI 24/7'].map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'hsl(0 0% 70%)', fontSize: 13, marginBottom: 10 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
            {f}
          </div>
        ))}
      </div>

      {/* Right — form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--foreground)', marginBottom: 4, letterSpacing: '-0.3px' }}>Welcome back</h1>
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 28 }}>Sign in to your dashboard</p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            {error && (
              <div style={{ background: 'hsl(0 50% 96%)', border: '1px solid hsl(0 70% 90%)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'hsl(0 72% 51%)' }}>
                {error}
              </div>
            )}
            <Button type="submit" disabled={loading} style={{ width: '100%', marginTop: 4 }}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </Button>
          </form>
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted-foreground)', marginTop: 20 }}>
            No access? Contact Will.
          </p>
        </div>
      </div>
    </div>
  )
}
