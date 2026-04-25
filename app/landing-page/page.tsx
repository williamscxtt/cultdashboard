'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

/* ─── Scroll-reveal ─────────────────────────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setOn(true) },
      { threshold: 0.08 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return { ref, on }
}

/* ─── Count-up hook ─────────────────────────────────────────────────── */
function useCountUp(target: number, duration = 1600) {
  const ref = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setStarted(true) },
      { threshold: 0.5 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    if (!started) return
    let frame = 0
    const steps = Math.ceil(duration / 16)
    const inc = target / steps
    const tick = () => {
      frame++
      setCount(Math.min(Math.round(inc * frame), target))
      if (frame < steps) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [started, target, duration])
  return { ref, count }
}

function Fade({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, on } = useReveal()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: on ? 1 : 0,
        transform: on ? 'none' : 'translateY(28px)',
        transition: `opacity .7s ease ${delay}ms, transform .7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

/* ─── SVG Icons ─────────────────────────────────────────────────────── */
const IconBrain = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3.16A2.5 2.5 0 0 1 9.5 2Z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3.16A2.5 2.5 0 0 0 14.5 2Z"/>
  </svg>
)
const IconDoc = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
)
const IconSearch = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const IconLayers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </svg>
)
const IconZap = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
)
const IconTrend = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
    <polyline points="16 7 22 7 22 13"/>
  </svg>
)
const IconStar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)
const IconUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const IconGrid = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
)
const IconMsg = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
)
const IconShield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const IconPackage = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
)
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const IconChevron = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)
const IconArrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
)

/* ─── Components ─────────────────────────────────────────────────────── */

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="lp-faq-item">
      <button className="lp-faq-q" onClick={() => setOpen(!open)}>
        <span>{q}</span>
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .25s', display: 'inline-flex', marginLeft: 16, flexShrink: 0 }}>
          <IconChevron />
        </span>
      </button>
      {open && <div className="lp-faq-a">{a}</div>}
    </div>
  )
}

function Win({ name, stat, detail, img, delay = 0 }: { name: string; stat: string; detail: string; img?: string; delay?: number }) {
  const { ref, on } = useReveal()
  return (
    <div
      ref={ref}
      className="lp-win-card"
      style={{ opacity: on ? 1 : 0, transform: on ? 'none' : 'translateY(24px)', transition: `opacity .6s ease ${delay}ms, transform .6s ease ${delay}ms` }}
    >
      <div className="lp-win-stat">{stat}</div>
      <p className="lp-win-detail">{detail}</p>
      {img && (
        <div className="lp-win-img-wrap">
          <img src={img} alt={`${name} result`} className="lp-win-img" loading="lazy" />
        </div>
      )}
      <div className="lp-win-name">— {name}</div>
    </div>
  )
}

function Phase({ num, title, desc, items, delay = 0, highlight = false }: { num: string; title: string; desc: string; items: string[]; delay?: number; highlight?: boolean }) {
  const { ref, on } = useReveal()
  return (
    <div
      ref={ref}
      className={`lp-phase-card${highlight ? ' lp-phase-hl' : ''}`}
      style={{ opacity: on ? 1 : 0, transform: on ? 'none' : 'translateY(24px)', transition: `opacity .65s ease ${delay}ms, transform .65s ease ${delay}ms` }}
    >
      <div className="lp-phase-num">Phase {num}</div>
      <h3 className="lp-phase-title">{title}</h3>
      <p className="lp-phase-desc">{desc}</p>
      <ul className="lp-phase-list">
        {items.map(i => (
          <li key={i} className="lp-phase-item">
            <span className="lp-check-icon"><IconCheck /></span>{i}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ToolCard({ icon, title, desc, badge }: { icon: React.ReactNode; title: string; desc: string; badge?: string }) {
  return (
    <div className="lp-tool-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div className="lp-tool-icon">{icon}</div>
        {badge && <span className="lp-tool-badge">{badge}</span>}
      </div>
      <div className="lp-tool-title">{title}</div>
      <p className="lp-tool-desc">{desc}</p>
    </div>
  )
}

function StatCounter({ prefix = '', target, suffix = '', label }: { prefix?: string; target: number; suffix?: string; label: string }) {
  const { ref, count } = useCountUp(target)
  const display = target >= 1000
    ? `${prefix}${count.toLocaleString()}${suffix}`
    : `${prefix}${count}${suffix}`
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="lp-stat-n" ref={ref}>{display}</div>
      <div className="lp-stat-l">{label}</div>
    </div>
  )
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  const tickerItems = [
    'Freddie · £1,950 in 3 days',
    'Eddie · 5K followers in 10 days',
    'Dino · 24M views in 3 weeks',
    'Brett · first client in 3 weeks',
    'Asfand · first client in 7 days',
    'Michael · $10K day',
    'Tom · monetised within 30 days',
    'Roy · 6K followers in 6 weeks',
  ]

  return (
    <>
      <style>{`
        /* ── Reset ── */
        .lp-root { all: initial; display: block; }
        .lp-root *, .lp-root *::before, .lp-root *::after {
          box-sizing: border-box; margin: 0; padding: 0;
        }
        .lp-root {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
          font-size: 16px; font-weight: 400; line-height: 1.6;
          color: #ffffff; background: #000; min-height: 100vh;
          overflow-x: hidden; -webkit-font-smoothing: antialiased;
        }

        /* ── Nav ── */
        .lp-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 50;
          height: 64px; display: flex; align-items: center;
          justify-content: space-between; padding: 0 32px;
          transition: background .3s, border-color .3s, backdrop-filter .3s;
        }
        .lp-nav.scrolled {
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .lp-nav-logo {
          font-family: 'Inter', -apple-system, sans-serif !important;
          font-size: 16px; font-weight: 900; letter-spacing: -.02em;
          text-decoration: none; display: flex; align-items: center; gap: 2px;
        }
        .lp-nav-logo .c1 { color: #60a5fa; }
        .lp-nav-logo .c2 { color: #ffffff; }
        .lp-nav-cta {
          display: inline-flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: #fff; font-size: 13px; font-weight: 700;
          padding: 10px 22px; border-radius: 12px; text-decoration: none;
          transition: opacity .2s, box-shadow .2s; cursor: pointer;
          box-shadow: 0 0 20px rgba(59,130,246,0.3);
        }
        .lp-nav-cta:hover { opacity: .9; box-shadow: 0 0 32px rgba(59,130,246,0.5); }

        /* ── Container ── */
        .lp-container { max-width: 1120px; margin: 0 auto; padding: 0 32px; width: 100%; }
        .lp-section { padding: 120px 0; }
        .lp-section-sm { padding: 72px 0; }

        /* ── HERO ── */
        .lp-hero {
          min-height: 100vh; display: flex; align-items: center;
          padding: 80px 32px 60px; position: relative; overflow: hidden;
        }
        .lp-hero-bg {
          position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(ellipse 80% 70% at 20% 40%, rgba(59,130,246,0.12) 0%, transparent 60%),
                      radial-gradient(ellipse 50% 50% at 80% 20%, rgba(99,102,241,0.06) 0%, transparent 55%);
        }
        .lp-hero-inner {
          position: relative; max-width: 1120px; margin: 0 auto; width: 100%;
          display: grid; grid-template-columns: 1fr 440px; gap: 80px; align-items: center;
        }
        @media (max-width: 960px) {
          .lp-hero-inner { grid-template-columns: 1fr; gap: 56px; }
          .lp-hero-photo-col { order: -1; max-width: 340px; margin: 0 auto; }
        }
        @media (max-width: 640px) {
          .lp-hero { padding: 80px 20px 60px; min-height: auto; padding-top: 110px; }
          .lp-hero-photo-col { max-width: 260px; }
        }

        /* ── Hero text ── */
        .lp-badge {
          display: inline-flex; align-items: center; gap: 8px;
          color: #60a5fa; font-size: 11px; font-weight: 700; letter-spacing: .14em;
          text-transform: uppercase; border: 1px solid rgba(96,165,250,0.2);
          background: rgba(59,130,246,0.08); padding: 8px 16px; border-radius: 999px;
          margin-bottom: 32px;
        }
        .lp-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #3b82f6; }
        .lp-h1 {
          font-family: 'Inter', -apple-system, sans-serif !important;
          font-size: clamp(44px, 6.5vw, 80px); font-weight: 900;
          line-height: 1.03; letter-spacing: -.04em; color: #fff;
          margin-bottom: 28px;
        }
        .lp-h1 .grad {
          background: linear-gradient(135deg, #60a5fa 0%, #818cf8 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .lp-hero-sub {
          font-size: clamp(17px, 2vw, 20px); color: #9ca3af;
          max-width: 520px; line-height: 1.65; margin-bottom: 40px;
        }
        .lp-cta-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .lp-cta-primary {
          display: inline-flex; align-items: center; gap: 10px;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: #fff; font-size: 17px; font-weight: 800;
          padding: 18px 36px; border-radius: 16px; text-decoration: none;
          transition: box-shadow .25s, transform .25s; cursor: pointer;
          box-shadow: 0 0 40px rgba(59,130,246,0.35);
          font-family: 'Inter', -apple-system, sans-serif !important;
        }
        .lp-cta-primary:hover {
          box-shadow: 0 0 70px rgba(59,130,246,0.6);
          transform: translateY(-2px);
        }
        .lp-cta-note { font-size: 13px; color: #4b5563; }

        /* ── Hero stats ── */
        .lp-hero-stats {
          display: flex; flex-wrap: wrap; gap: 40px; margin-top: 56px;
          padding-top: 40px; border-top: 1px solid rgba(255,255,255,0.07);
        }
        .lp-stat-n {
          font-family: 'Inter', -apple-system, sans-serif !important;
          font-size: 38px; font-weight: 900; color: #fff; letter-spacing: -.03em;
          line-height: 1;
          text-shadow: 0 0 40px rgba(59,130,246,0.4);
        }
        .lp-stat-l { font-size: 12px; color: #6b7280; margin-top: 6px; font-weight: 500; letter-spacing: .02em; }

        /* ── Hero photo ── */
        .lp-hero-photo-col { position: relative; }
        .lp-hero-photo-glow {
          position: absolute; inset: -60px;
          background: radial-gradient(ellipse at center, rgba(59,130,246,0.22) 0%, transparent 65%);
          pointer-events: none; z-index: 0;
        }
        .lp-hero-photo {
          position: relative; z-index: 1; width: 100%;
          border-radius: 24px; aspect-ratio: 3/4; object-fit: cover;
          object-position: top; display: block;
          border: 1px solid rgba(59,130,246,0.15);
          box-shadow: 0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04);
        }
        .lp-hero-photo-badge {
          position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
          z-index: 2; background: rgba(0,0,0,0.8); backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;
          padding: 12px 20px; text-align: center; white-space: nowrap;
        }
        .lp-hero-photo-badge-n {
          font-family: 'Inter', -apple-system, sans-serif !important;
          font-size: 20px; font-weight: 900; color: #60a5fa;
        }
        .lp-hero-photo-badge-l { font-size: 11px; color: #6b7280; margin-top: 2px; }

        /* ── Animated Ticker ── */
        .lp-ticker {
          border-top: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 18px 0; overflow: hidden; background: rgba(255,255,255,0.01);
        }
        .lp-ticker-track {
          display: flex; width: max-content;
          animation: lp-marquee 28s linear infinite;
        }
        .lp-ticker-track:hover { animation-play-state: paused; }
        @keyframes lp-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .lp-tick {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 13px; color: #6b7280; white-space: nowrap;
          padding: 0 32px;
        }
        .lp-tick-dot { width: 5px; height: 5px; border-radius: 50%; background: #3b82f6; flex-shrink: 0; }

        /* ── Section headings ── */
        .lp-overline {
          font-size: 11px; font-weight: 700; letter-spacing: .14em;
          text-transform: uppercase; color: #3b82f6; margin-bottom: 20px;
        }
        .lp-h2 {
          font-family: 'Inter', -apple-system, sans-serif !important;
          font-size: clamp(34px, 5vw, 56px); font-weight: 900;
          line-height: 1.07; letter-spacing: -.035em; color: #fff; margin-bottom: 20px;
        }
        .lp-h2 .muted { color: #374151; }
        .lp-h2 .blue { color: #60a5fa; }
        .lp-h2 .grad {
          background: linear-gradient(135deg, #60a5fa 0%, #818cf8 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .lp-intro { font-size: 18px; color: #6b7280; line-height: 1.75; }
        .lp-center { text-align: center; }
        .lp-center .lp-intro { margin: 0 auto; max-width: 600px; }

        /* ── Pain cards ── */
        .lp-pain-stack { display: flex; flex-direction: column; gap: 12px; margin-top: 52px; }
        .lp-pain-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px; padding: 30px 36px;
          transition: border-color .3s, background .3s, transform .2s;
          cursor: default;
        }
        .lp-pain-card:hover {
          border-color: rgba(59,130,246,0.18); background: rgba(255,255,255,0.03);
          transform: translateX(4px);
        }
        .lp-pain-num { font-size: 11px; font-weight: 700; color: rgba(96,165,250,0.4); letter-spacing: .1em; text-transform: uppercase; margin-bottom: 12px; }
        .lp-pain-title { font-size: 20px; font-weight: 800; color: #fff; margin-bottom: 10px; }
        .lp-pain-body { font-size: 15px; color: #6b7280; line-height: 1.75; }

        /* ── Story ── */
        .lp-story-border {
          background: linear-gradient(180deg, transparent 0%, rgba(59,130,246,0.03) 50%, transparent 100%);
          border-top: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          position: relative;
        }
        .lp-story-layout {
          display: grid; grid-template-columns: 1fr 400px; gap: 88px; align-items: start;
        }
        @media (max-width: 900px) {
          .lp-story-layout { grid-template-columns: 1fr; gap: 52px; }
          .lp-story-photo-col { order: -1; max-width: 380px; margin: 0 auto; }
        }
        .lp-story-photo-col { position: sticky; top: 90px; }
        .lp-story-photo {
          width: 100%; border-radius: 20px; object-fit: cover;
          aspect-ratio: 3/4; object-position: top; display: block;
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: 0 32px 80px rgba(0,0,0,0.5);
        }
        .lp-story-caption { text-align: center; font-size: 12px; color: #374151; margin-top: 14px; font-weight: 500; }
        .lp-story-text { font-size: 18px; color: #9ca3af; line-height: 1.85; }
        .lp-story-text p { margin-bottom: 22px; }
        .lp-story-text p:last-child { margin-bottom: 0; }
        .lp-story-text strong { color: #fff; font-weight: 700; }
        .lp-story-text .lp-h2 { margin-bottom: 32px; }

        /* ── Phase grid ── */
        .lp-phase-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 64px;
        }
        @media (max-width: 960px) { .lp-phase-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 580px) { .lp-phase-grid { grid-template-columns: 1fr; } }
        .lp-phase-card {
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px; padding: 28px;
          transition: border-color .3s, background .3s, transform .2s; cursor: default;
        }
        .lp-phase-card:hover {
          border-color: rgba(59,130,246,0.2); background: rgba(255,255,255,0.035);
          transform: translateY(-2px);
        }
        .lp-phase-hl {
          background: rgba(59,130,246,0.07); border-color: rgba(59,130,246,0.2);
        }
        .lp-phase-hl:hover { background: rgba(59,130,246,0.1); }
        .lp-phase-num {
          font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
          color: rgba(96,165,250,0.5); margin-bottom: 14px;
        }
        .lp-phase-title {
          font-family: 'Inter', -apple-system, sans-serif !important;
          font-size: 18px; font-weight: 800; color: #fff; margin-bottom: 10px;
        }
        .lp-phase-hl .lp-phase-title { color: #93c5fd; }
        .lp-phase-desc { font-size: 13px; color: #6b7280; line-height: 1.65; margin-bottom: 20px; }
        .lp-phase-hl .lp-phase-desc { color: rgba(147,197,253,0.6); }
        .lp-phase-list { list-style: none; display: flex; flex-direction: column; gap: 9px; }
        .lp-phase-item { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: #9ca3af; line-height: 1.5; }
        .lp-phase-hl .lp-phase-item { color: rgba(147,197,253,0.8); }
        .lp-check-icon {
          color: #3b82f6; flex-shrink: 0; margin-top: 2px;
          display: inline-flex; align-items: center;
        }
        .lp-phase-hl .lp-check-icon { color: #60a5fa; }

        /* ── Dashboard section ── */
        .lp-dash-bg {
          background: linear-gradient(180deg, transparent 0%, rgba(59,130,246,0.04) 50%, transparent 100%);
          border-top: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          position: relative; overflow: hidden;
        }
        .lp-dash-glow {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 70% 50% at 50% 50%, rgba(59,130,246,0.05) 0%, transparent 70%);
          pointer-events: none;
        }
        .lp-dash-mockup {
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px; overflow: hidden;
          margin: 52px 0; background: rgba(255,255,255,0.015);
          box-shadow: 0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02);
        }
        .lp-dash-bar {
          display: flex; align-items: center; gap: 8px;
          padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(255,255,255,0.02);
        }
        .lp-dash-dot { width: 11px; height: 11px; border-radius: 50%; background: rgba(255,255,255,0.08); }
        .lp-dash-url {
          flex: 1; background: rgba(255,255,255,0.04); border-radius: 8px;
          padding: 5px 12px; font-size: 12px; color: #4b5563;
          margin: 0 16px; display: flex; align-items: center; gap: 8px;
        }
        .lp-dash-url-dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(59,130,246,0.5); flex-shrink: 0; }
        .lp-dash-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 28px; }
        @media (max-width: 700px) { .lp-dash-cards { grid-template-columns: 1fr; } }
        .lp-dash-card {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px; padding: 20px;
        }
        .lp-dash-card-label { font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 8px; }
        .lp-dash-card-status { font-size: 13px; color: #e5e7eb; margin-bottom: 16px; font-weight: 500; }
        .lp-dash-bar-track { height: 3px; background: rgba(255,255,255,0.05); border-radius: 99px; overflow: hidden; }
        .lp-dash-bar-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, #3b82f6, #60a5fa); }

        /* ── Tool grid ── */
        .lp-tool-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 16px; }
        @media (max-width: 960px) { .lp-tool-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 580px) { .lp-tool-grid { grid-template-columns: 1fr; } }
        .lp-tool-card {
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px; padding: 26px;
          transition: border-color .25s, background .25s, transform .2s; cursor: default;
        }
        .lp-tool-card:hover {
          border-color: rgba(59,130,246,0.22); background: rgba(255,255,255,0.035);
          transform: translateY(-3px);
        }
        .lp-tool-icon {
          width: 42px; height: 42px; border-radius: 12px;
          background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.18);
          display: flex; align-items: center; justify-content: center;
          color: #60a5fa;
        }
        .lp-tool-badge {
          font-size: 10px; font-weight: 700; color: #3b82f6;
          background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.18);
          padding: 4px 10px; border-radius: 99px; letter-spacing: .06em;
        }
        .lp-tool-title { font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 8px; }
        .lp-tool-desc { font-size: 13px; color: #6b7280; line-height: 1.7; }

        /* ── Win grid ── */
        .lp-win-grid {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-top: 64px;
        }
        @media (max-width: 700px) { .lp-win-grid { grid-template-columns: 1fr; } }
        .lp-win-card {
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px; padding: 28px; display: flex; flex-direction: column; gap: 12px;
          transition: border-color .25s, background .25s, transform .2s; cursor: default;
        }
        .lp-win-card:hover {
          border-color: rgba(59,130,246,0.2); background: rgba(255,255,255,0.03);
          transform: translateY(-3px);
        }
        .lp-win-stat {
          font-family: 'Inter', -apple-system, sans-serif !important;
          font-size: 30px; font-weight: 900; letter-spacing: -.02em;
          background: linear-gradient(135deg, #60a5fa 0%, #93c5fd 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .lp-win-detail { font-size: 14px; color: #6b7280; line-height: 1.7; }
        .lp-win-img-wrap {
          background: #0c0c0c; border-radius: 12px; overflow: hidden;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .lp-win-img {
          width: 100%; display: block; max-height: 280px;
          object-fit: contain; object-position: top;
        }
        .lp-win-name { font-size: 12px; color: #374151; font-weight: 600; letter-spacing: .04em; }

        /* ── Included grid ── */
        .lp-included-grid {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-top: 64px;
        }
        @media (max-width: 640px) { .lp-included-grid { grid-template-columns: 1fr; } }
        .lp-included-card {
          display: flex; gap: 20px; background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 26px;
          transition: border-color .25s, transform .2s; cursor: default;
        }
        .lp-included-card:hover { border-color: rgba(59,130,246,0.18); transform: translateY(-2px); }
        .lp-included-icon {
          width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
          background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.15);
          display: flex; align-items: center; justify-content: center; color: #60a5fa;
          margin-top: 2px;
        }
        .lp-included-title { font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 6px; }
        .lp-included-desc { font-size: 13px; color: #6b7280; line-height: 1.7; }

        /* ── For / Not for ── */
        .lp-for-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 640px) { .lp-for-grid { grid-template-columns: 1fr; } }
        .lp-for-card { border-radius: 20px; padding: 36px; }
        .lp-for-card.yes {
          background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.18);
        }
        .lp-for-card.no {
          background: rgba(255,255,255,0.015); border: 1px solid rgba(255,255,255,0.06);
        }
        .lp-for-head { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
        .lp-for-head-icon {
          width: 32px; height: 32px; border-radius: 8px; display: flex;
          align-items: center; justify-content: center; flex-shrink: 0;
        }
        .lp-for-card.yes .lp-for-head-icon { background: rgba(96,165,250,0.15); color: #60a5fa; }
        .lp-for-card.no .lp-for-head-icon { background: rgba(255,255,255,0.04); color: #4b5563; }
        .lp-for-head-text { font-size: 16px; font-weight: 800; }
        .lp-for-card.yes .lp-for-head-text { color: #93c5fd; }
        .lp-for-card.no .lp-for-head-text { color: #4b5563; }
        .lp-for-list { display: flex; flex-direction: column; gap: 14px; }
        .lp-for-item { display: flex; align-items: flex-start; gap: 12px; font-size: 14px; line-height: 1.6; }
        .lp-for-card.yes .lp-for-item { color: rgba(147,197,253,0.85); }
        .lp-for-card.no .lp-for-item { color: #4b5563; }
        .lp-for-icon { flex-shrink: 0; margin-top: 2px; }
        .lp-for-card.yes .lp-for-icon { color: #60a5fa; }
        .lp-for-card.no .lp-for-icon { color: #374151; }

        /* ── Mid CTA ── */
        .lp-mid-cta {
          background: linear-gradient(180deg, transparent 0%, rgba(59,130,246,0.04) 50%, transparent 100%);
          border-top: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .lp-mid-cta-inner { max-width: 600px; margin: 0 auto; text-align: center; }
        .lp-mid-cta-h {
          font-family: 'Inter', -apple-system, sans-serif !important;
          font-size: clamp(28px, 4vw, 40px); font-weight: 900;
          color: #fff; margin-bottom: 16px; letter-spacing: -.025em;
        }
        .lp-mid-cta-sub { font-size: 16px; color: #6b7280; margin-bottom: 36px; line-height: 1.65; }

        /* ── FAQ ── */
        .lp-faq-stack { display: flex; flex-direction: column; gap: 8px; margin-top: 56px; }
        .lp-faq-item {
          border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; overflow: hidden;
          transition: border-color .25s;
        }
        .lp-faq-item:hover { border-color: rgba(255,255,255,0.12); }
        .lp-faq-q {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          padding: 22px 28px; text-align: left; background: transparent; border: none;
          cursor: pointer; font-size: 15px; font-weight: 700; color: #fff;
          font-family: 'Inter', -apple-system, sans-serif; transition: background .2s;
          color: #e5e7eb;
        }
        .lp-faq-q:hover { background: rgba(255,255,255,0.02); }
        .lp-faq-a {
          padding: 0 28px 22px; font-size: 14px; color: #6b7280; line-height: 1.75;
          border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px;
        }

        /* ── Final CTA ── */
        .lp-final { position: relative; overflow: hidden; text-align: center; }
        .lp-final-bg {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 80% 70% at 50% 50%, rgba(59,130,246,0.1) 0%, transparent 65%);
          pointer-events: none;
        }
        .lp-final-inner { position: relative; max-width: 700px; margin: 0 auto; }
        .lp-final-h {
          font-family: 'Inter', -apple-system, sans-serif !important;
          font-size: clamp(44px, 7vw, 72px); font-weight: 900;
          line-height: 1.04; letter-spacing: -.04em; color: #fff; margin-bottom: 22px;
        }
        .lp-final-h .grad {
          background: linear-gradient(135deg, #60a5fa 0%, #818cf8 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .lp-final-sub { font-size: 18px; color: #6b7280; margin-bottom: 44px; line-height: 1.65; }
        .lp-chips {
          display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; margin-top: 32px;
        }
        .lp-chip { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #4b5563; }
        .lp-chip-check { color: #3b82f6; display: inline-flex; }

        /* ── Footer ── */
        .lp-footer {
          border-top: 1px solid rgba(255,255,255,0.05);
          padding: 40px 32px; display: flex; flex-wrap: wrap;
          align-items: center; justify-content: space-between;
          gap: 16px; max-width: 1120px; margin: 0 auto;
        }
        .lp-footer-logo {
          font-family: 'Inter', -apple-system, sans-serif !important;
          font-size: 14px; font-weight: 900; letter-spacing: -.01em;
        }
        .lp-footer-logo .c1 { color: rgba(96,165,250,0.5); }
        .lp-footer-logo .c2 { color: rgba(255,255,255,0.3); }
        .lp-footer-links { display: flex; gap: 24px; }
        .lp-footer-links a { font-size: 13px; color: #374151; text-decoration: none; transition: color .2s; }
        .lp-footer-links a:hover { color: #6b7280; }
        .lp-footer-copy { font-size: 12px; color: #1f2937; }

        /* ── Divider ── */
        .lp-divider {
          height: 1px; background: rgba(255,255,255,0.05); margin: 0;
        }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .lp-container { padding: 0 20px; }
          .lp-section { padding: 80px 0; }
          .lp-h2 { font-size: 32px; }
          .lp-cta-row { flex-direction: column; align-items: flex-start; }
          .lp-footer { padding: 32px 20px; }
          .lp-nav { padding: 0 20px; }
        }
      `}</style>

      <div className="lp-root">
        {/* ── Nav ── */}
        <nav className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
          <a href="/landing-page" className="lp-nav-logo">
            <span className="c1">CREATOR</span><span className="c2"> CULT</span>
          </a>
          <Link href="/apply" className="lp-nav-cta">
            Apply Now <IconArrow />
          </Link>
        </nav>

        {/* ── Hero ── */}
        <div className="lp-hero">
          <div className="lp-hero-bg" />
          <div className="lp-hero-inner">
            {/* Text column */}
            <div>
              <Fade>
                <div className="lp-badge">
                  <span className="lp-badge-dot" />
                  Instagram Growth Coaching
                </div>
              </Fade>
              <Fade delay={80}>
                <h1 className="lp-h1">
                  You&apos;ve been posting<br />for months.<br />
                  <span className="grad">You&apos;re still clocking&nbsp;in.</span>
                </h1>
              </Fade>
              <Fade delay={160}>
                <p className="lp-hero-sub">
                  Creator Cult is the coaching programme that turns consistent creators into full-time personal brands.
                  A real system. Not recycled advice.
                </p>
              </Fade>
              <Fade delay={240}>
                <div className="lp-cta-row">
                  <Link href="/apply" className="lp-cta-primary">
                    Apply for a Spot <IconArrow />
                  </Link>
                </div>
                <p className="lp-cta-note" style={{ marginTop: 14 }}>Applications reviewed manually. No commitment to apply.</p>
              </Fade>
              <Fade delay={320}>
                <div className="lp-hero-stats">
                  <StatCounter target={40} suffix="+" label="Creators Enrolled" />
                  <StatCounter target={24} suffix="M" label="Views Generated" />
                  <StatCounter target={5} suffix="K" label="Followers in 10 Days" />
                  <StatCounter prefix="£" target={1950} label="Revenue in 3 Days" />
                </div>
              </Fade>
            </div>
            {/* Photo column */}
            <Fade delay={120} className="lp-hero-photo-col">
              <div className="lp-hero-photo-glow" />
              <img
                src="/will-gym.jpg"
                alt="Will Scott — Creator Cult founder"
                className="lp-hero-photo"
              />
              <div className="lp-hero-photo-badge">
                <div className="lp-hero-photo-badge-n">40+</div>
                <div className="lp-hero-photo-badge-l">Clients Enrolled</div>
              </div>
            </Fade>
          </div>
        </div>

        {/* ── Animated Ticker ── */}
        <div className="lp-ticker">
          <div className="lp-ticker-track">
            {[...tickerItems, ...tickerItems].map((s, i) => (
              <span key={i} className="lp-tick">
                <span className="lp-tick-dot" />{s}
              </span>
            ))}
          </div>
        </div>

        {/* ── Pain ── */}
        <div className="lp-section">
          <div className="lp-container">
            <Fade><div className="lp-overline">The Real Problem</div></Fade>
            <Fade delay={60}>
              <h2 className="lp-h2">
                You don&apos;t have a content problem.<br />
                <span className="muted">You have a system problem.</span>
              </h2>
            </Fade>
            <div className="lp-pain-stack">
              {[
                { n: '01', title: 'You post. Nothing moves.', body: "You try a new format. You copy what worked for someone else. You wait. The numbers don't shift. You wonder if Instagram has it in for you." },
                { n: '02', title: 'Everyone sells you tactics. Nobody gives you a system.', body: "You've watched the free courses. You've applied the hooks. You can name every algorithm update this year. Still no clients. Still no income." },
                { n: '03', title: 'The gap between content and income feels impossible.', body: "You're close enough to see that other creators are making it work. You can't work out what they have that you don't. The answer isn't hustle. It's structure." },
              ].map(({ n, title, body }, i) => (
                <Fade key={n} delay={i * 70}>
                  <div className="lp-pain-card">
                    <div className="lp-pain-num">{n}</div>
                    <div className="lp-pain-title">{title}</div>
                    <div className="lp-pain-body">{body}</div>
                  </div>
                </Fade>
              ))}
            </div>
          </div>
        </div>

        {/* ── Story ── */}
        <div className="lp-section lp-story-border">
          <div className="lp-container">
            <div className="lp-story-layout">
              <div>
                <Fade><div className="lp-overline">Why I Built This</div></Fade>
                <Fade delay={60}>
                  <h2 className="lp-h2">
                    412 followers.<br />£20,000 in debt.<br />
                    <span className="muted">Delivering pizzas in the evenings.</span>
                  </h2>
                </Fade>
                <Fade delay={120}>
                  <div className="lp-story-text">
                    <p>That was me. Not long ago. I was posting every day and getting nowhere. I knew content. I knew marketing theory. I still couldn&apos;t pay my rent with it.</p>
                    <p>I stopped copying tactics and started building a system. A real one. Positioning, story, offer, acquisition. In the right order.</p>
                    <p>Within months, I had clients. Then a waiting list. Then a coaching programme with 40+ creators inside.</p>
                    <p><strong>I didn&apos;t get lucky. I got structured.</strong></p>
                    <p>Creator Cult is the system I wish I&apos;d had in year one. Every phase, every tool, every coaching call. Built to shortcut the years I wasted figuring it out alone.</p>
                  </div>
                </Fade>
              </div>
              <Fade delay={100} className="lp-story-photo-col">
                <img
                  src="/will-hero.jpg"
                  alt="Will Scott — Creator Cult founder"
                  className="lp-story-photo"
                />
                <div className="lp-story-caption">Will Scott — Creator Cult</div>
              </Fade>
            </div>
          </div>
        </div>

        {/* ── The System ── */}
        <div className="lp-section">
          <div className="lp-container">
            <Fade>
              <div className="lp-center">
                <div className="lp-overline">The Programme</div>
                <h2 className="lp-h2">Five phases. One direction.<br /><span className="muted">Full-time creator.</span></h2>
              </div>
            </Fade>
            <div className="lp-phase-grid">
              <Phase num="1" title="Foundations" desc="Before you create content, you need clarity. Most creators skip this. It costs them everything." items={['Niche and ICP precision. Who you serve and what they need.', 'Positioning statement that makes you the obvious choice', 'Brand voice and content identity', 'Offer foundations. What you sell before you sell anything.']} delay={0} />
              <Phase num="2" title="Build the Brand" desc="Content that builds authority, attracts the right people, and makes them follow for a reason." items={['Hook writing and the psychology behind stopping thumbs', 'Content frameworks that convert viewers into followers', 'Story-driven content that sells without selling', 'Reel strategy tied directly to your offer']} delay={70} />
              <Phase num="3" title="Client Acquisition" desc="Followers mean nothing if you can't convert them. This phase builds the machine." items={['DM strategy that turns comments into conversations', 'Discovery call frameworks and objection handling', 'Lead magnet creation and comment-keyword funnels', 'First client delivery: get paid before you have a product']} delay={140} />
              <Phase num="4" title="Monetisation Mastery" desc="Turn a trickle of clients into a consistent, scalable income stream." items={['High-ticket offer structuring and pricing', 'Upsell and retention systems for existing clients', 'Instagram sales psychology: urgency, scarcity, trust', 'Revenue goal planning with real numbers']} delay={210} />
              <Phase num="5" title="Scale and Systems" desc="Build the infrastructure that lets the business run without burning out." items={['Content batching and weekly production workflow', 'Setter and team onboarding foundations', 'Automation for DMs, leads, and client delivery', 'From full-time employee to full-time creator']} delay={280} />
              <Phase num="+" title="Ongoing Support" desc="You're not going through this alone. Every week, every question, every plateau." items={['Weekly group coaching calls', 'Private Circle community', '1:1 support and feedback', 'Content and offer reviews', 'The Cult Dashboard (see below)']} delay={350} highlight />
            </div>
          </div>
        </div>

        {/* ── Cult Dashboard ── */}
        <div className="lp-dash-bg lp-section">
          <div className="lp-dash-glow" />
          <div className="lp-container" style={{ position: 'relative' }}>
            <Fade>
              <div className="lp-center">
                <div className="lp-overline">Exclusive to Creator Cult</div>
                <h2 className="lp-h2">The Cult Dashboard.<br /><span className="muted">Your AI-powered growth engine.</span></h2>
                <p className="lp-intro">
                  Every client gets access to a private dashboard built specifically for Creator Cult members.
                  AI tools trained on our methodology. Not generic. Purpose-built for your business.
                </p>
              </div>
            </Fade>

            <Fade delay={80}>
              <div className="lp-dash-mockup">
                <div className="lp-dash-bar">
                  <div className="lp-dash-dot" /><div className="lp-dash-dot" /><div className="lp-dash-dot" />
                  <div className="lp-dash-url">
                    <div className="lp-dash-url-dot" />
                    cult-dashboard.vercel.app/dashboard
                  </div>
                </div>
                <div className="lp-dash-cards">
                  {[
                    { label: 'AI Story Generator', status: 'Generating slide 3 of 7...', color: '#3b82f6', bar: 43 },
                    { label: 'Lead Magnet Generator', status: '3 ideas ready to review', color: '#22c55e', bar: 100 },
                    { label: 'Profile Audit', status: 'Report complete', color: '#a855f7', bar: 100 },
                  ].map(({ label, status, color, bar }) => (
                    <div key={label} className="lp-dash-card">
                      <div className="lp-dash-card-label" style={{ color }}>{label}</div>
                      <div className="lp-dash-card-status">{status}</div>
                      <div className="lp-dash-bar-track">
                        <div className="lp-dash-bar-fill" style={{ width: `${bar}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Fade>

            <div className="lp-tool-grid">
              {[
                { icon: <IconBrain />, title: 'AI Story Generator', desc: 'Input your niche, offer, and audience. Get a full Instagram story sequence built around your specific positioning. Hooks, slides, and CTA. Not a template. A custom sequence.', badge: 'Most Used' },
                { icon: <IconDoc />, title: 'Lead Magnet Generator', desc: 'Choose your angle. The AI builds a complete lead magnet brief: title, concept, outline, and a ready-to-paste caption CTA with comment keyword. Start converting followers into leads this week.' },
                { icon: <IconSearch />, title: 'Profile Audit AI', desc: "Feed in your Instagram URL. Get a structured audit: bio clarity, CTA strength, offer visibility, content gaps. Know exactly what to fix and in what order." },
                { icon: <IconLayers />, title: 'Content Library', desc: 'Every training, resource, and framework in one searchable library. Organised by phase. No hunting through Notion docs or Slack threads to find what you need.' },
                { icon: <IconZap />, title: 'Offer Builder', desc: 'Step through your offer structure with AI guidance. Deliverables, transformation, price point, positioning. Build an offer that actually sells before you launch it.' },
                { icon: <IconTrend />, title: 'Reel Analytics', desc: 'See which of your reels are pulling the most views, track hooks that work, and spot content patterns. All inside your dashboard, connected to your profile data.' },
              ].map((t, i) => (
                <Fade key={t.title} delay={i * 55}>
                  <ToolCard {...t} />
                </Fade>
              ))}
            </div>
          </div>
        </div>

        {/* ── Client Wins ── */}
        <div className="lp-section">
          <div className="lp-container">
            <Fade>
              <div className="lp-center">
                <div className="lp-overline">Real Results</div>
                <h2 className="lp-h2">What happens when you have<br /><span className="grad">a system instead of a strategy.</span></h2>
              </div>
            </Fade>
            <div className="lp-win-grid">
              <Win name="Freddie" stat="£1,950 in 3 days" detail="No offer, no clients when he joined. Built and launched his first high-ticket package using the Client Acquisition phase. £1,950 in three days." img="https://assets-v2.circle.so/vjrs5iivuayf1j9x5te9q9u8f3bt" delay={0} />
              <Win name="Eddie" stat="5,000 followers in 10 days" detail="Reworked his positioning and hooks using Phase 2. Two reels went viral. 5,000 new followers in 10 days. First paying client followed from that growth." img="https://assets-v2.circle.so/li0b9tx3pl289tyzwa4c1vhus6jb" delay={70} />
              <Win name="Dino" stat="24 million views in 3 weeks" detail="Changed his username, applied the content frameworks, and hit 24 million views three weeks after joining. DMs turned into discovery calls within days." img="https://assets-v2.circle.so/7di4sesakx0atgazfw0wdz0ult0i" delay={140} />
              <Win name="Michael" stat="$10K day" detail="Two $5K pay-in-fulls before noon. Went from inconsistent income to $10,000 in a single day by restructuring his offer using the Monetisation Mastery phase." img="https://assets-v2.circle.so/w5tlngk8d5r1q5dpt0bmjtq5zzxl" delay={210} />
              <Win name="Tom" stat="6K followers in 2 months" detail="First paying clients landed while growing to 6,000 followers working with Will. His own words: 'shits bout to get crazy.'" img="https://assets-v2.circle.so/oovd23m42ybtzncmcuomqyiabjm7" delay={280} />
              <Win name="Roy" stat="1M views — first viral reel" detail="First reel to break 1 million views after consistently posting every day for 25 days. Hit 1K followers within 2 months of starting Creator Cult." img="https://assets-v2.circle.so/0z7iywo1kuov1nlanetscbuw6o8p" delay={350} />
              <Win name="Brett" stat="First client in 3 weeks" detail="18 months of posting with zero clients. Rebuilt his positioning from scratch in Foundations. Signed his first high-ticket coaching client three weeks later." delay={420} />
              <Win name="Asfand" stat="First client in 7 days" detail="Used the DM acquisition system and lead magnet framework from Phase 3. First paid client within a week of implementing. Launched his Instagram the Monday before." delay={490} />
            </div>
            <Fade delay={80}>
              <p style={{ textAlign: 'center', fontSize: 13, color: '#1f2937', marginTop: 40 }}>
                Results vary. These are real outcomes from real Creator Cult members.
              </p>
            </Fade>
          </div>
        </div>

        {/* ── What's included ── */}
        <div className="lp-section" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.005)' }}>
          <div className="lp-container">
            <Fade>
              <div className="lp-center">
                <div className="lp-overline">What You Get</div>
                <h2 className="lp-h2">Everything in one place.</h2>
              </div>
            </Fade>
            <div className="lp-included-grid">
              {[
                { icon: <IconStar />, title: 'The 5-Phase Curriculum', desc: 'Foundations to Scale. Every lesson, framework, and exercise structured in the order that actually works. Self-paced but guided.' },
                { icon: <IconUsers />, title: 'Weekly Group Coaching Calls', desc: 'Live calls every week. Bring your questions, your content, your blockers. Will reviews your work live and tells you exactly what to fix.' },
                { icon: <IconGrid />, title: 'The Cult Dashboard', desc: 'Private access to all six AI tools built for Creator Cult members. Story Generator, Lead Magnet Generator, Profile Audit, Offer Builder, and more.' },
                { icon: <IconMsg />, title: 'Private Circle Community', desc: '40+ creators at different stages, all working the same system. Post wins, ask for feedback, get accountability. Active every day.' },
                { icon: <IconShield />, title: '1:1 Support', desc: 'Direct access to Will between calls. Post your content for review, ask for offer feedback, get unstuck fast. Not a bot. Not a VA.' },
                { icon: <IconPackage />, title: 'Weekly Strategy Packages', desc: "Every week you get a curated strategy package: what's working on Instagram right now, content angles to test, and a plan for the next 7 days." },
              ].map(({ icon, title, desc }, i) => (
                <Fade key={title} delay={i * 55}>
                  <div className="lp-included-card">
                    <div className="lp-included-icon">{icon}</div>
                    <div>
                      <div className="lp-included-title">{title}</div>
                      <div className="lp-included-desc">{desc}</div>
                    </div>
                  </div>
                </Fade>
              ))}
            </div>
          </div>
        </div>

        {/* ── For / Not for ── */}
        <div className="lp-section">
          <div className="lp-container">
            <Fade>
              <div className="lp-center" style={{ marginBottom: 56 }}>
                <h2 className="lp-h2">This is for you.<br /><span className="muted">This is not for everyone.</span></h2>
              </div>
            </Fade>
            <div className="lp-for-grid">
              <Fade delay={0}>
                <div className="lp-for-card yes">
                  <div className="lp-for-head">
                    <div className="lp-for-head-icon"><IconCheck /></div>
                    <span className="lp-for-head-text">Creator Cult is for you if...</span>
                  </div>
                  <div className="lp-for-list">
                    {[
                      "You've been posting consistently but you're not seeing income",
                      "You know content but you don't have a business system around it",
                      "You want to be full-time as a creator within 12 months",
                      "You're willing to put in the work and follow a proven process",
                      "You want support, not just another course to watch alone",
                      "You're ready to treat your content like a business, not a hobby",
                    ].map(s => (
                      <div key={s} className="lp-for-item">
                        <span className="lp-for-icon"><IconCheck /></span>{s}
                      </div>
                    ))}
                  </div>
                </div>
              </Fade>
              <Fade delay={100}>
                <div className="lp-for-card no">
                  <div className="lp-for-head">
                    <div className="lp-for-head-icon"><IconX /></div>
                    <span className="lp-for-head-text">Not the right fit if...</span>
                  </div>
                  <div className="lp-for-list">
                    {[
                      "You're expecting overnight results without putting in real effort",
                      "You're not willing to invest in your own growth",
                      "You want a magic content formula. This is a business system.",
                      "You're not able to commit time each week to implement",
                      "You just started posting and haven't tested what works yet",
                      "You're looking for someone to do it all for you",
                    ].map(s => (
                      <div key={s} className="lp-for-item">
                        <span className="lp-for-icon"><IconX /></span>{s}
                      </div>
                    ))}
                  </div>
                </div>
              </Fade>
            </div>
          </div>
        </div>

        {/* ── Mid CTA ── */}
        <div className="lp-mid-cta lp-section-sm">
          <div className="lp-mid-cta-inner">
            <Fade>
              <div className="lp-mid-cta-h">Ready to stop figuring it out alone?</div>
              <p className="lp-mid-cta-sub">Applications take 3 minutes. No commitment to apply. Will reviews every one personally.</p>
              <Link href="/apply" className="lp-cta-primary" style={{ display: 'inline-flex' }}>
                Apply for a Spot <IconArrow />
              </Link>
            </Fade>
          </div>
        </div>

        {/* ── FAQ ── */}
        <div className="lp-section">
          <div className="lp-container" style={{ maxWidth: 800, margin: '0 auto', padding: '0 32px' }}>
            <Fade>
              <div className="lp-center">
                <div className="lp-overline">FAQ</div>
                <h2 className="lp-h2">Common questions.</h2>
              </div>
            </Fade>
            <Fade delay={60}>
              <div className="lp-faq-stack">
                <Faq q="How long does the programme run?" a="Creator Cult is an ongoing coaching programme. Most clients see their first real results within 30 to 60 days of starting. There is no set end date. You stay in as long as you are growing." />
                <Faq q="Do I need a big following to join?" a="No. Several of our members signed their first clients with under 1,000 followers. Following size does not determine your results. Your system does. We build the system first." />
                <Faq q="How much time do I need to commit each week?" a="Expect to block 5 to 8 hours per week: content creation, implementation, and the weekly coaching call. Less than that and progress slows. You do not need more than that to see results." />
                <Faq q="What platforms does this work for?" a="The programme is built primarily around Instagram. The frameworks, tools, and coaching are all Instagram-first. If you are cross-posting to TikTok or YouTube, the positioning and offer work translates. Instagram is the core focus." />
                <Faq q="Is this just another course?" a="No. The curriculum is part of it, but Creator Cult is a coaching programme. You have live weekly calls, 1:1 access to Will, a community of active creators, and the Cult Dashboard AI tools. The course is the structure. The coaching is where you actually move forward." />
                <Faq q="What if I've tried coaching before and it didn't work?" a="That is worth talking about in your application. A lot of creators who come to Creator Cult have been through generic social media courses or coaching that gave them tactics without a system. If your previous experience did not work, tell us why in your application. Will reads every one." />
                <Faq q="How do I apply?" a="Click the Apply button and fill in the short form. It takes about 3 minutes. Will reviews it personally. If it is a fit, you will hear back within 48 hours." />
              </div>
            </Fade>
          </div>
        </div>

        {/* ── Final CTA ── */}
        <div className="lp-final lp-section">
          <div className="lp-final-bg" />
          <div className="lp-final-inner">
            <Fade>
              <h2 className="lp-final-h">
                Stop posting into<br /><span className="grad">the void.</span>
              </h2>
              <p className="lp-final-sub">
                You&apos;re three minutes away from finding out if Creator Cult is the right fit.<br />
                Apply now. No commitment. No sales call unless you want one.
              </p>
              <Link href="/apply" className="lp-cta-primary" style={{ display: 'inline-flex' }}>
                Apply for a Spot <IconArrow />
              </Link>
              <div className="lp-chips">
                {['Takes 3 minutes', 'Reviewed personally by Will', 'No commitment to apply'].map(c => (
                  <span key={c} className="lp-chip">
                    <span className="lp-chip-check"><IconCheck /></span> {c}
                  </span>
                ))}
              </div>
            </Fade>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="lp-footer">
          <div className="lp-footer-logo"><span className="c1">CREATOR</span><span className="c2"> CULT</span></div>
          <div className="lp-footer-links">
            <a href="/privacy">Privacy Policy</a>
            <a href="/data-deletion">Data Deletion</a>
            <Link href="/apply">Apply</Link>
          </div>
          <div className="lp-footer-copy">© {new Date().getFullYear()} Creator Cult. All rights reserved.</div>
        </div>
      </div>
    </>
  )
}
