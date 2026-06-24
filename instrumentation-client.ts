// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://4d7b36bce31402f4e8ad615b143f4e01@o4511421018013696.ingest.de.sentry.io/4511421025550416",

  // Free tier is ~5k errors/month — keep traces sampled low.
  tracesSampleRate: 0.1,
  enableLogs: false,

  // Don't ship IP addresses, cookies, or session headers. We have OAuth
  // session cookies + user emails — turning this on would leak them.
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

import posthog from "posthog-js";

// Sandboxed iframes, in-app browsers (LinkedIn/Facebook), Brave shields, and
// Safari ITP corner cases throw SecurityError on any localStorage access.
// Detect that here and fall back to in-memory persistence so posthog never
// touches storage on those contexts. Without this, the next posthog.* call
// (e.g. PostHogIdentifier's reset()) crashes the React commit phase and
// users see a blank page (Sentry: ASTROCHAGANTI-7).
function detectPersistence(): "localStorage+cookie" | "memory" {
  try {
    const probe = "__ph_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return "localStorage+cookie";
  } catch {
    return "memory";
  }
}

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: "/ingest",
  ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  defaults: "2026-01-30",
  persistence: detectPersistence(),
  // Sentry handles exception tracking. Avoid double-capturing.
  capture_exceptions: false,
  debug: process.env.NODE_ENV === "development",
});
