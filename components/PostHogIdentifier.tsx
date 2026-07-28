"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";

export function PostHogIdentifier() {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const email = session?.user?.email;
  const name = session?.user?.name;

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    // Belt-and-suspenders: even with persistence:"memory" set in posthog.init
    // (see instrumentation-client.ts), posthog-js can still touch storage in
    // certain code paths. Swallow storage errors so analytics failures never
    // break the React render (Sentry: ASTROCHAGANTI-7).
    try {
      if (userId) {
        posthog.identify(userId, {
          email: email ?? undefined,
          name: name ?? undefined,
        });
      } else {
        posthog.reset();
      }
    } catch {
      // Analytics is non-essential; failing silently is correct here.
    }
  }, [userId, email, name]);

  return null;
}
