"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/admin";

export function NavBar() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";
  const showAdmin = isAdmin(session);

  return (
    <nav className="border-b bg-background sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: Logo + links */}
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold tracking-tight">
            ✦ AstroUnified
          </Link>
          {isLoggedIn && (
            <div className="flex items-center gap-1 text-sm">
              <Link
                href="/"
                className="px-2 py-1 rounded-md text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
              >
                Profiles
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
            <>
              <Link href="/profiles/new">
                <Button variant="outline" size="sm" className="text-sm">
                  + New Profile
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="text-sm text-muted-foreground"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <Link href="/auth/signin">
              <Button size="sm" className="text-sm">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
