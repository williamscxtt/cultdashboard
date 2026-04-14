'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Zap, Check } from 'lucide-react'

type Mode = 'login' | 'forgot'

export default function ClientAccessPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search)
      if (p.get('error') === 'confirmation_failed') return 'Email confirmation failed — please contact Will for support.'
    }
    return ''
  })
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
    <div style={{ minHeight: '100vh', display: 'flex', background: '#000000' }}>
      <style>{`
        @keyframes loginFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glowPulse { 0%,100% { opacity: 0.15; } 50% { opacity: 0.25; } }
        .login-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          color: #F0F0F0;
          border-radius: 6px;
          padding: 0 14px;
          height: 42px;
          outline: none;
          font-size: 14px;
          font-weight: 500;
          font-family: inherit;
          box-sizing: border-box;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .login-input:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12); }
        .login-input::placeholder { color: #A1A4A5; }
        .login-btn-primary {
          width: 100%;
          height: 44px;
          background: #3B82F6;
          color: #fff;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          letter-spacing: -0.1px;
          transition: background 0.15s, opacity 0.15s;
        }
        .login-btn-primary:hover { background: #60A5FA; }
        .login-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        @media (max-width: 640px) { .login-brand-panel { display: none !important; } }
      `}</style>

      {/* ── Left brand panel ─────────────────────────────────────────────────── */}
      <div className="login-brand-panel" style={{
        width: 440, flexShrink: 0,
        background: 'linear-gradient(160deg, #03050d 0%, #060a14 60%, #080d1a 100%)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '0 52px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -60, right: -80, width: 300, height: 300,
          background: '#3B82F6', borderRadius: '50%',
          filter: 'blur(100px)', opacity: 0.1, animation: 'glowPulse 4s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: 20, left: -60, width: 200, height: 200,
          background: '#3B82F6', borderRadius: '50%',
          filter: 'blur(80px)', opacity: 0.06,
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, animation: 'loginFadeIn 0.5s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11,
              background: '#3B82F6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={18} color="white" fill="white" />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'hsl(0 5% 94%)', letterSpacing: '-0.4px', fontFamily: 'var(--font-display)' }}>
              Creator Cult
            </div>
          </div>

          <h2 style={{
            fontSize: 30, fontWeight: 800, color: 'hsl(0 5% 95%)',
            letterSpacing: '-0.7px', lineHeight: 1.15, marginBottom: 14,
            fontFamily: 'var(--font-display)',
          }}>
            Your personal brand<br />command centre.
          </h2>
          <p style={{ color: 'hsl(0 5% 52%)', fontSize: 14, lineHeight: 1.7, marginBottom: 44 }}>
            Scripts, analytics, and AI coaching — all in one place, built around your content.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {features.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={11} color="#3B82F6" strokeWidth={2.5} />
                </div>
                <span style={{ color: 'hsl(0 5% 72%)', fontSize: 13, fontWeight: 500 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ──────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 32px', background: '#000000',
      }}>
        <div style={{ width: '100%', maxWidth: 380, animation: 'loginFadeIn 0.5s 0.1s ease both', opacity: 0 }}>

          {/* ── Login ── */}
          {mode === 'login' && (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'hsl(0 5% 94%)', marginBottom: 4, letterSpacing: '-0.5px', fontFamily: 'var(--font-display)' }}>
                Welcome back
              </h1>
              <p style={{ fontSize: 13, color: 'hsl(0 5% 45%)', marginBottom: 32 }}>
                Sign in to your dashboard
              </p>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'hsl(0 5% 70%)', marginBottom: 7 }}>Email address</label>
                  <input className="login-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'hsl(0 5% 70%)' }}>Password</label>
                    <button type="button" onClick={() => reset('forgot')} style={{ fontSize: 12, color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                      Forgot password?
                    </button>
                  </div>
                  <input className="login-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                </div>

                {error && <ErrorBox>{error}</ErrorBox>}

                <button type="submit" className="login-btn-primary" disabled={loading} style={{ marginTop: 4 }}>
                  {loading ? 'Signing in…' : 'Sign in →'}
                </button>
              </form>

              <p style={{ textAlign: 'center', fontSize: 13, color: 'hsl(0 5% 40%)', marginTop: 28 }}>
                Don&apos;t have access?{' '}
                <a href="/apply" style={{ color: '#3B82F6', fontWeight: 600, textDecoration: 'none' }}>
                  Apply here →
                </a>
              </p>
            </>
          )}

          {/* ── Forgot password ── */}
          {mode === 'forgot' && (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'hsl(0 5% 94%)', marginBottom: 4, letterSpacing: '-0.5px', fontFamily: 'var(--font-display)' }}>
                Reset your password
              </h1>
              <p style={{ fontSize: 13, color: 'hsl(0 5% 45%)', marginBottom: 32 }}>
                Enter your email and we&apos;ll send you a reset link.
              </p>

              {success ? (
                <SuccessBox>{success}</SuccessBox>
              ) : (
                <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'hsl(0 5% 70%)', marginBottom: 7 }}>Email address</label>
                    <input className="login-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
                  </div>

                  {error && <ErrorBox>{error}</ErrorBox>}

                  <button type="submit" className="login-btn-primary" disabled={loading} style={{ marginTop: 4 }}>
                    {loading ? 'Sending…' : 'Send reset link →'}
                  </button>
                </form>
              )}

              <p style={{ textAlign: 'center', fontSize: 13, color: 'hsl(0 5% 40%)', marginTop: 28 }}>
                <button onClick={() => reset('login')} style={{ color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, padding: 0 }}>
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
    <div style={{ background: 'hsl(0 50% 12%)', border: '1px solid hsl(0 70% 28%)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'hsl(0 72% 70%)' }}>
      {children}
    </div>
  )
}

function SuccessBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
      {children}
    </div>
  )
}
