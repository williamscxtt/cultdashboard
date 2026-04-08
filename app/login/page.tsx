'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui'
import { Zap } from 'lucide-react'

type Mode = 'login' | 'signup' | 'forgot'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const reset = (m: Mode) => { setMode(m); setError(''); setSuccess('') }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) { setError(error.message); setLoading(false); return }

    // Create profile row via server
    if (data.session) {
      // Immediately signed in (email confirmation disabled)
      await fetch('/api/auth/create-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      router.push('/onboarding')
    } else {
      // Email confirmation required
      setSuccess("Account created — check your email to confirm, then come back and log in.")
      setLoading(false)
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess('Password reset email sent — check your inbox.')
    setLoading(false)
  }

  const features = [
    'Weekly AI-generated reel scripts',
    'Competitor intelligence reports',
    'Instagram analytics & insights',
    'Ask Will AI — 24/7 coaching',
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--background)' }}>
      <style>{`
        @media (max-width: 640px) {
          .login-brand-panel { display: none !important; }
          .login-form-panel { padding: 32px 24px !important; align-items: flex-start !important; }
          .login-form-panel > div { max-width: 100% !important; padding-top: 20px; }
        }
      `}</style>

      {/* ── Left brand panel ─────────────────────────────────────────────── */}
      <div className="login-brand-panel" style={{
        width: 420, flexShrink: 0,
        background: 'var(--foreground)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '0 52px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={18} color="white" fill="white" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'white', letterSpacing: '-0.4px' }}>
            Creator Cult
          </div>
        </div>

        <h2 style={{
          fontSize: 28, fontWeight: 800, color: 'white',
          letterSpacing: '-0.6px', lineHeight: 1.2, marginBottom: 12,
        }}>
          Your personal brand command centre.
        </h2>
        <p style={{ color: 'hsl(0 0% 55%)', fontSize: 14, lineHeight: 1.7, marginBottom: 40 }}>
          Scripts, analytics, and AI coaching — all in one place, built around your content.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {features.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                background: 'hsl(220 90% 56% / 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5 3.5-4" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span style={{ color: 'hsl(0 0% 70%)', fontSize: 13, fontWeight: 500 }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────────── */}
      <div className="login-form-panel" style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 32px',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>

          {/* ── Login ── */}
          {mode === 'login' && (
            <>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--foreground)', marginBottom: 4, letterSpacing: '-0.4px' }}>
                Welcome back
              </h1>
              <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 28 }}>
                Sign in to your dashboard
              </p>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>Email address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>Password</label>
                    <button type="button" onClick={() => reset('forgot')} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      Forgot password?
                    </button>
                  </div>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                </div>

                {error && <ErrorBox>{error}</ErrorBox>}

                <Button type="submit" variant="primary" disabled={loading} style={{ width: '100%', marginTop: 4, height: 44, fontSize: 14 }}>
                  {loading ? 'Signing in…' : 'Sign in →'}
                </Button>
              </form>

              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted-foreground)', marginTop: 24 }}>
                Don&apos;t have an account?{' '}
                <button onClick={() => reset('signup')} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, padding: 0 }}>
                  Sign up
                </button>
              </p>
            </>
          )}

          {/* ── Sign up ── */}
          {mode === 'signup' && (
            <>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--foreground)', marginBottom: 4, letterSpacing: '-0.4px' }}>
                Create your account
              </h1>
              <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 28 }}>
                Join Creator Cult and start growing.
              </p>

              {success ? (
                <SuccessBox>{success}</SuccessBox>
              ) : (
                <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>Full name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Will Scott" required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>Email address</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" minLength={8} required />
                  </div>

                  {error && <ErrorBox>{error}</ErrorBox>}

                  <Button type="submit" variant="primary" disabled={loading} style={{ width: '100%', marginTop: 4, height: 44, fontSize: 14 }}>
                    {loading ? 'Creating account…' : 'Create account →'}
                  </Button>
                </form>
              )}

              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted-foreground)', marginTop: 24 }}>
                Already have an account?{' '}
                <button onClick={() => reset('login')} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, padding: 0 }}>
                  Sign in
                </button>
              </p>
            </>
          )}

          {/* ── Forgot password ── */}
          {mode === 'forgot' && (
            <>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--foreground)', marginBottom: 4, letterSpacing: '-0.4px' }}>
                Reset your password
              </h1>
              <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 28 }}>
                Enter your email and we&apos;ll send you a reset link.
              </p>

              {success ? (
                <SuccessBox>{success}</SuccessBox>
              ) : (
                <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>Email address</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
                  </div>

                  {error && <ErrorBox>{error}</ErrorBox>}

                  <Button type="submit" variant="primary" disabled={loading} style={{ width: '100%', marginTop: 4, height: 44, fontSize: 14 }}>
                    {loading ? 'Sending…' : 'Send reset link →'}
                  </Button>
                </form>
              )}

              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted-foreground)', marginTop: 24 }}>
                <button onClick={() => reset('login')} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, padding: 0 }}>
                  ← Back to sign in
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'hsl(0 50% 96%)', border: '1px solid hsl(0 70% 88%)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'hsl(0 72% 45%)' }}>
      {children}
    </div>
  )
}

function SuccessBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'hsl(142 50% 96%)', border: '1px solid hsl(142 60% 80%)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: 'hsl(142 72% 28%)', lineHeight: 1.5 }}>
      {children}
    </div>
  )
}
