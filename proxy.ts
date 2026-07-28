import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = new Set([
  "/",
  "/unified",
  "/privacy",
  "/terms",
  "/credits",
  "/robots.txt",
  "/sitemap.xml",
  "/icon.svg",
]);

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname) || pathname.startsWith("/images/");
}

export default withAuth(
  function proxy(req) {
    // Authenticated users hitting the current public landing continue to the
    // dashboard. The isolated /unified preview remains reviewable by anyone.
    if (req.nextUrl.pathname === "/" && req.nextauth.token) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (isPublicPath(req.nextUrl.pathname)) return true;
        return !!token;
      },
    },
    pages: {
      signIn: "/auth/signin",
    },
  },
);

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|auth).*)",
  ],
};
