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
    if (userId) {
      posthog.identify(userId, {
        email: email ?? undefined,
        name: name ?? undefined,
      });
    } else {
      posthog.reset();
    }
  }, [userId, email, name]);

  return null;
}
