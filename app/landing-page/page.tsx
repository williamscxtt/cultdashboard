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
      'Course, monthly coaching, personal feedback in the member chat, private community, and the Cult Dashboard. One membership. One system.',
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
    category: 'growth' as const,
    images: [
      {
        src: '/testimonials/dino-14m-views.png',
        alt: 'Dino reporting 14 million views three weeks after joining Creator Cult',
      },
      {
        src: '/testimonials/dino-24m-views-5k-followers.png',
        alt: 'Dino reporting 24 million views and 5,000 more followers in a later update',
      },
    ],
    name: 'Dino',
    result: '14M views—then 24M',
    context: 'He added 5,000 followers in a later update.',
    story: 'Dino used the dashboard data, simplified his positioning, tested new hooks, and shared 14 million views three weeks after joining. His next update showed 24 million views and another 5,000 followers.',
  },
  {
    category: 'growth' as const,
    images: [
      {
        src: '/testimonials/zack-10k-followers.png',
        alt: 'Zack reporting that his Instagram grew from 1,500 to 10,000 followers',
      },
    ],
    name: 'Zack',
    result: '1.5K to 10K followers',
    context: 'A 6.6× increase from where he started.',
    story: 'Zack joined at roughly 1,500 followers and shared the moment his Instagram passed 10,000.',
  },
  {
    category: 'growth' as const,
    images: [
      {
        src: '/testimonials/eddie-5k-followers-10-days.png',
        alt: 'Eddie reporting 5,000 new followers in ten days after two reels went viral',
      },
    ],
    name: 'Eddie',
    result: '5K followers in 10 days',
    context: 'One reel brought in 4,600 followers from 258K views.',
    story: 'Eddie posted daily, had two reels break out, and used the performance data to identify which style of content attracted the right followers.',
  },
  {
    category: 'growth' as const,
    images: [
      {
        src: '/testimonials/janne-first-100k-german.png',
        alt: 'Janne reporting the first 100,000-view reel on her new German Instagram account',
      },
      {
        src: '/testimonials/janne-1k-followers.png',
        alt: 'Janne reporting 1,000 followers two and a half weeks after starting her German account',
      },
    ],
    name: 'Janne',
    result: '100K views—then 1K followers',
    context: 'Built a new German account in two and a half weeks.',
    story: 'Janne used the head-reels formula on a new German-language account, reached her first 100,000-view reel, and passed 1,000 followers within two and a half weeks.',
  },
  {
    category: 'growth' as const,
    images: [
      {
        src: '/testimonials/gabrielle-first-million-views.png',
        alt: 'Gabrielle reporting her first Instagram reel to reach one million views',
      },
      {
        src: '/testimonials/testimonial-gabrielle-first-100k-views.jpg',
        alt: 'Gabrielle sharing the insights from her first reel over 100,000 views',
      },
    ],
    name: 'Gabrielle',
    result: 'First 100K—then first 1M',
    context: 'The million-view reel also brought in roughly 1,000 followers.',
    story: 'Gabrielle first shared a reel passing 100,000 views and her account crossing 1,000 followers. She later returned with her first one-million-view Instagram reel.',
  },
  {
    category: 'growth' as const,
    images: [
      {
        src: '/testimonials/roy-first-million-views.png',
        alt: 'Roy showing the insights for his first Instagram reel to reach one million views',
      },
    ],
    name: 'Roy',
    result: 'First video with 1M views',
    context: 'The reel generated more than 770 profile actions.',
    story: 'Roy shared the Reel Insights screen when his first video passed one million views.',
  },
  {
    category: 'growth' as const,
    images: [
      {
        src: '/testimonials/asher-1-4m-views.png',
        alt: 'Asher reporting 1.4 million views, 45,700 interactions and 656 new followers in one month',
      },
    ],
    name: 'Asher',
    result: '1.4M views in one month',
    context: 'Four videos passed 100K views.',
    story: 'Asher reported his first sales call alongside four videos over 100,000 views. His Instagram dashboard showed 1.4 million views, 45,700 interactions, and 656 new followers for the month.',
  },
  {
    category: 'revenue' as const,
    images: [
      {
        src: '/testimonials/michael-10k-day-clean.png',
        alt: 'Michael showing 10,000 dollars in gross volume in one day',
      },
      {
        src: '/testimonials/michael-9k-before-noon.png',
        alt: 'Michael showing 9,000 dollars in sales before noon',
      },
      {
        src: '/testimonials/michael-5k-pif-clean.png',
        alt: 'Michael sharing a 5,000 dollar paid-in-full coaching sale',
      },
      {
        src: '/testimonials/testimonial-first-client-1942.png',
        alt: 'Michael sharing the payment from his first 2,000 dollar client',
      },
    ],
    name: 'Michael',
    result: 'First $2K client to a $10K day',
    context: 'Including $5K paid in full and $9K before noon.',
    story: 'Michael shared the progression in his own updates: a first $2,000 client, a $5,000 paid-in-full sale, $9,000 before noon, and a $10,000 day.',
  },
  {
    category: 'revenue' as const,
    images: [
      {
        src: '/testimonials/tom-6k-followers-first-clients.png',
        alt: 'Tom reporting almost 6,000 followers in two months and his first paid clients',
      },
      {
        src: '/testimonials/testimonial-tom-600-to-1300-followers.jpeg',
        alt: 'Tom reporting early growth from 600 to 1,300 followers in one week',
      },
    ],
    name: 'Tom',
    result: 'Nearly 6K followers + first clients',
    context: 'Two months after starting at roughly 600 followers.',
    story: 'Tom first shared a jump from 600 to 1,300 followers in one week. Two months later he reported almost 6,000 followers, inbound coaching enquiries, and his first paid clients.',
  },
  {
    category: 'revenue' as const,
    images: [
      {
        src: '/testimonials/freddie-first-two-signups.png',
        alt: 'Freddie sharing his first two programme sign-ups at 975 pounds each',
      },
      {
        src: '/testimonials/freddie-new-client-june-5.png',
        alt: 'Freddie sharing a new 1,500 pound client payment',
      },
      {
        src: '/testimonials/freddie-new-client-june-10.png',
        alt: 'Freddie sharing another new 1,500 pound client payment',
      },
    ],
    name: 'Freddie',
    result: 'Two £975 sales—then £1.5K clients',
    context: 'He kept closing at his new price after the first two sign-ups.',
    story: 'Freddie shared his first two programme sales at £975 each. He later posted two separate £1,500 client payments as he continued selling the upgraded offer.',
  },
  {
    category: 'revenue' as const,
    images: [
      {
        src: '/testimonials/brett-first-client-3weeks-clean.png',
        alt: 'Brett reporting his first paying client within three weeks of joining Creator Cult',
      },
    ],
    name: 'Brett',
    result: 'First paying client within 3 weeks',
    context: 'The client signed four days before he posted the update.',
    story: 'Brett joined Creator Cult, began posting consistently, starting conversations, and making the offer. He landed his first high-ticket paying client within three weeks.',
  },
  {
    category: 'revenue' as const,
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
    category: 'revenue' as const,
    images: [
      {
        src: '/testimonials/aaron-first-client.png',
        alt: 'Aaron reporting his first client and showing the programme setup payment',
      },
    ],
    name: 'Aaron',
    result: 'First client signed',
    context: 'He shared the initial programme setup payment.',
    story: 'Aaron shared his first client win as the first payment for the programme came through.',
  },
  {
    category: 'revenue' as const,
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
    copy: 'Bring your content, offer, and blockers to the live call—or share them in the member chat. I will personally point you towards the next move.',
    items: ['Monthly live coaching and Q&A', 'Personal feedback from me in the member chat'],
  },
  {
    number: '03',
    icon: Sparkles,
    title: 'The execution layer',
    copy: 'The tools, people, and accountability that turn what you learn into consistent action.',
    items: ['Private community of 160+ creators', 'Cult Dashboard with 12 AI tools'],
  },
]

