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
      { threshold: 0.1 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return { ref, on }
}

function Fade({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, on } = useReveal()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: on ? 1 : 0,
        transform: on ? 'none' : 'translateY(24px)',
        transition: `opacity .65s ease ${delay}ms, transform .65s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

/* ─── FAQ item ──────────────────────────────────────────────────────── */
function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="lp-faq-item">
      <button className="lp-faq-q" onClick={() => setOpen(!open)}>
        <span>{q}</span>
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .25s', display: 'inline-block', marginLeft: 16, flexShrink: 0 }}>▾</span>
      </button>
      {open && <div className="lp-faq-a">{a}</div>}
    </div>
  )
}

/* ─── Win card ──────────────────────────────────────────────────────── */
function Win({ name, stat, detail, img, delay = 0 }: { name: string; stat: string; detail: string; img?: string; delay?: number }) {
  const { ref, on } = useReveal()
  return (
    <div
      ref={ref}
      className="lp-win-card"
      style={{ opacity: on ? 1 : 0, transform: on ? 'none' : 'translateY(20px)', transition: `opacity .55s ease ${delay}ms, transform .55s ease ${delay}ms` }}
    >
      <div className="lp-win-stat">{stat}</div>
      <p className="lp-win-detail">{detail}</p>
      {img && (
        <img
          src={img}
          alt={`${name} result screenshot`}
          className="lp-win-img"
          loading="lazy"
        />
      )}
      <div className="lp-win-name">{name}</div>
    </div>
  )
}

/* ─── Phase card ────────────────────────────────────────────────────── */
function Phase({ num, title, desc, items, delay = 0 }: { num: string; title: string; desc: string; items: string[]; delay?: number }) {
  const { ref, on } = useReveal()
  return (
    <div
      ref={ref}
      className="lp-phase-card"
      style={{ opacity: on ? 1 : 0, transform: on ? 'none' : 'translateY(20px)', transition: `opacity .6s ease ${delay}ms, transform .6s ease ${delay}ms` }}
    >
      <div className="lp-phase-num">Phase {num}</div>
      <h3 className="lp-phase-title">{title}</h3>
      <p className="lp-phase-desc">{desc}</p>
      <ul className="lp-phase-list">
        {items.map(i => (
          <li key={i} className="lp-phase-item">
            <span className="lp-check">✓</span>{i}
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ─── Tool card ─────────────────────────────────────────────────────── */
function Tool({ icon, title, desc, badge }: { icon: string; title: string; desc: string; badge?: string }) {
  return (
    <div className="lp-tool-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="lp-tool-icon">{icon}</div>
        {badge && <span className="lp-tool-badge">{badge}</span>}
      </div>
      <div className="lp-tool-title">{title}</div>
      <p className="lp-tool-desc">{desc}</p>
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

  return (
    <>
      <style>{`
        /* ── Reset scoped to landing page ── */
        .lp-root { all: initial; display: block; }
        .lp-root *, .lp-root *::before, .lp-root *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        .lp-root {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 16px;
          font-weight: 400;
          line-height: 1.6;
          color: #ffffff;
          background: #000000;
          min-height: 100vh;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        /* ── Nav ── */
        .lp-nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 50;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          max-width: 100%;
          transition: background .3s, border-color .3s;
        }
        .lp-nav.scrolled {
          background: rgba(0,0,0,0.9);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .lp-nav-logo { font-size: 17px; font-weight: 800; letter-spacing: -.02em; text-decoration: none; }
        .lp-nav-logo span:first-child { color: #3b82f6; }
        .lp-nav-logo span:last-child { color: #ffffff; }
        .lp-nav-cta {
          display: flex; align-items: center; gap: 8px;
          background: #3b82f6; color: #fff;
          font-size: 14px; font-weight: 700;
          padding: 10px 20px; border-radius: 12px;
          text-decoration: none;
          transition: background .2s;
        }
        .lp-nav-cta:hover { background: #2563eb; }

        /* ── Container ── */
        .lp-container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 24px;
          width: 100%;
        }

        /* ── Section spacing ── */
        .lp-section { padding: 112px 0; }
        .lp-section-sm { padding: 64px 0; }

        /* ── Hero ── */
        .lp-hero {
          padding: 160px 24px 112px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .lp-hero-glow {
          position: absolute;
          top: 0; left: 50%;
          transform: translateX(-50%);
          width: 800px; height: 500px;
          background: radial-gradient(ellipse at top, rgba(59,130,246,0.14) 0%, transparent 70%);
          pointer-events: none;
        }
        .lp-hero-inner {
          position: relative;
          max-width: 800px;
          margin: 0 auto;
        }
        .lp-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #3b82f6;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
          border: 1px solid rgba(59,130,246,0.25);
          background: rgba(59,130,246,0.08);
          padding: 8px 16px;
          border-radius: 999px;
          margin-bottom: 32px;
        }
        .lp-h1 {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
          font-size: clamp(40px, 7vw, 72px);
          font-weight: 900;
          line-height: 1.05;
          letter-spacing: -.03em;
          color: #ffffff;
          margin-bottom: 28px;
        }
        .lp-h1 .blue { color: #3b82f6; }
        .lp-hero-sub {
          font-size: clamp(17px, 2.5vw, 21px);
          color: #a0a0a0;
          max-width: 560px;
          margin: 0 auto 40px;
          line-height: 1.6;
        }
        .lp-cta-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .lp-cta-primary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #3b82f6;
          color: #fff;
          font-size: 18px;
          font-weight: 800;
          padding: 18px 36px;
          border-radius: 16px;
          text-decoration: none;
          transition: background .2s, box-shadow .2s, transform .2s;
        }
        .lp-cta-primary:hover {
          background: #2563eb;
          box-shadow: 0 0 40px rgba(59,130,246,0.4);
          transform: scale(1.02);
        }
        .lp-cta-note { font-size: 13px; color: #555; }

        /* ── Stats bar ── */
        .lp-stats {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 48px;
          margin-top: 64px;
        }
        .lp-stat-n {
          font-size: 36px;
          font-weight: 900;
          color: #fff;
          letter-spacing: -.02em;
        }
        .lp-stat-l { font-size: 13px; color: #555; margin-top: 4px; }

        /* ── Ticker ── */
        .lp-ticker {
          border-top: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 20px 24px;
        }
        .lp-ticker-inner {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px 32px;
        }
        .lp-tick {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #555;
          white-space: nowrap;
        }
        .lp-tick-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #3b82f6;
          flex-shrink: 0;
        }

        /* ── Section headings ── */
        .lp-overline {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: #3b82f6;
          margin-bottom: 20px;
        }
        .lp-h2 {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
          font-size: clamp(32px, 5vw, 52px);
          font-weight: 900;
          line-height: 1.08;
          letter-spacing: -.03em;
          color: #ffffff;
          margin-bottom: 20px;
        }
        .lp-h2 .gray { color: #666; }
        .lp-h2 .blue { color: #3b82f6; }
        .lp-section-intro {
          font-size: 18px;
          color: #888;
          max-width: 600px;
          line-height: 1.7;
        }
        .lp-center { text-align: center; }
        .lp-center .lp-section-intro { margin: 0 auto; }

        /* ── Pain cards ── */
        .lp-pain-stack { display: flex; flex-direction: column; gap: 16px; margin-top: 48px; }
        .lp-pain-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 28px 32px;
          transition: border-color .3s;
        }
        .lp-pain-card:hover { border-color: rgba(59,130,246,0.2); }
        .lp-pain-title { font-size: 19px; font-weight: 800; color: #fff; margin-bottom: 12px; }
        .lp-pain-body { font-size: 15px; color: #888; line-height: 1.7; }

        /* ── Story section ── */
        /* ── Will's story layout ── */
        .lp-story-layout {
          display: grid;
          grid-template-columns: 1fr 420px;
          gap: 80px;
          align-items: start;
        }
        @media (max-width: 860px) {
          .lp-story-layout { grid-template-columns: 1fr; gap: 48px; }
          .lp-story-photo-wrap { order: -1; }
        }
        .lp-story-photo-wrap {
          position: sticky;
          top: 90px;
        }
        .lp-story-photo {
          width: 100%;
          border-radius: 20px;
          object-fit: cover;
          aspect-ratio: 3/4;
          object-position: top;
          border: 1px solid rgba(255,255,255,0.08);
          display: block;
        }
        .lp-story-photo-caption {
          text-align: center;
          font-size: 12px;
          color: #444;
          margin-top: 12px;
        }

        .lp-story-border {
          border-top: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          position: relative;
        }
        .lp-story-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 60% 40% at 50% 50%, rgba(59,130,246,0.06) 0%, transparent 70%);
          pointer-events: none;
        }
        .lp-story-inner { position: relative; max-width: 700px; }
        .lp-story-text { font-size: 18px; color: #aaa; line-height: 1.8; }
        .lp-story-text p { margin-bottom: 20px; }
        .lp-story-text p:last-child { margin-bottom: 0; }
        .lp-story-text strong { color: #fff; font-weight: 700; }

        /* ── Phase grid ── */
        .lp-phase-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 64px;
        }
        @media (max-width: 900px) { .lp-phase-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 580px) { .lp-phase-grid { grid-template-columns: 1fr; } }
        .lp-phase-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 28px;
          transition: border-color .3s, background .3s;
        }
        .lp-phase-card:hover { border-color: rgba(59,130,246,0.2); background: rgba(255,255,255,0.04); }
        .lp-phase-num { font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: rgba(59,130,246,0.5); margin-bottom: 14px; }
        .lp-phase-title { font-family: 'Inter', -apple-system, sans-serif !important; font-size: 19px; font-weight: 800; color: #fff; margin-bottom: 10px; }
        .lp-phase-desc { font-size: 14px; color: #777; line-height: 1.6; margin-bottom: 20px; }
        .lp-phase-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
        .lp-phase-item { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: #ccc; line-height: 1.5; }
        .lp-check { color: #3b82f6; flex-shrink: 0; font-weight: 700; margin-top: 1px; }
        .lp-phase-card.lp-support {
          background: rgba(59,130,246,0.08);
          border-color: rgba(59,130,246,0.2);
        }
        .lp-phase-card.lp-support .lp-phase-desc { color: rgba(147,197,253,0.7); }
        .lp-phase-card.lp-support .lp-phase-item { color: rgba(147,197,253,0.85); }
        .lp-phase-card.lp-support .lp-check { color: #60a5fa; }

        /* ── Dashboard section ── */
        .lp-dash-bg {
          position: relative;
          border-top: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          overflow: hidden;
        }
        .lp-dash-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 80% 60% at 50% 50%, rgba(59,130,246,0.06) 0%, transparent 70%);
          pointer-events: none;
        }
        .lp-dash-mockup {
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          overflow: hidden;
          margin: 56px 0 56px;
          background: rgba(255,255,255,0.02);
        }
        .lp-dash-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.02);
        }
        .lp-dash-dot { width: 12px; height: 12px; border-radius: 50%; background: rgba(255,255,255,0.1); }
        .lp-dash-url {
          flex: 1;
          background: rgba(255,255,255,0.04);
          border-radius: 8px;
          padding: 5px 12px;
          font-size: 12px;
          color: #555;
          margin: 0 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .lp-dash-url-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(59,130,246,0.5); flex-shrink: 0; }
        .lp-dash-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          padding: 28px;
        }
        @media (max-width: 700px) { .lp-dash-cards { grid-template-columns: 1fr; } }
        .lp-dash-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 20px;
        }
        .lp-dash-card-label { font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 8px; }
        .lp-dash-card-status { font-size: 13px; color: #fff; margin-bottom: 16px; }
        .lp-dash-bar-track { height: 4px; background: rgba(255,255,255,0.06); border-radius: 99px; overflow: hidden; }
        .lp-dash-bar-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, #3b82f6, #60a5fa); }

        /* ── Tool grid ── */
        .lp-tool-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 900px) { .lp-tool-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 580px) { .lp-tool-grid { grid-template-columns: 1fr; } }
        .lp-tool-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 24px;
          transition: border-color .3s, background .3s;
        }
        .lp-tool-card:hover { border-color: rgba(59,130,246,0.25); background: rgba(255,255,255,0.04); }
        .lp-tool-icon {
          width: 40px; height: 40px;
          border-radius: 12px;
          background: rgba(59,130,246,0.1);
          border: 1px solid rgba(59,130,246,0.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
        }
        .lp-tool-badge {
          font-size: 11px; font-weight: 700;
          color: #3b82f6;
          background: rgba(59,130,246,0.1);
          border: 1px solid rgba(59,130,246,0.2);
          padding: 4px 10px;
          border-radius: 99px;
        }
        .lp-tool-title { font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 8px; }
        .lp-tool-desc { font-size: 13px; color: #777; line-height: 1.65; }

        /* ── Win grid ── */
        .lp-win-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 64px;
        }
        @media (max-width: 900px) { .lp-win-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 580px) { .lp-win-grid { grid-template-columns: 1fr; } }
        .lp-win-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: border-color .3s, background .3s;
        }
        .lp-win-card:hover { border-color: rgba(59,130,246,0.25); background: rgba(255,255,255,0.04); }
        .lp-win-stat { font-size: 28px; font-weight: 900; color: #3b82f6; letter-spacing: -.02em; }
        .lp-win-detail { font-size: 14px; color: #888; line-height: 1.65; flex: 1; }
        .lp-win-img {
          width: 100%;
          border-radius: 10px;
          object-fit: cover;
          border: 1px solid rgba(255,255,255,0.07);
          margin-top: 4px;
        }
        .lp-win-name { font-size: 12px; color: #444; font-weight: 600; margin-top: 4px; }

        /* ── Included grid ── */
        .lp-included-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-top: 64px;
        }
        @media (max-width: 640px) { .lp-included-grid { grid-template-columns: 1fr; } }
        .lp-included-card {
          display: flex;
          gap: 20px;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 24px;
          transition: border-color .3s;
        }
        .lp-included-card:hover { border-color: rgba(59,130,246,0.2); }
        .lp-included-icon {
          font-size: 22px;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .lp-included-title { font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 6px; }
        .lp-included-desc { font-size: 14px; color: #777; line-height: 1.65; }

        /* ── For / Not for ── */
        .lp-for-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 640px) { .lp-for-grid { grid-template-columns: 1fr; } }
        .lp-for-card {
          border-radius: 20px;
          padding: 32px;
        }
        .lp-for-card.yes {
          background: rgba(59,130,246,0.07);
          border: 1px solid rgba(59,130,246,0.2);
        }
        .lp-for-card.no {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.07);
        }
        .lp-for-head {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 24px;
        }
        .lp-for-head-text { font-size: 17px; font-weight: 800; }
        .lp-for-card.yes .lp-for-head-text { color: #93c5fd; }
        .lp-for-card.no .lp-for-head-text { color: #666; }
        .lp-for-list { display: flex; flex-direction: column; gap: 14px; }
        .lp-for-item { display: flex; align-items: flex-start; gap: 12px; font-size: 14px; line-height: 1.6; }
        .lp-for-card.yes .lp-for-item { color: rgba(147,197,253,0.85); }
        .lp-for-card.no .lp-for-item { color: #555; }
        .lp-for-icon { flex-shrink: 0; font-weight: 700; margin-top: 2px; }
        .lp-for-card.yes .lp-for-icon { color: #60a5fa; }
        .lp-for-card.no .lp-for-icon { color: #444; }

        /* ── Mid CTA ── */
        .lp-mid-cta {
          border-top: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .lp-mid-cta-inner { max-width: 580px; margin: 0 auto; text-align: center; }
        .lp-mid-cta-h { font-family: 'Inter', -apple-system, sans-serif !important; font-size: 32px; font-weight: 900; color: #fff; margin-bottom: 16px; letter-spacing: -.02em; }
        .lp-mid-cta-sub { font-size: 16px; color: #666; margin-bottom: 32px; }

        /* ── FAQ ── */
        .lp-faq-stack { display: flex; flex-direction: column; gap: 8px; margin-top: 56px; }
        .lp-faq-item {
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          overflow: hidden;
        }
        .lp-faq-q {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          text-align: left;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 15px;
          font-weight: 700;
          color: #fff;
          font-family: 'Inter', -apple-system, sans-serif;
          transition: background .2s;
        }
        .lp-faq-q:hover { background: rgba(255,255,255,0.03); }
        .lp-faq-a {
          padding: 0 24px 20px;
          font-size: 14px;
          color: #888;
          line-height: 1.7;
          border-top: 1px solid rgba(255,255,255,0.06);
          padding-top: 16px;
        }

        /* ── Final CTA ── */
        .lp-final {
          position: relative;
          overflow: hidden;
          text-align: center;
        }
        .lp-final-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 80% 60% at 50% 50%, rgba(59,130,246,0.10) 0%, transparent 70%);
          pointer-events: none;
        }
        .lp-final-inner { position: relative; max-width: 680px; margin: 0 auto; }
        .lp-final-h { font-family: 'Inter', -apple-system, sans-serif !important; font-size: clamp(40px, 6vw, 64px); font-weight: 900; line-height: 1.05; letter-spacing: -.03em; color: #fff; margin-bottom: 20px; }
        .lp-final-h .blue { color: #3b82f6; }
        .lp-final-sub { font-size: 18px; color: #888; margin-bottom: 40px; line-height: 1.65; }
        .lp-cta-chips {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 20px;
          margin-top: 28px;
        }
        .lp-chip { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #555; }
        .lp-chip-check { color: #3b82f6; font-weight: 700; }

        /* ── Footer ── */
        .lp-footer {
          border-top: 1px solid rgba(255,255,255,0.06);
          padding: 36px 24px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .lp-footer-logo { font-size: 15px; font-weight: 800; }
        .lp-footer-logo span:first-child { color: rgba(59,130,246,0.6); }
        .lp-footer-logo span:last-child { color: rgba(255,255,255,0.4); }
        .lp-footer-links { display: flex; gap: 24px; }
        .lp-footer-links a { font-size: 13px; color: #444; text-decoration: none; transition: color .2s; }
        .lp-footer-links a:hover { color: #888; }
        .lp-footer-copy { font-size: 13px; color: #333; }
      `}</style>

      <div className="lp-root">
        {/* Nav */}
        <nav className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
          <a href="/landing-page" className="lp-nav-logo">
            <span>CREATOR</span><span> CULT</span>
          </a>
          <Link href="/apply" className="lp-nav-cta">
            Apply Now →
          </Link>
        </nav>

        {/* Hero */}
        <div className="lp-hero">
          <div className="lp-hero-glow" />
          <div className="lp-hero-inner">
            <Fade>
              <div className="lp-badge">✦ Instagram Growth Coaching</div>
            </Fade>
            <Fade delay={80}>
              <h1 className="lp-h1">
                You&apos;ve been posting<br />for months.<br />
                <span className="blue">You&apos;re still clocking in.</span>
              </h1>
            </Fade>
            <Fade delay={160}>
              <p className="lp-hero-sub">
                Creator Cult is the coaching programme that turns consistent creators into full-time personal brands.
                A real system. Not recycled advice.
              </p>
            </Fade>
            <Fade delay={240}>
              <div className="lp-cta-wrap">
                <Link href="/apply" className="lp-cta-primary">
                  Apply for a Spot →
                </Link>
                <p className="lp-cta-note">Applications reviewed manually. No commitment to apply.</p>
              </div>
            </Fade>
            <Fade delay={320}>
              <div className="lp-stats">
                {[
                  { n: '40+', l: 'Creators Enrolled' },
                  { n: '24M', l: 'Views Generated' },
                  { n: '5K', l: 'Followers in 10 Days' },
                  { n: '£1,950', l: 'Revenue in 3 Days' },
                ].map(({ n, l }) => (
                  <div key={l} style={{ textAlign: 'center' }}>
                    <div className="lp-stat-n">{n}</div>
                    <div className="lp-stat-l">{l}</div>
                  </div>
                ))}
              </div>
            </Fade>
          </div>
        </div>

        {/* Ticker */}
        <div className="lp-ticker">
          <div className="lp-ticker-inner">
            {[
              'Freddie: £1,950 in 3 days',
              'Eddie: 5K followers in 10 days',
              'Dino: 24M views in 3 weeks',
              'Brett: first client in 3 weeks',
              'Asfand: first client in 7 days',
              'Michael: $10K month',
              'Tom: monetised within 30 days',
              'Roy: 6K followers in 6 weeks',
            ].map(s => (
              <span key={s} className="lp-tick">
                <span className="lp-tick-dot" />{s}
              </span>
            ))}
          </div>
        </div>

        {/* Pain */}
        <div className="lp-section">
          <div className="lp-container">
            <Fade><div className="lp-overline">The Real Problem</div></Fade>
            <Fade delay={60}>
              <h2 className="lp-h2">
                You don&apos;t have a content problem.<br />
                <span className="gray">You have a system problem.</span>
              </h2>
            </Fade>
            <div className="lp-pain-stack">
              {[
                {
                  title: 'You post. Nothing moves.',
                  body: "You try a new format. You copy what worked for someone else. You wait. The numbers don't shift. You wonder if Instagram has it in for you.",
                },
                {
                  title: 'Everyone sells you tactics. Nobody gives you a system.',
                  body: "You've watched the free courses. You've applied the hooks. You can name every algorithm update this year. Still no clients. Still no income.",
                },
                {
                  title: 'The gap between content and income feels impossible.',
                  body: "You're close enough to see that other creators are making it work. You can't work out what they have that you don't. The answer isn't hustle. It's structure.",
                },
              ].map(({ title, body }, i) => (
                <Fade key={title} delay={i * 70}>
                  <div className="lp-pain-card">
                    <div className="lp-pain-title">{title}</div>
                    <div className="lp-pain-body">{body}</div>
                  </div>
                </Fade>
              ))}
            </div>
          </div>
        </div>

        {/* Will's story */}
        <div className="lp-section lp-story-border">
          <div className="lp-story-glow" />
          <div className="lp-container">
            <div className="lp-story-layout">
              {/* Copy side */}
              <div>
                <Fade><div className="lp-overline">Why I Built This</div></Fade>
                <Fade delay={60}>
                  <h2 className="lp-h2">
                    412 followers.<br />
                    £20,000 in debt.<br />
                    <span className="gray">Delivering pizzas in the evenings.</span>
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
              {/* Photo side */}
              <Fade delay={80} className="lp-story-photo-wrap">
                <img
                  src="/will-hero.jpg"
                  alt="Will Scott — Creator Cult founder"
                  className="lp-story-photo"
                />
                <div className="lp-story-photo-caption">Will Scott — Creator Cult</div>
              </Fade>
            </div>
          </div>
        </div>

        {/* The System */}
        <div className="lp-section">
          <div className="lp-container">
            <Fade>
              <div className="lp-center">
                <div className="lp-overline">The Programme</div>
                <h2 className="lp-h2">Five phases. One direction.<br /><span className="gray">Full-time creator.</span></h2>
              </div>
            </Fade>
            <div className="lp-phase-grid">
              <Phase num="1" title="Foundations" desc="Before you create content, you need clarity. Most creators skip this. It costs them everything." items={['Niche and ICP precision. Who you serve and what they need.', 'Positioning statement that makes you the obvious choice', 'Brand voice and content identity', 'Offer foundations. What you sell before you sell anything.']} delay={0} />
              <Phase num="2" title="Build the Brand" desc="Content that builds authority, attracts the right people, and makes them follow for a reason." items={['Hook writing and the psychology behind stopping thumbs', 'Content frameworks that convert viewers into followers', 'Story-driven content that sells without selling', 'Reel strategy tied directly to your offer']} delay={70} />
              <Phase num="3" title="Client Acquisition" desc="Followers mean nothing if you can't convert them. This phase builds the machine." items={['DM strategy that turns comments into conversations', 'Discovery call frameworks and objection handling', 'Lead magnet creation and comment-keyword funnels', 'First client delivery: get paid before you have a product']} delay={140} />
              <Phase num="4" title="Monetisation Mastery" desc="Turn a trickle of clients into a consistent, scalable income stream." items={['High-ticket offer structuring and pricing', 'Upsell and retention systems for existing clients', 'Instagram sales psychology: urgency, scarcity, trust', 'Revenue goal planning with real numbers']} delay={210} />
              <Phase num="5" title="Scale and Systems" desc="Build the infrastructure that lets the business run without burning out." items={['Content batching and weekly production workflow', 'Setter and team onboarding foundations', 'Automation for DMs, leads, and client delivery', 'From full-time employee to full-time creator']} delay={280} />
              <Fade delay={350}>
                <div className="lp-phase-card lp-support">
                  <div className="lp-phase-num">Throughout</div>
                  <h3 className="lp-phase-title">Ongoing Support</h3>
                  <p className="lp-phase-desc">You&apos;re not going through this alone. Every week, every question, every plateau.</p>
                  <ul className="lp-phase-list">
                    {['Weekly group coaching calls', 'Private Circle community', '1:1 support and feedback', 'Content and offer reviews', 'The Cult Dashboard (see below)'].map(i => (
                      <li key={i} className="lp-phase-item"><span className="lp-check">✓</span>{i}</li>
                    ))}
                  </ul>
                </div>
              </Fade>
            </div>
          </div>
        </div>

        {/* Cult Dashboard */}
        <div className="lp-dash-bg lp-section">
          <div className="lp-dash-glow" />
          <div className="lp-container" style={{ position: 'relative' }}>
            <Fade>
              <div className="lp-center">
                <div className="lp-overline">Exclusive to Creator Cult</div>
                <h2 className="lp-h2">The Cult Dashboard.<br /><span className="gray">Your AI-powered growth engine.</span></h2>
                <p className="lp-section-intro" style={{ margin: '0 auto' }}>
                  Every client gets access to a private dashboard built specifically for Creator Cult members.
                  AI tools trained on our methodology. Not generic. Purpose-built for your business.
                </p>
              </div>
            </Fade>

            {/* Mockup */}
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

            {/* Tool grid */}
            <div className="lp-tool-grid">
              {[
                { icon: '🧠', title: 'AI Story Generator', desc: 'Input your niche, offer, and audience. Get a full Instagram story sequence built around your specific positioning: hooks, slides, and CTA. Not a template. A custom sequence.', badge: 'Most Used' },
                { icon: '📄', title: 'Lead Magnet Generator', desc: 'Choose your angle. The AI builds a complete lead magnet brief: title, concept, outline, and a ready-to-paste caption CTA with comment keyword. Start converting followers into leads this week.' },
                { icon: '📊', title: 'Profile Audit AI', desc: "Feed in your Instagram URL. Get a structured audit: bio clarity, CTA strength, offer visibility, content gaps. Know exactly what to fix and in what order." },
                { icon: '💬', title: 'Content Library', desc: 'Every training, resource, and framework in one searchable library. Organised by phase. No hunting through Notion docs or Slack threads to find what you need.' },
                { icon: '⚡', title: 'Offer Builder', desc: 'Step through your offer structure with AI guidance. Deliverables, transformation, price point, positioning. Build an offer that actually sells before you launch it.' },
                { icon: '📈', title: 'Reel Analytics', desc: 'See which of your reels are pulling the most views, track hooks that work, and spot content patterns. All inside your dashboard, connected to your profile data.' },
              ].map((t, i) => (
                <Fade key={t.title} delay={i * 60}>
                  <Tool {...t} />
                </Fade>
              ))}
            </div>
          </div>
        </div>

        {/* Client Wins */}
        <div className="lp-section">
          <div className="lp-container">
            <Fade>
              <div className="lp-center">
                <div className="lp-overline">Real Results</div>
                <h2 className="lp-h2">What happens when you have<br /><span className="blue">a system instead of a strategy.</span></h2>
              </div>
            </Fade>
            <div className="lp-win-grid">
              <Win name="Freddie" stat="£1,950 in 3 days" detail="No offer, no clients when he joined. Built and launched his first high-ticket package using the Client Acquisition phase. £1,950 in three days." img="https://assets-v2.circle.so/vjrs5iivuayf1j9x5te9q9u8f3bt" delay={0} />
              <Win name="Eddie" stat="5,000 followers in 10 days" detail="Reworked his positioning and hooks using Phase 2. Two reels went viral. 5,000 new followers in 10 days. First paying client followed from that growth." img="https://assets-v2.circle.so/li0b9tx3pl289tyzwa4c1vhus6jb" delay={70} />
              <Win name="Dino" stat="24 million views in 3 weeks" detail="Changed his username, applied the content frameworks, and hit 24 million views three weeks after joining. DMs turned into discovery calls within days." img="https://assets-v2.circle.so/7di4sesakx0atgazfw0wdz0ult0i" delay={140} />
              <Win name="Brett" stat="First client in 3 weeks" detail="18 months of posting with zero clients. Rebuilt his positioning from scratch in Foundations. Signed his first high-ticket coaching client three weeks later." delay={210} />
              <Win name="Asfand" stat="First client in 7 days" detail="Used the DM acquisition system and lead magnet framework from Phase 3. First paid client within a week of implementing. Launched his Instagram the Monday before." delay={280} />
              <Win name="Michael" stat="$10K day" detail="Two $5K pay-in-fulls before noon. Went from inconsistent income to $10,000 in a single day by restructuring his offer using the Monetisation Mastery phase." img="https://assets-v2.circle.so/w5tlngk8d5r1q5dpt0bmjtq5zzxl" delay={350} />
              <Win name="Tom" stat="6K followers in 2 months" detail="First paying clients landed while growing to 6,000 followers working with Will. His own words: 'shits bout to get crazy.'" img="https://assets-v2.circle.so/oovd23m42ybtzncmcuomqyiabjm7" delay={420} />
              <Win name="Roy" stat="1M views — first viral reel" detail="First reel to break 1 million views after consistently posting every day for 25 days. Hit 1K followers within 2 months of starting Creator Cult." img="https://assets-v2.circle.so/0z7iywo1kuov1nlanetscbuw6o8p" delay={490} />
            </div>
            <Fade delay={80}>
              <p style={{ textAlign: 'center', fontSize: 13, color: '#333', marginTop: 40 }}>
                Results vary. These are real outcomes from real Creator Cult members.
              </p>
            </Fade>
          </div>
        </div>

        {/* What's included */}
        <div className="lp-section" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="lp-container">
            <Fade>
              <div className="lp-center">
                <div className="lp-overline">What You Get</div>
                <h2 className="lp-h2">Everything in one place.</h2>
              </div>
            </Fade>
            <div className="lp-included-grid">
              {[
                { icon: '⭐', title: 'The 5-Phase Curriculum', desc: 'Foundations to Scale. Every lesson, framework, and exercise structured in the order that actually works. Self-paced but guided.' },
                { icon: '👥', title: 'Weekly Group Coaching Calls', desc: 'Live calls every week. Bring your questions, your content, your blockers. Will reviews your work live and tells you exactly what to fix.' },
                { icon: '⚡', title: 'The Cult Dashboard', desc: 'Private access to all six AI tools built for Creator Cult members. Story Generator, Lead Magnet Generator, Profile Audit, Offer Builder, and more.' },
                { icon: '💬', title: 'Private Circle Community', desc: '40+ creators at different stages, all working the same system. Post wins, ask for feedback, get accountability. Active every day.' },
                { icon: '🛡️', title: '1:1 Support', desc: 'Direct access to Will between calls. Post your content for review, ask for offer feedback, get unstuck fast. Not a bot. Not a VA.' },
                { icon: '📈', title: 'Weekly Strategy Packages', desc: "Every week you get a curated strategy package: what's working on Instagram right now, content angles to test, and a plan for the next 7 days." },
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

        {/* For / Not for */}
        <div className="lp-section">
          <div className="lp-container">
            <Fade>
              <div className="lp-center" style={{ marginBottom: 56 }}>
                <h2 className="lp-h2">This is for you.<br /><span className="gray">This is not for everyone.</span></h2>
              </div>
            </Fade>
            <div className="lp-for-grid">
              <Fade delay={0}>
                <div className="lp-for-card yes">
                  <div className="lp-for-head">
                    <span className="lp-for-icon">✓</span>
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
                        <span className="lp-for-icon">✓</span>{s}
                      </div>
                    ))}
                  </div>
                </div>
              </Fade>
              <Fade delay={100}>
                <div className="lp-for-card no">
                  <div className="lp-for-head">
                    <span className="lp-for-icon">✕</span>
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
                        <span className="lp-for-icon">✕</span>{s}
                      </div>
                    ))}
                  </div>
                </div>
              </Fade>
            </div>
          </div>
        </div>

        {/* Mid CTA */}
        <div className="lp-mid-cta lp-section-sm">
          <div className="lp-mid-cta-inner">
            <Fade>
              <div className="lp-mid-cta-h">Ready to stop figuring it out alone?</div>
              <p className="lp-mid-cta-sub">Applications take 3 minutes. No commitment to apply. Will reviews every one personally.</p>
              <Link href="/apply" className="lp-cta-primary" style={{ display: 'inline-flex' }}>
                Apply for a Spot →
              </Link>
            </Fade>
          </div>
        </div>

        {/* FAQ */}
        <div className="lp-section">
          <div className="lp-container">
            <Fade>
              <div className="lp-center">
                <div className="lp-overline">FAQ</div>
                <h2 className="lp-h2">Common questions.</h2>
              </div>
            </Fade>
            <Fade delay={60}>
              <div className="lp-faq-stack">
                <Faq q="How long does the programme run?" a="Creator Cult is an ongoing coaching programme. Most clients see their first real results (followers, leads, or revenue) within 30 to 60 days of starting. There is no set end date. You stay in as long as you are growing." />
                <Faq q="Do I need a big following to join?" a="No. Several of our members signed their first clients with under 1,000 followers. Following size does not determine your results. Your system does. We build the system first." />
                <Faq q="How much time do I need to commit each week?" a="Expect to block 5 to 8 hours per week: content creation, implementation, and the weekly coaching call. Less than that and progress slows. You do not need more than that to see results." />
                <Faq q="What platforms does this work for?" a="The programme is built primarily around Instagram. The frameworks, tools, and coaching are all Instagram-first. If you are cross-posting to TikTok or YouTube, the positioning and offer work translates. Instagram is the core focus." />
                <Faq q="Is this just another course?" a="No. The curriculum is part of it, but Creator Cult is a coaching programme. You have live weekly calls, 1:1 access to Will, a community of active creators, and the Cult Dashboard AI tools. The course is the structure. The coaching is where you actually move forward." />
                <Faq q="What if I've tried coaching before and it didn't work?" a="That is worth talking about in your application. A lot of creators who come to Creator Cult have been through generic social media courses or coaching that gave them tactics without a system. That is the exact gap this is built to fill. If your previous experience did not work, tell us why in your application. Will reads every one." />
                <Faq q="How do I apply?" a="Click the Apply button and fill in the short form. It takes about 3 minutes. Will reviews it personally. If it is a fit, you will hear back within 48 hours." />
              </div>
            </Fade>
          </div>
        </div>

        {/* Final CTA */}
        <div className="lp-final lp-section">
          <div className="lp-final-glow" />
          <div className="lp-final-inner">
            <Fade>
              <h2 className="lp-final-h">Stop posting into<br /><span className="blue">the void.</span></h2>
              <p className="lp-final-sub">You&apos;re three minutes away from finding out if Creator Cult is the right fit. Apply now. No commitment. No sales call unless you want one.</p>
              <Link href="/apply" className="lp-cta-primary" style={{ display: 'inline-flex' }}>
                Apply for a Spot →
              </Link>
              <div className="lp-cta-chips">
                {['Takes 3 minutes', 'Reviewed personally by Will', 'No commitment to apply'].map(c => (
                  <span key={c} className="lp-chip"><span className="lp-chip-check">✓</span> {c}</span>
                ))}
              </div>
            </Fade>
          </div>
        </div>

        {/* Footer */}
        <div className="lp-footer">
          <div className="lp-footer-logo"><span>CREATOR</span><span> CULT</span></div>
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
