'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowRight, Check, X, ChevronDown,
  Zap, Brain, FileText, BarChart3, MessageSquare,
  TrendingUp, Users, Star, Shield, Layers, Sparkles,
} from 'lucide-react'

/* ─── Scroll-reveal hook ────────────────────────────────────────────── */
function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true) },
      { threshold }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return { ref, visible }
}

function Reveal({
  children, className = '', delay = 0, y = 28,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  y?: number
}) {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : `translateY(${y}px)`,
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

/* ─── FAQ accordion ─────────────────────────────────────────────────── */
function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-white/10 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-white/[0.03] transition-colors"
      >
        <span className="font-semibold text-white pr-4">{q}</span>
        <ChevronDown
          className="w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-300"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      {open && (
        <div className="px-6 pb-6 text-gray-400 leading-relaxed border-t border-white/10 pt-4 text-sm">
          {a}
        </div>
      )}
    </div>
  )
}

/* ─── Win card ──────────────────────────────────────────────────────── */
function WinCard({
  name, stat, detail, delay = 0,
}: {
  name: string; stat: string; detail: string; delay?: number
}) {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref}
      className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 flex flex-col gap-3 hover:border-blue-500/30 hover:bg-white/[0.06] transition-all duration-300"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
      }}
    >
      <div className="text-blue-400 font-bold text-2xl leading-tight">{stat}</div>
      <p className="text-gray-300 text-sm leading-relaxed flex-1">{detail}</p>
      <div className="text-gray-600 text-xs font-medium">{name}</div>
    </div>
  )
}

/* ─── Phase card ────────────────────────────────────────────────────── */
function PhaseCard({
  num, title, desc, items, delay = 0,
}: {
  num: string; title: string; desc: string; items: string[]; delay?: number
}) {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref}
      className="relative bg-white/[0.03] border border-white/10 rounded-2xl p-7 hover:border-blue-500/20 hover:bg-white/[0.05] transition-all duration-300"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      <div className="text-blue-500/40 font-bold text-sm mb-4 tracking-widest uppercase">
        Phase {num}
      </div>
      <h3 className="font-bold text-xl text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm mb-5 leading-relaxed">{desc}</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm text-gray-300">
            <Check className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ─── Dashboard feature card ────────────────────────────────────────── */
