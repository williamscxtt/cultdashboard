import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "CULT Dashboard",
  description: "Your personal brand command centre",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className} style={{ minHeight: '100vh' }}>
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
