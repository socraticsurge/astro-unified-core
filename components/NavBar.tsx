"use client";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { fonts } from "@/lib/typography";

// ── Bespoke SVG icons (same as landing page feature strip) ─────────────────

function NatalIcon({ active }: { active: boolean }) {
  const gold = "rgba(251,191,36,1)";
  const dim  = "rgba(255,255,255,0.52)";
  const c = active ? gold : dim;
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
  const gold = "rgba(251,191,36,1)";
  const dim  = "rgba(255,255,255,0.52)";
  const c = active ? gold : dim;
  const fill = active ? "rgba(251,191,36,0.22)" : "rgba(255,255,255,0.06)";
  return (
    <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="10" cy="14" r="9" stroke={c} strokeWidth="0.9" fill="rgba(255,255,255,0.02)"/>
      <circle cx="18" cy="14" r="9" stroke={c} strokeWidth="0.9" fill="rgba(255,255,255,0.02)"/>
      <path d="M14 6.6 C16.5 8.8 16.5 19.2 14 21.4 C11.5 19.2 11.5 8.8 14 6.6Z" fill={fill}/>
    </svg>
  );
}

function ConsultIcon({ active }: { active: boolean }) {
  const gold = "rgba(251,191,36,1)";
  const dim  = "rgba(255,255,255,0.52)";
  const c = active ? gold : dim;
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
        stroke="rgba(251,191,36,0.82)" strokeWidth="1.4" fill="none"/>
      <ellipse cx="24" cy="24" rx="12" ry="19" transform="rotate(22 24 24)"
        stroke="rgba(251,191,36,0.6)" strokeWidth="1.1" fill="none"/>
      <circle cx="13.5" cy="16" r="1.5" fill="rgba(251,191,36,0.8)"/>
      <circle cx="34.5" cy="32" r="1.5" fill="rgba(251,191,36,0.8)"/>
      <circle cx="24"   cy="24" r="2.6" fill="rgba(251,191,36,1)"/>
    </svg>
  );
}

// ── Nav link definitions ────────────────────────────────────────────────────

const NAV_LINKS = [
  { href: "/dashboard",     label: "Natal Charts",     short: "Charts",  Icon: NatalIcon   },
  { href: "/compatibility", label: "Kundali Matching", short: "Kundali", Icon: KundaliIcon },
  { href: "/consultation",  label: "Get Consultation", short: "Consult", Icon: ConsultIcon },
] as const;

// Shared glass style (matches landing page panel)
const glassStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.055)",
  backdropFilter: "blur(32px) saturate(1.8) brightness(1.04)",
  WebkitBackdropFilter: "blur(32px) saturate(1.8) brightness(1.04)",
  boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.13), inset 0 -1px 0 rgba(255,255,255,0.03)",
};

const wordmarkStyle: React.CSSProperties = {
  ...fonts.display,
  fontSize: "1.45rem",
  letterSpacing: "0.02em",
  lineHeight: 1,
};

const navLinkStyle: React.CSSProperties = {
  ...fonts.uiMedium,
  fontSize: "0.8rem",
  letterSpacing: "0.02em",
};

const adminLinkStyle: React.CSSProperties = {
  ...fonts.uiMedium,
  fontSize: "0.75rem",
  letterSpacing: "0.02em",
};

const signOutStyle: React.CSSProperties = {
  ...fonts.uiItalic,
  fontSize: "0.8rem",
  letterSpacing: "0.02em",
};

const goldStyle: React.CSSProperties = {
  fontStyle: "italic",
  background: "linear-gradient(135deg, #fde68a 0%, #fbbf24 50%, #f59e0b 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

// ── Component ───────────────────────────────────────────────────────────────

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
      {/* ── Desktop top nav (hidden on mobile) ── */}
      <nav
        className="hidden sm:flex sticky top-0 z-40 border-b border-white/[0.11] items-center"
        style={glassStyle}
      >
        <div className="max-w-7xl w-full mx-auto px-6 py-4 flex items-center justify-between gap-6">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group" aria-label="Home">
            <TwoOrbits size={40} />
            <span style={wordmarkStyle}>
              <span className="text-white/88">Astro </span>
              <span style={goldStyle}>Chaganti</span>
            </span>
          </Link>

          {/* Nav links */}
          {isLoggedIn && (
            <div className="flex items-center gap-1">
              {NAV_LINKS.map(({ href, label, Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={[
                      "flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all duration-200 whitespace-nowrap",
                      active
                        ? "bg-[rgba(251,191,36,0.1)] text-amber-400"
                        : "text-white/50 hover:text-white/90 hover:bg-white/[0.05]",
                    ].join(" ")}
                    style={navLinkStyle}
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
                    "flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all",
                    isActive("/admin")
                      ? "bg-[rgba(251,191,36,0.1)] text-amber-400"
                      : "text-amber-400/50 hover:text-amber-400 hover:bg-white/[0.05]",
                  ].join(" ")}
                  style={adminLinkStyle}
                >
                  <ShieldCheck className="h-[1.1em] w-[1.1em]" />
                  Admin
                </Link>
              )}
            </div>
          )}

          {/* Sign out */}
          <div className="flex items-center shrink-0">
            {isLoggedIn ? (
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="px-3 py-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
                style={signOutStyle}
              >
                Sign Out
              </button>
            ) : (
              <Link
                href="/auth/signin"
                className="px-4 py-1.5 rounded-xl text-sm font-medium border border-amber-400/30 bg-[rgba(251,191,36,0.08)] text-amber-400 hover:bg-[rgba(251,191,36,0.15)] hover:text-amber-300 transition-colors"
                style={fonts.uiMedium}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile bottom nav (hidden on desktop) ── */}
      {isLoggedIn && (
        <div
          className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.11]"
          style={{
            ...glassStyle,
            paddingBottom: "calc(env(safe-area-inset-bottom) + 0.25rem)",
          }}
        >
          <div className="flex items-stretch justify-around px-2 pt-1">
            {NAV_LINKS.map(({ href, short, Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors min-h-[52px] justify-center",
                    active ? "text-amber-400" : "text-white/40 hover:text-white/70",
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
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors min-h-[52px] justify-center",
                  isActive("/admin") ? "text-amber-400" : "text-amber-400/40 hover:text-amber-400",
                ].join(" ")}
              >
                <ShieldCheck className="h-5 w-5" />
                <span style={{ ...fonts.uiMedium, fontSize: "0.7rem" }}>Admin</span>
              </Link>
            )}

            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors min-h-[52px] justify-center text-white/25 hover:text-white/50"
            >
              <LogOut className="h-5 w-5" />
              <span style={{ ...fonts.ui, fontSize: "0.7rem" }}>Exit</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile unauthenticated: minimal top bar just for sign-in */}
      {!isLoggedIn && (
        <nav
          className="sm:hidden sticky top-0 z-40 border-b border-white/[0.11] flex items-center justify-between px-4 py-3"
          style={glassStyle}
        >
          <Link href="/" className="flex items-center gap-2" aria-label="Home">
            <TwoOrbits size={26} />
            <span style={{ ...wordmarkStyle, fontSize: "1.1rem" }}>
              <span className="text-white/88">Astro </span>
              <span style={goldStyle}>Chaganti</span>
            </span>
          </Link>
          <Link
            href="/auth/signin"
            className="px-4 py-1.5 rounded-xl text-sm border border-amber-400/30 bg-[rgba(251,191,36,0.08)] text-amber-400 hover:bg-[rgba(251,191,36,0.15)] transition-colors"
            style={fonts.uiMedium}
          >
            Sign In
          </Link>
        </nav>
      )}
    </>
  );
}
