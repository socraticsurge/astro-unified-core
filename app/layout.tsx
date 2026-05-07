import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { NextAuthProvider } from "@/components/auth/NextAuthProvider";
import { NavBar } from "@/components/NavBar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AstroUnified",
  description: "Unified Vedic, Western, and Chinese astrology in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <NextAuthProvider>
          <NavBar />
          <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
          <footer className="border-t border-white/10 mt-16 py-6 text-center text-xs text-muted-foreground space-x-4">
            <span>© {new Date().getFullYear()} AstroUnified</span>
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
          </footer>
        </NextAuthProvider>
      </body>
    </html>
  );
}