const tickerItems = [
  '24M views + 5K followers',
  'First paying client within 3 weeks',
  '5K followers in 10 days',
  '$10K day',
  'First reel to 1M views',
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
      'Payment unlocks the full five-phase course, monthly live coaching, the private Circle community, the Cult Dashboard, and a member chat where you can ask questions and get personal feedback from me. There is no application and no sales call.',
  },
  {
    question: 'How does the pricing work?',
    answer:
      'Choose $97 USD or £79 GBP per month, or pay $970 USD or £790 GBP for a full year. The annual option gives you two months free, and both options unlock the same membership.',
  },
  {
    question: 'How much time do I need each week?',
    answer:
      'Plan for five to eight focused hours per week for content, implementation, and coaching. The aim is to make the time you already spend creating finally count.',
  },
  {
    question: 'What if I have tried another course before?',
    answer:
      'This is not a course you binge and forget. The lessons give you the system. Live coaching, personal feedback in the member chat, the community, and the Dashboard help you actually use it.',
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
                  Join for <strong>$97 USD / £79 GBP per month</strong>, or save with annual access.
                </span>
              </div>
              <div className={styles.heroTrust}>
                <div className={styles.avatarStack} aria-hidden="true">
                  <span>FW</span>
                  <span>BC</span>
                  <span>TK</span>
                  <span>+157</span>
                </div>
                <p>
                  <strong>160+ creators</strong>
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
            eyebrow="Real members. Real receipts."
            title={<>Not theory. <span>Proof at every stage.</span></>}
            copy="From a first reel taking off to a first client paying—and then serious scale. Open any win to see the original screenshot and the full progression."
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
                Join month to month, or save two months with annual access. Both plans unlock the complete Creator Cult system from day one.
              </p>
              <div className={styles.pricingProof}>
                <div><strong>160+</strong><span>creators inside</span></div>
                <div><strong>15+</strong><span>countries</span></div>
                <div><strong>500M+</strong><span>combined views</span></div>
              </div>
            </div>
            <div className={styles.priceCard}>
              <div className={styles.priceCardGlow} />
              <p className={styles.priceLabel}>Creator Cult membership</p>
              <h3 className={styles.paymentHeading}>Choose how you join</h3>
              <p className={styles.paymentIntro}>Same complete membership. Choose flexibility or get two months free.</p>
              <div className={styles.paymentOptions}>
                <article className={styles.paymentOption}>
                  <div className={styles.paymentOptionTop}>
                    <h4>Monthly</h4>
                    <span>Flexible</span>
                  </div>
                  <div className={styles.currencyPrices} role="group" aria-label="$97 USD or £79 GBP per month">
                    <div className={styles.currencyPrice}>
                      <strong>$97</strong>
                      <span>USD / month</span>
                    </div>
                    <span className={styles.currencyOr}>or</span>
                    <div className={styles.currencyPrice}>
                      <strong>£79</strong>
                      <span>GBP / month</span>
                    </div>
                  </div>
                  <p className={styles.paymentDescription}>Full access with a simple monthly membership.</p>
                  <button
                    type="button"
                    className={styles.checkoutCta}
                    data-checkout-plan="monthly"
                    aria-label="Monthly checkout link coming soon"
                    disabled
                  >
                    Checkout link coming <ArrowRight size={17} />
                  </button>
                </article>

                <article className={`${styles.paymentOption} ${styles.paymentOptionFeatured}`}>
                  <div className={styles.paymentOptionTop}>
                    <h4>Annual</h4>
                    <span>2 months free</span>
                  </div>
                  <div
                    className={styles.currencyPrices}
                    role="group"
                    aria-label="$970 USD or £790 GBP per year"
                  >
                    <div className={styles.currencyPrice}>
                      <strong>$970</strong>
                      <span>USD / year</span>
                    </div>
                    <span className={styles.currencyOr}>or</span>
                    <div className={styles.currencyPrice}>
                      <strong>£790</strong>
                      <span>GBP / year</span>
                    </div>
                  </div>
                  <p className={styles.paymentDescription}>Save $194 or £158—exactly two months compared with paying monthly.</p>
                  <button
                    type="button"
                    className={styles.checkoutCta}
                    data-checkout-plan="annual"
                    aria-label="Annual checkout link coming soon"
                    disabled
                  >
                    Checkout link coming <ArrowRight size={17} />
                  </button>
                </article>
              </div>
              <div className={styles.priceRule} />
              <p className={styles.includedLabel}>Both memberships include:</p>
              <ul>
                <li><Check size={16} /> Full 5-phase Creator Cult course</li>
                <li><Check size={16} /> Monthly live coaching and Q&amp;A with me</li>
                <li><Check size={16} /> Ask questions and get my personal feedback in the member chat</li>
                <li><Check size={16} /> Private Circle community</li>
                <li><Check size={16} /> Cult Dashboard with 12 AI tools</li>
                <li><Check size={16} /> Weekly strategy packages</li>
              </ul>
              <p className={styles.checkoutNote}><LockKeyhole size={13} /> Secure checkout. Instant access begins as soon as you join.</p>
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
          <span className={styles.finalPrice}>$97 USD / £79 GBP monthly, or save two months with annual access.</span>
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
        <div><strong>$97 / £79</strong><span>per month</span></div>
        <PurchaseButton className={styles.mobileCta}>Join now <ArrowRight size={16} /></PurchaseButton>
      </div>
    </main>
  )
}
