"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Users, Heart, MessageSquare, ShieldCheck } from "lucide-react";

export function NavBar() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";
  const showAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin === true;

  return (
    <nav className="border-b bg-background sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: Logo + links */}
        <div className="flex items-center gap-3 sm:gap-6">
          <Link href="/" className="font-heading text-lg sm:text-xl font-semibold tracking-tight whitespace-nowrap">
            ✦ Astro Chaganti
          </Link>
          {isLoggedIn && (
            <div className="hidden sm:flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Link
                href="/dashboard"
                className="px-2 py-1 rounded-md text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
              >
                Profiles
              </Link>
              <Link
                href="/compatibility"
                className="px-2 py-1 rounded-md text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
              >
                Compatibility
              </Link>
              <Link
                href="/consultation"
                className="px-2 py-1 rounded-md text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
              >
                Ask a Question
              </Link>
              {showAdmin && (
                <Link
                  href="/admin"
                  className="px-2 py-1 rounded-md text-amber-400/80 hover:text-amber-400 hover:bg-muted transition-colors"
                >
                  Admin
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Right: auth actions */}
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm text-muted-foreground px-2 sm:px-3"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              Sign Out
            </Button>
          ) : (
            <Link href="/auth/signin">
              <Button size="sm" className="text-sm">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      {isLoggedIn && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-background/95 backdrop-blur-sm z-50 sm:hidden flex items-center justify-around py-2 px-1 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
          <Link
            href="/dashboard"
            className="flex flex-col items-center gap-1 p-2 text-foreground/70 hover:text-foreground transition-colors min-w-[44px] min-h-[44px] justify-center"
          >
            <Users className="h-5 w-5" />
            <span className="text-[10px] font-medium">Profiles</span>
          </Link>
          <Link
            href="/compatibility"
            className="flex flex-col items-center gap-1 p-2 text-foreground/70 hover:text-foreground transition-colors min-w-[44px] min-h-[44px] justify-center"
          >
            <Heart className="h-5 w-5" />
            <span className="text-[10px] font-medium">Match</span>
          </Link>
          <Link
            href="/consultation"
            className="flex flex-col items-center gap-1 p-2 text-foreground/70 hover:text-foreground transition-colors min-w-[44px] min-h-[44px] justify-center"
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-[10px] font-medium">Ask</span>
          </Link>
          {showAdmin && (
            <Link
              href="/admin"
              className="flex flex-col items-center gap-1 p-2 text-amber-400/80 hover:text-amber-400 transition-colors min-w-[44px] min-h-[44px] justify-center"
            >
              <ShieldCheck className="h-5 w-5" />
              <span className="text-[10px] font-medium">Admin</span>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
