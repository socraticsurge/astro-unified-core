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

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: "/ingest",
  ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  defaults: "2026-01-30",
  // Sentry handles exception tracking. Avoid double-capturing.
  capture_exceptions: false,
  debug: process.env.NODE_ENV === "development",
});