function ToolCard({
  icon: Icon, title, desc, badge,
}: {
  icon: React.ElementType; title: string; desc: string; badge?: string
}) {
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 flex flex-col gap-4 hover:border-blue-500/30 hover:bg-white/[0.06] transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-blue-400" />
        </div>
        {badge && (
          <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <div>
        <div className="font-semibold text-white mb-1">{title}</div>
        <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ── Sticky Nav ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(0,0,0,0.90)' : 'transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-lg tracking-tight">
            <span className="text-blue-400">CREATOR</span>
            <span className="text-white"> CULT</span>
          </div>
          <Link
            href="/apply"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            Apply Now
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-40 pb-28 px-6 overflow-hidden">
        {/* Glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(59,130,246,0.12) 0%, transparent 70%)',
          }}
        />

        <div className="max-w-4xl mx-auto text-center relative">
          <Reveal>
            <div className="inline-flex items-center gap-2 text-blue-400 text-xs font-semibold tracking-widest uppercase mb-8 border border-blue-500/20 bg-blue-500/8 px-4 py-2 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              Instagram Growth Coaching
            </div>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight mb-8">
              You&apos;ve been posting
              <br />
              for months.
              <br />
              <span className="text-blue-400">You&apos;re still clocking in.</span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="text-gray-400 text-xl md:text-2xl leading-relaxed max-w-2xl mx-auto mb-10">
              Creator Cult is the coaching programme that turns consistent creators into full-time personal brands.
              A real system. Not recycled advice.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/apply"
                className="flex items-center gap-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg px-8 py-4 rounded-2xl transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(59,130,246,0.35)]"
              >
                Apply for a Spot
                <ArrowRight className="w-5 h-5" />
              </Link>
              <p className="text-gray-500 text-sm">
                Applications reviewed manually. No commitment to apply.
              </p>
            </div>
          </Reveal>

          {/* Proof numbers */}
          <Reveal delay={320}>
            <div className="mt-16 flex flex-wrap items-center justify-center gap-8 md:gap-16">
              {[
                { n: '40+', label: 'Creators Enrolled' },
                { n: '24M', label: 'Views Generated' },
                { n: '5K', label: 'Followers in 10 Days' },
                { n: '£1,950', label: 'Revenue in 3 Days' },
              ].map(({ n, label }) => (
                <div key={label} className="text-center">
                  <div className="text-3xl font-extrabold text-white">{n}</div>
                  <div className="text-gray-500 text-sm mt-1">{label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Social proof ticker ── */}
      <section className="py-6 border-y border-white/5">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-500">
          {[
            'Freddie: £1,950 in 3 days',
            'Eddie: 5K followers in 10 days',
            'Dino: 24M views in 3 weeks',
            'Brett: first client in 3 weeks',
            'Asfand: first client in 7 days',
            'Michael: $10K month',
            'Tom: monetised within 30 days',
            'Roy: 6K followers in 6 weeks',
          ].map((s) => (
            <span key={s} className="flex items-center gap-2 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* ── Pain ── */}
      <section className="py-28 px-6">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-6">
              The Real Problem
            </p>
          </Reveal>
          <Reveal delay={60}>
            <h2 className="text-4xl md:text-5xl font-extrabold leading-tight mb-10">
              You don&apos;t have a content problem.
              <br />
              <span className="text-gray-400">You have a system problem.</span>
            </h2>
          </Reveal>

          <div className="space-y-6">
            {[
              {
                title: 'You post. Nothing moves.',
                body: 'You try a new format. You copy what worked for someone else. You wait. The numbers don\'t shift. You wonder if Instagram has it in for you.',
              },
              {
                title: 'Everyone sells you tactics. Nobody gives you a system.',
                body: 'You\'ve watched the free courses. You\'ve applied the hooks. You can name every algorithm update this year. Still no clients. Still no income.',
              },
              {
                title: 'The gap between content and income feels impossible.',
                body: 'You\'re close enough to see that other creators are making it work. You can\'t work out what they have that you don\'t. The answer isn\'t hustle. It\'s structure.',
              },
            ].map(({ title, body }, i) => (
              <Reveal key={title} delay={i * 80}>
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-7 hover:border-blue-500/20 transition-colors">
                  <h3 className="font-bold text-white text-lg mb-3">{title}</h3>
                  <p className="text-gray-400 leading-relaxed">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Will's Story ── */}
      <section className="py-28 px-6 border-y border-white/5">
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(59,130,246,0.07) 0%, transparent 70%)' }}
        />
        <div className="max-w-3xl mx-auto relative">
          <Reveal>
            <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-6">
              Why I Built This
            </p>
          </Reveal>
          <Reveal delay={60}>
            <h2 className="text-4xl md:text-5xl font-extrabold leading-tight mb-10">
              412 followers.
              <br />
              £20,000 in debt.
              <br />
              <span className="text-gray-400">Delivering pizzas in the evenings.</span>
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <div className="space-y-5 text-gray-300 leading-relaxed text-lg">
              <p>
                That was me. Not long ago. I was posting every day and getting nowhere. I knew content. I knew marketing theory. I still couldn&apos;t pay my rent with it.
              </p>
              <p>
                I stopped copying tactics and started building a system. A real one. Positioning, story, offer, acquisition. In the right order.
              </p>
              <p>
                Within months, I had clients. Then a waiting list. Then a coaching programme with 40+ creators inside.
              </p>
              <p className="font-semibold text-white">
                I didn&apos;t get lucky. I got structured.
              </p>
              <p>
                Creator Cult is the system I wish I&apos;d had in year one. Every phase, every tool, every coaching call. Built to shortcut the years I wasted figuring it out alone.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── The System ── */}
      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-4">
                The Programme
              </p>
              <h2 className="text-4xl md:text-5xl font-extrabold leading-tight">
                Five phases. One direction.
                <br />
                <span className="text-gray-400">Full-time creator.</span>
              </h2>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            <PhaseCard
              num="1"
              title="Foundations"
              desc="Before you create content, you need clarity. Most creators skip this. It costs them everything."
              items={[
                'Niche and ICP precision. Who you serve and what they need.',
                'Positioning statement that makes you the obvious choice',
                'Brand voice and content identity',
                'Offer foundations. What you sell before you sell anything.',
              ]}
              delay={0}
            />
            <PhaseCard
              num="2"
              title="Build the Brand"
              desc="Content that builds authority, attracts the right people, and makes them follow for a reason."
              items={[
                'Hook writing and the psychology behind stopping thumbs',
                'Content frameworks that convert viewers into followers',
                'Story-driven content that sells without selling',
                'Reel strategy tied directly to your offer',
              ]}
              delay={80}
            />
            <PhaseCard
              num="3"
              title="Client Acquisition"
              desc="Followers mean nothing if you can&apos;t convert them. This phase builds the machine."
              items={[
                'DM strategy that turns comments into conversations',
                'Discovery call frameworks and objection handling',
                'Lead magnet creation and comment-keyword funnels',
                'First client delivery: get paid before you have a product',
              ]}
              delay={160}
            />
            <PhaseCard
              num="4"
              title="Monetisation Mastery"
              desc="Turn a trickle of clients into a consistent, scalable income stream."
              items={[
                'High-ticket offer structuring and pricing',
                'Upsell and retention systems for existing clients',
                'Instagram sales psychology: urgency, scarcity, trust',
                'Revenue goal planning with real numbers',
              ]}
              delay={240}
            />
            <PhaseCard
              num="5"
              title="Scale and Systems"
              desc="Build the infrastructure that lets the business run without burning out."
              items={[
                'Content batching and weekly production workflow',
                'Setter and team onboarding foundations',
                'Automation for DMs, leads, and client delivery',
                'From full-time employee to full-time creator',
              ]}
              delay={320}
            />
            {/* Bonus card */}
            <Reveal delay={400}>
              <div className="bg-blue-500/10 border border-blue-500/25 rounded-2xl p-7 flex flex-col justify-between h-full">
                <div>
                  <div className="text-blue-400 font-bold text-sm mb-4 tracking-widest uppercase">
                    Throughout
                  </div>
                  <h3 className="font-bold text-xl text-white mb-3">Ongoing Support</h3>
                  <p className="text-blue-100/70 text-sm leading-relaxed mb-5">
                    You&apos;re not going through this alone. Every week, every question, every plateau.
                  </p>
                </div>
                <ul className="space-y-2">
                  {[
                    'Weekly group coaching calls',
                    'Private Circle community',
                    '1:1 support and feedback',
                    'Content and offer reviews',
                    'The Cult Dashboard (see below)',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-blue-100/80">
                      <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Cult Dashboard ── */}
      <section className="py-28 px-6 border-y border-white/5 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(59,130,246,0.06) 0%, transparent 70%)',
          }}
        />
        <div className="max-w-6xl mx-auto relative">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-4">
                Exclusive to Creator Cult
              </p>
              <h2 className="text-4xl md:text-5xl font-extrabold leading-tight mb-5">
                The Cult Dashboard.
                <br />
                <span className="text-gray-400">Your AI-powered growth engine.</span>
              </h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Every client gets access to a private dashboard built specifically for Creator Cult members.
                AI tools trained on our methodology. Not generic. Not ChatGPT with a system prompt.
                Purpose-built for your business.
              </p>
            </div>
          </Reveal>

          {/* Dashboard preview mockup */}
          <Reveal delay={80}>
            <div
              className="rounded-3xl border border-white/10 overflow-hidden mb-12"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                backdropFilter: 'blur(8px)',
              }}
            >
              {/* Fake browser bar */}
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/8 bg-white/[0.02]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                </div>
                <div className="flex-1 mx-4 bg-white/5 rounded-lg px-3 py-1 text-xs text-gray-600 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500/40 flex-shrink-0" />
                  cult-dashboard.vercel.app/dashboard
                </div>
              </div>
              {/* Mockup content */}
              <div className="p-8 grid md:grid-cols-3 gap-4">
                {[
                  {
                    label: 'AI Story Generator',
                    status: 'Generating slide 3 of 7...',
                    color: 'text-blue-400',
                    bar: 43,
                  },
                  {
                    label: 'Lead Magnet Generator',
                    status: '3 ideas ready to review',
                    color: 'text-green-400',
                    bar: 100,
                  },
                  {
                    label: 'Profile Audit',
                    status: 'Report complete',
                    color: 'text-purple-400',
                    bar: 100,
                  },
                ].map(({ label, status, color, bar }) => (
                  <div key={label} className="bg-white/[0.04] border border-white/8 rounded-xl p-5">
                    <div className={`text-xs font-semibold uppercase tracking-widest mb-2 ${color}`}>{label}</div>
                    <div className="text-white text-sm mb-4">{status}</div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${bar}%`,
                          background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Tool grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Reveal delay={0}>
              <ToolCard
                icon={Brain}
                title="AI Story Generator"
                desc="Input your niche, your offer, and your audience. Get a full Instagram story sequence built around your specific positioning: hooks, slides, and CTA. Not a template. A custom sequence."
                badge="Most Used"
              />
            </Reveal>
            <Reveal delay={60}>
              <ToolCard
                icon={FileText}
                title="Lead Magnet Generator"
                desc="Choose your angle. The AI builds a complete lead magnet brief: title, concept, outline, and a ready-to-paste caption CTA with comment keyword. Start converting followers into leads this week."
              />
            </Reveal>
            <Reveal delay={120}>
              <ToolCard
                icon={BarChart3}
                title="Profile Audit AI"
                desc="Feed in your Instagram URL. Get a structured audit: bio clarity, CTA strength, offer visibility, content gaps. Know exactly what to fix and in what order."
              />
            </Reveal>
            <Reveal delay={180}>
              <ToolCard
                icon={MessageSquare}
                title="Content Library"
                desc="Every training, resource, and framework in one searchable library. Organised by phase. No hunting through Notion docs or Slack threads to find what you need."
              />
            </Reveal>
            <Reveal delay={240}>
              <ToolCard
                icon={Layers}
                title="Offer Builder"
                desc="Step through your offer structure with AI guidance. Deliverables, transformation, price point, positioning. Build an offer that actually sells before you launch it."
              />
            </Reveal>
            <Reveal delay={300}>
              <ToolCard
                icon={TrendingUp}
                title="Reel Analytics"
                desc="See which of your reels are pulling the most views, track hooks that work, and spot content patterns. All inside your dashboard, connected to your profile data."
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Client Wins ── */}
      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-4">
                Real Results
              </p>
              <h2 className="text-4xl md:text-5xl font-extrabold leading-tight">
                What happens when you have
                <br />
                <span className="text-blue-400">a system instead of a strategy.</span>
              </h2>
            </div>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <WinCard
              name="Freddie"
              stat="£1,950 in 3 days"
              detail="Joined Creator Cult with no offer and no clients. Used the Client Acquisition phase to build and launch his first package. £1,950 in the first three days."
              delay={0}
            />
            <WinCard
              name="Eddie"
              stat="5,000 followers in 10 days"
              detail="Applied the Brand Build phase to his fitness content. Reworked his positioning, rewrote his hooks, and hit 5,000 new followers in 10 days. First paying client came from that growth."
              delay={80}
            />
            <WinCard
              name="Dino"
              stat="24 million views in 3 weeks"
              detail="Three weeks after joining, Dino hit 24 million views using the content frameworks from Phase 2. His DMs turned into discovery calls within days."
              delay={160}
            />
            <WinCard
              name="Brett"
              stat="First client in 3 weeks"
              detail="Had been posting for 18 months with zero clients. Went through Foundations, rebuilt his positioning from scratch, and signed his first coaching client in 3 weeks."
              delay={240}
            />
            <WinCard
              name="Asfand"
              stat="First client in 7 days"
              detail="Used the DM acquisition scripts and lead magnet framework from Phase 3. Had his first paid client within a week of implementing. No following required."
              delay={320}
            />
            <WinCard
              name="Michael"
              stat="$10,000 month"
              detail="Scaled from inconsistent one-off clients to a recurring $10K month by restructuring his offer and applying the Monetisation Mastery phase to his existing audience."
              delay={400}
            />
          </div>

          <Reveal delay={80}>
            <div className="mt-12 text-center">
              <p className="text-gray-500 text-sm">
                Results vary. These are real outcomes from real Creator Cult members.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── What's Included ── */}
      <section className="py-28 px-6 border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-4">
                What You Get
              </p>
              <h2 className="text-4xl md:text-5xl font-extrabold leading-tight">
                Everything in one place.
              </h2>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-5">
            {[
              {
                icon: Star,
                title: 'The 5-Phase Curriculum',
                desc: 'Foundations to Scale. Every lesson, framework, and exercise structured in the order that actually works. Self-paced but guided.',
              },
              {
                icon: Users,
                title: 'Weekly Group Coaching Calls',
                desc: 'Live calls every week. Bring your questions, your content, your blockers. Will reviews your work live and tells you exactly what to fix.',
              },
              {
                icon: Zap,
                title: 'The Cult Dashboard',
                desc: 'Private access to all six AI tools built for Creator Cult members. Story Generator, Lead Magnet Generator, Profile Audit, Offer Builder, and more.',
              },
              {
                icon: MessageSquare,
                title: 'Private Circle Community',
                desc: '40+ creators at different stages, all working the same system. Post wins, ask for feedback, get accountability. Active every day.',
              },
              {
                icon: Shield,
                title: '1:1 Support',
                desc: 'Direct access to Will between calls. Post your content for review, ask for offer feedback, get unstuck fast. Not a bot. Not a VA.',
              },
              {
                icon: TrendingUp,
                title: 'Weekly Strategy Packages',
                desc: "Every week you get a curated strategy package: what's working on Instagram right now, content angles to test, and a plan for the next 7 days.",
              },
            ].map(({ icon: Icon, title, desc }, i) => (
              <Reveal key={title} delay={i * 60}>
                <div className="flex gap-5 bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:border-blue-500/20 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="font-bold text-white mb-1.5">{title}</div>
                    <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── For / Not For ── */}
      <section className="py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-extrabold leading-tight">
                This is for you.
                <br />
                <span className="text-gray-400">This is not for everyone.</span>
              </h2>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6">
            {/* For */}
            <Reveal delay={0}>
              <div className="bg-blue-500/8 border border-blue-500/20 rounded-2xl p-8">
                <div className="flex items-center gap-2 mb-6">
                  <Check className="w-5 h-5 text-blue-400" />
                  <span className="font-bold text-blue-300 text-lg">Creator Cult is for you if...</span>
                </div>
                <ul className="space-y-4">
                  {[
                    "You've been posting consistently but you're not seeing income",
                    "You know content but you don't have a business system around it",
                    "You want to be full-time as a creator within 12 months",
                    "You're willing to put in the work and follow a proven process",
                    "You want support, not just another course to watch alone",
                    "You're ready to treat your content like a business, not a hobby",
                  ].map((s) => (
                    <li key={s} className="flex items-start gap-3 text-blue-100/80 text-sm leading-relaxed">
                      <Check className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            {/* Not for */}
            <Reveal delay={100}>
              <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-8">
                <div className="flex items-center gap-2 mb-6">
                  <X className="w-5 h-5 text-gray-500" />
                  <span className="font-bold text-gray-400 text-lg">Not the right fit if...</span>
                </div>
                <ul className="space-y-4">
                  {[
                    "You're expecting overnight results without putting in real effort",
                    "You're not willing to invest in your own growth",
                    "You want a magic content formula. This is a business system.",
                    "You're not able to commit time each week to implement",
                    "You just started posting and haven't tested what works yet",
                    "You're looking for someone to do it all for you",
                  ].map((s) => (
                    <li key={s} className="flex items-start gap-3 text-gray-500 text-sm leading-relaxed">
                      <X className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Mid-page CTA ── */}
      <section className="py-20 px-6 border-y border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-5">
              Ready to stop figuring it out alone?
            </h2>
            <p className="text-gray-400 mb-8">
              Applications take 3 minutes. No commitment to apply. Will reviews every one personally.
            </p>
            <Link
              href="/apply"
              className="inline-flex items-center gap-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg px-8 py-4 rounded-2xl transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(59,130,246,0.35)]"
            >
              Apply for a Spot
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-28 px-6">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-4">FAQ</p>
              <h2 className="text-4xl font-extrabold">Common questions.</h2>
            </div>
          </Reveal>

          <Reveal delay={60}>
            <div className="space-y-3">
              <Faq
                q="How long does the programme run?"
                a="Creator Cult is an ongoing coaching programme. Most clients see their first real results (followers, leads, or revenue) within 30 to 60 days of starting. There is no set end date. You stay in as long as you are growing."
              />
              <Faq
                q="Do I need a big following to join?"
                a="No. Several of our members signed their first clients with under 1,000 followers. Following size does not determine your results. Your system does. We build the system first."
              />
              <Faq
                q="How much time do I need to commit each week?"
                a="Expect to block 5 to 8 hours per week: content creation, implementation, and the weekly coaching call. Less than that and progress slows. You do not need more than that to see results."
              />
              <Faq
                q="What platforms does this work for?"
                a="The programme is built primarily around Instagram. The frameworks, tools, and coaching are all Instagram-first. If you are cross-posting to TikTok or YouTube, the positioning and offer work translates. Instagram is the core focus."
              />
              <Faq
                q="Is this just another course?"
                a="No. The curriculum is part of it, but Creator Cult is a coaching programme. You have live weekly calls, 1:1 access to Will, a community of active creators, and the Cult Dashboard AI tools. The course is the structure. The coaching is where you actually move forward."
              />
              <Faq
                q="What if I've tried coaching before and it didn't work?"
                a="That is worth talking about in your application. A lot of creators who come to Creator Cult have been through generic social media courses or coaching that gave them tactics without a system. That is the exact gap this is built to fill. If your previous experience did not work, tell us why in your application. Will reads every one."
              />
              <Faq
                q="How do I apply?"
                a="Click the Apply button and fill in the short form. It takes about 3 minutes. Will reviews it personally. If it is a fit, you will hear back within 48 hours."
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(59,130,246,0.10) 0%, transparent 70%)',
          }}
        />
        <div className="max-w-3xl mx-auto text-center relative">
          <Reveal>
            <h2 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6">
              Stop posting into
              <br />
              <span className="text-blue-400">the void.</span>
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <p className="text-gray-400 text-xl leading-relaxed mb-10 max-w-xl mx-auto">
              You&apos;re three minutes away from finding out if Creator Cult is the right fit.
              Apply now. No commitment. No sales call unless you want one.
            </p>
          </Reveal>
          <Reveal delay={160}>
            <Link
              href="/apply"
              className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xl px-10 py-5 rounded-2xl transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(59,130,246,0.4)]"
            >
              Apply for a Spot
              <ArrowRight className="w-6 h-6" />
            </Link>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-blue-500" /> Takes 3 minutes
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-blue-500" /> Reviewed personally by Will
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-blue-500" /> No commitment to apply
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/8 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <div className="font-bold text-white/60">
            <span className="text-blue-400/70">CREATOR</span> CULT
          </div>
          <div className="flex gap-6">
            <a href="/privacy" className="hover:text-gray-400 transition-colors">Privacy Policy</a>
            <a href="/data-deletion" className="hover:text-gray-400 transition-colors">Data Deletion</a>
            <Link href="/apply" className="hover:text-gray-400 transition-colors">Apply</Link>
          </div>
          <div className="text-gray-700">
            &copy; {new Date().getFullYear()} Creator Cult. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  )
}
