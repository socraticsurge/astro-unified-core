import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AstroUnified",
  description: "Unified Vedic astrology interface",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <nav className="border-b bg-background sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-lg font-bold tracking-tight">
                ✦ AstroUnified
              </Link>
              <div className="flex items-center gap-1 text-sm">
                <Link
                  href="/"
                  className="px-2 py-1 rounded-md text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
                >
                  Profiles
                </Link>
                <Link
                  href="/research"
                  className="px-2 py-1 rounded-md text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
                >
                  Research
                </Link>
              </div>
            </div>
            <Link href="/profiles/new">
              <button className="text-sm px-3 py-1 rounded-md border hover:bg-muted transition-colors">
                + New Profile
              </button>
            </Link>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
