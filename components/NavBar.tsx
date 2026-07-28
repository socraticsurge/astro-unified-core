"use client"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShieldCheck, LogOut, UserPlus } from "lucide-react"
import { fonts, motion } from "@/lib/typography"
import { ProfileNav } from "@/components/profiles/ProfileNav"
import { ThemeToggle } from "@/components/ThemeToggle"
import type { NavProfile } from "@/components/profiles/ProfileNav"

const navGlassStyle: React.CSSProperties = {
  background:           "var(--surface-blend)",
  backdropFilter:       "var(--backdrop-blur)",
  WebkitBackdropFilter: "var(--backdrop-blur)",
  boxShadow:            "inset 0 1.5px 0 var(--color-border-subtle), inset 0 -1px 0 var(--color-border-subtle)",
}

const wordmarkStyle: React.CSSProperties = {
  ...fonts.display,
  fontSize: "1.35rem",
  letterSpacing: "0.015em",
  lineHeight: 1,
  whiteSpace: "nowrap",
}

function BrandMark() {
  return (
    <svg
      aria-hidden="true"
      className="h-7 w-7 shrink-0 text-[var(--color-accent)]"
      viewBox="0 0 48 48"
      fill="none"
    >
      <ellipse cx="24" cy="24" rx="21" ry="7" transform="rotate(-8 24 24)" stroke="currentColor" strokeWidth="1.4" />
      <ellipse cx="24" cy="24" rx="12" ry="19" transform="rotate(22 24 24)" stroke="currentColor" strokeWidth="1.1" opacity="0.72" />
      <circle cx="13.5" cy="16" r="1.5" fill="currentColor" opacity="0.82" />
      <circle cx="34.5" cy="32" r="1.5" fill="currentColor" opacity="0.82" />
      <circle cx="24" cy="24" r="2.6" fill="currentColor" />
    </svg>
  )
}

interface NavBarProps {
  profiles?: NavProfile[]
  activeProfileId?: string | null
  onProfileChange?: (id: string) => void
  onAskOpen?: () => void
}

export function NavBar({ profiles = [], activeProfileId = null, onProfileChange, onAskOpen }: NavBarProps) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const isLoggedIn = status === "authenticated"
  const showAdmin  = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin === true

  return (
    <nav
      className="sticky top-0 z-40 border-b border-[var(--color-border)]"
      style={{ ...navGlassStyle, transition: `background ${motion.standard}` }}
    >
      <div className="flex items-stretch h-12">

        {/* Wordmark — collapses to the mark on mobile. */}
        <div className="w-auto shrink-0 flex items-center gap-2 px-3 sm:w-[248px] sm:flex-[0_0_248px] sm:px-4 border-r border-[var(--color-border)]">
          <Link
            href={isLoggedIn ? "/dashboard" : "/"}
            className="flex items-center gap-2 flex-1 min-w-0"
            aria-label="Astro Chaganti home"
          >
            <BrandMark />
            <span className="hidden sm:inline" style={wordmarkStyle}>
              <span style={{ color: "var(--color-ink-1)" }}>Astro </span>
              <span style={{ fontStyle: "italic", color: "var(--color-accent)" }}>Chaganti</span>
            </span>
          </Link>
          {/* The dashboard keeps this beside the wordmark on larger screens. */}
          <span className="hidden sm:block"><ThemeToggle /></span>
        </div>

        {pathname === "/" && (
          <div
            className="flex flex-1 min-w-0 items-stretch overflow-x-auto px-1 sm:px-3"
            aria-label="Homepage sections"
          >
            {[
              ["#today", "Horoscope"],
              ["#panchangam", "Panchangam"],
              ["#muhurtam", "When to act"],
              ["#about", "Astrologer"],
              ["#calendar", "Calendar"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="flex shrink-0 items-center px-2.5 text-[11px] font-medium text-[var(--color-ink-3)] transition-colors hover:text-[var(--color-accent)] sm:px-3"
              >
                {label}
              </a>
            ))}
          </div>
        )}

        {/* Profile tabs — fills remaining space */}
        {isLoggedIn && onProfileChange && (
          <div className="flex-1 min-w-0" data-testid="profile-nav">
            <ProfileNav
              profiles={profiles}
              activeProfileId={activeProfileId}
              onProfileChange={onProfileChange}
            />
          </div>
        )}

        {/* Right: primary profile action · human consultation · explicit account actions */}
        <div className="flex items-center gap-1.5 px-2 sm:px-3 shrink-0 ml-auto">
          {isLoggedIn && (
            <>
              <Link
                href="/dashboard?create=1"
                aria-label="Add profile"
                className="flex h-10 items-center gap-1.5 rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent)] px-2.5 text-xs font-semibold text-[var(--color-button-fg)] transition-opacity hover:opacity-80 sm:px-3"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Add profile</span>
              </Link>

              {/* Hidden on mobile — Ask lives in the profile header row instead */}
              {onAskOpen && (
                <button
                  type="button"
                  onClick={onAskOpen}
                  className="hidden h-10 items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 text-xs font-medium text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-accent-dim)] hover:text-[var(--color-ink-1)] sm:flex"
                >
                  <span aria-hidden="true">✦</span>
                  Ask Dr Chaganti
                </button>
              )}

              {showAdmin && (
                <Link
                  href="/admin"
                  aria-label="Open admin"
                  className="hidden h-10 items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink-1)] md:flex"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Admin
                </Link>
              )}

              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                aria-label="Sign out"
                className="flex h-10 items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-danger)]"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Sign out</span>
              </button>
            </>
          )}

          {!isLoggedIn && (
            <Link
              href="/auth/signin"
              className="px-4 py-1.5 rounded-md text-sm font-medium border border-[var(--color-accent-dim)] bg-[var(--color-accent-faint)] text-[var(--color-accent)]"
              style={fonts.uiMedium}
            >
              Sign In
            </Link>
          )}
        </div>

      </div>
    </nav>
  )
}
