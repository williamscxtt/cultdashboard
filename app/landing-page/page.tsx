'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

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

function Fade({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, on } = useReveal()
  return (
    <div ref={ref} className={className} style={{ opacity: on ? 1 : 0, transform: on ? 'none' : 'translateY(28px)', transition: `opacity .8s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .8s cubic-bezier(.16,1,.3,1) ${delay}ms` }}>
      {children}
    </div>
  )
}

const Ic = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)
const IconBrain = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3.16A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3.16A2.5 2.5 0 0 0 14.5 2Z"/></svg>
const IconDoc = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
const IconSearch = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
const IconLayers = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
const IconZap = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
const IconTrend = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
const IconStar = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
const IconUsers = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
const IconGrid = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
const IconMsg = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
const IconShield = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
const IconPackage = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
const IconArrow = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
const IconPlus = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IconMinus = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IconX = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IconStarFill = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>

const NavHome = () => <Ic d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" size={14} />
const NavContent = () => <Ic d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" size={14} />
const NavClients = () => <Ic d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={14} />
const NavIntel = () => <Ic d="M22 7 13.5 15.5 8.5 10.5 2 17M16 7h6v6" size={14} />
const NavTools = () => <Ic d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" size={14} />
const NavDM = () => <Ic d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" size={14} />

function useTypewriter(words: string[], typingSpeed = 72, deletingSpeed = 38, pauseMs = 2000) {
  const [display, setDisplay] = useState('')
  const [wordIdx, setWordIdx] = useState(0)
  const [phase, setPhase] = useState<'typing' | 'pausing' | 'deleting'>('typing')

  useEffect(() => {
    const word = words[wordIdx % words.length]
    if (phase === 'typing') {
      if (display.length < word.length) {
        const t = setTimeout(() => setDisplay(word.slice(0, display.length + 1)), typingSpeed)
        return () => clearTimeout(t)
      } else {
        const t = setTimeout(() => setPhase('deleting'), pauseMs)
        return () => clearTimeout(t)
      }
    } else if (phase === 'deleting') {
      if (display.length > 0) {
        const t = setTimeout(() => setDisplay(display.slice(0, -1)), deletingSpeed)
        return () => clearTimeout(t)
      } else {
        setPhase('typing')
        setWordIdx(i => i + 1)
      }
    }
  }, [display, phase, wordIdx, words, typingSpeed, deletingSpeed, pauseMs])

  return display
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <button onClick={() => setOpen(!open)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 0', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, -apple-system, sans-serif', fontSize: '15px', fontWeight: 500, color: '#e2e8f0', lineHeight: 1.5, gap: 24 }}>
        <span>{q}</span>
        <span style={{ flexShrink: 0, color: '#3b82f6', display: 'inline-flex', transition: 'transform .2s' }}>
          {open ? <IconMinus /> : <IconPlus />}
        </span>
      </button>
      {open && <div style={{ paddingBottom: 22, fontSize: 15, color: '#94a3b8', lineHeight: 1.8, maxWidth: 680, fontFamily: 'Inter, -apple-system, sans-serif' }}>{a}</div>}
    </div>
  )
}

const LogoMark = ({ size = 20 }: { size?: number }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: size, height: size, background: '#3b82f6', borderRadius: Math.round(size * 0.26),
    flexShrink: 0,
  }}>
    <svg width={Math.round(size * 0.5)} height={Math.round(size * 0.5)} viewBox="0 0 24 24" fill="white" stroke="none">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  </span>
)

