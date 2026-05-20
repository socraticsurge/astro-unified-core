import type { Metadata, Viewport } from "next";
import {
  Libre_Baskerville,
  Inter,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { NextAuthProvider } from "@/components/auth/NextAuthProvider";
import { NavBar } from "@/components/NavBar";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { AppShell } from "@/components/AppShell";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const CURRENT_YEAR = new Date().getFullYear();

// Both themes share the same font stack (Libre Baskerville display, Inter UI)
const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ui",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Astro Chaganti — Vedic birth charts by Dr. Vinay Kumar Chaganti",
  description:
    "Detailed Vedic birth charts: Lagna, divisional charts, 5-level Vimshottari Dasha, Yogas, Shadbala, Karakamsha, and more. By Dr. Vinay Kumar Chaganti.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    // No className="dark" — next-themes sets data-theme="dark" instead
    <html lang="en" suppressHydrationWarning>
      <body
        className={[
          libreBaskerville.variable,
          inter.variable,
          jetbrainsMono.variable,
          "font-sans antialiased",
        ].join(" ")}
      >
        <ThemeProvider>
          <ToastProvider>
            <NextAuthProvider session={session}>
              <AppShell
              navBar={<NavBar />}
              footer={
                <footer className="pb-24 sm:pb-6 pt-2 flex items-center justify-end px-4 sm:px-6 opacity-20 hover:opacity-50 transition-opacity duration-300">
                  <div className="flex items-center gap-3 text-[10px] text-[var(--color-ink-3)] tracking-wide">
                    <span>© {CURRENT_YEAR} Astro Chaganti</span>
                    <span className="text-[var(--color-border-subtle)]">·</span>
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
          </ToastProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
