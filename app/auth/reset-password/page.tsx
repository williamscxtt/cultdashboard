'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Zap } from 'lucide-react'

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.15)',
  color: '#F0F0F0',
  borderRadius: 8,
  padding: '0 16px',
  height: 52,
  outline: 'none',
  fontSize: 16,
  fontWeight: 500,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  display: 'block',
  WebkitAppearance: 'none',
  appearance: 'none',
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [pwFocus, setPwFocus] = useState(false)
  const [cfFocus, setCfFocus] = useState(false)
  const router = useRouter()
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let timeoutId: ReturnType<typeof setTimeout>

    async function init() {
      // Strategy 1: PKCE flow — ?code= in query string
      const searchParams = new URLSearchParams(window.location.search)
      const code = searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) { setReady(true); return }
      }

      // Strategy 2: Implicit flow — #access_token= in hash
      const hash = window.location.hash
      if (hash) {
        const params = new URLSearchParams(hash.substring(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (!error) { setReady(true); return }
        }
      }

      // Strategy 3: Already have a valid session
      const { data: { session } } = await supabase.auth.getSession()
      if (session) { setReady(true); return }

      // Strategy 4: Event listener fallback
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
          setReady(true)
        }
      })
      subscriptionRef.current = subscription

      timeoutId = setTimeout(() => setTimedOut(true), 10000)
    }

    init()
    return () => {
      subscriptionRef.current?.unsubscribe()
      clearTimeout(timeoutId)
    }
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess('Password set — taking you to the dashboard…')
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000',
      padding: '24px',
      boxSizing: 'border-box',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: '#3B82F6',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Zap size={17} color="white" fill="white" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#F0F0F0', letterSpacing: '-0.3px' }}>
            Creator Cult
          </span>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#F0F0F0', marginBottom: 8, letterSpacing: '-0.5px', margin: '0 0 8px' }}>
          Set your password
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)', marginBottom: 36, lineHeight: 1.5, margin: '0 0 36px' }}>
          Choose something secure — at least 8 characters.
        </p>

        {success ? (
          <div style={{
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: 10, padding: '16px 18px', fontSize: 15, color: '#4ade80', lineHeight: 1.5,
          }}>
            {success}
          </div>

        ) : !ready ? (
          <div style={{ textAlign: 'center', paddingTop: 8 }}>
            {timedOut ? (
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
                <p style={{ marginBottom: 20 }}>
                  This link may have expired or already been used.<br />
                  Request a new one from the login page.
                </p>
                <a href="/login" style={{
                  display: 'inline-block', background: '#3B82F6', color: '#fff',
                  padding: '14px 28px', borderRadius: 8, fontSize: 15, fontWeight: 700,
                  textDecoration: 'none', touchAction: 'manipulation',
                }}>
                  Back to login →
                </a>
              </div>
            ) : (
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                Verifying your link…
              </p>
            )}
          </div>

        ) : (
          <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
                onFocus={() => setPwFocus(true)}
                onBlur={() => setPwFocus(false)}
                style={{
                  ...INPUT_STYLE,
                  border: pwFocus ? '1px solid #3B82F6' : '1px solid rgba(255,255,255,0.15)',
                  boxShadow: pwFocus ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                required
                autoComplete="new-password"
                onFocus={() => setCfFocus(true)}
                onBlur={() => setCfFocus(false)}
                style={{
                  ...INPUT_STYLE,
                  border: cfFocus ? '1px solid #3B82F6' : '1px solid rgba(255,255,255,0.15)',
                  boxShadow: cfFocus ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none',
                }}
              />
            </div>

            {error && (
              <div style={{
                background: 'hsl(0 50% 12%)', border: '1px solid hsl(0 70% 28%)',
                borderRadius: 8, padding: '12px 16px', fontSize: 14, color: 'hsl(0 72% 70%)',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: 52,
                background: loading ? 'rgba(59,130,246,0.6)' : '#3B82F6',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 700,
                fontFamily: 'inherit',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 4,
                touchAction: 'manipulation',
              }}
            >
              {loading ? 'Setting password…' : 'Set password →'}
            </button>
          </form>
        )}

      </div>
    </div>
  )
}
