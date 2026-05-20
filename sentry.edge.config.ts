// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
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
