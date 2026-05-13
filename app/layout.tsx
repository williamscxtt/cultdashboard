import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--inter",
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: "Creator Cult Dashboard",
  description: "Your personal brand command centre — scripts, analytics, and AI coaching.",
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: "Creator Cult Dashboard",
    description: "Your personal brand command centre — scripts, analytics, and AI coaching.",
    siteName: "Creator Cult",
    type: "website",
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
    card: "summary_large_image",
    title: "Creator Cult Dashboard",
    description: "Your personal brand command centre — scripts, analytics, and AI coaching.",
    images: ['/will-hero.jpg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Sync theme before first paint — prevents flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('theme') || 'dark';
            document.documentElement.classList.toggle('dark', t === 'dark');
          } catch(e) { document.documentElement.classList.add('dark'); }
        ` }} />
      </head>
      <body className={inter.className} style={{ minHeight: '100vh' }}>
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
