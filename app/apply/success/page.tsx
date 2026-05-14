'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Zap, Check } from 'lucide-react'

function SuccessContent() {
  const params = useSearchParams()
  const sessionId = params.get('session_id')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    if (!sessionId) { setStatus('error'); return }
    setStatus('success')
  }, [sessionId])

  return (
    <>
      {status === 'loading' && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2.5px solid rgba(59,130,246,0.2)', borderTopColor: '#3B82F6', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {status === 'success' && (
        <>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px',
          }}>
            <Check size={30} color="#4ade80" strokeWidth={2.5} />
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f0f0f0', marginBottom: 12, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
            You&apos;re in. Welcome to the Cult.
          </h1>

          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, margin: '0 auto 36px', maxWidth: 380 }}>
            Your payment was successful. Will gets a notification and you&apos;ll be set up with full dashboard access shortly.
          </p>

          <div style={{
            padding: '16px 20px', borderRadius: 12, marginBottom: 36,
            background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)',
            fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6,
          }}>
            Check your email for login details, usually within a few minutes.
          </div>

          <a
            href="/login"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              height: 48, padding: '0 28px', borderRadius: 8,
              background: '#3B82F6', color: '#fff', textDecoration: 'none',
              fontSize: 15, fontWeight: 700, letterSpacing: '-0.1px',
            }}
          >
            Go to dashboard →
          </a>
        </>
      )}

      {status === 'error' && (
        <>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f0f0f0', marginBottom: 12 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 28 }}>
            Your payment may still have gone through. DM Will on Instagram to confirm.
          </p>
          <a href="https://instagram.com/williamscxtt" style={{ color: '#3B82F6', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
            DM Will on Instagram →
          </a>
        </>
      )}
    </>
  )
}

export default function ApplySuccessPage() {
  return (
    <div style={{
      minHeight: '100dvh', background: '#000', color: '#fff',
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      paddingTop: 'max(24px, env(safe-area-inset-top))',
      paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
      paddingLeft: 'max(20px, env(safe-area-inset-left))',
      paddingRight: 'max(20px, env(safe-area-inset-right))',
    }}>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <div style={{ width: '100%', maxWidth: 480, textAlign: 'center', animation: 'fadeUp 0.45s ease both' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 48 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={16} color="white" fill="white" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#f0f0f0', letterSpacing: '-0.3px' }}>Creator Cult</span>
        </div>

        <Suspense fallback={
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2.5px solid rgba(59,130,246,0.2)', borderTopColor: '#3B82F6', animation: 'spin 0.8s linear infinite' }} />
          </div>
        }>
          <SuccessContent />
        </Suspense>
      </div>
    </div>
  )
}
