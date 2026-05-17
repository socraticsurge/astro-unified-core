"use client";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { fonts, motion } from "@/lib/typography";
import { NAV_CONFIG } from "@/lib/nav";
import { ThemeToggle } from "@/components/ThemeToggle";

// ── Bespoke SVG icons ──────────────────────────────────────────────────────────

function NatalIcon({ active }: { active: boolean }) {
  const c = active ? "var(--color-accent)" : "var(--color-ink-3)";
  return (
    <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="12" stroke={c} strokeWidth="0.9"/>
      <circle cx="14" cy="14" r="6"  stroke={c} strokeWidth="0.7"/>
      <circle cx="14" cy="14" r="1.6" fill={c}/>
      <line x1="14" y1="2"  x2="14" y2="7"  stroke={c} strokeWidth="0.7"/>
      <line x1="14" y1="21" x2="14" y2="26" stroke={c} strokeWidth="0.7"/>
      <line x1="2"  y1="14" x2="7"  y2="14" stroke={c} strokeWidth="0.7"/>
      <line x1="21" y1="14" x2="26" y2="14" stroke={c} strokeWidth="0.7"/>
      <line x1="5"  y1="5"  x2="9"  y2="9"  stroke={c} strokeWidth="0.55"/>
      <line x1="19" y1="19" x2="23" y2="23" stroke={c} strokeWidth="0.55"/>
      <line x1="23" y1="5"  x2="19" y2="9"  stroke={c} strokeWidth="0.55"/>
      <line x1="9"  y1="19" x2="5"  y2="23" stroke={c} strokeWidth="0.55"/>
    </svg>
  );
}

function KundaliIcon({ active }: { active: boolean }) {
  const c    = active ? "var(--color-accent)" : "var(--color-ink-3)";
  const fill = active ? "var(--color-accent-faint)" : "var(--color-surface-1)";
  return (
    <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="10" cy="14" r="9" stroke={c} strokeWidth="0.9" fill="var(--color-surface-1)"/>
      <circle cx="18" cy="14" r="9" stroke={c} strokeWidth="0.9" fill="var(--color-surface-1)"/>
      <path d="M14 6.6 C16.5 8.8 16.5 19.2 14 21.4 C11.5 19.2 11.5 8.8 14 6.6Z" fill={fill}/>
    </svg>
  );
}

function ConsultIcon({ active }: { active: boolean }) {
  const c = active ? "var(--color-accent)" : "var(--color-ink-3)";
  return (
    <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="9" r="4.5" stroke={c} strokeWidth="0.9"/>
      <path d="M5 24 C5 18.5 8.5 15 14 15 C19.5 15 23 18.5 23 24"
        stroke={c} strokeWidth="0.9" strokeLinecap="round" fill="none"/>
      <circle cx="14" cy="9" r="1.5" fill={c}/>
    </svg>
  );
}

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
  );
}

type IconComponent = ({ active }: { active: boolean }) => React.ReactElement;

const NAV_ICONS: Record<string, IconComponent> = {
  "/dashboard":     NatalIcon,
  "/compatibility": KundaliIcon,
  "/consultation":  ConsultIcon,
};

const navGlassStyle: React.CSSProperties = {
  background:           "var(--surface-blend)",
  backdropFilter:       "var(--backdrop-blur)",
  WebkitBackdropFilter: "var(--backdrop-blur)",
  boxShadow:            "inset 0 1.5px 0 var(--color-border-subtle), inset 0 -1px 0 var(--color-border-subtle)",
};

const wordmarkStyle: React.CSSProperties = {
  ...fonts.display,
  fontSize: "1.45rem",
  letterSpacing: "0.02em",
  lineHeight: 1,
};

const goldStyle: React.CSSProperties = {
  fontStyle: "italic",
  color: "var(--color-accent)",
};

