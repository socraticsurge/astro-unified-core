import type { NextAuthOptions, Session } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";
import { ADMIN_EMAILS } from "@/lib/admin";
import { getPostHogClient } from "@/lib/posthog-server";

// The session callback below stamps `id` and `isAdmin` onto `session.user`.
// NextAuth's default Session type doesn't know about them, so use this helper
// at call sites instead of repeating `(session.user as { id: string }).id`.
export function getUserId(session: Session): string {
  return (session.user as { id: string }).id;
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (user.email) {
        await db.users.upsert({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        });
        const posthog = getPostHogClient();
        posthog.identify({
          distinctId: user.id,
          properties: {
            email: user.email,
            name: user.name ?? undefined,
          },
        });
        posthog.capture({
          distinctId: user.id,
          event: "user_signed_in",
          properties: { provider: "google" },
        });
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string; isAdmin: boolean }).id = token.sub as string;
        (session.user as { id: string; isAdmin: boolean }).isAdmin =
          ADMIN_EMAILS.includes(session.user.email?.toLowerCase() ?? "");
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};
