import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { NextAuthProvider } from "@/components/auth/NextAuthProvider";
import { NavBar } from "@/components/NavBar";

// Single classical serif throughout — same family for headings and body.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Astro Chaganti — Vedic birth charts by Dr. Vinay Kumar Chaganti",
  description:
    "Detailed Vedic birth charts: Lagna, divisional charts, 5-level Vimshottari Dasha, Yogas, Shadbala, Karakamsha, and more. By Dr. Vinay Kumar Chaganti.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${cormorant.variable} font-sans antialiased`}>
        <NextAuthProvider>
          <NavBar />
          <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
          <footer className="border-t border-white/10 mt-16 py-6 text-center text-xs text-muted-foreground space-x-4">
            <span>© {new Date().getFullYear()} Astro Chaganti</span>
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
          </footer>
        </NextAuthProvider>
      </body>
    </html>
  );
}
