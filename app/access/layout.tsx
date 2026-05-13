import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Creator Cult Dashboard — Get Access',
  description: 'Scripts, analytics, competitor intel, Hook Lab, and Ask Will AI. Everything you need to grow on Instagram — in one dashboard.',
  openGraph: {
    title: 'Creator Cult Dashboard',
    description: 'Scripts written to your niche every week. Competitor intelligence. Analytics. Hook Lab. Ask Will AI. All the tools Will uses — now yours.',
    type: 'website',
    images: [
      {
        url: '/will-hero.jpg',
        width: 1200,
        height: 630,
        alt: 'Creator Cult Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Creator Cult Dashboard — Get Access',
    description: 'Scripts, analytics, competitor intel, Hook Lab, and Ask Will AI.',
    images: ['/will-hero.jpg'],
  },
}

export default function AccessLayout({ children }: { children: React.ReactNode }) {
  return children
}
