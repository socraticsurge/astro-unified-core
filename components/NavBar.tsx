"use client"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { Settings, ShieldCheck, LogOut } from "lucide-react"
import { fonts, motion } from "@/lib/typography"
import { ProfileNav } from "@/components/profiles/ProfileNav"
import { ThemeToggle } from "@/components/ThemeToggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { NavProfile } from "@/components/profiles/ProfileNav"

function TwoOrbits({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <ellipse cx="24" cy="24" rx="21" ry="7" transform="rotate(-8 24 24)"
        stroke="var(--color-accent-dim)" strokeWidth="1.4" fill="none"/>
      <ellipse cx="24" cy="24" rx="12" ry="19" transform="rotate(22 24 24)"
        stroke="var(--color-accent-faint)" strokeWidth="1.1" fill="none"/>
      <circle cx="13.5" cy="16" r="1.5" fill="var(--color-accent-dim)"/>
      <circle cx="34.5" cy="32" r="1.5" fill="var(--color-accent-dim)"/>
      <circle cx="24"   cy="24" r="2.6" fill="var(--color-accent)"/>
    </svg>
  )
}

const navGlassStyle: React.CSSProperties = {
  background:           "var(--surface-blend)",
  backdropFilter:       "var(--backdrop-blur)",
  WebkitBackdropFilter: "var(--backdrop-blur)",
  boxShadow:            "inset 0 1.5px 0 var(--color-border-subtle), inset 0 -1px 0 var(--color-border-subtle)",
}

const wordmarkStyle: React.CSSProperties = {
  ...fonts.display,
  fontSize: "1.1rem",
  letterSpacing: "0.02em",
  lineHeight: 1,
}

interface NavBarProps {
  profiles?: NavProfile[]
  activeProfileId?: string | null
  onProfileChange?: (id: string) => void
  onAskOpen?: () => void
}

export function NavBar({ profiles = [], activeProfileId = null, onProfileChange, onAskOpen }: NavBarProps) {
  const { data: session, status } = useSession()
  const isLoggedIn  = status === "authenticated"
  const showAdmin   = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin === true

  return (
    <nav
      className="sticky top-0 z-40 border-b border-[var(--color-border)]"
      style={{ ...navGlassStyle, transition: `background ${motion.standard}` }}
    >
      <div className="w-full px-3 sm:px-5 py-2.5 flex items-center gap-3">

        {/* Logo */}
        <Link
          href={isLoggedIn ? "/dashboard" : "/"}
          className="flex items-center gap-2 shrink-0"
          aria-label="Home"
        >
          <TwoOrbits size={32} />
          <span style={wordmarkStyle} className="hidden sm:block">
            <span style={{ color: "var(--color-ink-1)" }}>Astro </span>
            <span style={{ fontStyle: "italic", color: "var(--color-accent)" }}>Chaganti</span>
          </span>
        </Link>

        {/* Divider */}
        {isLoggedIn && (
          <div className="h-6 w-px bg-[var(--color-border)] flex-shrink-0" />
        )}

        {/* Profile chips + Ask button */}
        {isLoggedIn && onProfileChange && onAskOpen && (
          <ProfileNav
            profiles={profiles}
            activeProfileId={activeProfileId}
            onProfileChange={onProfileChange}
            onAskOpen={onAskOpen}
          />
        )}

        {/* Right side: settings */}
        <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="p-1.5 rounded-lg text-muted-foreground hover:text-[var(--color-ink-1)] hover:bg-[var(--color-surface-hover)] transition-colors"
                aria-label="Settings"
              >
                <Settings className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem>
                  <Link href="/settings" className="w-full">Account settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-0">
                  <ThemeToggle />
                </DropdownMenuItem>
                {showAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Link href="/admin" className="flex items-center gap-2 w-full">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Admin
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/" })}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
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

      {/* Unauthenticated mobile — keep sign-in visible */}
      {!isLoggedIn && (
        <div className="sm:hidden border-t border-[var(--color-border)] px-4 py-2 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="Home">
            <TwoOrbits size={24} />
            <span style={{ ...wordmarkStyle, fontSize: "0.95rem" }}>
              <span style={{ color: "var(--color-ink-1)" }}>Astro </span>
              <span style={{ fontStyle: "italic", color: "var(--color-accent)" }}>Chaganti</span>
            </span>
          </Link>
        </div>
      )}
    </nav>
  )
}
