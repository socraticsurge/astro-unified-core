import type { NextAuthOptions, Session } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { ADMIN_EMAILS } from "@/lib/admin";
import { getPostHogClient } from "@/lib/posthog-server";
import {
  getStagingAuthConfig,
  validateStagingCredentials,
} from "@/lib/staging-auth";

// The session callback below stamps `id` and `isAdmin` onto `session.user`.
// NextAuth's default Session type doesn't know about them, so use this helper
// at call sites instead of repeating `(session.user as { id: string }).id`.
export function getUserId(session: Session): string {
  return (session.user as { id: string }).id;
}

const stagingAuth = getStagingAuthConfig();

const providers = stagingAuth.enabled
  ? [
      CredentialsProvider({
        id: "staging-credentials",
        name: "Gate 7 staging account",
        credentials: {
          email: { label: "Synthetic email", type: "email" },
          password: { label: "Staging password", type: "password" },
        },
        authorize(credentials) {
          return validateStagingCredentials(stagingAuth, credentials);
        },
      }),
    ]
  : [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    ];

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers,
  callbacks: {
    async signIn({ user, account }) {
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
          properties: { provider: account?.provider ?? "unknown" },
        });
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        // Resolve the user's id from OUR DB by email, not from token.sub.
        // token.sub can change between NextAuth versions / strategies; the
        // DB-stored id is immutable per email (see users.upsert comment).
        // This is what keeps `profiles.user_id` joins working across
        // sign-ins. Falls back to token.sub if the DB lookup fails — that
        // path only matters for the *first* sign-in (race between
        // signIn callback writing the row and session callback reading
        // it), and the next sign-in stabilises.
        let resolvedId = token.sub as string;
        const email = session.user.email?.toLowerCase();
        if (email) {
          try {
            const dbUser = await db.users.getByEmail(email);
            if (dbUser?.id) resolvedId = dbUser.id;
          } catch {
            // DB blip — fall back to token.sub so sign-in still works.
          }
        }
        (session.user as { id: string; isAdmin: boolean }).id = resolvedId;
        (session.user as { id: string; isAdmin: boolean }).isAdmin =
          ADMIN_EMAILS.includes(email ?? "");
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};
