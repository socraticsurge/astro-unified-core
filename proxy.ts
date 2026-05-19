import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = new Set(["/", "/privacy", "/terms", "/credits"]);

export default withAuth(
  function middleware(req) {
    // Authed users hitting the public landing get sent to the dashboard here
    // rather than from app/page.tsx — keeps the landing page CDN-cacheable.
    if (req.nextUrl.pathname === "/" && req.nextauth.token) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (PUBLIC_PATHS.has(req.nextUrl.pathname)) return true;
        return !!token;
      },
    },
    pages: {
      signIn: "/auth/signin",
    },
  }
);

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|auth).*)",
  ],
};
