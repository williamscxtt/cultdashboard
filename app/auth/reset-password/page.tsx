'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Zap } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash — the client SDK
    // picks it up automatically when we call getSession()
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
      else {
        // Try exchanging hash params
        supabase.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY') setReady(true)
        })
      }
    })
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess('Password updated. Taking you to the dashboard…')
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', padding: '0 24px' }}>
      <style>{`
        .rp-input {
          width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
          color: #F0F0F0; border-radius: 6px; padding: 0 14px; height: 42px; outline: none;
          font-size: 14px; font-weight: 500; font-family: inherit; box-sizing: border-box;
          transition: border-color 0.15s;
        }
        .rp-input:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
        .rp-input::placeholder { color: #A1A4A5; }
      `}</style>

      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={16} color="white" fill="white" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#F0F0F0', letterSpacing: '-0.3px' }}>Creator Cult</span>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F0F0F0', marginBottom: 6, letterSpacing: '-0.5px' }}>
          Set a new password
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 32 }}>
          Choose something secure — at least 8 characters.
        </p>

        {success ? (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
            {success}
          </div>
        ) : !ready ? (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Verifying reset link…</div>
        ) : (
          <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 7 }}>New password</label>
              <input className="rp-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 7 }}>Confirm password</label>
              <input className="rp-input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat your password" required />
            </div>

            {error && (
              <div style={{ background: 'hsl(0 50% 12%)', border: '1px solid hsl(0 70% 28%)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'hsl(0 72% 70%)' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              height: 44, background: '#3B82F6', color: '#fff', border: 'none',
              borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s',
            }}>
              {loading ? 'Updating…' : 'Update password →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
