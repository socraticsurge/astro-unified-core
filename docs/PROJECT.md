# Astro Chaganti — Project Reference

A Vedic-astrology birth-chart application by Dr. Vinay Kumar Chaganti.
Users sign in with Google, save profiles for themselves and family
members, and see a detailed chart for each profile.

- **Live site**: https://astrochaganti.com/
- **Main repo**: https://github.com/socraticsurge/astro-unified-core (this repo)
- **Sidecar repo**: https://github.com/socraticsurge/dashaflow-sidecar (private)

---

## Architecture at a glance

```
GitHub: astro-unified-core      GitHub: dashaflow-sidecar (private)
        │                                 │
        │ push to main                    │ push to master
        ▼                                 ▼
┌───────────────────────┐         ┌───────────────────────┐
│ Vercel project:       │   POST  │ Vercel project:       │
│ astro-unified-core-   │ ──────► │ dashaflow-sidecar     │
│   pfni                │         │                       │
│                       │         │ FastAPI + DashaFlow   │
│ Next.js 16, NextAuth, │         │ (Swiss Ephemeris,     │
│ shadcn/ui, Tailwind   │         │ Lahiri ayanamsha)     │
│                       │         │                       │
│ DB: Turso (libSQL)    │         │ No DB; compute auth   │
└───────────────────────┘         └───────────────────────┘
```

Why two projects? Next.js framework integration on Vercel claims the entire
`/api/*` URL space; a Python serverless function deployed in the same project
is unreachable because Next.js intercepts every `/api/*` request before
routing reaches the function. Splitting the Python service into its own
Vercel project (with no Next.js) gives it sole ownership of `/api/*`.

---

## Stack

| Concern               | Choice                                                                 |
| --------------------- | ---------------------------------------------------------------------- |
| Frontend / API        | Next.js 16 (App Router, Turbopack), React 19, TypeScript               |
| Auth                  | NextAuth v4, Google provider (JWT strategy, no DB adapter)             |
| Database              | Turso (libSQL, hosted)                                                 |
| Astrology engine      | DashaFlow 1.1.0 (PyPI) — Swiss Ephemeris, Lahiri sidereal              |
| Sidecar runtime       | FastAPI on Vercel Python serverless                                    |
| Geocoding             | Local development: fixed OpenStreetMap Nominatim; Preview/Production: one fixed LocationIQ/Geoapify adapter shared by guest and registered-profile journeys |
| UI                    | Tailwind v4, shadcn/ui                                                 |
| Fonts                 | Inter (body) + Cormorant Garamond (headings) via `next/font`           |
| Hosting               | Vercel (both projects, Hobby plan)                                     |

---

## Key code paths

### Main app (`socraticsurge/astro-unified-core`)

```
app/
├── layout.tsx                          # Root layout, fonts, footer, metadata
├── page.tsx                            # Landing page (unauth) + dashboard (auth)
├── auth/signin/page.tsx                # Sign-in page
├── admin/page.tsx                      # Admin dashboard (force-dynamic)
├── profiles/
│   ├── new/page.tsx                    # Profile creation form
│   └── [id]/
│       ├── page.tsx                    # Server component — pre-loads section explainers
│       └── ProfileDetailClient.tsx     # Client wrapper — fetches chart, status chrome
├── privacy/page.tsx                    # Public
├── terms/page.tsx                      # Public — includes content sources / Maitreya attribution
├── credits/page.tsx                    # Public — renders content/CREDITS.md
└── api/
    ├── auth/[...nextauth]/route.ts     # NextAuth handler
    ├── profiles/route.ts               # List / create profiles
    ├── profiles/[id]/route.ts          # Get / delete one profile
    ├── guest/profile/derive/route.ts   # Stateless birth-profile projection
    ├── guest/muhurta/election-charts/  # Stateless election-chart projection
    ├── content/[type]/[key]/route.ts   # Lazy fetch for per-row interpretive content
    └── readings/dashaflow/route.ts     # Sidecar proxy + cache

components/
├── NavBar.tsx                          # Top nav + auth state
├── CosmicLanding.tsx                   # Public landing (replaces LandingPage.tsx)
├── ProfileForm.tsx                     # New-profile form (geocodes on submit)
├── ThemeProvider.tsx, ThemeToggle.tsx  # Umbra dark / Vellum light theme system
├── auth/NextAuthProvider.tsx           # Session provider
├── unified/
│   ├── UnifiedView.tsx                 # 10-tab dashboard shell
│   └── tabs/                           # TodayTab, ChartTab, PlanetsTab,
│                                       # HousesVargasTab, DashaTab, YogasTab,
│                                       # JaiminiTab, AshtakavargaTab,
│                                       # TransitsTab, CareerTab
├── tabs/CompareTab.tsx, TodayTab.tsx   # Top-level compare + today views
├── engines/
│   ├── MuhurthaView.tsx                # Event picker
│   ├── TarabalamView.tsx               # Date-range + multi-profile star compatibility
│   ├── SectionShell.tsx                # Section container with collapse + ⓘ trigger
│   └── ExplainerModal.tsx              # Tabbed modal: "For your chart" + "About"
└── ui/                                 # shadcn primitives

content/                                # 538 markdown files of authored / adapted
                                        # interpretive content (sections, planet-in-house,
                                        # dasha-pair, nakshatra, ascendant, etc.)

lib/
├── auth.ts                             # Shared authOptions for getServerSession
├── admin.ts                            # ADMIN_EMAILS + isAdmin helper
├── db.ts                               # Turso client, schema, queries
├── engines/dashaflow.ts                # Full-chart + guest profile sidecar client
├── engines/dashaflow-election.ts       # Guest election-chart sidecar client
├── chart-summary.ts                    # Text summary for clipboard / LLM
├── geocode.ts                          # Bounded managed adapters + local Nominatim path
└── content/                            # Server-only loaders and renderers
    ├── loader.ts                       # readSync + frontmatter parse, cached
    ├── lookup.ts                       # planet-in-house / dasha-pair / etc. helpers
    ├── markdown.ts                     # marked wrapper + two-track body splitter
    └── types.ts                        # Typed entry shapes
└── astro-utils.ts                      # Sign / longitude helpers

proxy.ts                                # NextAuth middleware (matcher + authorized callback)
```

