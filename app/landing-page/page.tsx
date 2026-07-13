import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Check,
  CirclePlay,
  LockKeyhole,
  Sparkles,
  Target,
  Users,
  Video,
  WandSparkles,
} from 'lucide-react'
import PurchaseButton from './PurchaseButton'
import styles from './landing.module.css'

export const metadata: Metadata = {
  title: 'Creator Cult | Turn Your Content Into a Business',
  description:
    'The complete coaching system for fitness creators who are already posting and ready to grow, sign clients, and build income from their personal brand.',
  openGraph: {
    title: 'Creator Cult | Stop Posting and Going Nowhere',
    description:
      'Course, weekly coaching, direct support, private community, and the Cult Dashboard. One membership. One system.',
    images: ['/will-hero-2.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Creator Cult | Turn Your Content Into a Business',
    description:
      'The complete system for fitness creators who want views, clients, and a business that can replace their job.',
    images: ['/will-hero-2.jpg'],
  },
}

const results = [
  {
    image: '/testimonials/testimonial-brett-first-client-3weeks.jpeg',
    name: 'Brett',
    result: 'First client in 3 weeks',
    start: '18 months stuck with no paying clients.',
  },
  {
    image: '/testimonials/testimonial-asfand-first-client.png',
    name: 'Asfand',
    result: 'First client in 7 days',
    start: 'Launched on Monday. Closed on Friday.',
  },
  {
    image: '/testimonials/testimonial-tom-600-to-1300-followers.jpeg',
    name: 'Tom',
    result: '0 to 10K followers in 1 month',
    start: 'Plus his first £2,000 client.',
  },
  {
    image: '/testimonials/testimonial-zack-instagram-growth.jpg',
    name: 'Zack',
    result: '0 to 100K+ followers',
    start: 'Built the audience in four months.',
  },
  {
    image: '/testimonials/testimonial-matte-first-payout-500.jpeg',
    name: 'Matte',
    result: 'First €500 payout',
    start: 'First income from his content.',
  },
  {
    image: '/testimonials/testimonial-michael-10k-day.jpeg',
    name: 'Michael',
    result: 'Multiple $10K days',
    start: 'Then consistent £50K months.',
  },
]

const problems = [
  {
    icon: WandSparkles,
    title: 'You never know what to post.',
    copy: 'You open Instagram, stare at a blank screen, then copy another creator and hope it works.',
  },
  {
    icon: BarChart3,
    title: 'Your reels die below 1,000 views.',
    copy: 'You are posting consistently. The effort is real. The reach is not moving.',
  },
  {
    icon: Video,
    title: 'You still feel awkward on camera.',
    copy: 'You overthink every word, do twenty takes, and never sound like yourself.',
  },
  {
    icon: Target,
    title: 'Followers are not becoming clients.',
    copy: 'Even when people watch, there is no clear offer or system that gets them to buy.',
  },
]

const included = [
  {
    number: '01',
    icon: CirclePlay,
    title: 'The system',
    copy: 'A clear sequence that takes you from scattered content to a business people understand and trust.',
    items: ['Complete 5-phase curriculum', 'Weekly strategy packages'],
  },
  {
    number: '02',
    icon: Users,
    title: 'The coaching',
    copy: 'Bring your content, offer, and blockers. Leave every week knowing exactly what to improve next.',
    items: ['Weekly live coaching with Will', '1:1 feedback between calls'],
  },
  {
    number: '03',
    icon: Sparkles,
    title: 'The execution layer',
    copy: 'The tools, people, and accountability that turn what you learn into consistent action.',
    items: ['Private community of 140+ creators', 'Cult Dashboard with 12 AI tools'],
  },
]

const tickerItems = [
  'First client in 7 days',
  '0 to 10K followers in 1 month',
  'Multiple $10K days',
  '140+ creators inside',
]

const phases = [
  {
    number: '01',
    label: 'Foundations',
    title: 'Make people understand why they should follow you.',
    copy: 'Lock in your niche, positioning, message, and offer. Stop trying to be interesting to everyone.',
  },
  {
    number: '02',
    label: 'Build the brand',
    title: 'Create content people stop, watch, and remember.',
    copy: 'Build hooks, stories, and repeatable formats around your real life. You do not need a crazy transformation story.',
  },
  {
    number: '03',
    label: 'Get clients',
    title: 'Turn attention into conversations and sales.',
    copy: 'Use lead magnets, DMs, sales calls, and follow-ups without sounding desperate or fake.',
  },
  {
    number: '04',
    label: 'Monetise',
    title: 'Build an offer people are happy to pay for.',
    copy: 'Set the outcome, price, delivery, and proof. Then learn how to sell it with confidence.',
  },
  {
    number: '05',
    label: 'Scale',
    title: 'Build a business that does not own every hour.',
    copy: 'Batch content, systemise sales, improve delivery, and create the route out of your job.',
  },
]

const faqs = [
  {
    question: 'Is this for complete beginners?',
    answer:
      'Creator Cult is built for people who have already started posting but are going nowhere. You do not need a big following or paying clients yet. You do need to be ready to post, implement, and get feedback.',
  },
  {
    question: 'Do I need a dramatic transformation story?',
    answer:
      'No. This is one of the biggest fears inside the community. We help you find the useful stories, opinions, experience, and proof you already have. Authentic beats polished.',
  },
  {
    question: 'What exactly happens when I join?',
    answer:
      'Payment unlocks the full five-phase course, weekly coaching, direct support, the private Circle community, and the Cult Dashboard. There is no application and no sales call.',
  },
  {
    question: 'How does the pricing work?',
    answer:
      'Your first payment is £997 for six months of full access. After the first six months, access continues at £150 per month. You can cancel the ongoing membership at any time.',
  },
  {
    question: 'How much time do I need each week?',
    answer:
      'Plan for five to eight focused hours per week for content, implementation, and coaching. The aim is to make the time you already spend creating finally count.',
  },
  {
    question: 'What if I have tried another course before?',
    answer:
      'This is not a course you binge and forget. The lessons give you the system. Weekly coaching, direct feedback, the community, and the Dashboard help you actually use it.',
  },
  {
    question: 'Does this only work for fitness creators?',
    answer:
      'The core system works across personal brands, but Creator Cult is designed first for fitness creators, online coaches, and face-to-face PTs moving online.',
  },
]

function Logo() {
  return (
    <span className={styles.logo} aria-label="Creator Cult">
      <Image src="/icon.svg" alt="" width={32} height={32} className={styles.logoImage} />
      <span>Creator Cult</span>
    </span>
  )
}

function SectionIntro({ eyebrow, title, copy }: { eyebrow: string; title: React.ReactNode; copy?: string }) {
  return (
    <div className={styles.sectionIntro}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2>{title}</h2>
      {copy ? <p className={styles.sectionCopy}>{copy}</p> : null}
    </div>
  )
}

export default function LandingPage() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Main navigation">
        <div className={styles.navInner}>
          <a href="#top" className={styles.logoLink}>
            <Logo />
          </a>
          <div className={styles.navStatus}>
            <span className={styles.liveDot} />
            <strong>Creator Cult is open</strong>
            <span>Instant access</span>
          </div>
          <div className={styles.navActions}>
            <Link href="/login" className={styles.loginLink}>
              Client login
            </Link>
            <PurchaseButton className={styles.navCta}>Join now</PurchaseButton>
          </div>
        </div>
      </nav>

      <section className={styles.hero} id="top">
        <div className={styles.heroGlow} />
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.heroTag}>For fitness coaches posting and going nowhere</p>
              <h1>
                <span className={styles.heroTitleLine}>Stop winging it.</span>
                <span className={styles.heroTitleMuted}>
                  <span className={styles.heroTitleLine}>Build the system that</span>{' '}
                  <span className={styles.heroTitleLine}>gets you paid.</span>
                </span>
              </h1>
              <p className={styles.heroLead}>
                Turn what you know into content that grows, an offer people want, and a personal brand that can replace your job.
              </p>
              <div className={styles.heroActions}>
                <PurchaseButton className={styles.primaryCta}>
                  Join Creator Cult <ArrowRight size={17} />
                </PurchaseButton>
                <a href="#results" className={styles.secondaryCta}>
                  See member results <ArrowDown size={16} />
                </a>
              </div>
              <div className={styles.priceNote}>
                <LockKeyhole size={14} />
                <span>
                  <strong>£997</strong> for 6 months, then £150/month. Secure checkout.
                </span>
              </div>
              <div className={styles.heroTrust}>
                <div className={styles.avatarStack} aria-hidden="true">
                  <span>FW</span>
                  <span>BC</span>
                  <span>TK</span>
                  <span>+137</span>
                </div>
                <p>
                  <strong>140+ creators</strong>
                  <span>building inside Creator Cult</span>
                </p>
              </div>
            </div>

            <div className={styles.heroVisual}>
              <div className={styles.heroImageWrap}>
                <Image
                  src="/will-hero-2.jpg"
                  alt="Will Scott filming content for Creator Cult"
                  fill
                  priority
                  sizes="(max-width: 800px) 92vw, 42vw"
                  className={styles.heroImage}
                />
                <div className={styles.heroImageShade} />
              </div>
              <div className={`${styles.floatCard} ${styles.floatTop}`}>
                <span className={styles.floatIcon}><BarChart3 size={16} /></span>
                <span><strong>500M+</strong> combined views</span>
              </div>
              <div className={`${styles.floatCard} ${styles.floatBottom}`}>
                <span className={styles.floatIcon}><Target size={16} /></span>
                <span><strong>£500K+</strong> verified member wins</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.proofTicker} aria-label="Creator Cult member highlights">
        <div className={styles.tickerTrack}>
          {[false, true].map((duplicate) => (
            <div className={styles.tickerGroup} aria-hidden={duplicate || undefined} key={duplicate ? 'duplicate' : 'original'}>
              {tickerItems.map((item) => (
                <span className={styles.tickerItem} key={`${duplicate}-${item}`}>
                  <i /> {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section className={styles.section} id="results">
        <div className={styles.container}>
          <SectionIntro
            eyebrow="Proof before promises"
            title={<>They started where <span>you are now.</span></>}
            copy="Small audiences. Inconsistent views. No clear offer. These are real Creator Cult wins, from first clients to serious scale."
          />
          <div className={styles.resultGrid}>
            {results.map((item) => (
              <article className={styles.resultCard} key={`${item.name}-${item.result}`}>
                <div className={styles.resultImageWrap}>
                  <Image
                    src={item.image}
                    alt={`${item.name}: ${item.result}`}
                    fill
                    sizes="(max-width: 680px) 44vw, (max-width: 1000px) 45vw, 30vw"
                    className={styles.resultImage}
                  />
                </div>
                <div className={styles.resultText}>
                  <p>{item.name}</p>
                  <h3>{item.result}</h3>
                  <span>{item.start}</span>
                </div>
              </article>
            ))}
          </div>
          <p className={styles.disclaimer}>Member results vary. These examples are not a promise of what every member will achieve.</p>
        </div>
      </section>

      <section className={`${styles.section} ${styles.problemSection}`}>
        <div className={styles.container}>
          <SectionIntro
            eyebrow="Be honest with yourself"
            title={<>You do not have a motivation problem. <span>You have a system problem.</span></>}
            copy="You are already doing the hard bit. You are showing up. Creator Cult makes sure that effort finally has a direction."
          />
          <div className={styles.problemGrid}>
            {problems.map(({ icon: Icon, title, copy }) => (
              <article className={styles.problemCard} key={title}>
                <span className={styles.cardIcon}><Icon size={20} /></span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
          <div className={styles.bridgeCard}>
            <span className={styles.bridgeNumber}>01</span>
            <div className={styles.bridgeCopy}>
              <p>The missing piece</p>
              <h3>You already know how to coach. <span>Now build the business around it.</span></h3>
              <small>Creator Cult connects your knowledge to positioning, content, an offer, and a sales system.</small>
            </div>
            <PurchaseButton className={styles.bridgeCta}>Build the system <ArrowRight size={17} /></PurchaseButton>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.storySection}`}>
        <div className={styles.container}>
          <div className={styles.storyGrid}>
            <div className={styles.storyVisual}>
              <div className={styles.storyImageWrap}>
                <Image
                  src="/IMG_6327.JPG"
                  alt="Will Scott before and after building his personal brand"
                  fill
                  sizes="(max-width: 800px) 92vw, 44vw"
                  className={styles.storyImage}
                />
              </div>
              <div className={styles.storyCaption}>Same person. Better system.</div>
            </div>
            <div className={styles.storyCopy}>
              <p className={styles.eyebrow}>Why Will&apos;s story matters</p>
              <h2>I was delivering pizzas with <span>£20K of debt.</span></h2>
              <p>
                I did not have a team, a big budget, or a famous name. I had 412 followers, a phone, and a job I did not want to be doing forever.
              </p>
              <p>
                I spent two years learning how to turn fitness content into attention, attention into trust, and trust into a real business. That system took me past 1 million followers and to £30K months.
              </p>
              <p>
                Creator Cult is the playbook I wish I had at the start, with coaching and tools to stop you wasting the same time I did.
              </p>
              <div className={styles.storyStats}>
                <div><strong>412</strong><span>starting followers</span></div>
                <div><strong>1M+</strong><span>followers built</span></div>
                <div><strong>£30K</strong><span>months reached</span></div>
              </div>
              <PurchaseButton className={styles.textCta}>Build your system <ArrowRight size={17} /></PurchaseButton>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} id="inside">
        <div className={styles.container}>
          <SectionIntro
            eyebrow="Everything you need"
            title={<>One membership. <span>The whole system.</span></>}
            copy="No tiers. No hidden upgrade. You get the education, feedback, community, and tools from day one."
          />
          <div className={styles.includedGrid}>
            {included.map(({ number, icon: Icon, title, copy, items }) => (
              <article className={styles.includedCard} key={number}>
                <div className={styles.includedTop}>
                  <span className={styles.cardIcon}><Icon size={20} /></span>
                  <span className={styles.cardNumber}>{number}</span>
                </div>
                <h3>{title}</h3>
                <p>{copy}</p>
                <ul>
                  {items.map((item) => <li key={item}><Check size={14} /> {item}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.roadmapSection}`}>
        <div className={styles.container}>
          <SectionIntro
            eyebrow="Your roadmap"
            title={<>From posting randomly to <span>building on purpose.</span></>}
            copy="The curriculum follows five phases. Each one fixes the problem that would otherwise hold back the next."
          />
          <div className={styles.phaseList}>
            {phases.map((phase) => (
              <article className={styles.phase} key={phase.number}>
                <div className={styles.phaseNumber}>{phase.number}</div>
                <div className={styles.phaseBody}>
                  <p>{phase.label}</p>
                  <h3>{phase.title}</h3>
                  <span>{phase.copy}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.objectionSection}`}>
        <div className={styles.container}>
          <div className={styles.objectionCard}>
            <p className={styles.eyebrow}>The thought keeping you stuck</p>
            <h2>“My life is not interesting enough.”</h2>
            <p>
              You do not need a wild before-and-after. You do not need perfect camera confidence. You do not need thousands of followers.
            </p>
            <p>
              You need a clear point of view, useful proof, and a system that turns your real experience into content people care about.
            </p>
            <div className={styles.objectionQuote}>
              <span>Most members said the same thing on day one.</span>
              <strong>They started anyway.</strong>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.pricingSection}`} id="pricing">
        <div className={styles.container}>
          <div className={styles.pricingGrid}>
            <div className={styles.pricingCopy}>
              <p className={styles.eyebrow}>Join Creator Cult</p>
              <h2>Stop figuring it out <span>alone.</span></h2>
              <p>
                Six months gives you enough time to build the foundation, publish with purpose, create your offer, and learn how to sell it.
              </p>
              <div className={styles.pricingProof}>
                <div><strong>140+</strong><span>creators inside</span></div>
                <div><strong>15+</strong><span>countries</span></div>
                <div><strong>500M+</strong><span>combined views</span></div>
              </div>
            </div>
            <div className={styles.priceCard}>
              <div className={styles.priceCardGlow} />
              <p className={styles.priceLabel}>Six months of full access</p>
              <div className={styles.price}>
                <span>£997</span>
                <p>one payment</p>
              </div>
              <p className={styles.renewal}>Then £150/month to continue. Cancel anytime.</p>
              <div className={styles.priceRule} />
              <ul>
                <li><Check size={16} /> Full 5-phase Creator Cult course</li>
                <li><Check size={16} /> Weekly live coaching with Will</li>
                <li><Check size={16} /> 1:1 feedback between calls</li>
                <li><Check size={16} /> Private Circle community</li>
                <li><Check size={16} /> Cult Dashboard with 12 AI tools</li>
                <li><Check size={16} /> Weekly strategy packages</li>
              </ul>
              <PurchaseButton className={styles.purchaseCta}>
                Join Creator Cult <ArrowRight size={18} />
              </PurchaseButton>
              <p className={styles.checkoutNote}><LockKeyhole size={13} /> Secure checkout. Instant access on payment.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} id="faq">
        <div className={styles.containerSmall}>
          <SectionIntro eyebrow="Questions, answered" title={<>Before you <span>talk yourself out of it.</span></>} />
          <div className={styles.faqList}>
            {faqs.map(({ question, answer }, index) => (
              <details className={styles.faqItem} key={question} open={index === 0}>
                <summary>
                  <span>{question}</span>
                  <span className={styles.faqPlus} aria-hidden="true" />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div className={styles.finalGlow} />
        <div className={styles.containerSmall}>
          <Logo />
          <p className={styles.eyebrow}>Your next post can be another guess</p>
          <h2>Or it can be the first move in a <span>real system.</span></h2>
          <p>Join Creator Cult today. No application. No sales call. Start as soon as you pay.</p>
          <PurchaseButton className={styles.primaryCta}>Join Creator Cult <ArrowRight size={17} /></PurchaseButton>
          <span className={styles.finalPrice}>£997 for 6 months, then £150/month.</span>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Logo />
          <div className={styles.footerLinks}>
            <a href="https://www.instagram.com/williamscxtt" target="_blank" rel="noreferrer">Instagram</a>
            <Link href="/privacy">Privacy</Link>
            <Link href="/data-deletion">Data deletion</Link>
            <Link href="/login">Client login</Link>
          </div>
          <p>© {new Date().getFullYear()} Creator Cult</p>
        </div>
      </footer>

      <div className={styles.mobileBar}>
        <div><strong>£997</strong><span>6 months access</span></div>
        <PurchaseButton className={styles.mobileCta}>Join now <ArrowRight size={16} /></PurchaseButton>
      </div>
    </main>
  )
}