export function NavBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isLoggedIn = status === "authenticated";
  const showAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin === true;

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard" || (pathname?.startsWith("/profiles") ?? false)
      : pathname?.startsWith(href) ?? false;

  return (
    <>
      {/* ── Desktop top nav ── */}
      <nav
        className="hidden sm:flex sticky top-0 z-40 border-b border-[var(--color-border)] items-center"
        style={{ ...navGlassStyle, transition: `background ${motion.standard}` }}
      >
        <div className="max-w-7xl w-full mx-auto px-6 py-4 flex items-center justify-between gap-6">

          <Link
            href={isLoggedIn ? "/dashboard" : "/"}
            className="flex items-center gap-3 shrink-0"
            aria-label="Home"
          >
            <TwoOrbits size={40} />
            <span style={wordmarkStyle}>
              <span style={{ color: "var(--color-ink-1)" }}>Astro </span>
              <span style={goldStyle}>Chaganti</span>
            </span>
          </Link>

          {isLoggedIn && (
            <div className="flex items-center gap-1">
              {NAV_CONFIG.map(({ href, label }) => {
                const Icon = NAV_ICONS[href];
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={[
                      "flex items-center gap-2 px-3.5 py-2 rounded-[var(--radius-md)] transition-all whitespace-nowrap",
                      active
                        ? "bg-[var(--color-accent-faint)] text-[var(--color-accent)]"
                        : "text-[var(--color-ink-3)] hover:text-[var(--color-ink-1)] hover:bg-[var(--color-surface-hover)]",
                    ].join(" ")}
                    style={{ ...fonts.uiMedium, fontSize: "0.8rem", letterSpacing: "0.02em" }}
                  >
                    <Icon active={active} />
                    {label}
                  </Link>
                );
              })}

              {showAdmin && (
                <Link
                  href="/admin"
                  className={[
                    "flex items-center gap-2 px-3.5 py-2 rounded-[var(--radius-md)] transition-all",
                    isActive("/admin")
                      ? "bg-[var(--color-accent-faint)] text-[var(--color-accent)]"
                      : "text-[var(--color-accent-dim)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-hover)]",
                  ].join(" ")}
                  style={{ ...fonts.uiMedium, fontSize: "0.75rem", letterSpacing: "0.02em" }}
                >
                  <ShieldCheck className="h-[1.1em] w-[1.1em]" />
                  Admin
                </Link>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            {isLoggedIn ? (
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="px-3 py-1.5 rounded-[var(--radius-sm)] text-[var(--color-ink-4)] hover:text-[var(--color-ink-2)] hover:bg-[var(--color-surface-hover)] transition-all"
                style={{ ...fonts.uiItalic, fontSize: "0.8rem", letterSpacing: "0.02em" }}
              >
                Sign Out
              </button>
            ) : (
              <Link
                href="/auth/signin"
                className="px-4 py-1.5 rounded-[var(--radius-md)] text-sm font-medium border border-[var(--color-accent-dim)] bg-[var(--color-accent-faint)] text-[var(--color-accent)] hover:bg-[var(--color-accent-faint)] hover:text-[var(--color-accent-hover)] transition-all"
                style={fonts.uiMedium}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile bottom nav ── */}
      {isLoggedIn && (
        <div
          className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-border)]"
          style={{
            ...navGlassStyle,
            paddingBottom: "calc(env(safe-area-inset-bottom) + 0.25rem)",
          }}
        >
          <div className="flex items-stretch justify-around px-2 pt-1">
            {NAV_CONFIG.map(({ href, short }) => {
              const Icon = NAV_ICONS[href];
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    "flex flex-col items-center gap-1 px-4 py-2 rounded-[var(--radius-md)] transition-all min-h-[52px] justify-center",
                    active
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-ink-4)] hover:text-[var(--color-ink-2)]",
                  ].join(" ")}
                >
                  <Icon active={active} />
                  <span style={{ ...fonts.uiMedium, fontSize: "0.7rem", letterSpacing: "0.03em" }}>
                    {short}
                  </span>
                </Link>
              );
            })}

            {showAdmin && (
              <Link
                href="/admin"
                className={[
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-[var(--radius-md)] transition-all min-h-[52px] justify-center",
                  isActive("/admin")
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-accent-dim)] hover:text-[var(--color-accent)]",
                ].join(" ")}
              >
                <ShieldCheck className="h-5 w-5" />
                <span style={{ ...fonts.uiMedium, fontSize: "0.7rem" }}>Admin</span>
              </Link>
            )}
          </div>

          {/* Utility strip: theme toggle + sign out */}
          <div className="flex justify-end items-center gap-2 px-4 pb-0.5">
            <ThemeToggle />
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-[var(--color-ink-4)] hover:text-[var(--color-ink-2)] transition-all"
              style={{ ...fonts.ui, fontSize: "0.65rem", letterSpacing: "0.04em" }}
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Mobile unauthenticated */}
      {!isLoggedIn && (
        <nav
          className="sm:hidden sticky top-0 z-40 border-b border-[var(--color-border)] flex items-center justify-between px-4 py-3"
          style={navGlassStyle}
        >
          <Link href="/" className="flex items-center gap-2" aria-label="Home">
            <TwoOrbits size={26} />
            <span style={{ ...wordmarkStyle, fontSize: "1.1rem" }}>
              <span style={{ color: "var(--color-ink-1)" }}>Astro </span>
              <span style={goldStyle}>Chaganti</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/auth/signin"
              className="px-4 py-1.5 rounded-[var(--radius-md)] text-sm border border-[var(--color-accent-dim)] bg-[var(--color-accent-faint)] text-[var(--color-accent)] hover:bg-[var(--color-accent-faint)] transition-all"
              style={fonts.uiMedium}
            >
              Sign In
            </Link>
          </div>
        </nav>
      )}
    </>
  );
}
