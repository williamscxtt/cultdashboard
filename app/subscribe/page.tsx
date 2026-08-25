import Link from 'next/link'
import { Check, Lock, MessageCircle, Zap } from 'lucide-react'

const SKOOL_URL = 'https://www.skool.com/creator/about'

function SubscribeContent() {
  return (
    <div style={{ width: '100%', maxWidth: 460 }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 48, height: 48, borderRadius: 14, background: '#3b82f6', marginBottom: 16,
        }}>
          <Zap size={22} color="white" fill="white" />
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.4px' }}>
          Creator Cult Dashboard
        </div>
      </div>

      <div style={{
        background: '#141414', border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 18, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
      }}>
        <div style={{
          padding: '30px 28px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'linear-gradient(160deg, rgba(59,130,246,0.12) 0%, transparent 65%)',
        }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: '-0.8px', lineHeight: 1.1, marginBottom: 12 }}>
            Your Dashboard is included.
          </div>
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65 }}>
            Original Creator Cult members and active Skool members both get access at no extra cost.
          </p>
        </div>

        <div style={{ padding: '22px 28px 28px' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20,
            color: 'rgba(255,255,255,0.68)', fontSize: 13, lineHeight: 1.55,
          }}>
            <Check size={18} color="#60a5fa" style={{ flexShrink: 0, marginTop: 1 }} />
            Use the same email address connected to your Creator Cult membership.
          </div>

          <Link href="/client-access" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', minHeight: 48, borderRadius: 10, background: '#3b82f6',
            color: '#fff', fontSize: 14, fontWeight: 750, textDecoration: 'none',
            boxSizing: 'border-box', marginBottom: 10,
          }}>
            Sign in to my Dashboard →
          </Link>

          <a href={SKOOL_URL} target="_blank" rel="noopener noreferrer" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', minHeight: 46, borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.11)', color: 'rgba(255,255,255,0.75)',
            fontSize: 13, fontWeight: 700, textDecoration: 'none', boxSizing: 'border-box',
          }}>
            Open Creator Cult on Skool
          </a>

          <a href="https://instagram.com/willscxtt" target="_blank" rel="noopener noreferrer" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            color: 'rgba(255,255,255,0.4)', fontSize: 12, textDecoration: 'none', marginTop: 18,
          }}>
            <MessageCircle size={13} /> Already a member but still locked out? Message Will
          </a>
        </div>
      </div>

      <div style={{
        marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 6, color: 'rgba(255,255,255,0.25)', fontSize: 12,
      }}>
        <Lock size={11} /> Included with Creator Cult membership
      </div>
    </div>
  )
}

export default function SubscribePage() {
  return (
    <div style={{
      minHeight: '100dvh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center',
      paddingTop: 'max(24px, env(safe-area-inset-top))', paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
      paddingLeft: 'max(20px, env(safe-area-inset-left))', paddingRight: 'max(20px, env(safe-area-inset-right))',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <SubscribeContent />
    </div>
  )
}
