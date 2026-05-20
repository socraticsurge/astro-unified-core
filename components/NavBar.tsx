"use client"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { Settings, ShieldCheck, LogOut, UserPlus } from "lucide-react"
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
}

interface NavBarProps {
  profiles?: NavProfile[]
  activeProfileId?: string | null
  onProfileChange?: (id: string) => void
  onAskOpen?: () => void
}

export function NavBar({ profiles = [], activeProfileId = null, onProfileChange, onAskOpen }: NavBarProps) {
  const { data: session, status } = useSession()
  const isLoggedIn = status === "authenticated"
  const showAdmin  = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin === true

  return (
    <nav
      className="sticky top-0 z-40 border-b border-[var(--color-border)]"
      style={{ ...navGlassStyle, transition: `background ${motion.standard}` }}
    >
      <div className="flex items-stretch h-12">

        {/* Wordmark — same width as the profile sidebar so profile tabs align below */}
        <div className="w-auto md:w-80 shrink-0 flex items-center gap-2 px-4 border-r border-[var(--color-border)]">
          <Link
            href={isLoggedIn ? "/dashboard" : "/"}
            className="flex items-center flex-1 min-w-0"
            aria-label="Home"
          >
            <span style={wordmarkStyle}>
              <span style={{ color: "var(--color-ink-1)" }}>Astro </span>
              <span style={{ fontStyle: "italic", color: "var(--color-accent)" }}>Chaganti</span>
            </span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Profile tabs — fills remaining space */}
        {isLoggedIn && onProfileChange && (
          <div className="flex-1 min-w-0">
            <ProfileNav
              profiles={profiles}
              activeProfileId={activeProfileId}
              onProfileChange={onProfileChange}
            />
          </div>
        )}

        {/* Right: Add profile · Ask an expert · Settings */}
        <div className="flex items-center gap-1 px-3 shrink-0 ml-auto">
          {isLoggedIn && (
            <>
              <Link
                href="/dashboard?create=1"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-[var(--color-ink-2)] hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Add profile</span>
              </Link>

              {onAskOpen && (
                <button
                  type="button"
                  onClick={onAskOpen}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-opacity hover:opacity-80 bg-[var(--color-accent-faint)] border-[var(--color-accent-dim)] text-[var(--color-accent)]"
                >
                  <span aria-hidden="true">✦</span>
                  <span className="hidden sm:inline">Ask an expert</span>
                  <span className="sm:hidden">Ask</span>
                </button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger
                  className="p-2 rounded-lg text-muted-foreground hover:text-[var(--color-ink-1)] hover:bg-[var(--color-surface-hover)] transition-colors"
                  aria-label="Settings"
                >
                  <Settings className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem>
                    <Link href="/settings" className="w-full">Account settings</Link>
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
