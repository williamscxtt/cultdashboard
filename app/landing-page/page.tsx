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
import ResultsShowcase from './ResultsShowcase'
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
    images: [
      {
        src: '/testimonials/testimonial-brett-first-client-3weeks.jpeg',
        alt: 'Brett reporting his first paying client within three weeks of joining Creator Cult',
      },
    ],
    name: 'Brett',
    result: 'First paying client within 3 weeks',
    context: 'Joined Creator Cult three weeks before sharing the win.',
    story: 'Brett shared that he had landed his first paying client four days before posting this update, within three weeks of joining Creator Cult.',
  },
  {
    images: [
      {
        src: '/testimonials/testimonial-asfand-first-client.png',
        alt: 'Asfand reporting his first online coaching client after launching Instagram',
      },
    ],
    name: 'Asfand',
    result: 'First client in his first week',
    context: 'A newly launched Instagram and a lead from his DMs.',
    story: 'Asfand launched his Instagram, moved a qualified lead from an Instagram DM to WhatsApp, and signed his first online coaching client that same week.',
  },
  {
    images: [
      {
        src: '/testimonials/testimonial-tom-600-to-1300-followers.jpeg',
        alt: 'Tom reporting growth from 600 to 1,300 followers in one week',
      },
    ],
    name: 'Tom',
    result: '600 to 1,300 followers in one week',
    context: 'Around 300 followers came in a single day.',
    story: 'Tom added 700 followers in one week while his first videos began reaching 20,000 views. His update shows the exact numbers in his own words.',
  },
  {
    images: [
      {
        src: '/testimonials/testimonial-bile-first-2-clients.jpg',
        alt: 'Bile reporting his first two clients after applying the content strategy',
      },
      {
        src: '/testimonials/testimonial-bile-third-client.jpg',
        alt: 'Bile reporting his third client at 600 euros per month',
      },
    ],
    name: 'Bile',
    result: 'First 3 clients signed',
    context: 'The third was €600 a month for three months.',
    story: 'Bile applied the content strategy, improved his bio and personal brand, and signed his first two clients. He then added a third at €600 per month on a three-month contract.',
  },
  {
    images: [
      {
        src: '/testimonials/testimonial-gabrielle-1k-followers.jpg',
        alt: 'Gabrielle reporting her first 100,000 views and passing 1,000 followers',
      },
      {
        src: '/testimonials/testimonial-gabrielle-first-100k-views.jpg',
        alt: 'Gabrielle sharing the insights from her first reel over 100,000 views',
      },
    ],
    name: 'Gabrielle',
    result: 'First 100K views + 1K followers',
    context: 'Her profile reached 1,125 followers and 14.9K likes.',
    story: 'Gabrielle shared her first Instagram reel to pass 100,000 views, then followed it with a profile update showing she had passed 1,000 followers.',
  },
  {
    images: [
      {
        src: '/testimonials/testimonial-michael-10k-day.jpeg',
        alt: 'Michael showing 10,000 dollars in gross volume in one day',
      },
      {
        src: '/testimonials/testimonial-first-client-1942.png',
        alt: 'Michael sharing the payment from his first 2,000 dollar client',
      },
      {
        src: '/testimonials/testimonial-michael-5k-pif.jpeg',
        alt: 'Michael sharing a 5,000 dollar paid-in-full coaching sale',
      },
      {
        src: '/testimonials/testimonial-michael-1m-views-30days.png',
        alt: 'Michael showing 1 million Instagram views in 30 days',
      },
    ],
    name: 'Michael',
    result: '$10K day + 1M views in 30 days',
    context: 'From a first $2K client to a $5K paid-in-full offer.',
    story: 'Michael shared a clear progression: his first $2,000 client, a $5,000 paid-in-full offer, $10,000 in gross volume in one day, and 1 million profile views in 30 days.',
  },
  {
    images: [
      {
        src: '/testimonials/testimonial-matte-first-payout-500.jpeg',
        alt: 'Matte sharing his first 500 euro coaching payout',
      },
    ],
    name: 'Matte',
    result: 'First €500 coaching payout',
    context: 'One month of coaching sold.',
    story: 'Matte shared the successful €500 transaction as his first payout after selling one month of his coaching.',
  },
  {
    images: [
      {
        src: '/testimonials/testimonial-jakub-reels-views.jpg',
        alt: 'Jakub showing a reel at 114,000 views and several other high-performing reels',
      },
    ],
    name: 'Jakub',
    result: 'A reel reached 114K views',
    context: 'Other reels reached 47K, 12.6K, 5.5K and 4.6K.',
    story: 'Jakub shared a grid of reels as his Instagram began picking up, led by one at 114,000 views and supported by several more with thousands of views.',
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
    items: ['Weekly live coaching with me', '1:1 feedback between calls'],
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
  'First paying client within 3 weeks',
  '600 to 1,300 followers in one week',
  '$10K day + 1M views in 30 days',
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
      'Choose one payment of $997 USD or £740 GBP, or three instalments of $333 USD or £250 GBP. Both options give you six months of full access.',
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
                  Six months for <strong>$997 USD / £740 GBP</strong>, or choose 3 instalments. Secure checkout.
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
          <ResultsShowcase results={results} />
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
          <div className={styles.storyStats} aria-label="My creator business results">
            <div><strong>1.5M+</strong><span>followers online</span></div>
            <div><strong>£500K+</strong><span>revenue generated</span></div>
            <div><strong>£50K</strong><span>months reached</span></div>
          </div>
          <div className={styles.storyGrid}>
            <div className={styles.storyCopy}>
              <p className={styles.eyebrow}>Why my story matters</p>
              <h2>I was delivering pizzas with <span>£20K of debt.</span></h2>
              <p>
                I did not have a team, a big budget, or a famous name. I had 412 followers, a phone, and a job I did not want to be doing forever.
              </p>
              <p>
                I spent two years learning how to turn fitness content into attention, attention into trust, and trust into a real business. That system took me past 1.5 million followers, generated more than £500K in revenue, and got me to £50K months.
              </p>
              <p>
                Creator Cult is the playbook I wish I had at the start, with coaching and tools to stop you wasting the same time I did.
              </p>
              <PurchaseButton className={styles.textCta}>Build your system <ArrowRight size={17} /></PurchaseButton>
            </div>
            <div className={styles.storyVisual}>
              <div className={styles.storyImageWrap}>
                <Image
                  src="/B5D8C241-1826-46EE-898C-A40008641860.jpg"
                  alt="Will Scott after building his personal brand and creator business"
                  fill
                  sizes="(max-width: 800px) 92vw, 44vw"
                  className={styles.storyImage}
                />
              </div>
              <div className={styles.storyCaption}>Same person. Better system.</div>
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

      <section
        className={`${styles.section} ${styles.pricingSection}`}
        id="pricing"
        aria-labelledby="pricing-title"
      >
        <div className={styles.container}>
          <div className={styles.pricingGrid}>
            <div className={styles.pricingCopy}>
              <p className={styles.eyebrow}>Join Creator Cult</p>
              <h2 id="pricing-title">Stop figuring it out <span>alone.</span></h2>
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
              <h3 className={styles.paymentHeading}>Choose how you pay</h3>
              <p className={styles.paymentIntro}>The access is identical. Pick the option that works best for you.</p>
              <div className={styles.paymentOptions}>
                <article className={`${styles.paymentOption} ${styles.paymentOptionFeatured}`}>
                  <div className={styles.paymentOptionTop}>
                    <h4>Pay in full</h4>
                    <span>Best value</span>
                  </div>
                  <div className={styles.currencyPrices} role="group" aria-label="$997 USD or £740 GBP">
                    <div className={styles.currencyPrice}>
                      <strong>$997</strong>
                      <span>USD</span>
                    </div>
                    <span className={styles.currencyOr}>or</span>
                    <div className={styles.currencyPrice}>
                      <strong>£740</strong>
                      <span>GBP</span>
                    </div>
                  </div>
                  <p className={styles.paymentDescription}>One payment for the full six-month membership.</p>
                  <a
                    className={styles.checkoutCta}
                    href="https://commas.com/checkout/qLkzpmpZrFYjbX7L"
                    data-checkout-plan="pay-in-full"
                    aria-label="Pay in full: $997 USD or £740 GBP"
                  >
                    Pay in full <ArrowRight size={17} />
                  </a>
                </article>

                <article className={styles.paymentOption}>
                  <div className={styles.paymentOptionTop}>
                    <h4>3 instalments</h4>
                    <span>Split the cost</span>
                  </div>
                  <div
                    className={styles.currencyPrices}
                    role="group"
                    aria-label="Three instalments of $333 USD or £250 GBP"
                  >
                    <div className={styles.currencyPrice}>
                      <strong>3 × $333</strong>
                      <span>USD</span>
                    </div>
                    <span className={styles.currencyOr}>or</span>
                    <div className={styles.currencyPrice}>
                      <strong>3 × £250</strong>
                      <span>GBP</span>
                    </div>
                  </div>
                  <p className={styles.paymentDescription}>Three payments while keeping the same six months of access.</p>
                  <a
                    className={styles.checkoutCta}
                    href="https://commas.com/checkout/n69wWQYTD3Hnl7"
                    data-checkout-plan="instalments"
                    aria-label="Pay in three instalments of $333 USD or £250 GBP"
                  >
                    Choose 3 instalments <ArrowRight size={17} />
                  </a>
                </article>
              </div>
              <div className={styles.priceRule} />
              <p className={styles.includedLabel}>Both payment options include:</p>
              <ul>
                <li><Check size={16} /> Full 5-phase Creator Cult course</li>
                <li><Check size={16} /> Weekly live coaching with me</li>
                <li><Check size={16} /> 1:1 feedback between calls</li>
                <li><Check size={16} /> Private Circle community</li>
                <li><Check size={16} /> Cult Dashboard with 12 AI tools</li>
                <li><Check size={16} /> Weekly strategy packages</li>
              </ul>
              <p className={styles.checkoutNote}><LockKeyhole size={13} /> Secure checkout. Instant access with either option.</p>
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
          <span className={styles.finalPrice}>$997 USD / £740 GBP once, or 3 instalments of $333 USD / £250 GBP.</span>
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
        <div><strong>$997 / £740</strong><span>6 months access</span></div>
        <PurchaseButton className={styles.mobileCta}>Join now <ArrowRight size={16} /></PurchaseButton>
      </div>
    </main>
  )
}