### Sidecar (`socraticsurge/dashaflow-sidecar`)

```
api/index.py             # FastAPI: public GET /health + authenticated compute routes
api/profile.py           # Authenticated /v1/profile/derive projection
api/election_chart.py    # Authenticated /v1/election-chart/derive projection
requirements.txt         # fastapi==0.115.0, dashaflow==1.1.0
vercel.json              # Subpath rewrite so /api/python/:path* hits the function
```

---

## Environment variables

### Main app (Vercel `astro-unified-core-pfni`)

| Variable                   | Purpose                                                       |
| -------------------------- | ------------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`         | Google OAuth client id                                        |
| `GOOGLE_CLIENT_SECRET`     | Google OAuth client secret                                    |
| `NEXTAUTH_SECRET`          | NextAuth JWT signing                                          |
| `NEXTAUTH_URL`             | Canonical authentication origin used in OAuth `redirect_uri`; verify the deployed value and matching Google OAuth configuration before changing it. |
| `TURSO_DATABASE_URL`       | libSQL DSN                                                    |
| `TURSO_AUTH_TOKEN`         | Turso token                                                   |
| `DASHAFLOW_SIDECAR_URL`    | `https://dashaflow-sidecar.vercel.app`. Vercel Preview/Production require HTTPS; local HTTP is restricted to exact loopback hosts. |
| `DASHAFLOW_SIDECAR_TOKEN`  | Required server-only 32–256 character printable non-space ASCII bearer credential sent to every sidecar compute route (`/calculate`, `/transit`, `/career`, `/compatibility`, `/muhurtha`, and both `/v1/*/derive` projections); must equal the sidecar's `DASHAFLOW_API_TOKEN` value. Never prefix with `NEXT_PUBLIC_`. |
| `GUEST_BIRTH_PROFILE_ENABLED` | Server-only guest place-search/profile-derive gate. Omission defaults on only for an explicitly classified local/test runtime; recognized Vercel Preview/Production runtimes require the exact value `true`, and ambiguous markers (including self-hosted production without a trusted-proxy contract) fail closed. Keep off until Panchangam #231 and #233 close. |
| `GUEST_ELECTION_CHART_ENABLED` | Independent server-only election-chart gate with the same local default and exact deployed opt-in. Keep off until Panchangam #231 closes. |
| `GEOCODER_PROVIDER` | Server-only place-search adapter selector. Optional locally, where fixed public Nominatim is the default. Preview/Production guest search and an enabled authenticated migration require exactly `locationiq-eu`, `locationiq-us`, or `geoapify`; endpoints are code-owned and arbitrary base URLs are not accepted. |
| `GEOCODER_API_KEY` | Server-only key for the selected managed provider; required with `GEOCODER_PROVIDER` for deployed guest search or the enabled authenticated migration, and never returned to the browser. Never prefix with `NEXT_PUBLIC_` or `VITE_`. |
| `GEOCODER_DAILY_REQUEST_LIMIT` | Required server-only managed-provider UTC-day allowance: a canonical integer from 1 through 1,500. The first shared provider reservation each UTC day persists the value; a same-day Preview/Production mismatch fails closed. Every deployed process-cache miss must atomically reserve one cross-environment provider-family slot immediately before provider transit. Warm-process cache hits and coalesced duplicate callers do not consume it; an admitted failed provider attempt does. Missing, malformed, exhausted, or unavailable enforcement fails closed. |
| `RATE_LIMIT_HMAC_SECRET` | Required 32–256 character printable non-space server secret for deployed shared identity/fleet limiting. Turso stores only Vercel-environment-scoped HMAC digests with integer count/expiry fields. Hard attempt admissions per anchored 24-hour window are guest 2,000 Preview / 10,000 Production and managed-authenticated geocoding 500 Preview / 2,500 Production; capacity is reserved before route-specific rows and remains charged after a later denial. Never prefix the secret with `NEXT_PUBLIC_`, reuse it as an account identifier, or write raw IPs, user IDs, place data, birth data, profile data, coordinates, or provider keys to limiter tables. |
| `AUTH_PROFILE_MANAGED_GEOCODER_ENABLED` | Separate server-only registered-profile migration gate. Existing signed-in create/edit keeps the legacy provider unless this equals the exact string `true` in Preview/Production. Enable only after managed provider, Turso controls, quota, privacy, and full journey approval. Guest flags do not control it. |
| `GOOGLE_GEMINI_API_KEY`    | Default LLM provider for AI insights and today/landing readings (`lib/engines/gemini.ts`). Required for `gemini-flash` model usage. Get from Google AI Studio. |
| `GROQ_API_KEY`             | Secondary LLM provider used by chat / draft generation (`lib/engines/groq.ts`). Get from console.groq.com. |
| `ADMIN_EMAILS` (required)  | Comma-separated list of admin email addresses. If unset, no one has admin access. |
| `SENTRY_AUTH_TOKEN`        | Build-time only. Uploads source maps to Sentry for readable stack traces. From Sentry → Settings → Auth Tokens. |
| `NEXT_PUBLIC_POSTHOG_KEY`  | PostHog Project API key (`phc_…`). Browser-visible (public-prefix is correct). |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog ingest URL — `https://eu.i.posthog.com`. Browser hits `/ingest/*` which `next.config.ts` rewrites to this. |
| `RESEND_API_KEY`           | Resend API key (`re_…`). Used to send the admin notification email on new consultation requests. If unset, notifications are silently skipped (helper short-circuits). Recipient and from-address are hardcoded in `lib/constants.ts`. |
| `CRON_SECRET` (required)   | Shared secret the landing-refresh cron sends as `Authorization: Bearer <secret>` to `/api/cron/regenerate-landing` every 8 hours. Generate a random 32+ char string. Set as both a Vercel env var (so the route can validate) AND a GitHub Actions repo secret (so the workflow can send). The workflow lives at `.github/workflows/landing-cron.yml` — we use GitHub Actions instead of Vercel Cron because the Hobby plan only allows daily cron schedules. |

