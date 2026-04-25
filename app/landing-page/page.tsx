'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

/* ─── Scroll reveal ─────────────────────────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setOn(true) },
      { threshold: 0.06 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return { ref, on }
}

function Fade({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const { ref, on } = useReveal()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: on ? 1 : 0,
        transform: on ? 'none' : 'translateY(36px)',
        transition: `opacity .9s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .9s cubic-bezier(.16,1,.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

/* ─── SVG Icons ─────────────────────────────────────────────────────── */
const IconBrain = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3.16A2.5 2.5 0 0 1 9.5 2Z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3.16A2.5 2.5 0 0 0 14.5 2Z"/>
  </svg>
)
const IconDoc = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
)
const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const IconLayers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </svg>
)
const IconZap = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
)
const IconTrend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
    <polyline points="16 7 22 7 22 13"/>
  </svg>
)
const IconStar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)
const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const IconGrid = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>
)
const IconMsg = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
)
const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const IconPackage = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
)
const IconArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
)
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IconMinus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

/* ─── FAQ ──────────────────────────────────────────────────────────── */
function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="lp-faq-item" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <button
        className="lp-faq-q"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px 0',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: '15px',
          fontWeight: 500,
          color: '#e8e4dc',
          lineHeight: 1.5,
          gap: 24,
        }}
      >
        <span>{q}</span>
        <span style={{ flexShrink: 0, color: '#C41E3A', transition: 'transform .2s', display: 'inline-flex' }}>
          {open ? <IconMinus /> : <IconPlus />}
        </span>
      </button>
      {open && (
        <div style={{
          paddingBottom: 24,
          fontSize: 14,
          color: '#7a756e',
          lineHeight: 1.8,
          maxWidth: 680,
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}>
          {a}
        </div>
      )}
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
    'Freddie — £1,950 in 3 days',
    'Eddie — 5,000 followers in 10 days',
    'Dino — 24 million views in 3 weeks',
    'Brett Capstick — First client in 3 weeks',
    'Asfand — First paying client in 7 days',
    'Michael Kersee — $10,000 in a single day',
    'Tom Köster — 600 to 1,300 followers in one week',
    'Roy — 1 million views, first viral reel',
  ]

  const marqueeRow1 = [
    { name: 'Michael Kersee', result: '$10,000 in a single day' },
    { name: 'Freddie', result: '£1,950 in 72 hours' },
    { name: 'Eddie', result: '5,000 followers in 10 days' },
    { name: 'Dino', result: '24 million views in 3 weeks' },
    { name: 'Brett Capstick', result: 'First client in 3 weeks' },
    { name: 'Bile', result: '€550/month — two clients signed' },
    { name: 'Jakub Riedel', result: 'Three viral reels back to back' },
    { name: 'Zack Sinclair', result: '19K likes and 5.1K saves on one reel' },
  ]
  const marqueeRow2 = [
    { name: 'Tom Köster', result: '600 to 1,300 followers in one week' },
    { name: 'Roy', result: '1 million views — first viral reel' },
    { name: 'Gabrielle', result: 'First 100,000 views on Instagram' },
    { name: 'Matte Fortuna', result: '€500 first coaching payout' },
    { name: 'Asfand', result: 'First paying client in 7 days' },
    { name: 'Toshiro Khouth', result: 'First 100K-view video' },
    { name: 'FreeYourMind', result: '10K views in under 12 hours' },
    { name: 'Michael Kersee', result: '1M views in 30 days' },
  ]

  const tools = [
    { icon: <IconBrain />, title: 'AI Story Generator', desc: 'Input your niche, offer, and audience. Get a full Instagram story sequence built around your specific positioning — hooks, slides, CTA. Not a template. A custom sequence.', badge: 'Most Used' },
    { icon: <IconDoc />, title: 'Lead Magnet Generator', desc: 'Choose your angle. The AI builds a complete lead magnet brief: title, concept, outline, and a ready-to-paste caption CTA with comment keyword. Convert followers into leads this week.' },
    { icon: <IconSearch />, title: 'Profile Audit AI', desc: 'Feed in your Instagram URL. Get a structured audit: bio clarity, CTA strength, offer visibility, content gaps. Know exactly what to fix and in what order.' },
    { icon: <IconLayers />, title: 'Content Library', desc: 'Every training, resource, and framework in one searchable library. Organised by phase. No hunting through Notion docs or Slack threads to find what you need.' },
    { icon: <IconZap />, title: 'Offer Builder', desc: 'Step through your offer structure with AI guidance. Deliverables, transformation, price point, positioning. Build an offer that actually sells before you launch it.' },
    { icon: <IconTrend />, title: 'Reel Analytics', desc: 'See which reels pull the most views, track the hooks that work, and spot content patterns — all inside your dashboard, connected to your profile data.' },
  ]

  const included = [
    { icon: <IconStar />, title: 'The 5-Phase Curriculum', desc: 'Foundations to Scale. Every lesson, framework, and exercise structured in the order that works. Self-paced, but guided.' },
    { icon: <IconUsers />, title: 'Weekly Group Coaching Calls', desc: 'Live calls every week. Bring your questions, your content, your blockers. Will reviews your work live and tells you exactly what to fix.' },
    { icon: <IconGrid />, title: 'The Cult Dashboard', desc: 'Private access to all six AI tools built for Creator Cult members — Story Generator, Lead Magnet Generator, Profile Audit, Offer Builder, and more.' },
    { icon: <IconMsg />, title: 'Private Circle Community', desc: '40+ creators at different stages, all working the same system. Post wins, ask for feedback, get accountability. Active every day.' },
    { icon: <IconShield />, title: '1:1 Support', desc: 'Direct access to Will between calls. Post your content for review, ask for offer feedback, get unstuck fast. Not a bot. Not a VA.' },
    { icon: <IconPackage />, title: 'Weekly Strategy Packages', desc: "Every week you get a curated strategy package: what's working on Instagram right now, content angles to test, and a plan for the next 7 days." },
  ]

  const phases = [
    { n: '01', title: 'Foundations', desc: 'Before you create content, you need clarity. Most creators skip this. It costs them everything.', items: ['Niche and ICP precision', 'Positioning that makes you the obvious choice', 'Brand voice and content identity', 'Offer foundations — what you sell before you sell anything'] },
    { n: '02', title: 'Build the Brand', desc: 'Content that builds authority, attracts the right people, and makes them follow for a reason.', items: ['Hook writing and the psychology behind stopping thumbs', 'Content frameworks that convert viewers into followers', 'Story-driven content that sells without selling', 'Reel strategy tied directly to your offer'] },
    { n: '03', title: 'Client Acquisition', desc: "Followers mean nothing if you can't convert them. This phase builds the machine.", items: ['DM strategy that turns comments into conversations', 'Discovery call frameworks and objection handling', 'Lead magnet creation and comment-keyword funnels', 'First client delivery: get paid before you have a product'] },
    { n: '04', title: 'Monetisation Mastery', desc: 'Turn a trickle of clients into a consistent, scalable income stream.', items: ['High-ticket offer structuring and pricing', 'Upsell and retention systems for existing clients', 'Instagram sales psychology: urgency, scarcity, trust', 'Revenue goal planning with real numbers'] },
    { n: '05', title: 'Scale and Systems', desc: 'Build the infrastructure that lets the business run without burning out.', items: ['Content batching and weekly production workflow', 'Setter and team onboarding foundations', 'Automation for DMs, leads, and client delivery', 'From full-time employee to full-time creator'] },
    { n: '—', title: 'Ongoing Support', desc: "You're not going through this alone. Every week, every question, every plateau.", items: ['Weekly group coaching calls', 'Private Circle community', '1:1 support and feedback', 'Content and offer reviews', 'The Cult Dashboard'] },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Playfair+Display:ital,wght@0,400;0,500;0,700;0,900;1,400;1,500;1,700&display=swap');

        /* ── Reset ── */
        .lp-root { all: initial; display: block; }
        .lp-root *, .lp-root *::before, .lp-root *::after {
          box-sizing: border-box; margin: 0; padding: 0;
        }

        /* ── Base ── */
        .lp-root {
          font-family: 'DM Sans', system-ui, -apple-system, sans-serif !important;
          font-size: 16px; font-weight: 400; line-height: 1.65;
          color: #e8e4dc; background: #0d0d0a;
          min-height: 100vh; overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        /* ── Grain overlay ── */
        .lp-root::after {
          content: '';
          position: fixed; inset: 0;
          z-index: 9999; pointer-events: none;
          opacity: 0.045;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 280px 280px;
        }

        /* ── Typography ── */
        .lp-h1 {
          font-family: 'Playfair Display', Georgia, 'Times New Roman', serif !important;
          font-size: clamp(52px, 7.5vw, 96px);
          font-weight: 900; line-height: 0.93;
          letter-spacing: -0.025em; color: #f0ece4;
        }
        .lp-h2 {
          font-family: 'Playfair Display', Georgia, serif !important;
          font-size: clamp(38px, 5.5vw, 68px);
          font-weight: 700; line-height: 1.03;
          letter-spacing: -0.02em; color: #f0ece4;
        }
        .lp-h3 {
          font-family: 'Playfair Display', Georgia, serif !important;
          font-size: clamp(20px, 2.5vw, 28px);
          font-weight: 600; line-height: 1.15; color: #f0ece4;
        }
        .lp-h4 {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 13px; font-weight: 700;
          letter-spacing: .08em; color: #e8e4dc;
          text-transform: uppercase;
        }
        .lp-body { font-size: 16px; color: #7a756e; line-height: 1.75; }
        .lp-body-lg { font-size: 18px; color: #7a756e; line-height: 1.75; }
        .lp-italic { font-style: italic; }

        /* ── Layout ── */
        .lp-container { max-width: 1200px; margin: 0 auto; padding: 0 48px; }
        .lp-container-sm { max-width: 840px; margin: 0 auto; padding: 0 48px; }
        .lp-section { padding: 128px 0; }
        .lp-section-sm { padding: 80px 0; }
        .lp-hr { height: 1px; background: rgba(196,30,58,0.2); }

        /* ── Pill label ── */
        .lp-pill {
          display: inline-block;
          font-family: 'DM Sans', sans-serif !important;
          font-size: 9px; font-weight: 600;
          letter-spacing: .24em; text-transform: uppercase;
          color: #C41E3A;
          border: 1px solid rgba(196,30,58,0.3);
          padding: 5px 14px;
          border-radius: 2px;
          margin-bottom: 28px;
        }

        /* ── CTAs ── */
        .lp-cta {
          display: inline-flex; align-items: center; gap: 12px;
          font-family: 'DM Sans', sans-serif !important;
          font-size: 10px; font-weight: 700;
          letter-spacing: .22em; text-transform: uppercase;
          color: #C41E3A; background: transparent;
          border: 1px solid #C41E3A;
          padding: 17px 40px; text-decoration: none;
          transition: background .2s ease, color .2s ease;
          cursor: pointer; border-radius: 0;
        }
        .lp-cta:hover { background: #C41E3A; color: #0d0d0a; }
        .lp-cta-sm {
          display: inline-flex; align-items: center; gap: 10px;
          font-family: 'DM Sans', sans-serif !important;
          font-size: 9px; font-weight: 700;
          letter-spacing: .22em; text-transform: uppercase;
          color: #C41E3A; background: transparent;
          border: 1px solid #C41E3A;
          padding: 10px 22px; text-decoration: none;
          transition: background .2s ease, color .2s ease;
          cursor: pointer; border-radius: 0;
        }
        .lp-cta-sm:hover { background: #C41E3A; color: #0d0d0a; }

        /* ── Nav ── */
        .lp-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          height: 64px; display: flex; align-items: center;
          justify-content: space-between; padding: 0 48px;
          transition: background .4s ease, border-color .4s ease;
        }
        .lp-nav.scrolled {
          background: rgba(13,13,10,0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(196,30,58,0.15);
        }
        .lp-nav-logo {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 12px; font-weight: 700;
          letter-spacing: .22em; text-transform: uppercase;
          text-decoration: none; color: #e8e4dc;
        }
        .lp-nav-logo span { color: #C41E3A; }

        /* ── Hero ── */
        .lp-hero {
          display: grid;
          grid-template-columns: 1fr 42%;
          min-height: 100vh;
          position: relative;
        }
        @media (max-width: 900px) {
          .lp-hero { grid-template-columns: 1fr; min-height: auto; }
          .lp-hero-photo-col { height: 60vw; min-height: 320px; order: -1; }
        }
        .lp-hero-left {
          display: flex; flex-direction: column; justify-content: center;
          padding: 120px 64px 80px 48px;
          border-right: 1px solid rgba(196,30,58,0.1);
        }
        @media (max-width: 900px) {
          .lp-hero-left { padding: 100px 32px 60px; border-right: none; }
        }
        @media (max-width: 640px) {
          .lp-hero-left { padding: 100px 20px 60px; }
        }
        .lp-hero-eyebrow {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 9px; font-weight: 600; letter-spacing: .28em;
          text-transform: uppercase; color: #C41E3A; margin-bottom: 32px;
        }
        .lp-hero-photo-col {
          position: relative; overflow: hidden;
        }
        .lp-hero-photo {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover; object-position: top;
          display: block;
          filter: brightness(0.88) contrast(1.05);
        }
        .lp-hero-photo-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to right, #0d0d0a 0%, transparent 25%),
                      linear-gradient(to top, #0d0d0a 0%, transparent 30%);
        }
        .lp-hero-stats {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 0; margin-top: 56px;
          border-top: 1px solid rgba(255,255,255,0.07);
          padding-top: 40px;
        }
        @media (max-width: 640px) {
          .lp-hero-stats { grid-template-columns: repeat(2, 1fr); gap: 28px 0; }
        }
        .lp-stat { }
        .lp-stat-n {
          font-family: 'Playfair Display', Georgia, serif !important;
          font-size: clamp(28px, 4vw, 44px);
          font-weight: 900; color: #f0ece4;
          line-height: 1; letter-spacing: -0.02em;
        }
        .lp-stat-l {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 10px; color: #4a4640;
          font-weight: 500; letter-spacing: .1em;
          text-transform: uppercase; margin-top: 8px;
        }

        /* ── Ticker ── */
        .lp-ticker {
          border-top: 1px solid rgba(196,30,58,0.2);
          border-bottom: 1px solid rgba(196,30,58,0.2);
          padding: 16px 0; overflow: hidden;
          background: rgba(196,30,58,0.02);
        }
        .lp-ticker-track {
          display: flex; width: max-content;
          animation: lp-marquee 36s linear infinite;
        }
        .lp-ticker-track:hover { animation-play-state: paused; }
        @keyframes lp-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .lp-tick {
          display: inline-flex; align-items: center; gap: 0;
          font-family: 'DM Sans', sans-serif !important;
          font-size: 11px; font-weight: 500; letter-spacing: .1em;
          color: #4a4640; white-space: nowrap;
          padding: 0 32px;
        }
        .lp-tick-sep {
          color: #C41E3A; margin-right: 0; font-size: 10px; margin-left: 0;
        }

        /* ── Social strip ── */
        .lp-social-strip {
          padding: 40px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .lp-social-label {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 9px; font-weight: 600; letter-spacing: .28em;
          text-transform: uppercase; color: #3a3530;
          margin-bottom: 24px; text-align: center;
        }
        .lp-social-names {
          display: flex; flex-wrap: wrap; justify-content: center;
          gap: 0; align-items: center;
        }
        .lp-social-name {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 12px; font-weight: 500; letter-spacing: .08em;
          color: #3a3530; padding: 0 20px;
          border-right: 1px solid rgba(255,255,255,0.05);
        }
        .lp-social-name:last-child { border-right: none; }

        /* ── Pain ── */
        .lp-pain-item {
          padding: 44px 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: grid; grid-template-columns: 80px 1fr;
          gap: 48px; align-items: start;
        }
        @media (max-width: 640px) {
          .lp-pain-item { grid-template-columns: 1fr; gap: 12px; }
        }
        .lp-pain-num {
          font-family: 'Playfair Display', serif !important;
          font-size: 52px; font-weight: 400; color: rgba(196,30,58,0.15);
          line-height: 1; margin-top: -8px; font-style: italic;
        }
        .lp-pain-title {
          font-family: 'Playfair Display', serif !important;
          font-size: clamp(20px, 2.5vw, 26px);
          font-weight: 600; color: #f0ece4; margin-bottom: 12px; line-height: 1.25;
        }
        .lp-pain-body {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 15px; color: #5a5550; line-height: 1.8;
        }

        /* ── Story ── */
        .lp-story-grid {
          display: grid; grid-template-columns: 1fr 380px; gap: 96px; align-items: start;
        }
        @media (max-width: 900px) {
          .lp-story-grid { grid-template-columns: 1fr; gap: 52px; }
          .lp-story-photo-col { order: -1; max-width: 380px; }
        }
        .lp-story-photo-col { position: sticky; top: 90px; }
        .lp-story-photo {
          width: 100%; display: block;
          aspect-ratio: 3/4; object-fit: cover; object-position: top;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .lp-story-caption {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 10px; letter-spacing: .16em; text-transform: uppercase;
          color: #3a3530; margin-top: 16px; text-align: center;
        }
        .lp-story-text {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 17px; color: #5a5550; line-height: 1.85;
        }
        .lp-story-text p { margin-bottom: 22px; }
        .lp-story-text p:last-child { margin-bottom: 0; }
        .lp-story-text strong { color: #e8e4dc; font-weight: 600; }

        /* ── Phase grid ── */
        .lp-phase-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 0; margin-top: 80px;
          border: 1px solid rgba(255,255,255,0.06);
        }
        @media (max-width: 960px) { .lp-phase-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 580px) { .lp-phase-grid { grid-template-columns: 1fr; } }
        .lp-phase-card {
          padding: 36px 32px;
          border-right: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          transition: background .25s;
          cursor: default;
        }
        .lp-phase-card:hover { background: rgba(196,30,58,0.03); }
        .lp-phase-card:nth-child(3n) { border-right: none; }
        @media (max-width: 960px) {
          .lp-phase-card:nth-child(3n) { border-right: 1px solid rgba(255,255,255,0.06); }
          .lp-phase-card:nth-child(2n) { border-right: none; }
        }
        .lp-phase-n {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 9px; font-weight: 700; letter-spacing: .28em;
          text-transform: uppercase; color: #C41E3A;
          margin-bottom: 20px;
        }
        .lp-phase-title {
          font-family: 'Playfair Display', serif !important;
          font-size: 20px; font-weight: 700; color: #f0ece4;
          margin-bottom: 12px; line-height: 1.2;
        }
        .lp-phase-desc {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 13px; color: #5a5550; line-height: 1.7;
          margin-bottom: 24px; padding-bottom: 24px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .lp-phase-items { display: flex; flex-direction: column; gap: 10px; }
        .lp-phase-item {
          display: flex; align-items: flex-start; gap: 12px;
          font-family: 'DM Sans', sans-serif !important;
          font-size: 12px; color: #4a4640; line-height: 1.55;
        }
        .lp-phase-dash { color: #C41E3A; flex-shrink: 0; font-size: 10px; margin-top: 3px; }
        .lp-phase-card.lp-phase-support {
          background: rgba(196,30,58,0.04);
          border-top: 1px solid rgba(196,30,58,0.2);
        }
        .lp-phase-support .lp-phase-title { color: rgba(240,236,228,0.7); }
        .lp-phase-support .lp-phase-item { color: rgba(196,30,58,0.5); }

        /* ── Dashboard mockup ── */
        .lp-dash-mockup {
          margin: 56px 0;
          border: 1px solid rgba(255,255,255,0.07);
        }
        .lp-dash-bar {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(255,255,255,0.01);
        }
        .lp-dash-dot { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.06); }
        .lp-dash-url {
          flex: 1; background: rgba(255,255,255,0.03); padding: 5px 12px;
          font-family: 'DM Sans', sans-serif !important;
          font-size: 11px; color: #3a3530; margin: 0 12px;
          display: flex; align-items: center; gap: 8px;
        }
        .lp-dash-url-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(196,30,58,0.5); flex-shrink: 0; }
        .lp-dash-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; }
        @media (max-width: 700px) { .lp-dash-cards { grid-template-columns: 1fr; } }
        .lp-dash-card {
          padding: 24px;
          border-right: 1px solid rgba(255,255,255,0.05);
        }
        .lp-dash-card:last-child { border-right: none; }
        .lp-dash-card-label {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 9px; font-weight: 700; letter-spacing: .18em;
          text-transform: uppercase; margin-bottom: 10px;
        }
        .lp-dash-card-status {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 13px; color: #e5e7eb; margin-bottom: 18px; font-weight: 500;
        }
        .lp-dash-track { height: 2px; background: rgba(255,255,255,0.05); }
        .lp-dash-fill { height: 100%; background: #C41E3A; }

        /* ── Tool grid ── */
        .lp-tool-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 0; margin-top: 0;
          border: 1px solid rgba(255,255,255,0.06);
          border-top: none;
        }
        @media (max-width: 960px) { .lp-tool-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 580px) { .lp-tool-grid { grid-template-columns: 1fr; } }
        .lp-tool-card {
          padding: 32px;
          border-right: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          transition: background .25s; cursor: default;
        }
        .lp-tool-card:hover { background: rgba(196,30,58,0.03); }
        .lp-tool-card:nth-child(3n) { border-right: none; }
        @media (max-width: 960px) {
          .lp-tool-card:nth-child(3n) { border-right: 1px solid rgba(255,255,255,0.06); }
          .lp-tool-card:nth-child(2n) { border-right: none; }
        }
        .lp-tool-icon-wrap {
          width: 36px; height: 36px;
          border: 1px solid rgba(196,30,58,0.25);
          display: flex; align-items: center; justify-content: center;
          color: #C41E3A; margin-bottom: 20px;
        }
        .lp-tool-badge {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 9px; font-weight: 700; letter-spacing: .18em;
          color: #C41E3A; text-transform: uppercase; margin-left: 12px;
          border: 1px solid rgba(196,30,58,0.25); padding: 2px 8px;
        }
        .lp-tool-title {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 14px; font-weight: 700; color: #e8e4dc;
          margin-bottom: 10px; display: flex; align-items: center;
        }
        .lp-tool-desc {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 13px; color: #4a4640; line-height: 1.75;
        }

        /* ── Testimonial marquee ── */
        .lp-marquee-wrap { overflow: hidden; padding: 8px 0; }
        .lp-marquee-track-l {
          display: flex; width: max-content;
          animation: lp-mq-l 40s linear infinite;
        }
        .lp-marquee-track-r {
          display: flex; width: max-content;
          animation: lp-mq-r 38s linear infinite;
        }
        .lp-marquee-track-l:hover,
        .lp-marquee-track-r:hover { animation-play-state: paused; }
        @keyframes lp-mq-l {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes lp-mq-r {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .lp-mq-item {
          display: inline-flex; align-items: baseline; gap: 12px;
          padding: 18px 48px;
          border-right: 1px solid rgba(255,255,255,0.05);
          white-space: nowrap; cursor: default;
          transition: background .2s;
        }
        .lp-mq-item:hover { background: rgba(196,30,58,0.03); }
        .lp-mq-name {
          font-family: 'Playfair Display', serif !important;
          font-size: 14px; font-style: italic; color: #6b6560;
        }
        .lp-mq-result {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 13px; font-weight: 600; color: #f0ece4; letter-spacing: -.01em;
        }
        .lp-mq-dot { color: #C41E3A; font-size: 8px; }

        /* ── Win cards ── */
        .lp-win-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 0; margin-top: 64px;
          border: 1px solid rgba(255,255,255,0.06);
        }
        @media (max-width: 900px) { .lp-win-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 580px) { .lp-win-grid { grid-template-columns: 1fr; } }
        .lp-win-card {
          padding: 0;
          border-right: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex; flex-direction: column;
          overflow: hidden;
          transition: background .25s; cursor: default;
        }
        .lp-win-card:hover { background: rgba(196,30,58,0.03); }
        .lp-win-card:nth-child(3n) { border-right: none; }
        @media (max-width: 900px) {
          .lp-win-card:nth-child(3n) { border-right: 1px solid rgba(255,255,255,0.06); }
          .lp-win-card:nth-child(2n) { border-right: none; }
        }
        .lp-win-img-wrap {
          background: #0a0a08; overflow: hidden;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .lp-win-img {
          width: 100%; display: block;
          max-height: 220px; object-fit: contain; object-position: top;
        }
        .lp-win-body { padding: 24px 24px 28px; }
        .lp-win-stat {
          font-family: 'Playfair Display', serif !important;
          font-size: 22px; font-weight: 700; color: #f0ece4;
          letter-spacing: -.01em; margin-bottom: 8px; line-height: 1.2;
        }
        .lp-win-detail {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 12px; color: #4a4640; line-height: 1.7; margin-bottom: 12px;
        }
        .lp-win-name {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 9px; font-weight: 700; letter-spacing: .2em;
          text-transform: uppercase; color: #C41E3A;
        }

        /* ── Included grid ── */
        .lp-incl-grid {
          display: grid; grid-template-columns: repeat(2, 1fr);
          gap: 0; margin-top: 80px;
          border: 1px solid rgba(255,255,255,0.06);
        }
        @media (max-width: 640px) { .lp-incl-grid { grid-template-columns: 1fr; } }
        .lp-incl-card {
          padding: 36px 32px; display: flex; gap: 20px;
          border-right: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          transition: background .25s; cursor: default;
        }
        .lp-incl-card:hover { background: rgba(196,30,58,0.03); }
        .lp-incl-card:nth-child(2n) { border-right: none; }
        .lp-incl-icon {
          width: 32px; height: 32px; flex-shrink: 0;
          border: 1px solid rgba(196,30,58,0.2);
          display: flex; align-items: center; justify-content: center;
          color: #C41E3A; margin-top: 2px;
        }
        .lp-incl-title {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 13px; font-weight: 700; color: #e8e4dc;
          margin-bottom: 8px; letter-spacing: .02em;
        }
        .lp-incl-desc {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 13px; color: #4a4640; line-height: 1.7;
        }

        /* ── For/Not for ── */
        .lp-for-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
        @media (max-width: 640px) { .lp-for-grid { grid-template-columns: 1fr; } }
        .lp-for-col { padding: 52px 48px; }
        .lp-for-col.yes { border-right: 1px solid rgba(196,30,58,0.15); }
        .lp-for-col-head {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 9px; font-weight: 700; letter-spacing: .28em;
          text-transform: uppercase; margin-bottom: 32px;
        }
        .yes .lp-for-col-head { color: #C41E3A; }
        .no .lp-for-col-head { color: #3a3530; }
        .lp-for-items { display: flex; flex-direction: column; gap: 16px; }
        .lp-for-item {
          display: flex; gap: 16px; align-items: flex-start;
          font-family: 'DM Sans', sans-serif !important;
          font-size: 14px; line-height: 1.65;
        }
        .yes .lp-for-item { color: #8a8480; }
        .no .lp-for-item { color: #3a3530; }
        .lp-for-mark { flex-shrink: 0; font-size: 10px; font-weight: 700; margin-top: 4px; }
        .yes .lp-for-mark { color: #C41E3A; }
        .no .lp-for-mark { color: #2a2520; }

        /* ── Mid CTA ── */
        .lp-mid-cta-inner { text-align: center; padding: 80px 48px; }

        /* ── Final CTA ── */
        .lp-final { text-align: center; position: relative; }
        .lp-final-inner { padding: 120px 48px; }

        /* ── Footer ── */
        .lp-footer {
          border-top: 1px solid rgba(255,255,255,0.05);
          padding: 40px 48px;
          display: flex; flex-wrap: wrap;
          align-items: center; justify-content: space-between;
          gap: 16px; max-width: 1200px; margin: 0 auto;
        }
        .lp-footer-logo {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 10px; font-weight: 700; letter-spacing: .22em;
          text-transform: uppercase; color: #3a3530;
        }
        .lp-footer-logo span { color: #C41E3A; }
        .lp-footer-links { display: flex; gap: 24px; }
        .lp-footer-links a {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 11px; color: #2a2520; text-decoration: none;
          letter-spacing: .08em; transition: color .2s;
        }
        .lp-footer-links a:hover { color: #6b6560; }
        .lp-footer-copy {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 11px; color: #1f1c18;
        }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .lp-container { padding: 0 20px; }
          .lp-container-sm { padding: 0 20px; }
          .lp-section { padding: 80px 0; }
          .lp-nav { padding: 0 20px; }
          .lp-for-col { padding: 40px 20px; }
          .lp-footer { padding: 32px 20px; }
          .lp-final-inner { padding: 80px 20px; }
          .lp-mid-cta-inner { padding: 64px 20px; }
          .lp-hero-stats { grid-template-columns: repeat(2, 1fr); gap: 32px 0; }
        }
      `}</style>

      <div className="lp-root">

        {/* ── Nav ── */}
        <nav className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
          <a href="/landing-page" className="lp-nav-logo">
            Creator <span>Cult</span>
          </a>
          <Link href="/apply" className="lp-cta-sm">
            Apply <IconArrow />
          </Link>
        </nav>

        {/* ── Hero ── */}
        <div className="lp-hero">
          {/* Left */}
          <div className="lp-hero-left">
            <Fade>
              <div className="lp-hero-eyebrow">Instagram Growth Coaching</div>
            </Fade>
            <Fade delay={80}>
              <h1 className="lp-h1">
                You&apos;ve been<br />
                posting for<br />
                months.<br />
                <span className="lp-italic">Still clocking in.</span>
              </h1>
            </Fade>
            <Fade delay={160}>
              <p className="lp-body-lg" style={{ maxWidth: 500, marginTop: 32 }}>
                Creator Cult is the coaching programme that turns consistent creators into full-time personal brands.
                A real system. Not recycled advice.
              </p>
            </Fade>
            <Fade delay={240}>
              <div style={{ marginTop: 44, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                <Link href="/apply" className="lp-cta">
                  Apply for a Spot <IconArrow />
                </Link>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#3a3530', letterSpacing: '.06em' }}>
                  Applications reviewed personally.
                </span>
              </div>
            </Fade>
            <Fade delay={320}>
              <div className="lp-hero-stats">
                <div className="lp-stat">
                  <div className="lp-stat-n">40+</div>
                  <div className="lp-stat-l">Creators Enrolled</div>
                </div>
                <div className="lp-stat">
                  <div className="lp-stat-n">24M</div>
                  <div className="lp-stat-l">Views Generated</div>
                </div>
                <div className="lp-stat">
                  <div className="lp-stat-n">5K</div>
                  <div className="lp-stat-l">Followers in 10 Days</div>
                </div>
                <div className="lp-stat">
                  <div className="lp-stat-n">£1,950</div>
                  <div className="lp-stat-l">Revenue in 3 Days</div>
                </div>
              </div>
            </Fade>
          </div>
          {/* Right — photo */}
          <div className="lp-hero-photo-col">
            <img src="/will-gym.jpg" alt="Will Scott — Creator Cult" className="lp-hero-photo" />
            <div className="lp-hero-photo-overlay" />
          </div>
        </div>

        {/* ── Animated Results Ticker ── */}
        <div className="lp-ticker">
          <div className="lp-ticker-track">
            {[...tickerItems, ...tickerItems].map((s, i) => (
              <span key={i} className="lp-tick">
                <span className="lp-tick-sep" style={{ marginRight: 0 }}>◆&nbsp;&nbsp;</span>{s}
              </span>
            ))}
          </div>
        </div>

        {/* ── Social proof strip ── */}
        <div className="lp-social-strip">
          <div className="lp-container">
            <div className="lp-social-label">Members who have taken action</div>
            <div className="lp-social-names">
              {['Michael Kersee', 'Freddie', 'Eddie', 'Dino', 'Brett Capstick', 'Bile', 'Matte Fortuna', 'Jakub Riedel', 'Tom Köster', 'Roy', 'Gabrielle', 'Zack Sinclair', 'Asfand', 'Toshiro Khouth', 'FreeYourMind', 'Samuel'].map(n => (
                <span key={n} className="lp-social-name">{n}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="lp-hr" />

        {/* ── Pain ── */}
        <div className="lp-section">
          <div className="lp-container">
            <Fade>
              <span className="lp-pill">The Real Problem</span>
            </Fade>
            <Fade delay={60}>
              <h2 className="lp-h2">
                You don&apos;t have<br />a content problem.
              </h2>
              <p className="lp-body-lg" style={{ marginTop: 20, maxWidth: 520 }}>
                You have a system problem.
              </p>
            </Fade>
            <div style={{ marginTop: 64 }}>
              {[
                {
                  n: 'I',
                  title: 'You post. Nothing moves.',
                  body: "You try a new format. You copy what worked for someone else. You wait. The numbers don't shift. You wonder if Instagram has it in for you.",
                },
                {
                  n: 'II',
                  title: 'Everyone sells you tactics. Nobody gives you a system.',
                  body: "You've watched the free courses. You've applied the hooks. You can name every algorithm update this year. Still no clients. Still no income.",
                },
                {
                  n: 'III',
                  title: 'The gap between content and income feels impossible.',
                  body: "You're close enough to see that other creators are making it work. You can't work out what they have that you don't. The answer isn't hustle. It's structure.",
                },
              ].map(({ n, title, body }, i) => (
                <Fade key={n} delay={i * 80}>
                  <div className="lp-pain-item">
                    <div className="lp-pain-num">{n}</div>
                    <div>
                      <div className="lp-pain-title">{title}</div>
                      <div className="lp-pain-body">{body}</div>
                    </div>
                  </div>
                </Fade>
              ))}
            </div>
          </div>
        </div>

        <div className="lp-hr" />

        {/* ── Story ── */}
        <div className="lp-section">
          <div className="lp-container">
            <div className="lp-story-grid">
              <div>
                <Fade>
                  <span className="lp-pill">The Origin</span>
                </Fade>
                <Fade delay={60}>
                  <h2 className="lp-h2">
                    412 followers.<br />
                    £20,000 in debt.<br />
                    <span className="lp-italic">Delivering pizzas in the evenings.</span>
                  </h2>
                </Fade>
                <Fade delay={120}>
                  <div className="lp-story-text" style={{ marginTop: 40 }}>
                    <p>That was me. Not long ago. I was posting every day and getting nowhere. I knew content. I knew marketing theory. I still couldn&apos;t pay my rent with it.</p>
                    <p>I stopped copying tactics and started building a system. A real one. Positioning, story, offer, acquisition. In the right order.</p>
                    <p>Within months, I had clients. Then a waiting list. Then a coaching programme with 40+ creators inside.</p>
                    <p><strong>I didn&apos;t get lucky. I got structured.</strong></p>
                    <p>Creator Cult is the system I wish I&apos;d had in year one. Every phase, every tool, every coaching call. Built to shortcut the years I wasted figuring it out alone.</p>
                  </div>
                </Fade>
              </div>
              <Fade delay={100} className="lp-story-photo-col">
                <img src="/will-hero.jpg" alt="Will Scott" className="lp-story-photo" />
                <div className="lp-story-caption">Will Scott — Founder, Creator Cult</div>
              </Fade>
            </div>
          </div>
        </div>

        <div className="lp-hr" />

        {/* ── The Programme ── */}
        <div className="lp-section">
          <div className="lp-container">
            <Fade>
              <span className="lp-pill">The Programme</span>
            </Fade>
            <Fade delay={60}>
              <h2 className="lp-h2">
                Five phases.<br />One direction.
              </h2>
              <p className="lp-body-lg" style={{ marginTop: 20, maxWidth: 520 }}>
                Full-time creator.
              </p>
            </Fade>
          </div>
          <div className="lp-container">
            <div className="lp-phase-grid">
              {phases.map(({ n, title, desc, items }, i) => (
                <Fade key={n} delay={i * 60}>
                  <div className={`lp-phase-card${n === '—' ? ' lp-phase-support' : ''}`}>
                    <div className="lp-phase-n">{n === '—' ? 'Throughout' : `Phase ${n}`}</div>
                    <div className="lp-phase-title">{title}</div>
                    <div className="lp-phase-desc">{desc}</div>
                    <div className="lp-phase-items">
                      {items.map(item => (
                        <div key={item} className="lp-phase-item">
                          <span className="lp-phase-dash">—</span>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </Fade>
              ))}
            </div>
          </div>
        </div>

        <div className="lp-hr" />

        {/* ── Cult Dashboard ── */}
        <div className="lp-section">
          <div className="lp-container">
            <Fade>
              <span className="lp-pill">Exclusive to Creator Cult</span>
            </Fade>
            <Fade delay={60}>
              <h2 className="lp-h2">The Cult Dashboard.</h2>
              <p className="lp-body-lg" style={{ marginTop: 20, maxWidth: 560 }}>
                Every client gets access to a private dashboard built specifically for Creator Cult members.
                AI tools trained on our methodology. Not generic. Purpose-built for your business.
              </p>
            </Fade>

            <Fade delay={80}>
              <div className="lp-dash-mockup">
                <div className="lp-dash-bar">
                  <div className="lp-dash-dot" />
                  <div className="lp-dash-dot" />
                  <div className="lp-dash-dot" />
                  <div className="lp-dash-url">
                    <div className="lp-dash-url-dot" />
                    cult-dashboard.vercel.app/dashboard
                  </div>
                </div>
                <div className="lp-dash-cards">
                  {[
                    { label: 'AI Story Generator', status: 'Generating slide 3 of 7...', color: '#C41E3A', bar: 43 },
                    { label: 'Lead Magnet Generator', status: '3 ideas ready to review', color: '#6b6560', bar: 100 },
                    { label: 'Profile Audit', status: 'Report complete', color: '#6b6560', bar: 100 },
                  ].map(({ label, status, color, bar }) => (
                    <div key={label} className="lp-dash-card">
                      <div className="lp-dash-card-label" style={{ color }}>{label}</div>
                      <div className="lp-dash-card-status">{status}</div>
                      <div className="lp-dash-track">
                        <div className="lp-dash-fill" style={{ width: `${bar}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Fade>

            <div className="lp-tool-grid">
              {tools.map((t, i) => (
                <Fade key={t.title} delay={i * 50}>
                  <div className="lp-tool-card">
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                      <div className="lp-tool-icon-wrap">{t.icon}</div>
                      {t.badge && <span className="lp-tool-badge">{t.badge}</span>}
                    </div>
                    <div className="lp-tool-title">{t.title}</div>
                    <div className="lp-tool-desc">{t.desc}</div>
                  </div>
                </Fade>
              ))}
            </div>
          </div>
        </div>

        <div className="lp-hr" />

        {/* ── Results — Marquee ── */}
        <div className="lp-section">
          <div className="lp-container">
            <Fade>
              <span className="lp-pill">The Results</span>
            </Fade>
            <Fade delay={60}>
              <h2 className="lp-h2">
                What happens when you have<br /><span className="lp-italic">a system instead of a strategy.</span>
              </h2>
            </Fade>
          </div>

          <div style={{ marginTop: 64, borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {/* Row 1 — scrolls left */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="lp-marquee-wrap">
                <div className="lp-marquee-track-l">
                  {[...marqueeRow1, ...marqueeRow1].map((item, i) => (
                    <div key={i} className="lp-mq-item">
                      <span className="lp-mq-name">{item.name}</span>
                      <span className="lp-mq-dot">◆</span>
                      <span className="lp-mq-result">{item.result}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Row 2 — scrolls right */}
            <div>
              <div className="lp-marquee-wrap">
                <div className="lp-marquee-track-r">
                  {[...marqueeRow2, ...marqueeRow2].map((item, i) => (
                    <div key={i} className="lp-mq-item">
                      <span className="lp-mq-name">{item.name}</span>
                      <span className="lp-mq-dot">◆</span>
                      <span className="lp-mq-result">{item.result}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Screenshot results grid */}
          <div className="lp-container">
            <div className="lp-win-grid">
              {[
                { name: 'FREDDIE', stat: '£1,950 in 3 days', detail: 'No offer, no clients when he joined. Built and launched his first high-ticket package using Phase 3. £1,950 in three days.', img: 'https://assets-v2.circle.so/vjrs5iivuayf1j9x5te9q9u8f3bt' },
                { name: 'EDDIE', stat: '5,000 followers in 10 days', detail: 'Reworked his positioning and hooks using Phase 2. Two reels went viral. 5,000 new followers in 10 days.', img: 'https://assets-v2.circle.so/li0b9tx3pl289tyzwa4c1vhus6jb' },
                { name: 'DINO', stat: '24 million views in 3 weeks', detail: 'Changed his username, applied the content frameworks, and hit 24 million views three weeks after joining.', img: 'https://assets-v2.circle.so/7di4sesakx0atgazfw0wdz0ult0i' },
                { name: 'MICHAEL KERSEE', stat: '$10K day', detail: 'Two $5K pay-in-fulls before noon. From inconsistent income to $10,000 in a single day.', img: 'https://assets-v2.circle.so/w5tlngk8d5r1q5dpt0bmjtq5zzxl' },
                { name: 'TOM', stat: '6K followers in 2 months', detail: 'First paying clients landed while growing to 6,000 followers. His words: "shits bout to get crazy."', img: 'https://assets-v2.circle.so/oovd23m42ybtzncmcuomqyiabjm7' },
                { name: 'ROY', stat: '1M views — first viral reel', detail: 'First reel to break 1 million views after 25 days of consistent posting. Hit 1K followers within 2 months.', img: 'https://assets-v2.circle.so/0z7iywo1kuov1nlanetscbuw6o8p' },
                { name: 'BRETT CAPSTICK', stat: 'First client in 3 weeks', detail: '18 months of posting with zero clients. Rebuilt his positioning from scratch. Signed his first high-ticket client three weeks later.' },
                { name: 'ASFAND', stat: 'First client in 7 days', detail: 'Used the DM acquisition system from Phase 3. First paid client within a week of implementing. Launched his Instagram the Monday before.' },
              ].map(({ name, stat, detail, img }, i) => (
                <Fade key={name} delay={(i % 3) * 70}>
                  <div className="lp-win-card">
                    {img && (
                      <div className="lp-win-img-wrap">
                        <img src={img} alt={`${name} result`} className="lp-win-img" loading="lazy" />
                      </div>
                    )}
                    <div className="lp-win-body">
                      <div className="lp-win-stat">{stat}</div>
                      <div className="lp-win-detail">{detail}</div>
                      <div className="lp-win-name">{name}</div>
                    </div>
                  </div>
                </Fade>
              ))}
            </div>
            <Fade delay={80}>
              <p style={{ textAlign: 'center', fontSize: 11, color: '#2a2520', marginTop: 32, fontFamily: "'DM Sans', sans-serif", letterSpacing: '.08em' }}>
                Results vary. These are real outcomes from real Creator Cult members.
              </p>
            </Fade>
          </div>
        </div>

        <div className="lp-hr" />

        {/* ── What's Included ── */}
        <div className="lp-section" style={{ background: 'rgba(255,255,255,0.008)' }}>
          <div className="lp-container">
            <Fade>
              <span className="lp-pill">What You Get</span>
            </Fade>
            <Fade delay={60}>
              <h2 className="lp-h2">Everything in one place.</h2>
            </Fade>
          </div>
          <div className="lp-container">
            <div className="lp-incl-grid">
              {included.map(({ icon, title, desc }, i) => (
                <Fade key={title} delay={(i % 2) * 70}>
                  <div className="lp-incl-card">
                    <div className="lp-incl-icon">{icon}</div>
                    <div>
                      <div className="lp-incl-title">{title}</div>
                      <div className="lp-incl-desc">{desc}</div>
                    </div>
                  </div>
                </Fade>
              ))}
            </div>
          </div>
        </div>

        <div className="lp-hr" />

        {/* ── For / Not For ── */}
        <div className="lp-section">
          <div className="lp-container">
            <Fade>
              <h2 className="lp-h2" style={{ marginBottom: 64 }}>
                This is for you.<br />
                <span className="lp-italic" style={{ color: '#3a3530' }}>This is not for everyone.</span>
              </h2>
            </Fade>
          </div>
          <div className="lp-container">
            <div style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="lp-for-grid">
                <Fade delay={0}>
                  <div className="lp-for-col yes">
                    <div className="lp-for-col-head">Creator Cult is for you if</div>
                    <div className="lp-for-items">
                      {[
                        "You've been posting consistently but you're not seeing income",
                        "You know content but you don't have a business system around it",
                        "You want to be full-time as a creator within 12 months",
                        "You're willing to put in the work and follow a proven process",
                        "You want support, not just another course to watch alone",
                        "You're ready to treat your content like a business, not a hobby",
                      ].map(s => (
                        <div key={s} className="lp-for-item">
                          <span className="lp-for-mark">—</span>{s}
                        </div>
                      ))}
                    </div>
                  </div>
                </Fade>
                <Fade delay={100}>
                  <div className="lp-for-col no">
                    <div className="lp-for-col-head">Not the right fit if</div>
                    <div className="lp-for-items">
                      {[
                        "You're expecting overnight results without putting in real effort",
                        "You're not willing to invest in your own growth",
                        "You want a magic content formula. This is a business system.",
                        "You're not able to commit time each week to implement",
                        "You just started posting and haven't tested what works yet",
                        "You're looking for someone to do it all for you",
                      ].map(s => (
                        <div key={s} className="lp-for-item">
                          <span className="lp-for-mark">×</span>{s}
                        </div>
                      ))}
                    </div>
                  </div>
                </Fade>
              </div>
            </div>
          </div>
        </div>

        <div className="lp-hr" />

        {/* ── Mid CTA ── */}
        <div>
          <div className="lp-mid-cta-inner">
            <Fade>
              <span className="lp-pill">Apply</span>
              <h2 className="lp-h2" style={{ marginBottom: 20 }}>
                Ready to stop figuring<br /><span className="lp-italic">it out alone?</span>
              </h2>
              <p className="lp-body-lg" style={{ marginBottom: 40 }}>
                Applications take 3 minutes. No commitment to apply.<br />Will reviews every one personally.
              </p>
              <Link href="/apply" className="lp-cta">
                Apply for a Spot <IconArrow />
              </Link>
            </Fade>
          </div>
        </div>

        <div className="lp-hr" />

        {/* ── FAQ ── */}
        <div className="lp-section">
          <div className="lp-container-sm">
            <Fade>
              <span className="lp-pill">FAQ</span>
            </Fade>
            <Fade delay={60}>
              <h2 className="lp-h2" style={{ marginBottom: 64 }}>Common questions.</h2>
            </Fade>
            <Fade delay={100}>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <Faq q="What exactly do I get when I join Creator Cult?" a="You get access to the full 5-phase curriculum, weekly live group coaching calls with recordings, 1:1 access to Will between calls, content and offer reviews, the Cult Dashboard with all six AI tools, and the private Circle community. Ongoing support at every stage." />
                <Faq q="How long does the programme run?" a="Creator Cult is an ongoing coaching programme. Most clients see their first real results within 30 to 60 days of starting. There is no set end date. You stay in as long as you are growing." />
                <Faq q="Do I need a big following to join?" a="No. Several of our members signed their first clients with under 1,000 followers. Following size does not determine your results. Your system does. We build the system first." />
                <Faq q="How much time do I need to commit each week?" a="Expect to block 5 to 8 hours per week: content creation, implementation, and the weekly coaching call. Less than that and progress slows. You do not need more than that to see results." />
                <Faq q="Is this just another course?" a="No. The curriculum is part of it, but Creator Cult is a coaching programme. You have live weekly calls, 1:1 access to Will, a community of active creators, and the Cult Dashboard AI tools. The course is the structure. The coaching is where you actually move forward." />
                <Faq q="How does the weekly group coaching work?" a="Every week we host live group coaching calls where you bring your content and business challenges. You get real-time feedback on your brand strategy, content audits, offer positioning, and scaling decisions. Can't make it live? You get access to all past recordings too." />
                <Faq q="What if I've tried coaching before and it didn't work?" a="That is worth talking about in your application. A lot of creators who come to Creator Cult have been through generic social media courses or coaching that gave them tactics without a system. If your previous experience did not work, tell us why in your application. Will reads every one." />
                <Faq q="Who is this NOT for?" a="This isn't for people looking for quick fixes, those hoping someone else will do the work, anyone not willing to show up and implement, or creators allergic to accountability and feedback. You need to be ready to invest 6 months into building something real." />
              </div>
            </Fade>
          </div>
        </div>

        <div className="lp-hr" />

        {/* ── Final CTA ── */}
        <div className="lp-final">
          <div className="lp-final-inner">
            <Fade>
              <span className="lp-pill">One last thing</span>
              <h2 className="lp-h2" style={{ marginBottom: 24 }}>
                Stop posting into<br /><span className="lp-italic">the void.</span>
              </h2>
              <p className="lp-body-lg" style={{ marginBottom: 48, maxWidth: 520, margin: '0 auto 48px' }}>
                You&apos;re three minutes away from finding out if Creator Cult is the right fit.
                Apply now. No commitment. No sales call unless you want one.
              </p>
              <Link href="/apply" className="lp-cta">
                Apply for a Spot <IconArrow />
              </Link>
              <div style={{ marginTop: 36, display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
                {['Takes 3 minutes', 'Reviewed personally by Will', 'No commitment to apply'].map(c => (
                  <span key={c} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#2a2520', letterSpacing: '.1em' }}>
                    — {c}
                  </span>
                ))}
              </div>
            </Fade>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="lp-footer">
          <div className="lp-footer-logo"><span>Creator</span> Cult</div>
          <div className="lp-footer-links">
            <a href="/privacy">Privacy</a>
            <a href="/data-deletion">Data Deletion</a>
            <Link href="/apply">Apply</Link>
          </div>
          <div className="lp-footer-copy">© {new Date().getFullYear()} Creator Cult</div>
        </div>

      </div>
    </>
  )
}
