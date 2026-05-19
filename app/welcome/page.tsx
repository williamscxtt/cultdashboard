'use client'

import Link from 'next/link'

export default function WelcomePage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d0d0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>

        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(59,130,246,0.12)',
          border: '1px solid rgba(59,130,246,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        {/* Heading */}
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: 16 }}>
          Payment Confirmed
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#ffffff', letterSpacing: '-.03em', lineHeight: 1.15, marginBottom: 16 }}>
          Welcome to<br />Creator Cult.
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginBottom: 36 }}>
          Check your inbox — we&apos;ve sent you an email to set up your dashboard account.
          Click the link in the email to create your password and get straight into onboarding.
        </p>

        {/* Email hint box */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 32,
          textAlign: 'left',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>
            Next steps
          </div>
          {[
            'Check your email for a setup link from Creator Cult',
            'Click the link to create your password',
            'Complete your onboarding — takes 3 minutes',
            'Your 12 AI tools are waiting inside the dashboard',
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: i < 3 ? 10 : 0 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.3)',
                color: '#3b82f6', fontSize: 11, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 1,
              }}>
                {i + 1}
              </div>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{step}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginBottom: 24 }}>
          Didn&apos;t get the email? Check your spam folder, or{' '}
          <a href="https://instagram.com/willscxtt" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>
            DM Will on Instagram
          </a>.
        </p>

        <Link href="/login" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.35)',
          textDecoration: 'none',
        }}>
          Already have an account? Log in →
        </Link>

      </div>
    </div>
  )
}
