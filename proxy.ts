import { withAuth } from "next-auth/middleware";

const PUBLIC_PATHS = new Set(["/", "/privacy", "/terms", "/credits"]);

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      if (PUBLIC_PATHS.has(req.nextUrl.pathname)) return true;
      return !!token;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|auth).*)",
  ],
};
