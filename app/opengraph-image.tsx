import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Creator Cult Dashboard'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000000',
          position: 'relative',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Ambient glow */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            left: '50%',
            width: 600,
            height: 600,
            background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)',
            transform: 'translateX(-50%)',
            display: 'flex',
          }}
        />

        {/* Bottom glow */}
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            right: 200,
            width: 400,
            height: 400,
            background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Logo mark */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 22,
            background: '#3B82F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
            boxShadow: '0 0 60px rgba(59,130,246,0.5)',
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="white"
          >
            <path d="M13 2L4.09 12.37A1 1 0 0 0 5 14h6l-1 8 8.91-10.37A1 1 0 0 0 18 10h-6l1-8z" />
          </svg>
        </div>

        {/* Brand name */}
        <div
          style={{
            fontSize: 68,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-2px',
            lineHeight: 1,
            marginBottom: 16,
          }}
        >
          Creator Cult
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 26,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: '-0.5px',
          }}
        >
          Your personal brand command centre
        </div>

        {/* Bottom pill */}
        <div
          style={{
            position: 'absolute',
            bottom: 52,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(59,130,246,0.12)',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: 99,
            padding: '10px 24px',
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#3B82F6',
              display: 'flex',
            }}
          />
          <span
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: '#3B82F6',
              letterSpacing: '0.05em',
            }}
          >
            cult.scottvip.com
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
