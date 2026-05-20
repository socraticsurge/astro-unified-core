# Astro Chaganti — Project Reference

A Vedic-astrology birth-chart application by Dr. Vinay Kumar Chaganti.
Users sign in with Google, save profiles for themselves and family
members, and see a detailed chart for each profile.

- **Live site**: https://astro-unified-core-pfni.vercel.app/
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
│ DB: Turso (libSQL)    │         │ No DB, no auth        │
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
| Geocoding             | OpenStreetMap Nominatim                                                |
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
├── engines/dashaflow.ts                # HTTP client for the sidecar
├── chart-summary.ts                    # Text summary for clipboard / LLM
├── geocode.ts                          # Nominatim wrapper
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
api/index.py             # FastAPI: GET /health, POST /calculate
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
| `NEXTAUTH_URL`             | **Must equal** the canonical alias `https://astro-unified-core-pfni.vercel.app` — used in OAuth `redirect_uri` |
| `TURSO_DATABASE_URL`       | libSQL DSN                                                    |
| `TURSO_AUTH_TOKEN`         | Turso token                                                   |
| `DASHAFLOW_SIDECAR_URL`    | `https://dashaflow-sidecar.vercel.app`                        |
| `ADMIN_EMAILS` (required)  | Comma-separated list of admin email addresses. If unset, no one has admin access. |
| `SENTRY_AUTH_TOKEN`        | Build-time only. Uploads source maps to Sentry for readable stack traces. From Sentry → Settings → Auth Tokens. |
| `NEXT_PUBLIC_POSTHOG_KEY`  | PostHog Project API key (`phc_…`). Browser-visible (public-prefix is correct). |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog ingest URL — `https://eu.i.posthog.com`. Browser hits `/ingest/*` which `next.config.ts` rewrites to this. |
| `RESEND_API_KEY`           | Resend API key (`re_…`). Used to send the admin notification email on new consultation requests. If unset, notifications are silently skipped (helper short-circuits). Recipient and from-address are hardcoded in `lib/constants.ts`. |

### Sidecar — none required.

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
   → geocode(place) → lat, lon, timezone via Nominatim + geo-tz
   → INSERT into profiles
   → redirect to /profiles/{id}

3. Dashboard loads at /dashboard?profile={id}
   → GET /api/profiles/{id} → load profile (admin can fetch any)
   → GET /api/readings/dashaflow?profile_id={id}
       → check readings cache (engine="dashaflow")
       → if miss: POST to ${DASHAFLOW_SIDECAR_URL}/calculate
       → save reading row, return chart
   → DashboardClient renders the 10-tab unified view (Today, Chart, Planets,
     Houses, Dasha, Yogas, Jaimini, Ashtakavarga, Transits, Career, Compare)
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

---

## What's deliberately not done (yet)

These came up but were left out of scope. None block the live site.

- **Sidecar auth**: the Python sidecar is unauthenticated. Anyone with the
  URL can compute charts. Low risk (read-only, no PII, no DB), but a shared
  secret header would harden it.
- **Custom domain**: we use `astro-unified-core-pfni.vercel.app`. A real
  domain (`astrochaganti.com` or similar) would be cleaner.
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

1. Add DDL in `lib/db/client.ts` inside `ensureSchema()`.
2. Bump `SCHEMA_VERSION` (currently `7`).
3. Deploy. `ensureSchema()` will auto-run the DDL on the next DB call.
4. Update `docs/ARCHITECTURE.md §5` and `docs/PROJECT.md` schema section.

### Clear stale compatibility history (admin)

1. Sign in as admin → `/admin` → Settings tab → "Clear History" button.
2. Or directly via API: `POST /api/admin/clear-compatibility` with a valid admin session.

---

*See `docs/STANDARDS.md` for coding standards, `docs/ARCHITECTURE.md` for system
design, `docs/BACKLOG.md §Session Decisions` for historical architectural choices.*

*Last updated: 2026-05-14*
