"use client";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CircleDot, Heart, MessageSquare, ShieldCheck } from "lucide-react";

const NAV_LINKS = [
  { href: "/dashboard",     label: "Natal Charts",     short: "Charts"  },
  { href: "/compatibility", label: "Kundali Matching", short: "Kundali" },
  { href: "/consultation",  label: "Get Consultation", short: "Consult" },
] as const;

function TwoOrbits({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <ellipse cx="24" cy="24" rx="21" ry="7" transform="rotate(-8 24 24)"
        stroke="rgba(251,191,36,0.82)" strokeWidth="1.4" fill="none" />
      <ellipse cx="24" cy="24" rx="12" ry="19" transform="rotate(22 24 24)"
        stroke="rgba(251,191,36,0.6)" strokeWidth="1.1" fill="none" />
      <circle cx="13.5" cy="16" r="1.5" fill="rgba(251,191,36,0.8)" />
      <circle cx="34.5" cy="32" r="1.5" fill="rgba(251,191,36,0.8)" />
      <circle cx="24" cy="24" r="2.6" fill="rgba(251,191,36,1)" />
    </svg>
  );
}

export function NavBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isLoggedIn = status === "authenticated";
  const showAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin === true;

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" || pathname?.startsWith("/profiles")
    : pathname?.startsWith(href);

  return (
    <nav className="sticky top-0 z-40 border-b border-white/10 bg-[#030115]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="Astro Chaganti home">
            <TwoOrbits size={30} />
            <span
              className="font-heading text-xl font-light tracking-wide leading-none"
              style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
            >
              <span className="text-white/90">Astro </span>
              <em
                className="not-italic font-light"
                style={{
                  background: "linear-gradient(135deg, #fde68a 0%, #fbbf24 50%, #f59e0b 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Chaganti
              </em>
            </span>
          </Link>

          {/* Desktop nav links */}
          {isLoggedIn && (
            <div className="hidden sm:flex items-center gap-1 text-sm">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={[
                    "px-3 py-1.5 rounded-md transition-colors whitespace-nowrap",
                    isActive(href)
                      ? "text-amber-400 bg-amber-400/8"
                      : "text-white/50 hover:text-white/90 hover:bg-white/5",
                  ].join(" ")}
                >
                  {label}
                </Link>
              ))}
              {showAdmin && (
                <Link
                  href="/admin"
                  className={[
                    "px-3 py-1.5 rounded-md transition-colors",
                    isActive("/admin")
                      ? "text-amber-400 bg-amber-400/8"
                      : "text-amber-400/60 hover:text-amber-400 hover:bg-white/5",
                  ].join(" ")}
                >
                  Admin
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Right: auth */}
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm text-white/40 hover:text-white/70 hover:bg-white/5 px-2 sm:px-3"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              Sign Out
            </Button>
          ) : (
            <Link href="/auth/signin">
              <Button
                size="sm"
                className="text-sm border border-amber-400/30 bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 hover:text-amber-300"
              >
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile bottom navigation */}
      {isLoggedIn && (
        <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden
          border-t border-white/10 bg-[#030115]/95 backdrop-blur-md
          flex items-center justify-around
          pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1 px-1">
          {NAV_LINKS.map(({ href, short }, i) => {
            const active = isActive(href);
            const Icon = i === 0 ? CircleDot : i === 1 ? Heart : MessageSquare;
            return (
              <Link
                key={href}
                href={href}
                className={[
                  "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-[52px] min-h-[44px] justify-center",
                  active ? "text-amber-400" : "text-white/40 hover:text-white/70",
                ].join(" ")}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium tracking-wide">{short}</span>
                {active && <span className="absolute bottom-[calc(env(safe-area-inset-bottom)+3.25rem)] w-5 h-0.5 rounded-full bg-amber-400" />}
              </Link>
            );
          })}
          {showAdmin && (
            <Link
              href="/admin"
              className={[
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-[52px] min-h-[44px] justify-center",
                isActive("/admin") ? "text-amber-400" : "text-amber-400/50 hover:text-amber-400",
              ].join(" ")}
            >
              <ShieldCheck className="h-5 w-5" />
              <span className="text-[10px] font-medium tracking-wide">Admin</span>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
