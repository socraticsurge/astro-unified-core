import type { Metadata } from "next";
import { Philosopher, Jost } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { NextAuthProvider } from "@/components/auth/NextAuthProvider";
import { NavBar } from "@/components/NavBar";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { AppShell } from "@/components/AppShell";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const CURRENT_YEAR = new Date().getFullYear();

const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
});

const philosopher = Philosopher({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

export const metadata: Metadata = {
  title: "Astro Chaganti — Vedic birth charts by Dr. Vinay Kumar Chaganti",
  description:
    "Detailed Vedic birth charts: Lagna, divisional charts, 5-level Vimshottari Dasha, Yogas, Shadbala, Karakamsha, and more. By Dr. Vinay Kumar Chaganti.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en" className="dark">
      <body className={`${jost.variable} ${philosopher.variable} font-sans antialiased`}>
        <NextAuthProvider session={session}>
          <AppShell
            navBar={<NavBar />}
            footer={
              <footer className="pb-24 sm:pb-6 pt-2 flex items-center justify-end px-4 sm:px-6 opacity-20 hover:opacity-50 transition-opacity duration-300">
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground tracking-wide">
                  <span>© {CURRENT_YEAR} Astro Chaganti</span>
                  <span className="text-white/20">·</span>
                  <Link href="/privacy" className="hover:underline">Privacy</Link>
                  <Link href="/terms" className="hover:underline">Terms</Link>
                </div>
              </footer>
            }
            feedback={<FeedbackWidget />}
          >
            {children}
          </AppShell>
        </NextAuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
