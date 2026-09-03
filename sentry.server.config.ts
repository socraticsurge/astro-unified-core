// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { sentryServerPrivacyOptions } from "./lib/sentry-privacy";

Sentry.init({
  dsn: "https://4d7b36bce31402f4e8ad615b143f4e01@o4511421018013696.ingest.de.sentry.io/4511421025550416",

  // Free tier is ~5k errors/month — keep traces sampled low.
  tracesSampleRate: 0.1,
  enableLogs: false,

  // Don't ship IP addresses, cookies, or session headers. We have OAuth
  // session cookies + user emails — turning this on would leak them.
  sendDefaultPii: false,

  // Provider queries contain a birthplace/current-location string and the
  // server-only API key in the URL. Exclude those exact fixed endpoints from
  // fetch spans and scrub them again at the final span boundary.
  ...sentryServerPrivacyOptions(
    Sentry.nativeNodeFetchIntegration,
    Sentry.httpIntegration,
  ),
});
