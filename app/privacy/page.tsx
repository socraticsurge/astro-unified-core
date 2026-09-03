export const metadata = { title: "Privacy Policy — Astro Chaganti" };

export default function PrivacyPage() {
  return (
    <article className="prose prose-invert max-w-2xl mx-auto py-12">
      <h1>Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: 2026-09-03</p>

      <h2>What we collect</h2>
      <p>
        When you sign in with Google, we receive your name, email address, and
        profile picture. When you create a birth profile, we store the name,
        date, time, and place of birth you provide, along with the resolved
        latitude, longitude, and timezone.
      </p>
      <p>
        The guest profile tools used from Panchangam do not require an account.
        A guest profile name stays in that browser. If remote calculation is
        enabled, this service receives a place-search query and then the
        selected coordinates, timezone, birth date, and birth time needed for
        the requested calculation; it does not save a guest profile in the
        Astro Chaganti account database.
      </p>

      <h2>How we use it</h2>
      <p>
        Your account information is used solely to identify you within the app
        and link saved profiles to your account. Birth profiles are used to
        compute astrological readings on demand and are stored so you can view
        them again later. We do not sell your data or use birth data for
        advertising. We send only the information needed to the service
        providers described below.
      </p>

      <h2>Service providers</h2>
      <ul>
        <li>Google — for sign-in.</li>
        <li>
          LocationIQ or Geoapify — the configured managed geocoder receives
          the place text needed to return selectable locations. The active
          provider is credited beside guest search results.
        </li>
        <li>
          OpenStreetMap Nominatim — receives place text from signed-in profile
          creation and place-changing edits while the separately reviewed
          managed-provider migration remains disabled. Local development may
          also use Nominatim.
        </li>
        <li>
          OpenStreetMap contributors — the configured geocoder may use
          OpenStreetMap data, with linked attribution where results appear.
        </li>
        <li>
          Upstash Redis, or the configured compatible Redis hosting provider —
          receives HMAC-pseudonymous cache and rate-limit keys. Managed
          geocoding stores only normalized location results there for no more
          than 24 hours; raw place text and account identifiers are not Redis
          keys.
        </li>
        <li>
          DashaFlow sidecar — receives the bounded birth or election-chart
          inputs needed to perform an astrological calculation.
        </li>
        <li>Turso (libSQL) — stores signed-in account profiles and readings.</li>
        <li>Vercel — hosts the application and its server functions.</li>
        <li>
          Sentry — error and performance monitoring. Server request-body
          capture is disabled, and geocoder request URLs are excluded and
          scrubbed so place queries and provider keys are not sent in traces.
        </li>
        <li>
          PostHog — product analytics. Guest calculation routes do not add
          profile names, birth payloads, or chart data to analytics events.
        </li>
      </ul>

      <h2>Retention and caching</h2>
      <p>
        Signed-in profiles remain until you delete them. In a deployed managed
        geocoder flow, this application may cache only normalized location
        results for up to 24 hours under a pseudonymous key; raw place text and
        client IP addresses are not cache keys. Short-lived pseudonymous
        rate-limit records expire with their one-minute window. Each external
        provider, including the configured Redis host, may retain request data
        under its own published terms, which must be reviewed before activation.
      </p>

      <h2>Your choices</h2>
      <p>
        You can delete any saved profile at any time from your dashboard. To
        delete your account entirely, email{" "}
        <a href="mailto:astrochaganti@gmail.com">astrochaganti@gmail.com</a>.
      </p>
    </article>
  );
}
