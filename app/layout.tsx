import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-dm-sans",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
  variable: "--font-syne",
});

export const metadata: Metadata = {
  title: "CULT Dashboard",
  description: "Your personal brand command centre",
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
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
      <body
        className={`${dmSans.variable} ${syne.variable} ${dmSans.className}`}
        style={{ minHeight: '100vh' }}
      >
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