interface WinItem {
  img: string
  name: string
  stat: string
  detail: string
  quote?: string
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [selectedWin, setSelectedWin] = useState<WinItem | null>(null)
  const typedText = useTypewriter([
    'Still clocking in.',
    'Still getting zero likes.',
    'Still posting into the void.',
    'Still broke at 11pm.',
    'Still figuring it out alone.',
    'Still working your 9-to-5.',
    'Still waiting for results.',
    'Still watching others win.',
  ])

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  useEffect(() => {
    if (selectedWin) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [selectedWin])

  const tickerItems = [
    'Freddie — £1,950 in 3 days',
    'Eddie — 4,600 followers in 10 days',
    'Dino — 24 million views in 3 weeks',
    'Brett Capstick — First client in 3 weeks',
    'Asfand — First paying client in 7 days',
    'Michael Kersee — $10,000 in a single day',
    'Tom Köster — 600 to 1,300 followers in one week',
    'Roy — 1 million views, first viral reel',
    'Mateus — 2.3M total reach in 30 days',
    'Jakub — Three viral reels back to back',
  ]

  const mqRow1 = [
    { img: '/testimonials/testimonial-michael-10k-day.jpeg',      name: 'Michael Kersee',  win: '$10K in one day' },
    { img: '/testimonials/testimonial-35k-month-sales.png',       name: '',                win: '£35K in 1 month' },
    { img: '/testimonials/testimonial-michael-5k-pif.jpeg',       name: 'Michael Kersee',  win: '$5K paid in full' },
    { img: '/testimonials/testimonial-bile-first-2-clients.jpg',  name: 'Bile',            win: 'First 2 clients — €550/mo' },
    { img: '/testimonials/testimonial-brett-first-client-3weeks.jpeg', name: 'Brett',      win: 'First client in 3 weeks' },
    { img: '/testimonials/testimonial-tom-600-to-1300-followers.jpeg', name: 'Tom Köster', win: '600 → 1,300 followers' },
    { img: '/testimonials/testimonial-jakub-reels-views.jpg',     name: 'Jakub',           win: 'Three viral reels' },
    { img: '/testimonials/testimonial-freeyourmind-10k-views.jpg',name: 'FreeYourMind',    win: '10K views in 12 hours' },
  ]
  const mqRow2 = [
    { img: '/testimonials/testimonial-michael-1m-views-30days.png', name: 'Michael Kersee', win: '1M views in 30 days' },
    { img: '/testimonials/testimonial-gabrielle-first-100k-views.jpg', name: 'Gabrielle', win: 'First 100K views' },
    { img: '/testimonials/testimonial-matte-first-payout-500.jpeg', name: 'Matte Fortuna', win: 'First €500 payout' },
    { img: '/testimonials/testimonial-zack-instagram-growth.jpg', name: 'Zack Sinclair',   win: '19K likes — one reel' },
    { img: '/testimonials/testimonial-asfand-first-client.png',   name: 'Asfand',          win: 'First client in 7 days' },
    { img: '/testimonials/testimonial-toshiro-first-100k.jpg',    name: 'Toshiro',         win: 'First 100K video' },
    { img: '/testimonials/testimonial-gabrielle-1k-followers.jpg',name: 'Gabrielle',        win: '1K followers + 100K views' },
    { img: '/testimonials/testimonial-bile-third-client.jpg',     name: 'Bile',             win: 'Third client — €600/mo' },
  ]

  const tools = [
    { icon: <IconBrain />, title: 'AI Story Generator', desc: 'Input your niche, offer, and audience. Get a full Instagram story sequence — hooks, slides, CTA. Built for your positioning, not a template.', badge: 'Most Used' },
    { icon: <IconTrend />, title: 'Competitor Intel Engine', desc: 'Every Monday: a full breakdown of what your top competitors posted, what went viral, and 5 ready-to-use script angles based on what\'s already working in your niche. Auto-generated.', badge: 'Auto-Weekly' },
    { icon: <IconDoc />, title: 'Reel Script Generator', desc: 'Pick a proven hook style, describe your angle, and get a complete reel script in seconds — structured on 1,000+ of Will\'s viral frameworks. One click to copy.' },
    { icon: <IconSearch />, title: 'Profile Audit AI', desc: 'Feed your Instagram URL. Get a structured audit: bio clarity, CTA strength, offer visibility, content gaps. Know exactly what to fix and in what order.' },
    { icon: <IconMsg />, title: 'DM Sales Playbook', desc: 'The exact DM sequences used to close high-ticket coaching clients from comments and follows. Scripts, objection handling, follow-ups — all in one place.' },
    { icon: <IconZap />, title: 'Lead Magnet Generator', desc: 'Choose your angle. The AI builds a complete lead magnet: title, concept, outline, and caption CTA with comment keyword. Ready to post in 5 minutes.' },
    { icon: <IconGrid />, title: 'Content Calendar Builder', desc: 'Input your niche and monthly goals. Get a 30-day posting plan with content themes, hook angles, and recommended post types — optimised for reach and conversion.' },
    { icon: <IconLayers />, title: 'Viral Hook Analyser', desc: 'Paste any hook or opening line. The AI scores it on thumb-stop power, clarity, and emotional pull — then rewrites it three different ways. Know before you post.' },
    { icon: <IconPackage />, title: 'Bio Optimiser', desc: 'Feed your current Instagram bio. Get four fully rewritten versions with sharper positioning, stronger CTA, and cleaner keyword signals. Updated in under 60 seconds.' },
    { icon: <IconDoc />, title: 'Caption Generator', desc: 'Describe your reel angle. Get three complete captions with hooks, body copy, and keyword CTA options — formatted to stop the scroll and drive saves and follows.', badge: 'New' },
    { icon: <IconShield />, title: 'Offer Builder', desc: 'Describe what you do and who you help. The AI builds a full high-ticket coaching offer: name, outcome promise, pricing structure, and delivery format. Ready to pitch.' },
    { icon: <IconTrend />, title: 'Outreach Script Library', desc: 'Pre-written cold outreach, comment reply scripts, follow-up sequences, and DM openers — all indexed by niche and scenario. Stop writing from scratch every time.' },
  ]

  const included = [
    { icon: <IconStar />, title: 'The 5-Phase Curriculum', desc: 'Foundations to Scale. Every lesson and framework in the order that works. Self-paced but guided.' },
    { icon: <IconUsers />, title: 'Weekly Group Coaching', desc: 'Live calls every week. Bring your questions, your content, your blockers. Will reviews your work live.' },
    { icon: <IconGrid />, title: 'The Cult Dashboard', desc: 'Private access to 12 AI tools built for Creator Cult members — Story Generator, Competitor Intel Engine, Reel Scripts, Hook Analyser, Bio Optimiser, and more.' },
    { icon: <IconMsg />, title: 'Private Circle Community', desc: '140+ creators working the same system. Post wins, ask for feedback, get accountability. Active every single day.' },
    { icon: <IconShield />, title: '1:1 Support', desc: 'Direct access to Will between calls. Post your content for review, ask for offer feedback. Not a bot. Not a VA.' },
    { icon: <IconPackage />, title: 'Weekly Strategy Packages', desc: "Every week: what's working on Instagram now, content angles to test, and a plan for the next 7 days." },
  ]

  const phases = [
    { n: '01', title: 'Foundations', desc: 'Before content, you need clarity. Most creators skip this. It costs them everything.', items: ['Niche and ICP precision', 'Positioning that makes you the obvious choice', 'Brand voice and content identity', 'Offer foundations — what you sell before you sell anything'] },
    { n: '02', title: 'Build the Brand', desc: 'Content that builds authority, attracts the right people, and makes them follow for a reason.', items: ['Hook writing and thumb-stopping psychology', 'Content frameworks that convert viewers into followers', 'Story-driven content that sells without selling', 'Reel strategy tied directly to your offer'] },
    { n: '03', title: 'Client Acquisition', desc: "Followers mean nothing if you can't convert them. This phase builds the machine.", items: ['DM strategy that turns comments into conversations', 'Discovery call frameworks and objection handling', 'Lead magnet creation and comment-keyword funnels', 'First client: get paid before you have a product'] },
    { n: '04', title: 'Monetisation', desc: 'Turn a trickle of clients into a consistent, scalable income stream.', items: ['High-ticket offer structuring and pricing', 'Upsell and retention systems for existing clients', 'Instagram sales psychology: urgency, scarcity, trust', 'Revenue goal planning with real numbers'] },
    { n: '05', title: 'Scale & Systems', desc: 'Build the infrastructure that lets the business run without burning out.', items: ['Content batching and weekly production workflow', 'Setter and team onboarding foundations', 'Automation for DMs, leads, and client delivery', 'From full-time employee to full-time creator'] },
    { n: '—', title: 'Ongoing Support', desc: "You're not going through this alone. Every week, every question, every plateau.", items: ['Weekly group coaching calls', 'Private Circle community', '1:1 support and feedback', 'Content and offer reviews', 'The Cult Dashboard'] },
  ]

  const wins: WinItem[] = [
    { img: '/testimonials/testimonial-michael-10k-day.jpeg',           name: 'MICHAEL KERSEE', stat: '$10K in one day',          detail: 'Two $5K paid-in-fulls before noon. From inconsistent income to $10,000 in a single day using the DM close system.',
      quote: "$10K DAY. Two $5K PIFs for 6-month coaching. The price is just made up — once your positioning is right, people pay it. The DM system did this." },
    { img: '/testimonials/testimonial-35k-month-sales.png',            name: '',               stat: '£35K in 1 month',         detail: 'Net volume from sales — £35,810.79 in a single month using the offer and conversion system from Phase 4.' },
    { img: '/testimonials/testimonial-michael-1m-views-30days.png',    name: 'MICHAEL KERSEE', stat: '1M views in 30 days',      detail: 'From inconsistent posting to 1 million views in a single month after implementing the content batching system.',
      quote: "I was posting randomly and getting nowhere. Will's content system changed everything. 1M views in 30 days is not something I thought was possible this quickly." },
    { img: '/testimonials/testimonial-brett-first-client-3weeks.jpeg', name: 'BRETT CAPSTICK', stat: 'First client in 3 weeks',  detail: '18 months with no clients. Rebuilt positioning from scratch. Signed first high-ticket client 3 weeks later.',
      quote: "I was stuck for 18 months. Three weeks after joining Creator Cult I had my first paying client. Just consistently posting, started convos, made the offer. That's literally it." },
    { img: '/testimonials/testimonial-bile-first-2-clients.jpg',       name: 'BILE',           stat: '€550/month — 2 clients',  detail: 'Signed first two clients at €550/month total after joining the programme. First income from content.',
      quote: "Signed my first two clients in the same week. Never thought it would happen this fast. The DM framework Will teaches is the real deal." },
    { img: '/testimonials/testimonial-jakub-reels-views.jpg',          name: 'JAKUB RIEDEL',   stat: '114K views — viral reel', detail: 'Three viral reels back to back — 47K, 12.6K, and 114K views after applying the hooks framework from Phase 2.',
      quote: "Three viral reels in a row after applying the hooks framework. The content system is genuinely different to anything else I've tried." },
    { img: '/testimonials/testimonial-gabrielle-first-100k-views.jpg', name: 'GABRIELLE',      stat: 'First 100K views',        detail: 'First Instagram reel to break 100,000 views after joining Creator Cult and applying the hook writing system.',
      quote: "First reel to ever hit 100K. I've been posting for a year with nothing. One framework change and this happened." },
    { img: '/testimonials/testimonial-tom-600-to-1300-followers.jpeg', name: 'TOM KÖSTER',     stat: '600 → 1,300 followers',  detail: '600 to 1,300 followers in one week. Videos reaching 20K views each using the brand-first content approach.',
      quote: "Doubled my followers in a week. The brand positioning work makes everything else click. My content finally feels like it has a direction." },
    { img: '/testimonials/testimonial-zack-instagram-growth.jpg',      name: 'ZACK SINCLAIR',  stat: '19K likes — one reel',   detail: '19K likes and 5.1K saves on a single Instagram reel using the story-driven hooks framework.',
      quote: "19K likes and 5.1K saves on one reel. People are saving it because it actually hits something real — that's what the storytelling training teaches you." },
    { img: '/testimonials/testimonial-matte-first-payout-500.jpeg',    name: 'MATTE FORTUNA',  stat: 'First €500 payout',      detail: 'First ever coaching payout — €500. First client landed through the DM system inside Creator Cult.',
      quote: "First ever money from content. €500. Doesn't sound huge but it proved the whole thing works. I'll be at €5K/month within 3 months." },
    { img: '/testimonials/testimonial-michael-5k-pif.jpeg',            name: 'MICHAEL KERSEE', stat: '$5K paid in full',        detail: 'A $5K, 3-month coaching deal closed. Gross volume shown in Stripe. Closed via Instagram DMs.',
      quote: "Closed a $5K paid-in-full deal through Instagram DMs. The call-to-close framework is next level. People literally thank you for the offer." },
    { img: '/testimonials/testimonial-freeyourmind-10k-views.jpg',     name: 'FREEYOURMIND',   stat: '10K views in 12 hours',  detail: '10,000 views in under 12 hours on Instagram. Then another 10K the same week using the same hook structure.',
      quote: "10K views in 12 hours. Then another 10K later that week. I've been trying to go viral for 8 months. Took two weeks inside this programme." },
  ]

  const reviews = [
    { name: 'Freddie Woodward', initials: 'FW', color: '#3b82f6', role: 'Fitness Creator', metric: '£1,950 in 72 hours', quote: "£1,950 worth of sales in 3 days. Two sales at £975 each. I just followed the system — it actually works. Can't believe I spent 18 months trying to figure this out alone." },
    { name: 'Brett Capstick',   initials: 'BC', color: '#6366f1', role: 'Personal Trainer', metric: 'First client in 3 weeks', quote: "18 months with zero paying clients. Three weeks in Creator Cult — signed my first. Just consistently posting, started conversations, made the offer. Simple as that." },
    { name: 'Eddie Harding',    initials: 'EH', color: '#8b5cf6', role: 'Fitness Creator', metric: '258K views + 4,600 followers', quote: "Two posts gone viral. One reel gave me 4,600 new followers and 258K views in a week. The hooks framework is genuinely different to anything else out there." },
    { name: 'Rokas Žebrauskas', initials: 'RŽ', color: '#0ea5e9', role: 'Creator', metric: 'Best investment ever', quote: "This is my best investment so far, 100%. I've learned more in two weeks inside this programme than in six months of watching free content. The system just makes sense." },
    { name: 'Mateus Chapman',   initials: 'MC', color: '#10b981', role: 'Fitness Creator', metric: '2.3M reach in 30 days', quote: "1 million views in a month. My total reach is 2.3 million for the last 30 days. The content batching and posting system changed everything about how I work." },
    { name: 'Asher Hayhoe',     initials: 'AH', color: '#f59e0b', role: 'Creator', metric: 'First sales call booked', quote: "Had my first ever sales call this week. 4 videos over 100K views in the past month. Before this programme I couldn't get consistent views let alone client enquiries." },
  ]

  const avatarMembers = [
    { initials: 'MK', bg: '#0ea5e9' },
    { initials: 'FW', bg: '#3b82f6' },
    { initials: 'BC', bg: '#6366f1' },
    { initials: 'EH', bg: '#8b5cf6' },
    { initials: 'MC', bg: '#10b981' },
    { initials: 'RŽ', bg: '#f59e0b' },
  ]

  return (
    <>
      <style>{`
        .lp-root { all: initial; display: block; }
        .lp-root *, .lp-root *::before, .lp-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .lp-root {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
          font-size: 16px; font-weight: 400; line-height: 1.65;
          color: #cbd5e1; background-color: #0d0d0a;
          min-height: 100vh; overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
          background-image:
            linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        /* ── Page frame ── */
        .lp-page-frame {
          max-width: 1380px;
          margin: 0 auto;
          border-left: 1px solid rgba(255,255,255,0.08);
          border-right: 1px solid rgba(255,255,255,0.08);
          position: relative;
          overflow: hidden;
        }
        .lp-root::after {
          content: ''; position: fixed; inset: 0; z-index: 9999; pointer-events: none; opacity: 0.04;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 280px 280px;
        }

        /* ── Typography ── */
        .lp-h1 { font-family: 'Inter', -apple-system, sans-serif !important; font-size: clamp(38px, 7vw, 88px); font-weight: 900; line-height: 1.0; letter-spacing: -0.04em; color: #f1f5f9; }
        .lp-h2 { font-family: 'Inter', -apple-system, sans-serif !important; font-size: clamp(30px, 5vw, 62px); font-weight: 800; line-height: 1.05; letter-spacing: -0.03em; color: #f1f5f9; }
        .lp-h3 { font-family: 'Inter', -apple-system, sans-serif !important; font-size: clamp(20px, 2.5vw, 28px); font-weight: 700; line-height: 1.2; color: #f1f5f9; }
        .lp-body { font-size: 16px; color: #ffffff; line-height: 1.75; }
        .lp-body-lg { font-size: clamp(16px, 1.5vw, 19px); color: #ffffff; line-height: 1.75; }
        .lp-blue { color: #3b82f6; }
        .lp-dim { color: #b0bec5; }

        /* ── Layout ── */
        .lp-container { max-width: 1200px; margin: 0 auto; padding: 0 48px; }
        .lp-container-sm { max-width: 840px; margin: 0 auto; padding: 0 48px; }
        .lp-section { padding: 112px 0; }
        .lp-hr { height: 1px; background: rgba(59,130,246,0.12); }

        /* ── Cursor blink ── */
        @keyframes lp-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .lp-cursor { display: inline-block; color: #3b82f6; animation: lp-blink .65s step-end infinite; margin-left: 2px; font-weight: 300; }
        /* ── Badge dot pulse ── */
        @keyframes lp-pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.7); } }
        .lp-pill-dot { animation: lp-pulse-dot 2s ease-in-out infinite; }

        /* ── Feature strip ── */
        .lp-feat-strip { padding: 18px 0; border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); overflow: hidden; }
        .lp-feat-inner { display: flex; align-items: center; justify-content: center; gap: 0; flex-wrap: wrap; }
        .lp-feat-item { font-family: 'Inter', sans-serif !important; font-size: 10px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: #64748b; padding: 4px 20px; white-space: nowrap; }
        .lp-feat-sep { color: #3b82f6; font-size: 8px; flex-shrink: 0; }

        /* ── Pill ── */
        .lp-pill { display: inline-flex; align-items: center; gap: 8px; font-family: 'Inter', sans-serif !important; font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #60a5fa; border: 1px solid rgba(96,165,250,0.2); background: rgba(59,130,246,0.06); padding: 7px 16px; border-radius: 999px; margin-bottom: 28px; }
        .lp-pill-dot { width: 6px; height: 6px; border-radius: 50%; background: #3b82f6; flex-shrink: 0; }

        /* ── CTAs ── */
        .lp-cta-primary { display: inline-flex; align-items: center; gap: 10px; font-family: 'Inter', sans-serif !important; font-size: 15px; font-weight: 700; letter-spacing: -.01em; color: #fff; text-decoration: none; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 16px 36px; border-radius: 10px; box-shadow: 0 0 32px rgba(59,130,246,0.3); transition: box-shadow .25s, transform .2s; cursor: pointer; border: none; }
        .lp-cta-primary:hover { box-shadow: 0 0 60px rgba(59,130,246,0.5); transform: translateY(-1px); }
        .lp-cta-ghost { display: inline-flex; align-items: center; gap: 10px; font-family: 'Inter', sans-serif !important; font-size: 13px; font-weight: 600; letter-spacing: .02em; color: #60a5fa; text-decoration: none; border: 1px solid rgba(96,165,250,0.3); padding: 12px 28px; border-radius: 8px; transition: background .2s, border-color .2s; cursor: pointer; background: transparent; }
        .lp-cta-ghost:hover { background: rgba(59,130,246,0.08); border-color: rgba(96,165,250,0.5); }
        .lp-cta-ghost-sm { display: inline-flex; align-items: center; gap: 8px; font-family: 'Inter', sans-serif !important; font-size: 12px; font-weight: 600; color: #60a5fa; text-decoration: none; border: 1px solid rgba(96,165,250,0.25); padding: 9px 18px; border-radius: 6px; transition: background .2s; cursor: pointer; background: transparent; }
        .lp-cta-ghost-sm:hover { background: rgba(59,130,246,0.08); }
        .lp-nav-cta { display: inline-flex; align-items: center; gap: 8px; font-family: 'Inter', sans-serif !important; font-size: 13px; font-weight: 700; letter-spacing: -.01em; color: #fff; text-decoration: none; background: #3b82f6; padding: 10px 22px; border-radius: 8px; transition: background .2s, transform .15s, box-shadow .2s; cursor: pointer; border: none; box-shadow: 0 0 24px rgba(59,130,246,0.35); }
        .lp-nav-cta:hover { background: #2563eb; transform: translateY(-1px); box-shadow: 0 0 36px rgba(59,130,246,0.55); }

        /* ── Nav ── */
        .lp-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; height: 64px; display: flex; align-items: center; justify-content: space-between; padding: 0 48px; transition: background .3s, border-color .3s; }
        .lp-nav.scrolled { background: rgba(13,13,10,0.88); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid rgba(59,130,246,0.1); }
        .lp-nav-logo { font-family: 'Inter', sans-serif !important; font-size: 15px; font-weight: 800; letter-spacing: -.02em; text-decoration: none; display: flex; align-items: center; gap: 9px; color: #f1f5f9; }

        /* ── Hero ── */
        .lp-hero { display: grid; grid-template-columns: 1fr 42%; min-height: 100vh; position: relative; }
        @media (max-width: 900px) { .lp-hero { grid-template-columns: 1fr; min-height: auto; } .lp-hero-photo-col { height: 65vw; min-height: 300px; order: -1; } }
        .lp-hero-left { display: flex; flex-direction: column; justify-content: center; padding: 120px 64px 80px 48px; border-right: 1px solid rgba(59,130,246,0.07); }
        @media (max-width: 900px) { .lp-hero-left { padding: 96px 32px 60px; border-right: none; } }
        @media (max-width: 640px) { .lp-hero-left { padding: 88px 20px 56px; } }
        .lp-hero-badge { display: inline-flex; align-items: center; gap: 8px; font-family: 'Inter', sans-serif !important; font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #60a5fa; background: rgba(59,130,246,0.08); border: 1px solid rgba(96,165,250,0.2); padding: 7px 16px; border-radius: 999px; margin-bottom: 36px; width: fit-content; }
        .lp-hero-photo-col { position: relative; overflow: hidden; }
        .lp-hero-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; filter: brightness(0.85) contrast(1.05) saturate(0.9); }
        .lp-hero-photo-overlay { position: absolute; inset: 0; background: linear-gradient(to right, #0d0d0a 0%, transparent 20%), linear-gradient(to top, #0d0d0a 0%, transparent 30%), linear-gradient(to bottom, rgba(13,13,10,0.3) 0%, transparent 20%); }
        .lp-hero-stats { display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 56px; border-top: 1px solid rgba(255,255,255,0.07); padding-top: 40px; }
        @media (max-width: 640px) { .lp-hero-stats { grid-template-columns: repeat(2, 1fr); gap: 28px 0; } }
        .lp-stat-n { font-family: 'Inter', sans-serif !important; font-size: clamp(26px, 3.5vw, 40px); font-weight: 900; color: #f1f5f9; letter-spacing: -.03em; line-height: 1; }
        .lp-stat-l { font-size: 11px; color: #94a3b8; font-weight: 500; letter-spacing: .06em; text-transform: uppercase; margin-top: 8px; }

        /* ── Avatar social strip ── */
        .lp-avatar-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .lp-avatar-stack { display: flex; align-items: center; }
        .lp-avatar { width: 36px; height: 36px; border-radius: 50%; border: 2px solid #0d0d0a; display: flex; align-items: center; justify-content: center; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0; position: relative; }
        .lp-avatar-text { font-family: 'Inter', sans-serif !important; font-size: 13px; color: #94a3b8; line-height: 1.4; }
        .lp-avatar-text strong { color: #ffffff; font-weight: 600; }

        /* ── Ticker ── */
        .lp-ticker { padding: 13px 0; overflow: hidden; background: #1d4ed8; }
        .lp-ticker-track { display: flex; width: max-content; animation: lp-tick 36s linear infinite; }
        .lp-ticker-track:hover { animation-play-state: paused; }
        @keyframes lp-tick { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .lp-tick-item { display: inline-flex; align-items: center; font-family: 'Inter', sans-serif !important; font-size: 12px; font-weight: 700; color: #fff; white-space: nowrap; padding: 0 28px; letter-spacing: .05em; text-transform: uppercase; }
        .lp-tick-dot { color: rgba(255,255,255,0.45); font-size: 8px; }

        /* ── Social strip (member names) ── */
        .lp-social-strip { padding: 28px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .lp-social-label { font-size: 10px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; color: #ffffff; margin-bottom: 16px; text-align: center; }
        .lp-social-names { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 0; }
        .lp-social-name { font-size: 13px; font-weight: 500; color: #e2e8f0; padding: 5px 16px; border-right: 1px solid rgba(255,255,255,0.08); letter-spacing: .02em; }
        .lp-social-name:last-child { border-right: none; }

        /* ── Pain ── */
        .lp-pain-item { padding: 32px 36px; background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; display: grid; grid-template-columns: 64px 1fr; gap: 32px; align-items: start; margin-bottom: 14px; transition: background .25s, border-color .25s; }
        .lp-pain-item:hover { background: rgba(59,130,246,0.045); border-color: rgba(59,130,246,0.22); }
        @media (max-width: 640px) { .lp-pain-item { grid-template-columns: 1fr; gap: 10px; padding: 24px 20px; } }
        .lp-pain-num { font-family: 'Inter', sans-serif !important; font-size: 48px; font-weight: 900; color: rgba(255,255,255,0.22); line-height: 1; margin-top: -6px; letter-spacing: -.04em; }
        .lp-pain-title { font-family: 'Inter', sans-serif !important; font-size: clamp(17px, 2vw, 22px); font-weight: 700; color: #f1f5f9; margin-bottom: 10px; line-height: 1.3; letter-spacing: -.02em; }
        .lp-pain-body { font-size: 15px; color: #b0bec5; line-height: 1.8; }

        /* ── Story ── */
        .lp-story-grid { display: grid; grid-template-columns: 1fr 340px; gap: 80px; align-items: start; }
        @media (max-width: 900px) { .lp-story-grid { grid-template-columns: 1fr; gap: 48px; } }
        .lp-story-card-col { position: sticky; top: 90px; }
        .lp-story-text { font-size: clamp(15px, 1.4vw, 17px); color: #b0bec5; line-height: 1.85; }
        .lp-story-text p { margin-bottom: 20px; }
        .lp-story-text p:last-child { margin-bottom: 0; }
        .lp-story-text strong { color: #ffffff; font-weight: 600; }
        /* Before/After card */
        .lp-ba-card { border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; }
        .lp-ba-before { padding: 24px 28px; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .lp-ba-after { padding: 24px 28px; background: rgba(59,130,246,0.06); }
        .lp-ba-label { font-size: 9px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; margin-bottom: 16px; }
        .lp-ba-before .lp-ba-label { color: #64748b; }
        .lp-ba-after .lp-ba-label { color: #3b82f6; }
        .lp-ba-item { display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px; }
        .lp-ba-item:last-child { margin-bottom: 0; }
        .lp-ba-before .lp-ba-item { color: #94a3b8; font-size: 14px; }
        .lp-ba-before .lp-ba-mark { color: #64748b; font-size: 12px; }
        .lp-ba-after .lp-ba-item { color: #f1f5f9; font-size: 15px; font-weight: 600; }
        .lp-ba-after .lp-ba-mark { color: #3b82f6; font-size: 12px; font-weight: 700; }

        /* ── Phase list (new design) ── */
        .lp-phase-list { margin-top: 80px; display: flex; flex-direction: column; gap: 12px; }
        .lp-phase-row { display: grid; grid-template-columns: 100px 1fr 1fr; gap: 56px; padding: 40px 36px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; transition: background .3s, border-color .3s; position: relative; overflow: hidden; }
        .lp-phase-row::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: transparent; border-radius: 12px 0 0 12px; transition: background .3s; }
        .lp-phase-row:hover::before { background: #3b82f6; }
        .lp-phase-row:hover { background: rgba(59,130,246,0.04); border-color: rgba(59,130,246,0.2); }
        @media (max-width: 960px) { .lp-phase-row { grid-template-columns: 70px 1fr; gap: 32px; } .lp-phase-row-bullets { display: none; } }
        @media (max-width: 580px) { .lp-phase-row { grid-template-columns: 1fr; gap: 16px; padding: 40px 0; } }
        .lp-phase-row-num { font-family: 'Inter', sans-serif !important; font-size: 80px; font-weight: 900; color: #3b82f6; letter-spacing: -.06em; line-height: 0.85; opacity: 0.9; }
        .lp-phase-row-label { font-size: 10px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; color: #3b82f6; margin-bottom: 14px; }
        .lp-phase-row-title { font-family: 'Inter', sans-serif !important; font-size: clamp(20px, 2.2vw, 28px); font-weight: 800; color: #ffffff; letter-spacing: -.03em; line-height: 1.15; margin-bottom: 14px; }
        .lp-phase-row-desc { font-size: 15px; color: #b0bec5; line-height: 1.75; }
        .lp-phase-row-bullets { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; align-content: start; padding-top: 2px; }
        .lp-phase-row-bullet { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: #b0bec5; line-height: 1.5; }
        .lp-phase-row-bmark { color: #3b82f6; flex-shrink: 0; font-weight: 700; font-size: 14px; line-height: 1.5; }
        /* Support (throughout) row */
        .lp-phase-row.lp-support { grid-template-columns: 100px 1fr 1fr; background: rgba(59,130,246,0.06); border-color: rgba(59,130,246,0.2); }
        @media (max-width: 960px) { .lp-phase-row.lp-support { grid-template-columns: 70px 1fr; } .lp-phase-row.lp-support .lp-phase-row-bullets { display: grid; } }
        .lp-phase-row.lp-support .lp-phase-row-num { color: rgba(59,130,246,0.25); }
        .lp-phase-row.lp-support .lp-phase-row-title { color: rgba(255,255,255,0.7); }

        /* ── Dashboard mockup ── */
        .lp-dash-outer { border: 1px solid rgba(59,130,246,0.15); border-radius: 10px; overflow: hidden; margin: 56px 0 0; background: #0a0a08; }
        .lp-dash-chrome { display: flex; align-items: center; gap: 8px; padding: 11px 16px; background: #080808; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .lp-dash-dot-r { width: 12px; height: 12px; border-radius: 50%; background: rgba(255,80,80,0.45); flex-shrink: 0; }
        .lp-dash-dot-y { width: 12px; height: 12px; border-radius: 50%; background: rgba(255,185,0,0.4); flex-shrink: 0; }
        .lp-dash-dot-g { width: 12px; height: 12px; border-radius: 50%; background: rgba(40,200,70,0.35); flex-shrink: 0; }
        .lp-dash-url { flex: 1; background: rgba(255,255,255,0.03); border-radius: 5px; padding: 5px 12px; font-size: 11px; color: rgba(255,255,255,0.3); text-align: center; margin: 0 16px; font-family: 'Inter', monospace; }
        .lp-dash-body { display: grid; grid-template-columns: 192px 1fr; min-height: 380px; }
        @media (max-width: 700px) { .lp-dash-body { grid-template-columns: 1fr; } .lp-dash-sidebar { display: none; } }
        .lp-dash-sidebar { background: #080808; border-right: 1px solid rgba(255,255,255,0.05); padding: 20px 12px; display: flex; flex-direction: column; }
        .lp-dash-logo { font-family: 'Inter', sans-serif !important; font-size: 12px; font-weight: 900; letter-spacing: -.02em; color: #fff; padding: 8px 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 12px; display: flex; align-items: center; gap: 7px; }
        .lp-dash-logo span { color: #60a5fa; }
        .lp-dash-nav { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.35); cursor: pointer; transition: background .15s; margin-bottom: 2px; }
        .lp-dash-nav.active { background: rgba(59,130,246,0.12); color: #60a5fa; font-weight: 600; }
        .lp-dash-nav:hover:not(.active) { background: rgba(255,255,255,0.04); }
        .lp-dash-main { padding: 24px; background: #0f0f0c; display: flex; flex-direction: column; gap: 18px; }
        .lp-dash-topbar { display: flex; justify-content: space-between; align-items: center; }
        .lp-dash-greeting { font-family: 'Inter', sans-serif !important; font-size: 14px; font-weight: 700; color: #f1f5f9; letter-spacing: -.01em; }
        .lp-dash-subtext { font-size: 11px; color: #64748b; margin-top: 2px; }
        .lp-dash-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        @media (max-width: 700px) { .lp-dash-metrics { grid-template-columns: repeat(2, 1fr); } }
        .lp-dash-metric { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 14px 16px; }
        .lp-dash-metric-val { font-family: 'Inter', sans-serif !important; font-size: 18px; font-weight: 900; color: #f1f5f9; letter-spacing: -.03em; }
        .lp-dash-metric-val.blue { color: #3b82f6; }
        .lp-dash-metric-lbl { font-size: 10px; color: #64748b; margin-top: 4px; font-weight: 500; letter-spacing: .06em; text-transform: uppercase; }
        .lp-dash-lower { display: grid; grid-template-columns: 3fr 2fr; gap: 10px; }
        @media (max-width: 700px) { .lp-dash-lower { grid-template-columns: 1fr; } }
        .lp-dash-panel { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 16px; }
        .lp-dash-panel-title { font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #94a3b8; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
        .lp-dash-ai-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; color: #3b82f6; background: rgba(59,130,246,0.1); padding: 3px 8px; border-radius: 4px; font-weight: 600; }
        .lp-dash-line { font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 7px; padding: 7px 10px; background: rgba(255,255,255,0.02); border-radius: 5px; border-left: 2px solid rgba(59,130,246,0.3); line-height: 1.45; }
        .lp-dash-line.green { border-left-color: rgba(16,185,129,0.4); color: rgba(255,255,255,0.45); }
        .lp-dash-progress { margin-top: 12px; height: 3px; background: rgba(255,255,255,0.05); border-radius: 2px; }
        .lp-dash-pfill { height: 100%; width: 68%; border-radius: 2px; background: linear-gradient(90deg, #3b82f6, #60a5fa); }
        .lp-dash-client { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .lp-dash-client:last-child { border-bottom: none; }
        .lp-dash-client-name { font-size: 12px; color: rgba(255,255,255,0.65); font-weight: 500; }
        .lp-dash-client-phase { font-size: 10px; color: #64748b; margin-top: 2px; }
        .lp-dash-client-badge { font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #3b82f6; }

        /* ── Tool grid ── */
        .lp-tool-grid { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid rgba(255,255,255,0.06); border-top: none; }
        @media (max-width: 960px) { .lp-tool-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 580px) { .lp-tool-grid { grid-template-columns: 1fr; } }
        .lp-tool-card { padding: 28px; border-right: 1px solid rgba(255,255,255,0.06); border-bottom: 1px solid rgba(255,255,255,0.06); transition: background .2s; }
        .lp-tool-card:hover { background: rgba(59,130,246,0.03); }
        .lp-tool-card:nth-child(3n) { border-right: none; }
        @media (max-width: 960px) { .lp-tool-card:nth-child(3n) { border-right: 1px solid rgba(255,255,255,0.06); } .lp-tool-card:nth-child(2n) { border-right: none; } }
        .lp-tool-icon-wrap { width: 36px; height: 36px; border: 1px solid rgba(59,130,246,0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #3b82f6; margin-bottom: 16px; }
        .lp-tool-badge { font-size: 9px; font-weight: 700; letter-spacing: .14em; color: #3b82f6; text-transform: uppercase; background: rgba(59,130,246,0.1); padding: 2px 8px; border-radius: 4px; margin-left: 10px; }
        .lp-tool-title { font-size: 14px; font-weight: 700; color: #e2e8f0; margin-bottom: 8px; display: flex; align-items: center; letter-spacing: -.01em; }
        .lp-tool-desc { font-size: 13px; color: #b0bec5; line-height: 1.7; }

        /* ── Image marquee ── */
        .lp-imgmq-wrap { overflow: hidden; }
        .lp-imgmq-track-l { display: flex; width: max-content; animation: lp-mq-l 18s linear infinite; }
        .lp-imgmq-track-r { display: flex; width: max-content; animation: lp-mq-r 22s linear infinite; }
        .lp-imgmq-track-l:hover, .lp-imgmq-track-r:hover { animation-play-state: paused; }
        @keyframes lp-mq-l { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes lp-mq-r { 0% { transform: translateX(-50%); } 100% { transform: translateX(0); } }
        .lp-imgmq-card { width: 200px; flex-shrink: 0; border-right: 1px solid rgba(255,255,255,0.05); }
        @media (max-width: 640px) { .lp-imgmq-card { width: 160px; } }
        .lp-imgmq-img-wrap { width: 100%; height: 220px; background: #0a0a08; overflow: hidden; border-bottom: 1px solid rgba(255,255,255,0.05); }
        @media (max-width: 640px) { .lp-imgmq-img-wrap { height: 180px; } }
        .lp-imgmq-img { width: 100%; height: 100%; object-fit: contain; object-position: center; display: block; }
        .lp-imgmq-foot { padding: 12px 14px 14px; }
        .lp-imgmq-win { font-size: 12px; font-weight: 700; color: #e2e8f0; line-height: 1.3; letter-spacing: -.01em; }
        .lp-imgmq-name { font-size: 10px; color: #94a3b8; margin-top: 4px; font-weight: 500; letter-spacing: .04em; }

        /* ── Win grid ── */
        .lp-win-grid { display: grid; grid-template-columns: repeat(3, 1fr); margin-top: 64px; border: 1px solid rgba(255,255,255,0.09); border-radius: 14px; overflow: hidden; background: rgba(255,255,255,0.015); }
        @media (max-width: 900px) { .lp-win-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 580px) { .lp-win-grid { grid-template-columns: 1fr; } }
        .lp-win-card { border-right: 1px solid rgba(255,255,255,0.07); border-bottom: 1px solid rgba(255,255,255,0.07); display: flex; flex-direction: column; overflow: hidden; cursor: pointer; transition: background .2s, border-color .25s; position: relative; }
        .lp-win-card:hover { background: rgba(59,130,246,0.05); border-color: rgba(59,130,246,0.2); }
        .lp-win-card::after { content: 'Tap to expand'; position: absolute; top: 10px; right: 10px; font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #3b82f6; background: rgba(59,130,246,0.1); padding: 3px 8px; border-radius: 4px; opacity: 0; transition: opacity .2s; }
        .lp-win-card:hover::after { opacity: 1; }
        .lp-win-card:nth-child(3n) { border-right: none; }
        @media (max-width: 900px) { .lp-win-card:nth-child(3n) { border-right: 1px solid rgba(255,255,255,0.06); } .lp-win-card:nth-child(2n) { border-right: none; } }
        .lp-win-img-wrap { background: #0a0a08; border-bottom: 1px solid rgba(255,255,255,0.05); overflow: hidden; height: 200px; }
        .lp-win-img { width: 100%; height: 100%; display: block; object-fit: contain; object-position: top; }
        .lp-win-body { padding: 20px 22px 24px; flex: 1; display: flex; flex-direction: column; }
        .lp-win-stat { font-family: 'Inter', sans-serif !important; font-size: 18px; font-weight: 800; color: #f1f5f9; letter-spacing: -.02em; margin-bottom: 7px; line-height: 1.2; }
        .lp-win-detail { font-size: 12px; color: #b0bec5; line-height: 1.65; margin-bottom: 10px; flex: 1; }
        .lp-win-name { font-size: 9px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #3b82f6; }
        .lp-win-expand-hint { margin-top: 12px; font-size: 11px; color: #3b82f6; display: flex; align-items: center; gap: 6px; font-weight: 600; letter-spacing: .04em; }

        /* ── Win modal ── */
        .lp-modal-overlay { position: fixed; inset: 0; z-index: 10000; background: rgba(0,0,0,0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; padding: 20px; }
        .lp-modal { background: #0f0f0c; border: 1px solid rgba(59,130,246,0.2); border-radius: 14px; max-width: 580px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative; }
        .lp-modal-close { position: absolute; top: 14px; right: 14px; background: rgba(255,255,255,0.07); border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; color: #94a3b8; display: flex; align-items: center; justify-content: center; z-index: 1; transition: background .2s; }
        .lp-modal-close:hover { background: rgba(255,255,255,0.12); }
        .lp-modal-img { width: 100%; max-height: 320px; object-fit: contain; display: block; background: #080808; }
        .lp-modal-body { padding: 28px 32px 36px; }
        .lp-modal-tag { font-size: 10px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: #3b82f6; margin-bottom: 10px; }
        .lp-modal-stat { font-family: 'Inter', sans-serif !important; font-size: clamp(22px, 4vw, 30px); font-weight: 800; color: #f1f5f9; letter-spacing: -.03em; line-height: 1.1; margin-bottom: 16px; }
        .lp-modal-detail { font-size: 15px; color: #b0bec5; line-height: 1.75; margin-bottom: 24px; }
        .lp-modal-quote { border-left: 2px solid rgba(59,130,246,0.35); padding-left: 20px; margin-bottom: 24px; }
        .lp-modal-quote p { font-size: 14px; color: #60a5fa; font-style: italic; line-height: 1.7; }
        .lp-modal-source { font-size: 11px; color: #475569; letter-spacing: .08em; text-transform: uppercase; }

        /* ── Reviews ── */
        .lp-reviews-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 64px; }
        @media (max-width: 900px) { .lp-reviews-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 580px) { .lp-reviews-grid { grid-template-columns: 1fr; } }
        .lp-review-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 24px; display: flex; flex-direction: column; gap: 14px; transition: border-color .25s, background .25s; }
        .lp-review-card:hover { border-color: rgba(59,130,246,0.2); background: rgba(59,130,246,0.04); }
        .lp-review-header { display: flex; align-items: center; gap: 12px; }
        .lp-review-avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 700; color: #fff; flex-shrink: 0; }
        .lp-review-name { font-size: 14px; font-weight: 700; color: #e2e8f0; letter-spacing: -.01em; }
        .lp-review-role { font-size: 11px; color: #b0bec5; margin-top: 1px; }
        .lp-review-stars { display: flex; gap: 2px; }
        .lp-review-metric { font-size: 12px; font-weight: 700; color: #3b82f6; background: rgba(59,130,246,0.08); padding: 4px 10px; border-radius: 5px; display: inline-block; }
        .lp-review-quote { font-size: 14px; color: #e2e8f0; line-height: 1.7; font-style: italic; }
        .lp-review-source { font-size: 10px; color: #64748b; letter-spacing: .1em; text-transform: uppercase; margin-top: 4px; }

        /* ── Included grid ── */
        .lp-incl-grid { display: grid; grid-template-columns: repeat(2, 1fr); margin-top: 72px; border: 1px solid rgba(255,255,255,0.06); }
        @media (max-width: 640px) { .lp-incl-grid { grid-template-columns: 1fr; } }
        .lp-incl-card { padding: 32px 28px; display: flex; gap: 18px; border-right: 1px solid rgba(255,255,255,0.06); border-bottom: 1px solid rgba(255,255,255,0.06); transition: background .2s; }
        .lp-incl-card:hover { background: rgba(59,130,246,0.02); }
        .lp-incl-card:nth-child(2n) { border-right: none; }
        .lp-incl-icon { width: 32px; height: 32px; flex-shrink: 0; border: 1px solid rgba(59,130,246,0.2); border-radius: 7px; display: flex; align-items: center; justify-content: center; color: #3b82f6; margin-top: 2px; }
        .lp-incl-title { font-size: 13px; font-weight: 700; color: #e2e8f0; margin-bottom: 7px; letter-spacing: -.01em; }
        .lp-incl-desc { font-size: 13px; color: #b0bec5; line-height: 1.7; }

        /* ── For/Not for ── */
        .lp-for-grid { display: grid; grid-template-columns: 1fr 1fr; }
        @media (max-width: 640px) { .lp-for-grid { grid-template-columns: 1fr; } }
        .lp-for-col { padding: 48px 44px; }
        .lp-for-col.yes { border-right: 1px solid rgba(59,130,246,0.1); }
        @media (max-width: 640px) { .lp-for-col { padding: 36px 20px; } .lp-for-col.yes { border-right: none; border-bottom: 1px solid rgba(59,130,246,0.1); } }
        .lp-for-col-head { font-size: 10px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; margin-bottom: 28px; }
        .yes .lp-for-col-head { color: #3b82f6; }
        .no .lp-for-col-head { color: #94a3b8; }
        .lp-for-items { display: flex; flex-direction: column; gap: 14px; }
        .lp-for-item { display: flex; gap: 14px; align-items: flex-start; font-size: 15px; line-height: 1.65; }
        .yes .lp-for-item { color: #e2e8f0; }
        .no .lp-for-item { color: #94a3b8; }
        .lp-for-mark { flex-shrink: 0; font-size: 12px; font-weight: 700; margin-top: 3px; }
        .yes .lp-for-mark { color: #3b82f6; }
        .no .lp-for-mark { color: #64748b; }

        /* ── Mid & Final CTA ── */
        .lp-cta-block { text-align: center; padding: 88px 48px; }
        @media (max-width: 640px) { .lp-cta-block { padding: 64px 20px; } }

        /* ── Footer ── */
        .lp-footer { border-top: 1px solid rgba(255,255,255,0.05); padding: 36px 48px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; max-width: 1200px; margin: 0 auto; }
        .lp-footer-logo { font-size: 12px; font-weight: 900; letter-spacing: -.02em; color: #94a3b8; display: flex; align-items: center; gap: 7px; }
        .lp-footer-logo span { color: #3b82f6; }
        .lp-footer-links { display: flex; gap: 24px; }
        .lp-footer-links a { font-size: 12px; color: #64748b; text-decoration: none; transition: color .2s; }
        .lp-footer-links a:hover { color: #cbd5e1; }
        .lp-footer-copy { font-size: 12px; color: #64748b; }

        /* ── Global mobile ── */
        @media (max-width: 640px) {
          .lp-container { padding: 0 20px; }
          .lp-container-sm { padding: 0 20px; }
          .lp-section { padding: 72px 0; }
          .lp-nav { padding: 0 20px; }
          .lp-footer { padding: 32px 20px; }
          .lp-pill { font-size: 10px; }
        }
      `}</style>

      <div className="lp-root">

        {/* ── Win modal ── */}
        {selectedWin && (
          <div className="lp-modal-overlay" onClick={() => setSelectedWin(null)}>
            <div className="lp-modal" onClick={e => e.stopPropagation()}>
              <button className="lp-modal-close" onClick={() => setSelectedWin(null)}><IconX /></button>
              <img src={selectedWin.img} alt={selectedWin.stat} className="lp-modal-img" />
              <div className="lp-modal-body">
                {selectedWin.name && <div className="lp-modal-tag">{selectedWin.name}</div>}
                <div className="lp-modal-stat">{selectedWin.stat}</div>
                <p className="lp-modal-detail">{selectedWin.detail}</p>
                {selectedWin.quote && (
                  <div className="lp-modal-quote">
                    <p>&ldquo;{selectedWin.quote}&rdquo;</p>
                  </div>
                )}
                <div className="lp-modal-source">Creator Cult Member — Circle Community</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Nav ── */}
        <nav className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
          <a href="/landing-page" className="lp-nav-logo">
            <LogoMark size={28} />
            Creator Cult
          </a>
          <Link href="/apply" className="lp-nav-cta">
            Apply Now <IconArrow />
          </Link>
        </nav>

        {/* ── Hero ── */}
        <div className="lp-hero">
          {/* Background radial glow */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-30%', left: '15%', width: '70%', height: '110%', background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.08) 0%, transparent 60%)' }} />
            <div style={{ position: 'absolute', bottom: '-20%', right: '0', width: '40%', height: '60%', background: 'radial-gradient(ellipse at bottom right, rgba(99,102,241,0.05) 0%, transparent 55%)' }} />
          </div>
          <div className="lp-hero-left" style={{ position: 'relative', zIndex: 1 }}>
            <Fade>
              <div className="lp-hero-badge">
                <span className="lp-pill-dot" />
                Instagram Growth Coaching
              </div>
            </Fade>
            <Fade delay={80}>
              <h1 className="lp-h1">
                You&apos;ve been<br />
                <span style={{ color: '#ffffff' }}>posting for months.</span><br />
                <span className="lp-blue">{typedText}<span className="lp-cursor">|</span></span>
              </h1>
            </Fade>
            <Fade delay={160}>
              <p className="lp-body-lg" style={{ maxWidth: 500, marginTop: 28 }}>
                Creator Cult is the coaching programme that turns consistent creators into full-time personal brands. A real system. Not recycled advice.
              </p>
            </Fade>
            <Fade delay={240}>
              <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <Link href="/apply" className="lp-cta-primary">
                  Apply for a Spot <IconArrow />
                </Link>
                <span className="lp-dim" style={{ fontSize: 12, fontFamily: 'Inter, sans-serif' }}>Applications reviewed personally.</span>
              </div>
            </Fade>
            <Fade delay={320}>
              {/* Avatar social proof strip */}
              <div className="lp-avatar-row" style={{ marginTop: 32 }}>
                <div className="lp-avatar-stack">
                  {avatarMembers.map((a, i) => (
                    <div key={i} className="lp-avatar" style={{ background: a.bg, marginLeft: i > 0 ? -10 : 0, zIndex: 10 - i }}>
                      {a.initials}
                    </div>
                  ))}
                  <div className="lp-avatar" style={{ background: '#1e293b', marginLeft: -10, zIndex: 4, fontSize: 9 }}>
                    +134
                  </div>
                </div>
                <div className="lp-avatar-text">
                  <strong>140+ creators.</strong> £500K+ in verified wins. Members in 15+ countries.
                </div>
              </div>
            </Fade>
            <Fade delay={400}>
              <div className="lp-hero-stats">
                <div><div className="lp-stat-n">140+</div><div className="lp-stat-l">Creators enrolled</div></div>
                <div><div className="lp-stat-n">350M+</div><div className="lp-stat-l">Combined views</div></div>
                <div><div className="lp-stat-n">1M+</div><div className="lp-stat-l">Combined followers</div></div>
                <div><div className="lp-stat-n">£50K+</div><div className="lp-stat-l">Monthly revenue</div></div>
              </div>
            </Fade>
          </div>
          <div className="lp-hero-photo-col" style={{ position: 'relative', zIndex: 1 }}>
            <img src="/B5D8C241-1826-46EE-898C-A40008641860.jpg" alt="Will Scott — Creator Cult" className="lp-hero-photo" />
            <div className="lp-hero-photo-overlay" />
          </div>
        </div>

        {/* ── Ticker — full bleed ── */}
        <div className="lp-ticker">
          <div className="lp-ticker-track">
            {[...tickerItems, ...tickerItems].map((s, i) => (
              <span key={i} className="lp-tick-item">
                <span className="lp-tick-dot" style={{ marginRight: 12 }}>&#9670;</span>{s}
              </span>
            ))}
          </div>
        </div>

        <div className="lp-page-frame">

        <div className="lp-hr" />

        {/* ── Pain ── */}
        <div className="lp-section">
          <div className="lp-container">
            <Fade><span className="lp-pill"><span className="lp-pill-dot" />The Real Problem</span></Fade>
            <Fade delay={60}>
              <h2 className="lp-h2">You don&apos;t have<br /><span style={{ color: '#ffffff' }}>a content problem.</span></h2>
              <p className="lp-body-lg" style={{ marginTop: 16, maxWidth: 500 }}>You have a system problem. And there&apos;s a difference.</p>
            </Fade>
            <div style={{ marginTop: 56 }}>
              {[
                { n: '01', title: 'You post. Nothing moves.', body: "You try a new format. You copy what worked for someone else. You wait. The numbers don't shift. You wonder if Instagram has it in for you." },
                { n: '02', title: 'Everyone sells you tactics. Nobody gives you a system.', body: "You've watched the free courses. Applied the hooks. You can name every algorithm update this year. Still no clients. Still no income." },
                { n: '03', title: 'The gap between content and income feels impossible.', body: "You're close enough to see that other creators are making it work. You can't work out what they have that you don't. The answer isn't hustle. It's structure." },
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
            <Fade delay={100}>
              <div style={{ marginTop: 56, display: 'flex', justifyContent: 'flex-start' }}>
                <Link href="/apply" className="lp-cta-primary">Get the system. Apply now. <IconArrow /></Link>
              </div>
            </Fade>
          </div>
        </div>

        <div className="lp-hr" />

        {/* ── Story ── */}
        <div className="lp-section">
          <div className="lp-container">
            <div className="lp-story-grid">
              <div>
                <Fade><span className="lp-pill"><span className="lp-pill-dot" />The Origin</span></Fade>
                <Fade delay={60}>
                  <h2 className="lp-h2">412 followers.<br /><span style={{ color: '#ffffff' }}>£20,000 in debt.</span><br /><span style={{ color: '#3b82f6' }}>Delivering pizzas in the evenings.</span></h2>
                </Fade>
                <Fade delay={120}>
                  <div className="lp-story-text" style={{ marginTop: 36 }}>
                    <p>That was me. Not long ago. I was posting every day and getting nowhere. I knew content. I knew marketing theory. I still couldn&apos;t pay my rent with it.</p>
                    <p>I stopped copying tactics and started building a system. A real one. Positioning, story, offer, acquisition. In the right order.</p>
                    <p>Within months, I had clients. Then a waiting list. Then a coaching programme with 140+ creators inside.</p>
                    <p><strong>I didn&apos;t get lucky. I got structured.</strong></p>
                    <p>Creator Cult is the system I wish I&apos;d had in year one. Every phase, every tool, every coaching call — built to shortcut the years I wasted figuring it out alone.</p>
                  </div>
                </Fade>
              </div>
              <Fade delay={100} className="lp-story-card-col">
                <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <img
                    src="/IMG_6327.JPG"
                    alt="Will Scott — transformation"
                    style={{ width: '100%', height: 200, objectFit: 'cover', objectPosition: 'center top', display: 'block', filter: 'brightness(0.88) contrast(1.08) saturate(0.85)' }}
                    loading="lazy"
                  />
                </div>
                <div className="lp-ba-card">
                  <div className="lp-ba-before">
                    <div className="lp-ba-label">Before</div>
                    {[
                      '412 followers',
                      '£20,000 in debt',
                      'Delivering pizzas at night',
                      'Posting daily — zero growth',
                      'No system. No direction.',
                    ].map(t => (
                      <div key={t} className="lp-ba-item">
                        <span className="lp-ba-mark">×</span>{t}
                      </div>
                    ))}
                  </div>
                  <div className="lp-ba-after">
                    <div className="lp-ba-label">Now</div>
                    {[
                      '1M+ followers',
                      '£50K+/month',
                      '140+ clients coached',
                      '350M+ combined views',
                      'Full-time. Fully free.',
                    ].map(t => (
                      <div key={t} className="lp-ba-item">
                        <span className="lp-ba-mark">—</span>{t}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 14, textAlign: 'center', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: '#475569', fontFamily: 'Inter, sans-serif' }}>
                  Will Scott — Founder, Creator Cult
                </div>
              </Fade>
            </div>
          </div>
        </div>

        </div>{/* ── /lp-page-frame 1 ── */}

        {/* ── Community image break — full bleed ── */}
        <div style={{ position: 'relative', height: 'clamp(300px, 38vw, 500px)', overflow: 'hidden' }}>
          <img
            src="/IMG_7050.JPG"
            alt="Creator Cult community"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 55%', filter: 'brightness(0.75) contrast(1.06) saturate(0.85)' }}
            loading="lazy"
          />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(13,13,10,0.25) 0%, rgba(13,13,10,0.65) 80%)' }} />
          <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: 16, fontFamily: 'Inter, sans-serif' }}>The community</div>
            <div style={{ fontSize: 'clamp(26px, 4vw, 52px)', fontWeight: 900, color: '#ffffff', letterSpacing: '-.04em', lineHeight: 1.08, fontFamily: 'Inter, sans-serif', maxWidth: 700 }}>
              140+ creators.<br />One system. One community.
            </div>
            <div style={{ fontSize: 14, color: '#cbd5e1', marginTop: 16, fontFamily: 'Inter, sans-serif' }}>
              Members in 15+ countries. Active every single day.
            </div>
          </div>
        </div>

        <div className="lp-page-frame">{/* ── lp-page-frame 2 ── */}

        {/* ── Programme ── */}
        <div className="lp-section">
          <div className="lp-container">
            <Fade><span className="lp-pill"><span className="lp-pill-dot" />The Programme</span></Fade>
            <Fade delay={60}>
              <h2 className="lp-h2">Five phases.<br /><span style={{ color: '#ffffff' }}>One direction.</span></h2>
              <p className="lp-body-lg" style={{ marginTop: 16, maxWidth: 520 }}>
                Every Creator Cult member goes through the same five phases in order. Skip one and you build on sand. Follow the sequence and the results compound.
              </p>
            </Fade>

            <div className="lp-phase-list">
              {phases.map(({ n, title, desc, items }, i) => (
                <Fade key={n} delay={i * 50}>
                  <div className={`lp-phase-row${n === '—' ? ' lp-support' : ''}`}>
                    <div className="lp-phase-row-num">{n === '—' ? '∞' : n}</div>
                    <div>
                      <div className="lp-phase-row-label">{n === '—' ? 'Throughout' : `Phase ${n}`}</div>
                      <div className="lp-phase-row-title">{title}</div>
                      <div className="lp-phase-row-desc">{desc}</div>
                    </div>
                    <div className="lp-phase-row-bullets">
                      {items.map(item => (
                        <div key={item} className="lp-phase-row-bullet">
                          <span className="lp-phase-row-bmark">—</span>{item}
                        </div>
                      ))}
                    </div>
                  </div>
                </Fade>
              ))}
            </div>

            {/* CTA after phases */}
            <Fade delay={80}>
              <div style={{ textAlign: 'center', paddingTop: 64 }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#94a3b8', marginBottom: 24 }}>
                  Ready to start Phase 01?
                </p>
                <Link href="/apply" className="lp-cta-primary">Apply for a Spot <IconArrow /></Link>
              </div>
            </Fade>
          </div>
        </div>

        <div className="lp-hr" />

        {/* ── Cult Dashboard ── */}
        <div className="lp-section">
          <div className="lp-container">
            <Fade><span className="lp-pill"><span className="lp-pill-dot" />Exclusive to Creator Cult</span></Fade>
            <Fade delay={60}>
              <h2 className="lp-h2">The Cult Dashboard.<br /><span style={{ color: '#ffffff', fontSize: '0.7em', fontWeight: 700, letterSpacing: '-.02em' }}>12 AI tools. Yours when you join.</span></h2>
              <p className="lp-body-lg" style={{ marginTop: 16, maxWidth: 580 }}>
                Every member gets private access to a dashboard built specifically for Creator Cult. 12 AI tools trained on the methodology — including weekly competitor analysis that writes your content ideas for you.
              </p>
            </Fade>

            <Fade delay={100}>
              <div style={{ marginTop: 56, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(59,130,246,0.15)', position: 'relative', boxShadow: '0 0 80px rgba(59,130,246,0.1)', background: '#000' }}>
                {/* Browser chrome bar */}
                <div style={{ background: '#080808', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(255,80,80,0.45)' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(255,185,0,0.4)' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(40,200,70,0.35)' }} />
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: 5, padding: '4px 12px', fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', margin: '0 16px', fontFamily: 'Inter, monospace' }}>
                    cult-dashboard.vercel.app/dashboard
                  </div>
                </div>
                {/* 16:9 YouTube embed */}
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                  <iframe
                    src="https://www.youtube.com/embed/_ZA94MQqnOs?start=10&rel=0&modestbranding=1&color=white"
                    title="Creator Cult Dashboard — Full Walkthrough"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', display: 'block' }}
                  />
                </div>
              </div>
            </Fade>

            <div className="lp-tool-grid">
              {tools.map((t, i) => (
                <Fade key={t.title} delay={i * 50}>
                  <div className="lp-tool-card">
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                      <div className="lp-tool-icon-wrap">{t.icon}</div>
                      {t.badge && <span className="lp-tool-badge">{t.badge}</span>}
                    </div>
                    <div className="lp-tool-title">{t.title}</div>
                    <div className="lp-tool-desc">{t.desc}</div>
                  </div>
                </Fade>
              ))}
            </div>
            <Fade delay={60}>
              <div style={{ textAlign: 'center', paddingTop: 56 }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#94a3b8', marginBottom: 20 }}>
                  Access unlocks when you join Creator Cult.
                </p>
                <Link href="/apply" className="lp-cta-primary">Apply for access <IconArrow /></Link>
              </div>
            </Fade>
          </div>
        </div>

        <div className="lp-hr" />

        {/* ── Results ── */}
        <div className="lp-section">
          <div className="lp-container">
            <Fade><span className="lp-pill"><span className="lp-pill-dot" />The Results</span></Fade>
            <Fade delay={60}>
              <h2 className="lp-h2">What happens when you have<br /><span style={{ color: '#ffffff' }}>a system instead of a strategy.</span></h2>
            </Fade>
          </div>

          {/* Image marquee */}
          <div style={{ marginTop: 56, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="lp-imgmq-wrap">
                <div className="lp-imgmq-track-l">
                  {[...mqRow1, ...mqRow1].map((item, i) => (
                    <div key={i} className="lp-imgmq-card">
                      <div className="lp-imgmq-img-wrap">
                        <img src={item.img} alt={item.win} className="lp-imgmq-img" loading="lazy" />
                      </div>
                      <div className="lp-imgmq-foot">
                        <div className="lp-imgmq-win">{item.win}</div>
                        {item.name && <div className="lp-imgmq-name">{item.name}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div className="lp-imgmq-wrap">
                <div className="lp-imgmq-track-r">
                  {[...mqRow2, ...mqRow2].map((item, i) => (
                    <div key={i} className="lp-imgmq-card">
                      <div className="lp-imgmq-img-wrap">
                        <img src={item.img} alt={item.win} className="lp-imgmq-img" loading="lazy" />
                      </div>
                      <div className="lp-imgmq-foot">
                        <div className="lp-imgmq-win">{item.win}</div>
                        {item.name && <div className="lp-imgmq-name">{item.name}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Win grid — clickable */}
          <div className="lp-container">
            <Fade delay={20}>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 48, marginBottom: 8, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                Click any result to read the full story
              </p>
            </Fade>
            <div className="lp-win-grid">
              {wins.map((win, i) => (
                <Fade key={win.stat + win.name} delay={(i % 3) * 60}>
                  <div className="lp-win-card" onClick={() => setSelectedWin(win)}>
                    <div className="lp-win-img-wrap">
                      <img src={win.img} alt={`${win.name} — ${win.stat}`} className="lp-win-img" loading="lazy" />
                    </div>
                    <div className="lp-win-body">
                      <div className="lp-win-stat">{win.stat}</div>
                      <div className="lp-win-detail">{win.detail}</div>
                      {win.name && <div className="lp-win-name">{win.name}</div>}
                      {win.quote && <div className="lp-win-expand-hint">Read their story <IconArrow /></div>}
                    </div>
                  </div>
                </Fade>
              ))}
            </div>
            <Fade delay={80}>
              <p style={{ textAlign: 'center', fontSize: 12, color: '#64748b', marginTop: 28, letterSpacing: '.06em', fontFamily: 'Inter, sans-serif' }}>
                Real results from real Creator Cult members. Individual results vary.
              </p>
            </Fade>
          </div>
        </div>

        <div className="lp-hr" />

        {/* ── Community Reviews ── */}
        <div className="lp-section" style={{ background: 'rgba(59,130,246,0.01)' }}>
          <div className="lp-container">
            <Fade><span className="lp-pill"><span className="lp-pill-dot" />From The Community</span></Fade>
            <Fade delay={60}>
              <h2 className="lp-h2">What members<br /><span style={{ color: '#ffffff' }}>are saying.</span></h2>
              <p className="lp-body-lg" style={{ marginTop: 16, maxWidth: 520 }}>
                Posted in the private Creator Cult Circle community. Unedited.
              </p>
            </Fade>
            <div className="lp-reviews-grid">
              {reviews.map((r, i) => (
                <Fade key={r.name} delay={i * 60}>
                  <div className="lp-review-card">
                    <div className="lp-review-header">
                      <div className="lp-review-avatar" style={{ background: r.color }}>
                        {r.initials}
                      </div>
                      <div>
                        <div className="lp-review-name">{r.name}</div>
                        <div className="lp-review-role">{r.role}</div>
                      </div>
                    </div>
                    <div className="lp-review-stars">
                      {[1,2,3,4,5].map(s => <IconStarFill key={s} />)}
                    </div>
                    <span className="lp-review-metric">{r.metric}</span>
                    <p className="lp-review-quote">&ldquo;{r.quote}&rdquo;</p>
                    <div className="lp-review-source">Verified · Circle Community</div>
                  </div>
                </Fade>
              ))}
            </div>
            <Fade delay={80}>
              <div style={{ textAlign: 'center', paddingTop: 56 }}>
                <Link href="/apply" className="lp-cta-primary">Join the programme <IconArrow /></Link>
              </div>
            </Fade>
          </div>
        </div>

        {/* ── 5-Star ratings strip ── */}
        <div style={{ padding: '56px 0', borderTop: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          <div className="lp-container">
            <Fade>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                <div style={{ display: 'flex', gap: 3 }}>{[1,2,3,4,5].map(s => <IconStarFill key={s} />)}</div>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>Verified reviews</span>
              </div>
            </Fade>
          </div>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingLeft: 'max(24px, calc((100vw - 1200px) / 2 + 48px))', paddingRight: 48, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            {[
              { img: '/testimonials/IMG_8034.jpeg', name: 'reenzo',           text: 'Will is an absolute goat of the coaching industry. 10/10 course recommendation.' },
              { img: '/testimonials/IMG_8033.jpeg', name: 'FreeYourMind',     text: 'Very insightful course and Will is actively implicated and invested in delivering the most value!' },
              { img: '/testimonials/IMG_8032.jpeg', name: 'Kyriakos Parpas',  text: 'Just starting out with his Course and i feel like its a steal from the value and the hours he is put down, absolutely great.' },
              { img: '/testimonials/IMG_8031.jpeg', name: 'Matt Neems',       text: 'Looks great so far and extremely grateful that this is available at no cost.' },
              { img: '/testimonials/IMG_8036.jpeg', name: 'Ed Kershaw',       text: 'Insanely good free value' },
              { img: '/testimonials/IMG_8037.jpeg', name: 'Jacob B Smith',    text: 'Comprehensive and competitive, Useful and Thorough' },
            ].map((r, i) => (
              <div key={i} style={{ flexShrink: 0, width: 'clamp(240px, 30vw, 300px)', background: '#ffffff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
                <img src={r.img} alt={`${r.name} review`} style={{ width: '100%', height: 'auto', display: 'block' }} loading="lazy" />
              </div>
            ))}
          </div>
        </div>

        </div>{/* ── /lp-page-frame 2 ── */}

        {/* ── Cinematic quote break — full bleed ── */}
        <div style={{ position: 'relative', height: 'clamp(280px, 36vw, 460px)', overflow: 'hidden' }}>
          <img
            src="/IMG_8083.JPG"
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', filter: 'brightness(0.85) contrast(1.04) saturate(0.85)' }}
            loading="lazy"
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(13,13,10,0.88) 0%, rgba(13,13,10,0.4) 55%, rgba(13,13,10,0.72) 100%)' }} />
          <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 clamp(20px,8vw,120px)', maxWidth: 720 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: 20, fontFamily: 'Inter, sans-serif' }}>The result of the system</div>
            <div style={{ fontSize: 'clamp(28px, 4.5vw, 58px)', fontWeight: 900, color: '#ffffff', letterSpacing: '-.04em', lineHeight: 1.05, fontFamily: 'Inter, sans-serif' }}>
              &ldquo;I didn&apos;t get lucky.<br />I got structured.&rdquo;
            </div>
            <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 20, fontFamily: 'Inter, sans-serif', letterSpacing: '.04em' }}>
              Will Scott — Founder, Creator Cult
            </div>
          </div>
        </div>

        <div className="lp-page-frame">{/* ── lp-page-frame 3 ── */}

        {/* ── What's Included ── */}
        <div className="lp-section">
          <div className="lp-container">
            <Fade><span className="lp-pill"><span className="lp-pill-dot" />What You Get</span></Fade>
            <Fade delay={60}><h2 className="lp-h2">Everything<br /><span style={{ color: '#ffffff' }}>in one place.</span></h2></Fade>
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
              <h2 className="lp-h2" style={{ marginBottom: 56 }}>This is for you.<br /><span className="lp-dim">This is not for everyone.</span></h2>
            </Fade>
            <div style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="lp-for-grid">
                <Fade>
                  <div className="lp-for-col yes">
                    <div className="lp-for-col-head">Creator Cult is for you if</div>
                    <div className="lp-for-items">
                      {["You've been posting consistently but you're not seeing income", "You know content but you don't have a business system around it", "You want to be full-time as a creator within 12 months", "You're willing to put in the work and follow a proven process", "You want support, not just another course to watch alone", "You're ready to treat your content like a business, not a hobby"].map(s => (
                        <div key={s} className="lp-for-item"><span className="lp-for-mark">—</span>{s}</div>
                      ))}
                    </div>
                  </div>
                </Fade>
                <Fade delay={100}>
                  <div className="lp-for-col no">
                    <div className="lp-for-col-head">Not the right fit if</div>
                    <div className="lp-for-items">
                      {["You're expecting overnight results without putting in real effort", "You're not willing to invest in your own growth", "You want a magic content formula. This is a business system.", "You're not able to commit time each week to implement", "You just started posting and haven't tested what works yet", "You're looking for someone to do it all for you"].map(s => (
                        <div key={s} className="lp-for-item"><span className="lp-for-mark">×</span>{s}</div>
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
        <div className="lp-cta-block">
          <Fade>
            <span className="lp-pill" style={{ marginBottom: 20 }}><span className="lp-pill-dot" />Apply</span>
            <h2 className="lp-h2" style={{ marginBottom: 20 }}>Ready to stop figuring<br /><span style={{ color: '#ffffff' }}>it out alone?</span></h2>
            <p className="lp-body-lg" style={{ marginBottom: 36 }}>Applications take 3 minutes. No commitment to apply.<br />Will reviews every one personally.</p>
            <Link href="/apply" className="lp-cta-primary">Apply for a Spot <IconArrow /></Link>
          </Fade>
        </div>

        <div className="lp-hr" />

        {/* ── FAQ ── */}
        <div className="lp-section">
          <div className="lp-container-sm">
            <Fade><span className="lp-pill"><span className="lp-pill-dot" />FAQ</span></Fade>
            <Fade delay={60}><h2 className="lp-h2" style={{ marginBottom: 56 }}>Common questions.</h2></Fade>
            <Fade delay={100}>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <Faq q="What exactly do I get when I join Creator Cult?" a="You get access to the full 5-phase curriculum, weekly live group coaching calls with recordings, 1:1 access to Will between calls, content and offer reviews, the Cult Dashboard with all 12 AI tools, and the private Circle community. Ongoing support at every stage." />
                <Faq q="How long does the programme run?" a="Creator Cult is an ongoing coaching programme. Most clients see their first real results within 30 to 60 days of starting. There is no set end date. You stay in as long as you are growing." />
                <Faq q="Do I need a big following to join?" a="No. Several of our members signed their first clients with under 1,000 followers. Following size does not determine your results. Your system does. We build the system first." />
                <Faq q="How much time do I need to commit each week?" a="Expect to block 5 to 8 hours per week: content creation, implementation, and the weekly coaching call. Less than that and progress slows. You do not need more than that to see results." />
                <Faq q="Is this just another course?" a="No. The curriculum is part of it, but Creator Cult is a coaching programme. You have live weekly calls, 1:1 access to Will, a community of 140+ active creators, and the Cult Dashboard AI tools. The course is the structure. The coaching is where you actually move forward." />
                <Faq q="How does the weekly group coaching work?" a="Every week we host live group coaching calls where you bring your content and business challenges. You get real-time feedback on your brand strategy, content audits, offer positioning, and scaling decisions. Can't make it live? You get access to all past recordings too." />
                <Faq q="What if I've tried coaching before and it didn't work?" a="That is worth talking about in your application. A lot of creators who come to Creator Cult have been through generic social media courses or coaching that gave them tactics without a system. If your previous experience did not work, tell us why in your application. Will reads every one." />
                <Faq q="Who is this NOT for?" a="This isn't for people looking for quick fixes, those hoping someone else will do the work, anyone not willing to show up and implement, or creators allergic to accountability and feedback. You need to be ready to invest 6 months into building something real." />
              </div>
            </Fade>
          </div>
        </div>

        <div className="lp-hr" />

        {/* ── Final CTA ── */}
        <div className="lp-cta-block" style={{ padding: '120px 48px', position: 'relative', overflow: 'hidden' }}>
          <img
            src="/19241A27-9CDA-4FE2-8DBF-066F8E62E29E.jpg"
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 60%', filter: 'brightness(0.25) saturate(0.5) contrast(1.1)' }}
            loading="lazy"
          />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center bottom, rgba(13,13,10,0.4) 0%, rgba(13,13,10,0.85) 65%, rgba(13,13,10,0.98) 100%)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <Fade>
              <span className="lp-pill" style={{ marginBottom: 24 }}><span className="lp-pill-dot" />One last thing</span>
              <h2 className="lp-h2" style={{ marginBottom: 20 }}>Stop posting<br /><span style={{ color: '#ffffff' }}>into the void.</span></h2>
              <p className="lp-body-lg" style={{ marginBottom: 44, maxWidth: 480, margin: '0 auto 44px' }}>
                You&apos;re three minutes away from finding out if Creator Cult is the right fit. Apply now. No commitment. No sales call unless you want one.
              </p>
              <Link href="/apply" className="lp-cta-primary">Apply for a Spot <IconArrow /></Link>
              <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap' }}>
                {['Takes 3 minutes', 'Reviewed personally by Will', 'No commitment to apply'].map(c => (
                  <span key={c} className="lp-dim" style={{ fontSize: 12, letterSpacing: '.08em', fontFamily: 'Inter, sans-serif' }}>— {c}</span>
                ))}
              </div>
            </Fade>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="lp-footer">
          <div className="lp-footer-logo">
            <LogoMark size={22} />
            Creator Cult
          </div>
          <div className="lp-footer-links">
            <a href="/privacy">Privacy</a>
            <a href="/data-deletion">Data Deletion</a>
            <Link href="/apply">Apply</Link>
          </div>
          <div className="lp-footer-copy">© {new Date().getFullYear()} Creator Cult</div>
        </div>

      </div>
      </div>
    </>
  )
}