#### Managed geocoder adapters

| `GEOCODER_PROVIDER` | Fixed endpoint | Query/key parameters | Normalized response |
|---|---|---|---|
| `locationiq-eu` | `https://eu1.locationiq.com/v1/search` | `q` / `key`; adapter pins OSM-only `source=nom` | JSON array with `lat`, `lon`, `display_name`, `place_id` |
| `locationiq-us` | `https://us1.locationiq.com/v1/search` | `q` / `key`; adapter pins OSM-only `source=nom` | JSON array with `lat`, `lon`, `display_name`, `place_id` |
| `geoapify` | `https://api.geoapify.com/v1/geocode/search` | `text` / `apiKey`; adapter forces `format=json` | `results` array with `lat`, `lon`, `formatted`, `place_id` |

The endpoint and parameter mapping is not environment-configurable. Guest
search keeps its existing `attribution` string and adds structured
`{ label, url }` links for provider and OpenStreetMap credit. Existing deployed
authenticated profile creation/editing keeps its legacy provider until
`AUTH_PROFILE_MANAGED_GEOCODER_ENABLED=true`. The enabled migration uses the
same fixed provider independently of guest flags, issues one bounded query per
place, and applies a distributed ten-call-per-user limit plus the same 30-call
minute fleet ceiling used by guest search. After a process-cache miss and
duplicate coalescing, guest and managed-authenticated work also share one
atomic `GEOCODER_DAILY_REQUEST_LIMIT` counter per provider family and UTC day.
Preview and Production deliberately share that non-personal aggregate row when
they use the same provider account; LocationIQ EU/US also share one LocationIQ
pool. A 1,100 ms database-clock lease orders distributed admission but does not
strictly order actual network sends across functions. Failed admitted provider
attempts consume their slot; warm-process cached and coalesced work does not.
Provider HTTP `429` responses map to a sanitized app `429` with bounded
`Retry-After`; transport, timeout, malformed-response, and provider-server
failures map to retryable `503`. Normalized place results remain only in a bounded,
24-hour process cache and are never persisted as a shared result cache or
limiter data. A location explicitly selected for a signed-in saved profile
continues to be stored in that profile. See the official
[LocationIQ search contract](https://docs.locationiq.com/reference/search),
[LocationIQ attribution guide](https://web.locationiq.com/attribution), and
[Geoapify forward-geocoding contract](https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/).
LocationIQ is the recommended release candidate, but human account creation,
terms/billing approval, a real key, and activation remain release decisions
tracked in Panchangam #233.

The configured Vercel environment metadata confirms that both Preview and
Production define Turso variables, but the secret values were not inspected and
the exact physical database identity is not currently verified. The intended
shared-provider topology requires one physical Turso database for the
cross-environment provider-family row. Confirm that identity and measure current
Turso usage/headroom before activation; the presence of adapter code is not a
public-readiness signal.

### Sidecar

| Variable | Purpose |
|---|---|
| `DASHAFLOW_API_TOKEN` | Required 32–256 character bearer-token verifier for every compute route. `GET /` and `GET /health` remain public. Use the same secret value as the main app's `DASHAFLOW_SIDECAR_TOKEN`. |

### Guest calculation gateway rollout (approval-gated)

This is a coordinated three-service change; a code merge by itself is not a
release. Use this order so no public browser can reach an uncredentialed or
missing calculation operation:

1. Keep `GUEST_BIRTH_PROFILE_ENABLED` and `GUEST_ELECTION_CHART_ENABLED`
   absent or false in Vercel Preview and Production. Close Panchangam #231 with
   the owner-recorded Swiss Ephemeris license decision. Close #233 with the
   approved managed geocoder choice; LocationIQ is recommended but its account
   and key remain human-owned steps. Configure `GEOCODER_PROVIDER` and
   server-only `GEOCODER_API_KEY`, plus an owner-approved canonical
   `GEOCODER_DAILY_REQUEST_LIMIT` from 1 through 1,500. Public Nominatim cannot
   satisfy deployed guest configuration. Keep
   `AUTH_PROFILE_MANAGED_GEOCODER_ENABLED` absent or false so this guest rollout
   cannot regress existing signed-in profiles.
2. Generate one random 32–256 character printable non-space service credential.
   Configure the same value as `DASHAFLOW_API_TOKEN` on the sidecar and
   `DASHAFLOW_SIDECAR_TOKEN` on Astro Chaganti Preview and Production. Confirm
   the configured sidecar URL is HTTPS in both Astro environments.
3. Deploy the credentialed Astro caller migration while the current sidecar
   still accepts legacy operations. Verify authorized full-chart, transit,
   career, compatibility, and registered-user Muhurtha fixtures; missing or
   unsafe Astro configuration must fail closed without a network request.
4. Deploy the sidecar enforcement change. Verify `GET /health` remains public,
   all seven compute operations reject a missing/wrong bearer token, and the
   same authorized fixtures still pass. Roll back the sidecar first if this
   verification fails.
5. Generate a separate 32–256 character printable non-space
   `RATE_LIMIT_HMAC_SECRET` for Astro Chaganti Preview and Production. Verify
   that both environments point to the intended physical Turso database and
   measure current usage/quota headroom before rollout; variable-name presence
   alone does not prove DB identity. Identity
   and fleet rows are HMAC-pseudonymous and separated by Vercel environment;
   the non-personal provider-family quota/pacing row intentionally spans
   Preview and Production when one provider account is shared. Place queries,
   results, labels, IDs, birth details, coordinates, provider keys, and profile
   data never enter limiter tables. Preview and Production fail closed with
   `503` when shared enforcement is absent or unavailable. Attempt caps per
   anchored 24-hour window are guest 2,000 Preview / 10,000 Production and
   managed-authenticated geocoding 500 Preview / 2,500 Production. Capacity is
   reserved before route-specific rows and is not refunded after a later
   user/fleet/client denial. Before either public flag is enabled, explicitly
   accept the resulting pool-exhaustion availability risk or add a fleet-wide
   WAF/edge limit or atomic composite admission. One cooperative two-second
   deadline bounds the complete deployed guard chain and prevents later SQL
   dispatch after expiry. Measure cold-path Preview p95/p99 before activation;
   do not extend this deadline without re-budgeting the browser and sidecar
   limits. An already-dispatched Turso operation may still settle and consume a
   slot, so never refund or automatically retry a storage-ambiguous attempt.
   The current focused cold-start helper still issues idempotent DDL before the
   capacity preflight. Before public activation, move that DDL to a controlled
   full-schema/deployment provisioning step, make guest readiness read-only and
   fail-closed, and add an edge/WAF ceiling for cold-start and post-cap reads.
6. Verify the gateway's allowed/disallowed
   OPTIONS, `private, no-store`, 4 KiB rejection, local and global rate-limit
   retry headers, and fixture profile and election-chart derivations,
   including chart order and whole-sign provenance. Tokens must never appear
   in a browser bundle or response.
7. Enable only the route being released by setting its server-only flag to the
   exact value `true`. Verify disabled routes still return a sanitized
   `private, no-store` `503` without consuming request bodies, local limits,
   Turso limiter, geocoder, or sidecar capacity.
8. Point the Panchangam UI at `https://astrochaganti.com/api/guest` and publish
   that consumer only after the gateway fixture passes from
   `https://panchangam.astrochaganti.com`.
9. Treat registered-profile provider migration as a later, independent release.
   Keep `AUTH_PROFILE_MANAGED_GEOCODER_ENABLED` off until signed-in profile
   create/edit, provider attribution and privacy terms, Turso-counter failure,
   process-cache behavior, per-user limiting, and the fleet ceiling pass in
   Preview. Enable the exact
   value `true` only with separate owner approval; guest flags do not imply it.

Rollback is stateless: keep the Panchangam manual-profile and base Muhurtam
ranking paths available, disable their optional guest API entry points, then
roll back the gateway if needed. There are no Astro Chaganti profile rows,
sessions, durable result caches, intent records, or analytics events to delete.
Rotate both
token variables together if either value may have been exposed.

### Google Cloud Console — OAuth consent

- **Authorized redirect URIs**: `https://astro-unified-core-pfni.vercel.app/api/auth/callback/google` (exact match required by Google).
- **Authorized JavaScript origins**: `https://astro-unified-core-pfni.vercel.app`.

---

## Database schema (Turso)

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,        -- Google sub (subject id)
  name TEXT,
  email TEXT UNIQUE,
  image TEXT,
  last_login TEXT             -- ISO timestamp
);

CREATE TABLE profiles (
  id TEXT PRIMARY KEY,        -- UUID
  user_id TEXT NOT NULL,      -- → users.id
  name TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,    -- YYYY-MM-DD
  time_of_birth TEXT NOT NULL,    -- HH:MM
  place_of_birth TEXT NOT NULL,   -- resolved display name
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  timezone TEXT NOT NULL,         -- IANA (e.g. "Asia/Kolkata")
  timezone_offset REAL NOT NULL,  -- decimal hours (e.g. 5.5)
  created_at TEXT NOT NULL
);

CREATE TABLE readings (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  engine TEXT NOT NULL,           -- "dashaflow" today; older rows: "vedastro", "bazi", etc.
  input_snapshot TEXT NOT NULL,   -- JSON of the input
  output_data TEXT NOT NULL,      -- JSON of the chart
  created_at TEXT NOT NULL
);

CREATE INDEX idx_profiles_user ON profiles(user_id);
CREATE INDEX idx_readings_profile ON readings(profile_id);
```

Schema is created lazily by `db.ts` on first call (`ensureSchema`) — no
migration tool. Old rows from removed engines (`bazi`, `vedastro`, etc.) are
harmless dead data.

---

## Auth model

- NextAuth v4, JWT strategy (no DB adapter — sessions live in the JWT cookie).
- `signIn` callback upserts the user row in Turso so the admin can see who
  signed in.
- `session` callback adds `user.id = token.sub` (the Google subject id) so
  server routes can scope queries by user.
- `lib/auth.ts` exports `authOptions`, which **must** be passed to every
  `getServerSession(authOptions)` call — without it, the session callback
  doesn't fire and `user.id` is `undefined`.
- `lib/admin.ts` exposes `isAdmin(session)` — **server-side only**. Reads
  `ADMIN_EMAILS` env var (no hardcoded fallback; if unset, no one is admin).
  The `session` callback in `lib/auth.ts` stamps `user.isAdmin` into the JWT at
  sign-in so client components can read it without re-evaluating env vars.
  See `docs/STANDARDS.md §5` for the full isAdmin pattern.

Admin can read any user's profile and chart (override applied in
`/api/profiles/[id]` GET and `/api/readings/dashaflow` GET/POST). Admin
cannot delete other users' profiles.

`proxy.ts` (NextAuth middleware) protects all paths matched by its config
except those listed in `PUBLIC_PATHS = {"/", "/privacy", "/terms"}`. Public
pages render to anyone; everything else redirects to `/auth/signin` if
unauthenticated.

---

## DashaFlow chart output

Every chart returns 17 sections; the view renders all of them as collapsible
sections.

| Section              | Highlights                                                          |
| -------------------- | ------------------------------------------------------------------- |
| metadata             | Ayanamsha (Lahiri), exact value, query date, coords, timezone        |
| panchang             | Tithi, Vara, Nakshatra, Yoga, Karana                                 |
| lagna                | Ascendant in D1 + 14 divisional charts (D2–D60)                      |
| planets              | Sign, degree, house, nakshatra, pada, dignity, retrograde, combust   |
| dashas               | 5-level Vimshottari tree + full timeline                             |
| yogas                | Major/minor planetary combinations with explanations                 |
| ashtakavarga         | Bhinnashtakavarga + SAV totals                                       |
| jaimini_karakas      | Atmakaraka, etc.                                                     |
| shadbala             | Six-fold strength per planet                                         |
| bhava_chalit         | Bhava vs rashi house shifts                                          |
| avasthas             | Planetary states                                                     |
| kaal_sarpa, graha_yuddha, gandanta, arudha_padas, upapada, karakamsha | … |

The reading is cached in `readings` after first fetch; "Refresh" on the
profile detail page re-fetches and overwrites.

---

## Lessons learned, gotchas, and dead ends

These are the real ones we hit, in roughly the order we hit them.

### 1. Google `redirect_uri_mismatch`

**Symptom**: Sign-In with Google fails with `Error 400: redirect_uri_mismatch`.

**Cause**: Google requires the `redirect_uri` to **exactly** match an entry in
"Authorized redirect URIs". Vercel deployments expose multiple URLs
(deployment-hash, team alias, git alias, clean alias) and NextAuth uses
whichever one the request landed on.

**Fix**: pin `NEXTAUTH_URL` to one canonical alias (the clean
`*.vercel.app` URL) so NextAuth always sends the same redirect URI, and
register exactly that callback URL in Google Console.

### 2. `getServerSession()` without `authOptions`

**Symptom**: Profile creation returned 500, the client showed
"Unexpected end of JSON input".

**Cause**: NextAuth v4: when `getServerSession()` is called *without* passing
`authOptions`, the custom `session` callback never runs, so
`session.user.id` is `undefined`. Every `db.profiles.create(undefined, …)`
call then violated the NOT NULL constraint on `user_id`.

**Fix**: extract `authOptions` to `lib/auth.ts` and pass it everywhere:
`getServerSession(authOptions)`. Subtle and easy to miss; affected ~15 routes.

### 3. Server components prerendering with no env

**Symptom**: Vercel build failed with `TypeError: Invalid URL` while
prerendering `/admin`.

**Cause**: `/admin` is a server component that calls `getServerSession()`
and DB methods. Next.js tried to prerender it at build time, but with
`TURSO_DATABASE_URL=""` (sensitive vars don't pull locally) the libSQL
client constructor blew up.

**Fix**: `export const dynamic = "force-dynamic"` at the top of
`app/admin/page.tsx`. Any future server component that depends on request
context (auth, headers, cookies, DB calls) needs the same.

### 4. Vercel Hobby plan author-email gate

**Symptom**: After pushing commits, deployment errored instantly with no
build logs. CLI showed "Unexpected error".

**Cause**: Vercel Hobby plans block deployments whose commit author email
isn't tied to the Vercel account. Real reason was hidden behind a generic
error in the CLI; only visible in the v13 deployment API as
`readyStateReason: "The Deployment was blocked because the commit author
does not have contributing access to the project on Vercel."`

**Fix**: re-author commits with the email registered to the Vercel account
(`cvk.atreya@gmail.com`), force-push. Going forward, the repo's local git
config is set to that email.

**Tooling note**: when Vercel deploys error mysteriously, fetch
`GET /v13/deployments/{id}` and read `readyStateReason` directly — the CLI
hides the actionable detail.

### 5. SSO Deployment Protection blocks intra-deployment fetches

**Symptom**: After fixing auth, engine reading routes returned `Unauthorized`
inside the response body.

**Cause**: Engines fetched `https://${VERCEL_URL}/api/python/...`. `VERCEL_URL`
is the deployment-hash URL, which is gated by Vercel SSO Deployment
Protection (config: `all_except_custom_domains`). The clean alias is
exempt.

**Fix**: use `VERCEL_PROJECT_PRODUCTION_URL` (the stable alias) for
intra-deployment fetches. This was the right *idea* but didn't fully solve
things — see #6.

### 6. Next.js owns `/api/*` — Python serverless can't share

**Symptom**: After #5, requests to `/api/python/calculate` returned 500 from
Next.js's error page (`x-matched-path: /500`). The Python lambda was
deployed (`lambdaRuntimeStats: {python: 1}`) but never invoked.

**Cause**: With Next.js as the framework, Vercel's routing layer hands every
`/api/*` request to the Next.js function. A Python file at `api/python/index.py`
is built and deployed but never gets traffic. Renaming the file inside `/api/`
doesn't help — Next.js claims the whole namespace.

**Things that did NOT work**:
- Deleting the Next.js stub at `app/api/python/route.ts` (Next still 500's).
- `vercel.json` rewrite `/api/python/:path*` → `/api/python` (Next is upstream).
- Renaming `api/python/index.py` to `api/sidecar.py` (still under `/api/`).
- ASGI middleware that strips path prefix (the request never reached the lambda).

**What worked**: deploy the Python service as a **separate Vercel project**
with no framework. The Python lambda then has sole ownership of `/api/*`
on its own domain (`dashaflow-sidecar.vercel.app`). The main app calls it
via absolute URL.

### 7. VedAstro free-tier rate limit

**Symptom**: Some chart sections returned `"Status": "Fail"` with a
"Free tier rate limit exceeded (5 calls/minute)" payload.

**Cause**: VedAstro public API has a 5-call/minute cap on the free tier;
each profile creation made 5 calls in parallel and exceeded budget on
even moderate usage.

**Footprint of decision**: ultimately replaced VedAstro with self-hosted
DashaFlow (no rate limit, more sections) — see #8.

### 8. Lagna mismatch — sidereal vs tropical

**Symptom**: For the same birth time, our app showed Capricorn lagna while
some other apps showed Sagittarius (or vice-versa).

**Cause**: We use the Vedic sidereal zodiac with Lahiri ayanamsha. Western/
tropical apps use a different reference frame; the offset is roughly 24°,
enough to shift the lagna and several planets by a sign. Both can be
internally consistent — they're different reference frames, not a bug.

**Documented in the public FAQ on the landing page.**

### 9. JSX whitespace stripped by Turbopack/SWC

**Symptom**: Bio paragraph rendered as `Chagantibrings` — no space between
the bolded name and the next word, despite a literal space character in the
source.

**Cause**: Next.js 16 + Turbopack's JSX whitespace normalization can strip
whitespace adjacent to a closing tag inside a `<p>` whose body has
multi-line text content. Both `<span>X</span> Y` (single line) and
`<span>X</span>{" "}Y` got normalized away in this configuration.

**Fix**: put the space *inside* the span as trailing text content:
`<span>X </span>Y`. The space becomes character data within the element
and is no longer subject to JSX whitespace rules. Visually identical (a
bolded space is invisible).

### 10. `vercel env pull` returns empty strings for sensitive vars

**Symptom**: `vercel build --prod` locally fails on `URL` parsing.

**Cause**: Vercel marks production secrets as sensitive; `vercel env pull`
writes empty strings rather than actual values. Local builds then run with
`TURSO_DATABASE_URL=""`, and code paths that construct a URL fail.

**Fix**: don't try to do full Vercel-style builds locally. Use plain
`next build` for local sanity checks; let the cloud build see real env vars.

### 11. Vercel `productionBranch` not editable via API

**Symptom**: GitHub default-branch rename (`master` → `main`) didn't change
which branch Vercel deploys as Production.

**Cause**: The `productionBranch` field in the project's `link` object is
read-only via the public Vercel API; it can only be changed via the Vercel UI.

**Workaround**: rename the GitHub default branch to match Vercel's stored
`productionBranch` value. Cosmetic compromise — branch name is internal-only.

### 12. Cache invalidation across engine swaps

When we changed the cached output shape (e.g. swapping VedAstro key names,
or moving from VedAstro to DashaFlow), the easiest invalidation strategy
was to **change the engine name string** in the readings table. Old cached
rows under the old name become orphans (dead data, harmless), and the new
name has no cached row, so the next request triggers a fresh fetch.

### 13. Vercel CLI `vercel logs` and `vercel inspect --logs` are flaky

`vercel logs <url>` regularly times out or hangs. `vercel inspect <url> --logs`
silently returns nothing. The reliable path for debugging a deployment:
fetch `GET /v13/deployments/{id}` from the Vercel API, read `readyState`,
`readyStateReason`, `errorLink`. The actionable reason is almost always there.

---

## How auth, profile, and reading flow

```
1. User clicks "Sign In with Google"
   → /auth/signin redirects to Google
   → Google redirects back to /api/auth/callback/google with code
   → NextAuth verifies, signIn() callback upserts users row in Turso
   → JWT cookie set, user lands at /

2. User creates a profile at /profiles/new
   → POST /api/profiles
   → getServerSession(authOptions) → user.id (Google sub)
   → geocode(place) → lat, lon, timezone via the configured provider + geo-tz
   → INSERT into profiles
   → redirect to /profiles/{id}

3. Dashboard loads at /dashboard?profile={id}
   → GET /api/profiles/{id} → load profile (admin can fetch any)
   → GET /api/readings/dashaflow?profile_id={id}
       → check readings cache (engine="dashaflow")
       → if miss: authenticated POST to ${DASHAFLOW_SIDECAR_URL}/calculate
       → save reading row, return chart
   → DashboardClient renders the 10-tab unified view (Today, Chart, Planets,
     Houses, Dasha, Yogas, Jaimini, Ashtakavarga, Transits, Career, Compare)

4. Panchangam guest derives a browser-local profile (no Astro Chaganti session)
   → POST /api/guest/places/search from an approved Origin
   → choose returned coordinates + IANA timezone
   → POST /api/guest/profile/derive with exact date/time and selected place
   → main app sends DASHAFLOW_SIDECAR_TOKEN to sidecar /v1/profile/derive
   → return only normalized contract v1; Panchangam stores it locally

5. Panchangam guest requests election charts for Muhurtam screening
   → POST /api/guest/muhurta/election-charts from an approved Origin
   → main app validates location + at most 24 bounded, ordered instants
   → main app omits browser credentials and sends DASHAFLOW_SIDECAR_TOKEN to
     sidecar /v1/election-chart/derive
   → validate and return only contract v1; no activity, person, natal chart,
     auth session, intent, or result is persisted
```

---

## Local development

```bash
# Main app
cd astrounified
npm install
npm run dev               # http://localhost:3000

# Sidecar (only needed if you're changing it)
cd dashaflow-sidecar
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn api.index:app --reload  # http://localhost:8000
# then point the main app at it: PYTHON_SIDECAR_URL=http://localhost:8000
```

For local main-app dev you don't need the local sidecar — `DASHAFLOW_SIDECAR_URL`
in `.env.local` (or the Vercel-pulled one) can point to the production sidecar.
Every sidecar computation requires `DASHAFLOW_SIDECAR_TOKEN` to match the
selected sidecar's `DASHAFLOW_API_TOKEN`; only health checks omit it. Local
browser requests are
accepted only from exact HTTP `localhost`, `127.0.0.1`, or `[::1]` origins.
Local sidecar HTTP follows the same exact-loopback rule; Preview and Production
always require an HTTPS sidecar URL before bearer credentials are attached.
Guest calculations default on locally when their server-only flags are omitted;
set either flag to `false` to test its disabled state. Local public-Nominatim
calls share one process-wide 1,100 ms request-start scheduler and a bounded
24-hour cache. Preview and Production default both guest routes off; guest
place search requires one fixed LocationIQ or Geoapify adapter, its server-only
key, and the Turso-backed shared controls. Results remain in bounded process
memory only.
Signed-in profiles retain the legacy provider until the separate
managed-migration flag is approved and enabled. Adapter support and the
LocationIQ recommendation do not themselves approve terms, provision a human
account or real key, or activate either feature.

---

## What's deliberately not done (yet)

These came up but were left out of scope. None block the live site.

- **Production domain**: `https://astrochaganti.com` is attached to the
  `astro-unified-core-pfni` Vercel project. Authentication callback settings
  remain a separate controlled configuration boundary.
- **Lead capture**: the contact section is a `mailto:` link. No email
  capture / waitlist form yet.
- **Payment / appointment booking**: the current flow asks users to email
  for a calendar link. Could be wired to Cal.com, Calendly, or similar.
- **Profile editing**: only DELETE is supported on `/api/profiles/[id]`.
  No PATCH; if you want to fix a typo, delete and recreate.
- **Profile sharing**: profiles are private to the owner (and visible to
  the admin). No share-link / public-profile feature.
- **Family/relationship metadata**: profiles are flat. No way to mark a
  profile as "spouse of X" so the admin can navigate relationships.
- **DashaFlow extras**: the library exposes `calculate_compatibility`,
  `analyze_career`, `match_kuja_dosha`, `evaluate_muhurtha`, etc. We only
  call `calculate_vedic_chart`. Plenty more to surface.
- **Pre-existing lint warnings**: `app/page.tsx` has a `setState`-in-effect
  warning, and `lib/engines/bazi.ts` (deleted) had an unused param. These
  don't block builds but should get cleaned up.
- **Old `readings` rows**: dead rows for removed engines (`bazi`,
  `vedastro`, etc.) sit in the DB. Cosmetic. One-line cleanup if you want:
  `DELETE FROM readings WHERE engine != 'dashaflow';`.
- **Profile editing not available**: only DELETE is supported on
  `/api/profiles/[id]`. No PATCH; to fix a typo, delete and recreate.

---

## Runbook

Common operational procedures for deployment, maintenance, and debugging.

### Add or change admin users

1. Update `ADMIN_EMAILS` env var in the Vercel dashboard (Production + Preview scopes).
2. Existing admin users must **sign out and sign back in** — the `isAdmin` flag
   is baked into the JWT at sign-in time. Changing env vars does not retroactively
   update existing sessions.

### Run a sidecar backfill (refresh all cached charts)

1. Sign in as an admin.
2. Navigate to `/admin` → use the backfill button.
3. Monitor Vercel function logs for errors (`GET /v13/deployments/{id}` via API
   if logs CLI is flaky — see Lesson 13 in this file).

### Verify a failed deployment

```bash
# Find the deployment ID
curl -s "https://api.vercel.com/v6/deployments?teamId=TEAM_ID" \
  -H "Authorization: Bearer TOKEN" | jq '.deployments[0]'

# Read the failure reason
curl -s "https://api.vercel.com/v13/deployments/DEPLOYMENT_ID" \
  -H "Authorization: Bearer TOKEN" | jq '.readyStateReason, .errorLink'
```

### Update a Vercel env var without the CLI

The CLI sometimes fails on preview scopes. Use the REST API directly:

```bash
curl -X POST "https://api.vercel.com/v10/projects/PROJECT_ID/env" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"ENV_KEY","value":"VALUE","type":"plain","target":["preview"]}'
```

### Schema migration

1. Add new idempotent tables/indexes to `bootstrapTables()` in
   `lib/db/client.ts`. If a focused cold-start helper owns the DDL, call that
   same helper from the full bootstrap.
2. Add version-dependent `ALTER TABLE`, backfill, or seed work to
   `runMigrations()` via `migrate()`.
3. Bump `SCHEMA_VERSION` (currently `12`) with the schema change.
4. Deploy. The next DB call always runs the idempotent bootstrap and runs
   migrations only when the stored version is behind.
5. Update `docs/ARCHITECTURE.md §5` and this schema section.

### Clear stale compatibility history (admin)

1. Sign in as admin → `/admin` → Settings tab → "Clear History" button.
2. Or directly via API: `POST /api/admin/clear-compatibility` with a valid admin session.

---

*See `docs/STANDARDS.md` for coding standards, `docs/ARCHITECTURE.md` for system
design, `docs/BACKLOG.md §Session Decisions` for historical architectural choices.*

*Last updated: 2026-09-04*
