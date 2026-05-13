'use client'

import { Zap, Check, ArrowRight, TrendingUp, Lightbulb, MessageSquare, BarChart2, Calendar, PhoneCall, Search, Send, List } from 'lucide-react'

const FEATURES = [
  { icon: BarChart2,     label: 'Instagram analytics & follower tracking' },
  { icon: Lightbulb,    label: 'AI content studio — scripts written around your niche every week' },
  { icon: TrendingUp,   label: 'Competitor intelligence reports — see exactly what\'s working in your niche' },
  { icon: Zap,          label: 'Hook Lab — generate 20+ scroll-stopping hooks per topic instantly' },
  { icon: List,         label: 'Series Planner — multi-part content series mapped out in seconds' },
  { icon: Calendar,     label: 'Content calendar — plan and schedule your entire month' },
  { icon: Search,       label: 'Profile audit tools — fix what\'s killing your reach' },
  { icon: PhoneCall,    label: 'DM sales system — scripts and strategies to close clients in the DMs' },
  { icon: Send,         label: 'Outreach tools — cold and warm outreach frameworks' },
  { icon: MessageSquare,label: 'Ask Will AI — 24/7 coaching, available any time you need it' },
]

export default function AccessPage() {
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#000',
      color: '#fff',
      fontFamily: 'Inter, system-ui, sans-serif',
      paddingTop: 'max(40px, env(safe-area-inset-top))',
      paddingBottom: 'max(60px, env(safe-area-inset-bottom))',
      paddingLeft: 'max(20px, env(safe-area-inset-left))',
      paddingRight: 'max(20px, env(safe-area-inset-right))',
    }}>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .plan-card { transition: border-color 0.15s, background 0.15s; }
        .plan-card:hover { border-color: rgba(59,130,246,0.6) !important; background: rgba(59,130,246,0.1) !important; }
        .plan-card-best:hover { border-color: rgba(74,222,128,0.6) !important; }
      `}</style>

      <div style={{ maxWidth: 560, margin: '0 auto', animation: 'fadeUp 0.45s ease both' }}>

        {/* ── Logo ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: '#3B82F6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Zap size={17} color="#fff" fill="#fff" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px' }}>
            Creator Cult
          </span>
        </div>

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{
            fontSize: 'clamp(28px, 6vw, 38px)',
            fontWeight: 800,
            letterSpacing: '-0.8px',
            lineHeight: 1.12,
            marginBottom: 14,
            color: '#fff',
          }}>
            Everything you need to grow<br />
            <span style={{ color: '#60a5fa' }}>on Instagram</span> — in one place.
          </h1>
          <p style={{
            fontSize: 15,
            color: 'rgba(255,255,255,0.45)',
            lineHeight: 1.7,
            maxWidth: 480,
          }}>
            Scripts written to your niche every week. Competitor intelligence. Analytics. Hook Lab. Ask Will AI. All the tools Will uses — now yours.
          </p>
        </div>

        {/* ── Feature list ──────────────────────────────────────────────── */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          padding: '20px 22px',
          marginBottom: 32,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14,
          }}>
            What&apos;s inside
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  background: 'rgba(59,130,246,0.12)',
                  border: '1px solid rgba(59,130,246,0.22)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={11} color="#60a5fa" strokeWidth={2} />
                </div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.4 }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Pricing ───────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 10 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14,
          }}>
            Choose a plan
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Monthly */}
            <a
              href="https://buy.stripe.com/14A9AS0Ee0ihe8Cagc9IQ1G"
              className="plan-card"
              style={{
                display: 'block',
                padding: '20px 22px',
                borderRadius: 12,
                textDecoration: 'none',
                background: 'rgba(59,130,246,0.07)',
                border: '1px solid rgba(59,130,246,0.28)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 5, letterSpacing: '0.02em' }}>
                    Monthly
                  </div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: '#93c5fd', letterSpacing: '-0.6px', lineHeight: 1 }}>
                    £495
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.3)' }}>/mo</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                  Cancel anytime <ArrowRight size={12} />
                </div>
              </div>
            </a>

            {/* 6-month */}
            <a
              href="https://buy.stripe.com/dRm3cuev48ON3tY8849IQ1I"
              className="plan-card plan-card-best"
              style={{
                display: 'block',
                padding: '20px 22px',
                borderRadius: 12,
                textDecoration: 'none',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.12)',
                position: 'relative',
              }}
            >
              {/* Badge */}
              <div style={{
                position: 'absolute', top: -10, right: 16,
                fontSize: 10, fontWeight: 800, color: '#000',
                background: '#4ade80', padding: '3px 10px', borderRadius: 99,
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                Best value
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 5, letterSpacing: '0.02em' }}>
                    6 Months
                  </div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: '-0.6px', lineHeight: 1 }}>
                    £2,000
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.3)' }}> total</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                    ~£333/mo · save £970
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(74,222,128,0.8)', fontWeight: 700 }}>
                  Save £970 <ArrowRight size={12} />
                </div>
              </div>
            </a>
          </div>
        </div>

        {/* ── What's included explainer ──────────────────────────────────── */}
        <div style={{
          marginTop: 20,
          padding: '14px 18px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          fontSize: 12,
          color: 'rgba(255,255,255,0.3)',
          lineHeight: 1.65,
        }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Both plans include everything.</span>
          {' '}Full dashboard access, all AI tools, weekly scripts, and unlimited use of every feature. The 6-month plan is the same tools at a lower monthly rate — no features removed.
        </div>

        {/* ── Social proof line ─────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginTop: 28, marginBottom: 8,
          padding: '12px 16px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', gap: -4 }}>
            {['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444'].map((c, i) => (
              <div key={i} style={{
                width: 22, height: 22, borderRadius: '50%',
                background: c, border: '2px solid #000',
                marginLeft: i === 0 ? 0 : -6, flexShrink: 0,
              }} />
            ))}
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
            Used by creators and coaches growing their audience on Instagram
          </span>
        </div>

        {/* ── Footer note ───────────────────────────────────────────────── */}
        <p style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.18)',
          lineHeight: 1.6,
          marginTop: 24,
          textAlign: 'center',
        }}>
          Questions before you commit?{' '}
          <a
            href="https://instagram.com/williamscxtt"
            style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none', fontWeight: 600 }}
          >
            DM Will on Instagram →
          </a>
        </p>

      </div>
    </div>
  )
}
