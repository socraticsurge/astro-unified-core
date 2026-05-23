# Astro Chaganti — Architecture & Module Reference

<!-- last-updated: 2026-05-21 -->

> **Note:** The legacy "Basic / Professional" two-mode chart view was replaced
> with the unified 10-tab dashboard on 2026-05-19. The components below
> describe the current architecture; legacy components (`ProfileDetailClient`,
> `ProfessionalView`, `DashaflowView`, `VargaDashboard`, `AntardashaTimeline`,
> `TransitView`, `CareerView`, `AIInsightShell`, `ProfileChat`, `LandingPage`,
> `ChartSkeleton`, `dashboard/ProfileList`) are deleted. If you see any of
> them referenced in code, check `git log` — they're gone from `main` after
> commit `297c665` (#52).

> **Companion to [`PROJECT.md`](./PROJECT.md)** — that file covers env vars,
> deployment gotchas, and the auth model. This file covers the code itself:
> every module's purpose, how the pieces connect, and the user journeys they
> serve.
>
> All file links point to `main` on GitHub:
> `https://github.com/socraticsurge/astro-unified-core`
>
> **Maintenance rule:** Update the `<!-- last-updated -->` stamp and the
> affected section(s) on every push that changes structure, routes, or journeys.
> See [`STANDARDS.md`](./STANDARDS.md) for the full documentation hygiene rules.

---

## Table of Contents

0. [User Types](#0-user-types)
1. [Server / Client Boundary Map](#1-server--client-boundary-map)
2. [Repository Layout](#2-repository-layout)
3. [Entry Points & Routing](#3-entry-points--routing)
4. [Authentication Layer](#4-authentication-layer)
5. [Database Layer](#5-database-layer)
6. [Astrology Engine Layer](#6-astrology-engine-layer)
7. [API Routes](#7-api-routes)
8. [Page Components](#8-page-components)
9. [Shared UI Components](#9-shared-ui-components)
10. [Content Library (Markdown CMS)](#10-content-library-markdown-cms)
11. [Utility Modules](#11-utility-modules)
12. [User Journey Traces](#12-user-journey-traces)
13. [Code Organisation Assessment](#13-code-organisation-assessment)
14. [Observability & Daily Landing Engine](#14-observability--daily-landing-engine)

---

## 0. User Types

<!-- last-updated: 2026-05-13 -->

Three personas access the app. Every feature decision and user journey should
be reasoned against all three.

### Guest (unauthenticated)
- Can access: `/` (landing), `/privacy`, `/terms`, `/credits`
- Cannot access: anything under `/dashboard`, `/profiles`, `/compatibility`, `/admin`
- All protected routes redirect to `/auth/signin` via [`proxy.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/proxy.ts) middleware

### Registered User
- Can access: full app — dashboard, profile CRUD, charts, compatibility
- Scoped to own data only: `db.profiles.list(userId)`, `db.compatibility.list(userId)`
- Limits: 10 profiles max, 6 compatibility checks max, rate-limited on refresh
- Cannot see: other users' profiles, admin panel, professional views

### Admin
- Defined by `ADMIN_EMAILS` env var (see [`lib/admin.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/admin.ts))
- Can access: everything a Registered User can + admin panel at `/admin`
- Elevated data access: `db.profiles.getAny(id)`, `db.compatibility.getAny(id)`, `db.profiles.listAllWithUser()`
- Professional view toggle on all profile and compatibility detail pages
- Can trigger sidecar backfill (`/api/admin/backfill`) and clear compatibility history (`/api/admin/clear-compatibility`)

---

## 1. Server / Client Boundary Map

<!-- last-updated: 2026-05-14 -->

This is the most important section for anyone touching the codebase. Understanding
what runs where prevents the class of bugs where env vars are missing, `getServerSession`
returns null, or admin features silently disappear.

### The rule

**Server** = runs in a Node.js Lambda on Vercel. Has access to all env vars
(including secrets). Can call the DB, sidecar, and `getServerSession(authOptions)`.
Never runs in the browser.

**Client** = runs in the browser. Has NO access to server env vars.
`process.env.ADMIN_EMAILS` is `undefined`. `process.env.NEXTAUTH_SECRET` is `undefined`.
Must receive data via props, `useSession()`, or fetch calls to API routes.

### Page and layout components

| File | Runtime | Why |
|---|---|---|
| `app/layout.tsx` | Server | Root HTML shell, font loading, analytics |
| `app/page.tsx` | Server | Session check → redirect or LandingPage |
| `app/dashboard/page.tsx` | Server + `force-dynamic` | DB read (`db.profiles.list`) |
| `app/profiles/new/page.tsx` | Server | Static form shell |
| `app/profiles/[id]/page.tsx` | Server + `force-dynamic` | DB read (profile + sections) |
| `app/profiles/[id]/edit/page.tsx` | Server + `force-dynamic` | DB read (profile pre-fill) |
| `app/compatibility/page.tsx` | Server + `force-dynamic` | DB read (profiles + checks) |
| `app/compatibility/[id]/page.tsx` | Server + `force-dynamic` | DB read (check + profiles) |
| `app/admin/page.tsx` | Server + `force-dynamic` | Admin guard + all DB reads |
| `app/consultation/page.tsx` | Server + `force-dynamic` | DB read (pending request + settings) |
| `app/auth/signin/page.tsx` | Server | Static sign-in form |
| `app/privacy/page.tsx` | Server | Static |
| `app/terms/page.tsx` | Server | Static |
| `app/credits/page.tsx` | Server | Renders CREDITS.md |

### Client components (`"use client"`)

| File | Why client | What it cannot do |
|---|---|---|
| `app/dashboard/DashboardClient.tsx` | Active profile state, tab orchestration, parallel prefetch | Cannot call `isAdmin()` — reads `session.user.isAdmin` |
| `app/compatibility/[id]/CompatibilityDetailClient.tsx` | Interactive detail tabs | Same — reads `session.user.isAdmin` |
| `app/admin/AdminTables.tsx` | Tabs, sort, inline actions | Cannot call `isAdmin()` — admin gate is on the server page |
| `app/consultation/ConsultationForm.tsx` | Multi-step form with live preview | Receives settings as props from server |
| `components/NavBar.tsx` | `useSession`, `signOut`, profile chips, Ask button | Cannot call `isAdmin()` — reads `session.user.isAdmin` |
| `components/CosmicLanding.tsx` | Earth-globe video, theme-aware star canvas | Public landing |
| `components/AppShell.tsx`, `AppStarCanvas.tsx` | Persistent background canvas | |
| `components/compatibility/CompatibilityClient.tsx` | Profile selection, check submission | Receives profiles + checks as props |
| `components/profiles/ProfileView.tsx` + `components/unified/tabs/*` | 10-tab dashboard shell: Today, Chart, Planets, HousesVargas, Dasha, Yogas, Jaimini, Ashtakavarga, Transits, Career, Compare. `ProfileView` owns the active-tab state and renders the relevant tab component. | Receives chart/transit/career output as props |
| `components/tabs/CompareTab.tsx`, `TodayTab.tsx` | Multi-profile compare + Today highlights | |
| `components/engines/MuhurthaView.tsx` | Event picker | |
| `components/engines/TarabalamView.tsx` | Date range + multi-profile picker | |
| `components/panels/AskPanel.tsx`, `AIAdminPanel.tsx` | Slide-out Ask + admin LLM panels | |
| `components/profiles/ProfileNav.tsx`, `ProfileChip.tsx`, `ProfileSidebar.tsx`, `ProfileView.tsx` | Profile chip nav + sidebar info | |
| `components/ProfileLoadingScreen.tsx` | Celestial loading screen after profile creation | |
| `components/ThemeProvider.tsx`, `ThemeToggle.tsx` | next-themes provider + toggle (Umbra / Vellum) | |
| `components/FeedbackWidget.tsx` | Floating overlay, form submit | |
| `components/ProfileForm.tsx` | Geocode-on-submit, controlled form | |
| `components/auth/NextAuthProvider.tsx` | `SessionProvider` mount | |

### API routes (all server-side, all in `app/api/`)

Every API route runs on the server. The client calls them via `fetch()`.
See [Section 7: API Routes](#7-api-routes) for the full route table.

### The `isAdmin` pattern

```
lib/auth.ts session callback (server)
  → evaluates ADMIN_EMAILS env var
  → stamps user.isAdmin = true/false into the JWT

lib/admin.ts isAdmin(session) (server-only)
  → called only in server components and API routes
  → NEVER in "use client" components

Client components (browser)
  → const showAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin === true
  → reads the flag from the JWT, already evaluated server-side
```

If `isAdmin` is ever invisible to admin users after a code change, the
cause is almost always `isAdmin(session)` being called in a client component.

### What `process.env` is available where

| Variable | Server component | API route | Client component |
|---|---|---|---|
| `TURSO_DATABASE_URL` | Yes | Yes | No (never expose) |
| `TURSO_AUTH_TOKEN` | Yes | Yes | No (never expose) |
| `NEXTAUTH_SECRET` | Yes | Yes | No (never expose) |
| `ADMIN_EMAILS` | Yes | Yes | No (never expose) |
| `DASHAFLOW_SIDECAR_URL` | Yes | Yes | No |
| `GOOGLE_CLIENT_ID` | Yes | Yes | No |
| `NEXTAUTH_URL` | Yes | Yes | No |
| `NEXT_PUBLIC_SENTRY_DSN` | Yes | Yes | Yes (`NEXT_PUBLIC_` is bundled) |

---

## 2. Repository Layout

```
astrounified/
├── app/                    # Next.js App Router — pages, layouts, API routes
│   ├── api/                # Server-side API handlers
│   ├── admin/              # Admin-only panel
│   ├── auth/               # Sign-in page
│   ├── compatibility/      # Compatibility checker + detail views
│   ├── profiles/           # Profile CRUD + chart detail
│   ├── layout.tsx          # Root HTML shell
│   └── page.tsx            # Home — landing (guest) or redirect (auth)
├── components/             # React components
│   ├── engines/            # Chart/reading display components
│   ├── compatibility/      # Compatibility UI
│   ├── dashboard/          # Dashboard-specific components
│   ├── auth/               # Session provider wrapper
│   └── ui/                 # shadcn/ui primitives
├── content/                # 538 markdown files (Vedic interpretations)
│   ├── sections/           # Explainers for chart sections
│   ├── planet-in-house/    # Planet × house interpretations (110 files)
│   ├── house-lordship/     # House lord × house interpretations (146 files)
│   ├── dasha-pair/         # Mahadasha × antardasha pairs (83 files)
│   ├── conjunction/        # Planetary conjunctions (93 files)
│   ├── nakshatra/          # 27 lunar mansion interpretations
│   ├── ascendant/          # 12 rising-sign descriptions
│   ├── nabhasa-yoga/       # Special planetary yogas
│   └── lunar-yoga/         # Moon-based yogas
├── lib/                    # Shared server-side utilities
│   ├── engines/            # HTTP clients for the Python sidecar
│   ├── content/            # Markdown loader & renderer
│   └── *.ts                # Auth, DB, geocoding, astro helpers
├── public/                 # Static assets (icons, landing globe video)
├── docs/                   # Developer documentation (this file)
├── next.config.ts          # Next.js config
├── proxy.ts                # NextAuth middleware (route protection)
└── tailwind.config.mjs     # Tailwind v4 config
```

---

## 3. Entry Points & Routing

### Root Layout
[`app/layout.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/layout.tsx)

Wraps every page. Provides:
- Google Fonts (`Inter` body, `Cormorant Garamond` headings)
- `NextAuthProvider` — makes the session available client-side
- `NavBar` — top navigation
- `FeedbackWidget` — floating feedback form overlay
- `@vercel/analytics` and `@vercel/speed-insights` scripts

### Home Page
[`app/page.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/page.tsx)

Server component. If the user is authenticated, redirects to `/dashboard`.
Otherwise renders `LandingPage`. This is the only public non-auth page that
does a session check; all other public pages render without a session.

### Route Protection Middleware
[`proxy.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/proxy.ts)

NextAuth middleware (`export { auth as middleware }`). Runs on every request
before the page renders. Redirects unauthenticated users to `/auth/signin`
for all paths *except* the `PUBLIC_PATHS` set (`/`, `/privacy`, `/terms`).

### Navigation
[`components/NavBar.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/NavBar.tsx)

Sticky top bar. Conditionally renders:
- **Dashboard** link (authenticated users)
- **Compatibility** link (authenticated users)
- **Admin** link (admin users only, gated by `isAdmin()`)
- Sign-in / Sign-out button (NextAuth)

---

## 4. Authentication Layer

### NextAuth Configuration
[`lib/auth.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/auth.ts)

Central `authOptions` object used by every `getServerSession()` call:
- **Provider**: Google OAuth
- **Strategy**: JWT (no DB adapter — sessions live in a signed cookie)
- **`signIn` callback**: upserts the user row in Turso so admin can track logins
- **`session` callback**: adds `user.id = token.sub` (Google subject ID) to
  the session so API routes can scope queries by user

> **Important**: every server route must pass `authOptions` explicitly:
> `getServerSession(authOptions)` — without it, the callbacks don't run
> and `user.id` is `undefined`.

### Admin Guard
[`lib/admin.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/admin.ts)

Exports `isAdmin(session)`. Reads a comma-separated `ADMIN_EMAILS` env var
(no hardcoded fallback). Used **server-side only** in:
- `app/admin/page.tsx` — gates the admin panel
- Every API route that needs to return data for *any* user (not just the caller)

`lib/auth.ts` session callback evaluates `ADMIN_EMAILS` server-side at sign-in
time and stamps `user.isAdmin = true/false` into the JWT. Client components
(`NavBar`, `ProfileDetailClient`, `CompatibilityDetailClient`) read
`session.user.isAdmin` from the JWT — they never call `isAdmin()` directly.
See [Section 1](#1-server--client-boundary-map) for the full pattern.

### Session Provider
[`components/auth/NextAuthProvider.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/auth/NextAuthProvider.tsx)

Thin wrapper around NextAuth `SessionProvider`. Mounted in `app/layout.tsx`
so that client components can call `useSession()`.

### Sign-in Page
[`app/auth/signin/page.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/auth/signin/page.tsx)

Custom sign-in page. Renders the "Sign in with Google" button that triggers
the NextAuth OAuth flow.

---

## 5. Database Layer

<!-- last-updated: 2026-05-13 -->

### Client & Schema
[`lib/db/`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/db/) — modular DB layer. `lib/db.ts` is a one-line re-export shim so all existing `import { db } from "@/lib/db"` imports continue to work.

| File | Responsibility |
|---|---|
| [`lib/db/client.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/db/client.ts) | Turso client singleton, `ensureSchema()`, `SCHEMA_VERSION` |
| [`lib/db/users.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/db/users.ts) | `User` type, `users.upsert`, `users.list` |
| [`lib/db/profiles.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/db/profiles.ts) | `Profile`, `ProfileWithUser` types, full profiles CRUD |
| [`lib/db/readings.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/db/readings.ts) | `Reading` type, cache save/fetch/delete |
| [`lib/db/compatibility.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/db/compatibility.ts) | `CompatibilityCheck`, `CompatibilityCheckWithDetails` types, compatibility CRUD |
| [`lib/db/feedback.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/db/feedback.ts) | `Feedback` type, feedback save/list |
| [`lib/db/settings.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/db/settings.ts) | `AppSettings` type, `getAll()`, `set(key, value)` |
| [`lib/db/consultation-requests.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/db/consultation-requests.ts) | `ConsultationRequest`, `ConsultationRequestWithUser` types; `getPending`, `listByUser`, `listAllWithUser`, `create`, `markAnswered` |
| [`lib/db/index.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/db/index.ts) | Re-exports all types; assembles the `db` object |

Built on `@libsql/client` (Turso's HTTP SQLite driver).

**Tables:**

| Table | Purpose |
|---|---|
| `users` | One row per Google account (id = Google sub). Updated on every login. |
| `profiles` | Birth profiles. Belongs to a user. Contains geocoded lat/lon/timezone. |
| `readings` | Cache of sidecar responses. One row per `(profile_id, engine)`. |
| `compatibility_checks` | Results of Ashtakoota Milan runs. Stores full JSON payload. |
| `feedback` | User-submitted feedback/ratings. |
| `consultation_requests` | User questions (Life Problem Statements). One pending row per user at a time. |
| `settings` | Key-value app settings (e.g. `live_consultation_enabled`). Seeded with defaults. |
| `schema_version` | Single-row version table for schema migration tracking. |

**Schema management**: `ensureSchema()` runs lazily on the first DB call per
Lambda instance. It checks `schema_version`; if the stored version is behind
`SCHEMA_VERSION` (currently `7`), it runs all DDL statements. Column additions
use `ALTER TABLE … ADD COLUMN` wrapped in `try/catch` to handle re-runs.

**Key exported namespaces:**

```
db.users                — upsert, list
db.profiles             — list, listAll, listAllWithUser, get, getAny, create, update, delete
db.readings             — save, latestByEngine, deleteByProfile
db.compatibility        — list, listAllWithDetails, get, getAny, save
db.feedback             — save, list
db.settings             — getAll, set
db.consultationRequests — getPending, listByUser, listAllWithUser, create, markAnswered
```

### Rate Limiting
[`lib/rate-limit.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/rate-limit.ts) — unified in-memory rate limiter: `rateLimit(key, limit, windowMs)` → `{ success, limit, remaining }`. Per-instance (not shared across Lambdas); adequate for abuse prevention on a small app.

> For global enforcement at scale, replace with Redis/Upstash.

---

## 6. Astrology Engine Layer

All computation-heavy work runs in the Python sidecar
([`socraticsurge/dashaflow-sidecar`](https://github.com/socraticsurge/dashaflow-sidecar), private).
The TypeScript layer is purely HTTP client + cache + TypeScript-native calculations.

### DashaFlow (Full Chart)
[`lib/engines/dashaflow.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/engines/dashaflow.ts)

Calls `POST ${DASHAFLOW_SIDECAR_URL}/calculate` with birth coordinates.
Returns 17 chart sections (planets, dashas, yogas, ashtakavarga, etc.).
Consumed by `DashboardClient` and rendered across `components/unified/tabs/*`
(Chart, Planets, Houses, Dasha, Yogas, Jaimini, Ashtakavarga). Sidebar
panchang + birth info comes from the same payload via `ProfileSidebar`.

### Transit
[`lib/engines/transit.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/engines/transit.ts)

Calls `POST ${DASHAFLOW_SIDECAR_URL}/transit` with birth data + a target date.
Returns current planetary positions (sign + degree within sign, not raw longitude).

> **Key gotcha**: the sidecar returns `{ sign: "Taurus", degree: 14.3 }` per
> planet — NOT a raw ecliptic longitude. To reconstruct longitude:
> `SIGNS.indexOf(sign) * 30 + degree`. Several parts of the codebase
> depend on this reconstruction.

### Career (D10 Analysis)
[`lib/engines/career.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/engines/career.ts)

Calls `POST ${DASHAFLOW_SIDECAR_URL}/career` with birth data.
Returns D10 chart themes and planet-domain recommendations for career guidance.

### Tarabalam (TypeScript-native, no sidecar)
[`lib/tarabalam.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/tarabalam.ts)

Entirely in TypeScript — no additional sidecar calls per day.

**Exports:**
- `NAKSHATRAS_27` — ordered list of 27 lunar mansions
- `TARAS` — array of 9 Tara archetypes (quality: auspicious/inauspicious, description)
- `computeTara(birthNakIdx, moonNakIdx)` — count from birth nakshatra, mod 9, 1-indexed
- `computeTithi(moonLon, sunLon)` — `ceil((moonLon - sunLon) / 12)`, returns
  `{ number, name, paksha, label }`
- `extrapolateMoonLongitude(baseLon, baseDate, targetDate)` — mean Moon motion
  (13.176°/day) from a known position
- `extrapolateSunLongitude(baseLon, baseDate, targetDate)` — mean Sun motion
  (0.9856°/day)
- `taraColor(tara)` — Tailwind class string for the Tara number (green/amber/red)

**Design note:** One sidecar call is made for *today's* positions; then all
subsequent days in the date range are extrapolated from that single anchor
using mean motion. Accuracy is good enough for ±14 days (Moon error < 0.5°).

### Astro Utilities
[`lib/astro-utils.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/astro-utils.ts)

Shared constants and helpers:
- `SIGNS` — 12 sidereal sign names in order (Aries … Pisces)
- `NAKSHATRAS` — 27 nakshatra names
- `longitudeToSign(lon)` — `SIGNS[Math.floor(lon / 30) % 12]`
- `longitudeToNakshatra(lon)` — `NAKSHATRAS[Math.floor(lon / (360/27)) % 27]`
- `parseVedAstroPlanets(data)` — normalises sidecar planet output into a
  consistent `{ sign, degree, house, nakshatra, dignity }` shape
- `dignityBadgeColor(dignity)` — Tailwind colour class for exaltation/debilitation

### Engine Error Handling
[`lib/engine-error.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/engine-error.ts)

`extractEngineError(response)` — detects failure payloads in sidecar responses
(checks `.error`, `.errors`, `.data === null`). Used in all reading routes to
surface a human-readable error instead of rendering broken data.

---

## 7. API Routes

All routes authenticate via `getServerSession(authOptions)` and return JSON.
Admin routes additionally check `isAdmin(session)`.

### Profile Management

**[`app/api/profiles/route.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/api/profiles/route.ts)**

- `GET` — returns the caller's profiles (`db.profiles.list(userId)`)
- `POST` — creates a new profile:
  1. Rate-limit check (5 req/min per user email)
  2. Profile cap check (max 10 per user)
  3. `geocodePlace(place)` → lat, lon, IANA timezone, offset
  4. `db.profiles.create(userId, data)`

**[`app/api/profiles/[id]/route.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/api/profiles/%5Bid%5D/route.ts)**

- `GET` — fetches one profile (admin can fetch any user's profile)
- `PUT` — updates a profile (re-geocodes if place changed)
- `DELETE` — deletes a profile + cascades by calling `db.readings.deleteByProfile`

### Astrology Readings

**[`app/api/readings/dashaflow/route.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/api/readings/dashaflow/route.ts)**

- `GET` — returns latest cached chart for a profile (admin can fetch any profile's cache)
- `POST` — triggers a fresh calculation:
  1. Load profile from DB
  2. Call `fetchDashaflow(profile)` → full chart JSON
  3. `db.readings.save(profile_id, "dashaflow", input, output)`
  4. Return chart data

**[`app/api/readings/transit/route.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/api/readings/transit/route.ts)**

- `POST` — transit positions for a profile on a given date
  - Calls `fetchTransit(profile, date)` — result is not cached (ephemeral)

**[`app/api/readings/career/route.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/api/readings/career/route.ts)**

- `POST` — D10 career analysis
  - Rate-limited separately via `lib/security.ts`
  - Calls `fetchCareer(profile)` → D10 themes + planet recommendations
  - Cached in readings table under engine `"career"`

**[`app/api/readings/muhurtha/route.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/api/readings/muhurtha/route.ts)**

- `POST` — auspicious timing check for an event type + date/time/location

**[`app/api/readings/tarabalam/route.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/api/readings/tarabalam/route.ts)**

- `POST` — Tara + Tithi calendar for one or more profiles over a date range:
  1. Load each profile from DB
  2. Extract birth nakshatra from the cached dashaflow reading
  3. Call `fetchTransit()` *once* for today → reconstruct Moon & Sun longitudes
  4. Extrapolate Moon/Sun position for each day in the range
  5. Compute `computeTara()` and `computeTithi()` per profile per day
  6. Return structured grid

### Compatibility

**[`app/api/compatibility/route.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/api/compatibility/route.ts)**

- `GET` — list user's compatibility checks (most recent first)
- `POST` — run a new check:
  1. Load both profiles from DB (verifies ownership)
  2. Check limit (6 checks per user)
  3. `POST ${DASHAFLOW_SIDECAR_URL}/compatibility` with both profiles' birth data
  4. `db.compatibility.save(userId, { profile_id_1, profile_id_2, score, result_json })`
  5. Return saved check record

### Content

**[`app/api/content/[type]/[key]/route.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/api/content/%5Btype%5D/%5Bkey%5D/route.ts)**

Lazy-loads interpretive markdown for a specific content type + key
(e.g. `planet-in-house/Sun-in-House1`). Called on demand from the chart view
when a user expands an explainer modal. Content is cached in memory by
`lib/content/loader.ts` after first load.

### Feedback

**[`app/api/feedback/route.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/api/feedback/route.ts)**

- `POST` — saves a user feedback entry (rating + optional message + page URL)

### Admin

**[`app/api/admin/backfill/route.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/api/admin/backfill/route.ts)**

Admin-only. Re-runs DashaFlow for all profiles in the DB and updates their
cached readings. Used when the sidecar is updated and stale caches need refreshing.

**[`app/api/admin/clear-compatibility/route.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/api/admin/clear-compatibility/route.ts)**

Admin-only. Deletes all rows from `compatibility_checks`. Exposed in the admin
UI as the "Clear History" button.

**[`app/api/admin/consultation-requests/route.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/api/admin/consultation-requests/route.ts)**

Admin-only. `PATCH ?id=<id>` marks a consultation request as answered and saves an optional admin note.

**[`app/api/admin/settings/route.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/api/admin/settings/route.ts)**

Admin-only. `GET` returns all app settings. `PATCH` updates one or more settings (boolean values only).

### Consultation Requests

**[`app/api/consultation-requests/route.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/api/consultation-requests/route.ts)**

- `GET` — returns the authenticated user's consultation request history.
- `POST` — submits a new consultation request. Enforces one-pending-at-a-time. Rate-limited 5/min.
  Validates all three Life Problem Statement fields meet `MIN_FIELD_LENGTH = 30`.

---

## 8. Page Components

### Dashboard
**[`app/dashboard/page.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/dashboard/page.tsx)**

Server component. Fetches `db.profiles.list(userId)` and renders
`ProfileList` with a "New Profile" button. Shows profile count vs 10-profile
limit.

### Profile Creation & Editing

**[`app/profiles/new/page.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/profiles/new/page.tsx)**

Renders `ProfileForm` in create mode. On submit POSTs to `/api/profiles`.

**[`app/profiles/[id]/edit/page.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/profiles/%5Bid%5D/edit/page.tsx)**

Server component. Fetches the profile, renders `ProfileForm` pre-populated
with existing data in edit mode. On submit PUTs to `/api/profiles/[id]`.

**[`components/ProfileForm.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/ProfileForm.tsx)**

Reusable form for both create and edit flows. Fields: name, DOB, time of birth,
place of birth (geocoded on submit), current location (optional), gender,
relationship label.

### Dashboard / Profile View

**[`app/profiles/[id]/page.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/profiles/%5Bid%5D/page.tsx)**

Server component. Auth-gated. Redirects to `/dashboard?profile={id}` — the
unified dashboard is now the single entry point for viewing any profile.
The legacy `ProfileDetailClient` (and its Basic / Professional toggle) was
removed in the 2026-05-19 cleanup.

**[`app/dashboard/page.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/dashboard/page.tsx)**

Server component. Auth-gated. Resolves the active profile from the
`?profile={id}` query param (defaulting to the user's first profile),
loads all of the user's profiles for the NavBar pill switcher, and renders
`DashboardClient`.

**[`app/dashboard/DashboardClient.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/dashboard/DashboardClient.tsx)**

Client component. Owns the active-profile state and orchestrates engine
fetches for the entire dashboard. Renders `NavBar` + `ProfileSidebar` +
`ProfileView`.

- **New profile flow** (`?new=1`): shows `ProfileLoadingScreen` while
  chart, transit, career, and today-reading load in parallel. Minimum 2s
  animation; lifts when all four settle.
- **Returning user flow**: chart + transit prefetched immediately;
  today-reading chains after chart resolves; career loads lazily on tab
  open. Toggling between profile pills is served from the in-memory
  per-profile cache (no refetch unless the user explicitly triggers refresh).

**[`components/profiles/ProfileView.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/profiles/ProfileView.tsx)**

Hosts the 10-tab dashboard:

| Tab | Renders | Data source |
|---|---|---|
| Today | `TodayTab` + `TodayInsightCard` | chart (dashas) + today-reading (LLM) |
| Chart | `components/unified/tabs/ChartTab` | chart |
| Planets | `PlanetsTab` (positions, dignity, shadbala) | chart |
| Houses | `HousesVargasTab` (D1 + D-charts) | chart |
| Dasha | `DashaTab` (5-level Vimshottari) | chart |
| Yogas | `YogasTab` | chart |
| Jaimini | `JaiminiTab` | chart |
| Ashtakavarga | `AshtakavargaTab` | chart |
| Transits | `TransitsTab` | transit |
| Career | `CareerTab` | career |
| Compare | `components/tabs/CompareTab` | sibling profiles + Ashtakoota engine |

Admin users also see an **AI Admin panel** (`components/panels/AIAdminPanel`)
for inspecting / chatting with the LLM output, and an **Ask panel**
(`components/panels/AskPanel`) for triggering a consultation request from
any tab.

### Compatibility

**[`app/compatibility/page.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/compatibility/page.tsx)**

Server component. Loads the user's profiles (for the dropdowns) and their
existing compatibility checks. Renders `CompatibilityClient`.

**[`components/compatibility/CompatibilityClient.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/compatibility/CompatibilityClient.tsx)**

Client component. Provides:
- Inline new-check form: gender-filtered Male / Female profile dropdowns
- Limit indicator (6 checks max)
- History cards linking to `/compatibility/[id]`
- On submit: `POST /api/compatibility`, then `router.push('/compatibility/${data.id}')`

**[`app/compatibility/[id]/page.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/compatibility/%5Bid%5D/page.tsx)**

Server component. Loads the check + both profiles (any profile, since
compatibility checks may involve profiles from the same user). Renders
`CompatibilityDetailClient`.

**[`app/compatibility/[id]/CompatibilityDetailClient.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/compatibility/%5Bid%5D/CompatibilityDetailClient.tsx)**

Client component. Admin-only Basic / Professional toggle.

**Basic view:**
- Score ring with colour coding (emerald ≥26, green ≥18, amber ≥12, red below)
- Ashtakoota table (8 kootas, score/max/matched)
- Mangal Dosha + Bhakoot Dosha cards

**Professional view** (admin only):
- Match verdict banner (`is_match_approved`, Kuja balance result)
- Natal Moon Profiles — Moon sign, Nakshatra, Gana, Nadi, Yoni per person
- Kuja Dosha Analysis — per-planet breakdown (planet, house, sign, score) for both
- Additional Kutas grid — Mahendra, Stree Deergha, Vedha, Rajju (body-part
  group + effect), BadConstellations, Lagna/7th House, Sex Energy
- Dosha Mitigations — classical exception strings from BPHS

### Admin Panel

**[`app/admin/page.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/admin/page.tsx)**

Server component. Admin-gated. Loads users, profiles (with user email join),
compatibility checks (with profile name join), feedback, all consultation requests,
and app settings. Renders `AdminTables`.

**[`app/admin/AdminTables.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/admin/AdminTables.tsx)**

Client component. Six tabs:
- **Users** — sign-in history, emails
- **Profiles** — all profiles across users with birth data
- **Compatibility** — all checks with **View** link (→ `/compatibility/[id]`) and JSON dropdown
- **Feedback** — submitted ratings and messages
- **Questions** — consultation requests; pending cards show the assembled question and a "Mark as Answered" action with optional admin note
- **Settings** — toggle switch for `live_consultation_enabled`

### Consultation

**[`app/consultation/page.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/consultation/page.tsx)**

Server component. Auth-gated (middleware). Loads: pending consultation request, user's profiles, app settings. Renders `ConsultationForm`.

**[`app/consultation/ConsultationForm.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/app/consultation/ConsultationForm.tsx)**

Client component. Steps:
1. Select one of 8 life areas (Career, Wealth, Marriage, Family, Health, Education, Travel, Dharma)
2. Select one or more profiles the question is about
3. Fill the three Life Problem Statement fields (Observation / Constraint / Objective) — live char count, per-area placeholder examples
4. Live assembled preview panel
5. Delivery mode: Written Answer (always shown) | Live Consultation (shown only when `live_consultation_enabled = true`)

When a pending question exists, renders `PendingCard` instead of the form — shows the submitted question and admin note if present.

---

## 9. Shared UI Components

### Chart Engine Components

The chart UI is split across two directories:

**[`components/unified/`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/unified/)** — the 10-tab dashboard rendered inside `ProfileView`:

| Component | What it renders |
|---|---|
| [`TabGrid.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/unified/TabGrid.tsx) | Shared `TwoColumnTabGrid` / `TabColumn` / `TabSection` primitives — composed by every dense tab |
| [`TabLoadingSkeleton.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/unified/TabLoadingSkeleton.tsx) | Shared pulsing loader (transit, career, etc.) |
| [`IdentityStrip.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/unified/IdentityStrip.tsx) | Ascendant / Moon sign / Nakshatra strip |
| [`HouseGrid.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/unified/HouseGrid.tsx) | 12-house diamond/grid |
| [`NatalChartGrid.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/unified/NatalChartGrid.tsx) | Square North-Indian style chart |
| [`SavChartGrid.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/unified/SavChartGrid.tsx) | SAV (sarvashtakavarga) chart |
| [`tabs/ChartTab.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/unified/tabs/ChartTab.tsx) | Main chart visualization |
| [`tabs/PlanetsTab.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/unified/tabs/PlanetsTab.tsx) | Planet table — sign, house, retro, dignity, shadbala |
| [`tabs/HousesVargasTab.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/unified/tabs/HousesVargasTab.tsx) | D1 + D-chart switcher |
| [`tabs/DashaTab.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/unified/tabs/DashaTab.tsx) | 5-level Vimshottari with timeline visualization |
| [`tabs/timeline/DashaTimeline.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/unified/tabs/timeline/DashaTimeline.tsx) + [`DashaRow.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/unified/tabs/timeline/DashaRow.tsx) | Visual dasha row |
| [`tabs/YogasTab.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/unified/tabs/YogasTab.tsx) | Active yogas |
| [`tabs/JaiminiTab.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/unified/tabs/JaiminiTab.tsx) | Jaimini karakas + Karakamsha |
| [`tabs/AshtakavargaTab.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/unified/tabs/AshtakavargaTab.tsx) | BAV + SAV bindu tables |
| [`tabs/TimeTab.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/unified/tabs/TimeTab.tsx) | Panchang + birth time details |
| [`tabs/TransitsTab.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/unified/tabs/TransitsTab.tsx) | Compact card grid; calls `POST /api/readings/transit` |
| [`tabs/CareerTab.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/unified/tabs/CareerTab.tsx) | Two-column layout (D10 + themes + indicators \| 10th house + significators); calls `POST /api/readings/career` |

**[`components/tabs/`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/tabs/)** — top-level tabs that compose multiple data sources:

| Component | What it renders |
|---|---|
| [`TodayTab.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/tabs/TodayTab.tsx) + [`TodayInsightCard.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/tabs/TodayInsightCard.tsx) | 5-level dasha hero, pratyantar shifts, LLM-generated today-reading |
| [`CompareTab.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/tabs/CompareTab.tsx) | Inline Ashtakoota compatibility for sibling profiles |

**[`components/engines/`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/engines/)** — standalone engine views (not part of the unified dashboard):

| Component | What it renders |
|---|---|
| [`MuhurthaView.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/engines/MuhurthaView.tsx) | Auspicious timing for event types (marriage, travel, etc.) |
| [`TarabalamView.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/engines/TarabalamView.tsx) | Tara + Tithi calendar table, multi-profile |
| [`SectionShell.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/engines/SectionShell.tsx) | Collapsible section container with ⓘ trigger |
| [`ExplainerModal.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/engines/ExplainerModal.tsx) | Tabbed modal: "For your chart" + "About" |
| [`AIInsightCard.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/engines/AIInsightCard.tsx) | LLM compatibility / chart insights card |
| [`CompatibilityChat.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/engines/CompatibilityChat.tsx) | Chat overlay on compatibility detail |
| [`SectionShell.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/engines/SectionShell.tsx) | Collapsible section wrapper with ⓘ explainer trigger |
| [`ExplainerModal.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/engines/ExplainerModal.tsx) | "For your chart" + "About" tabbed modal |

### Landing & Feedback
[`components/LandingPage.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/LandingPage.tsx) — Hero + four service area sections (Relationships, Career, Timing, Family) with CTAs

[`components/FeedbackWidget.tsx`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/FeedbackWidget.tsx) — Floating overlay: emoji rating + optional message, submits to `/api/feedback`

### shadcn/ui Primitives
[`components/ui/`](https://github.com/socraticsurge/astro-unified-core/blob/main/components/ui/)

Standard shadcn components: `button`, `badge`, `card`, `input`, `label`,
`separator`, `tabs`, `scroll-area`. Styled with `class-variance-authority`
and Tailwind.

---

## 10. Content Library (Markdown CMS)

### Loader & Renderer
[`lib/content/loader.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/content/loader.ts) — Reads and caches markdown files by type + key. Uses `gray-matter` for YAML frontmatter.

[`lib/content/lookup.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/content/lookup.ts) — Convenience helpers to look up content by chart data (e.g. `lookupPlanetInHouse("Sun", 1)`).

[`lib/content/markdown.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/content/markdown.ts) — `marked` wrapper + a "two-track" body splitter that separates the
personalised chart interpretation from the generic educational text.

[`lib/content/types.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/content/types.ts) — TypeScript types for all content shapes (`SectionEntry`, `PlanetInHouseEntry`, `DashaPairEntry`, etc.).

### Content Volumes

| Directory | Type | Count | Keys |
|---|---|---|---|
| `content/sections/` | Chart section explainers | ~20 | `vimshottari-dasha`, `yogas`, `transit-analysis`, etc. |
| `content/planet-in-house/` | Planet × house | ~110 | `Sun-in-House1` … `Ketu-in-House12` |
| `content/house-lordship/` | Lord × house | ~146 | `1st-lord-in-1st` … `12th-lord-in-12th` |
| `content/dasha-pair/` | Mahadasha + antardasha | ~83 | `Sun-Sun` … `Ketu-Ketu` |
| `content/conjunction/` | Planet pairs | ~93 | `Sun-Moon` … `Rahu-Ketu` |
| `content/nakshatra/` | Lunar mansions | 27 | `Ashwini` … `Revati` |
| `content/ascendant/` | Rising signs | 12 | `Aries` … `Pisces` |
| `content/nabhasa-yoga/` | Special yogas | ~26 | `Chakra`, `Yava`, etc. |
| `content/lunar-yoga/` | Moon yogas | ~26 | `Gaja-Kesari`, etc. |

Each file has YAML frontmatter (`type`, `title`, `factors`, `sources`,
`rendering_status`) and a markdown body with two tracks: a personalised
interpretation (uses chart-specific facts) and a generic educational section.

---

## 11. Utility Modules

| Module | Purpose |
|---|---|
| [`lib/geocode.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/geocode.ts) | `geocodePlace(text)` → calls Nominatim, resolves IANA timezone via `geo-tz` |
| [`lib/utils.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/utils.ts) | `cn(...classes)` — `clsx` + `tailwind-merge` |
| [`lib/chart-summary.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/chart-summary.ts) | Generates a plain-text summary of chart data for clipboard or LLM consumption |
| [`lib/sanitize.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/sanitize.ts) | Dual client/server HTML sanitizer to prevent XSS in `dangerouslySetInnerHTML` |

---

## 12. User Journey Traces

### Journey 1: New User Sign-In

```
User visits https://astro-unified-core-pfni.vercel.app/
  → app/page.tsx              — no session, renders LandingPage
  → "Get Started" CTA click
  → app/auth/signin/page.tsx  — "Sign in with Google" button
  → NextAuth OAuth flow
  → lib/auth.ts signIn()      — db.users.upsert(googleUser)
  → redirect to /dashboard
  → app/dashboard/page.tsx    — "No profiles yet" empty state
```

### Journey 2: Creating a Birth Profile

```
/dashboard → "New Profile" →
  app/profiles/new/page.tsx
    → components/ProfileForm.tsx (name, DOB, time, place, gender, relationship)
    → submit → POST /api/profiles
      → app/api/profiles/route.ts
        → rate limit check (lib/rate-limit.ts)
        → geocodePlace(place) → lib/geocode.ts → Nominatim + geo-tz
        → db.profiles.create(userId, data)
        → 201 + profile JSON
  → redirect to /profiles/{id}
```

### Journey 3: Viewing a Birth Chart

```
/profiles/{id}                  ← legacy URL; redirects to /dashboard?profile={id}
/dashboard?profile={id} →
  app/dashboard/page.tsx (server)
    → db.profiles.list(userId)              ← user's own profiles for NavBar pills
    → resolve active profile from ?profile= or default to first
    → renders DashboardClient(profiles, initialProfileId, isNewProfile, isAdmin)

  DashboardClient (client)
    → Returning-user flow (default):
      ╠ Check profileCacheRef.get(activeProfileId)
      ║   cache hit → hydrate from { chart, transit, career, todayReading }
      ║   cache miss → run the fetches below
      ║
      ╠ Chart (parallel):
      ║   GET /api/readings/dashaflow?profile_id={id}
      ║     → db.readings.latestByEngine(id, "dashaflow")
      ║     → cache hit → return stored chart JSON
      ║     → cache miss → fetchDashaflow(profile) → sidecar /calculate → save → return
      ║   (after chart resolves) GET /api/readings/today-reading
      ║     → checks input_snapshot { birth_data, pratyantar_end, llm_fingerprint }
      ║     → fingerprint mismatch (admin edited prompt / temperature) → regenerate
      ║
      ╠ Transit (parallel):
      ║   GET /api/readings/transit?profile_id={id} → sidecar /transit
      ║
      ╚ Career: lazy — fired only when the user opens the Career tab
        GET /api/readings/career?profile_id={id} → sidecar /career

    → New-profile flow (?new=1):
      → ProfileLoadingScreen mounted (orbital animation, min 2s)
      → All four fetches (chart, transit, career, today-reading) fire in parallel
      → Loading screen dismisses when min-time AND all-settled both true

  ProfileView (client, inside DashboardClient)
    → Renders 10-tab dashboard:
        Today        → TodayTab + TodayInsightCard
        Chart        → unified/tabs/ChartTab
        Planets      → unified/tabs/PlanetsTab
        Houses       → unified/tabs/HousesVargasTab
        Dasha        → unified/tabs/DashaTab + timeline/DashaTimeline
        Yogas        → unified/tabs/YogasTab
        Jaimini      → unified/tabs/JaiminiTab
        Ashtakavarga → unified/tabs/AshtakavargaTab
        Transits     → unified/tabs/TransitsTab
        Career       → unified/tabs/CareerTab (triggers fetchCareer on open)
        Compare      → components/tabs/CompareTab

    → Admin only:
      → AIAdminPanel slide-out for inspecting/chatting with LLM output
      → AI button on each tab triggers handleAIOpen with tab context

    → Per-tab Ask button → AskPanel → POST /api/consultation-requests
```

Muhurtha and Tarabalam are no longer surfaced through the chart view — they
live on dedicated pages outside the dashboard.

### Journey 4: Running a Compatibility Check

```
/compatibility →
  app/compatibility/page.tsx (server)
    → db.profiles.list(userId)               ← user's own profiles for dropdowns
    → db.compatibility.list(userId)          ← existing checks
    → renders CompatibilityClient

  CompatibilityClient (client)
    → Select male profile (gender=male filtered)
    → Select female profile (gender=female filtered)
    → "Run Check" → POST /api/compatibility
        → app/api/compatibility/route.ts
          → load both profiles, verify ownership
          → check 6-check limit
          → POST sidecar /compatibility
          → db.compatibility.save(userId, { ... , result_json })
          → router.push('/compatibility/{id}')

  /compatibility/{id} →
  app/compatibility/[id]/page.tsx (server)
    → db.compatibility.get(id, userId) or getAny(id)
    → db.profiles.getAny(profile_id_1), db.profiles.getAny(profile_id_2)
    → renders CompatibilityDetailClient

  CompatibilityDetailClient (client)
    → Basic view: score ring, 8-koota table, Mangal + Bhakoot dosha cards
    → Professional view (admin): natal moon profiles, kuja breakdown,
      additional kutas, dosha mitigations
```

### Journey 5: Admin Reviewing Users

```
/admin →
  app/admin/page.tsx (server)
    → isAdmin(session) check → redirect if not admin
    → db.users.list()
    → db.profiles.listAllWithUser()
    → db.compatibility.listAllWithDetails()
    → db.feedback.list()
    → renders AdminTables

  AdminTables
    → Users tab: login history
    → Profiles tab: all profiles across all users
    → Compatibility tab:
        "View" link → /compatibility/{id}     ← standard detail page
        "JSON" dropdown → raw result_json
    → Feedback tab: ratings + messages

  Clicking "View" on a compatibility check:
    → /compatibility/{id} (same journey as above)
    → Admin sees Professional view toggle because isAdmin(session) = true
```

### Journey 6: Tarabalam for a Family

```
/profiles/{id} → Professional tab → Tarabalam →
  TarabalamView
    → Checkbox list of all profiles for this user (current profile pre-checked)
    → Date range selector (default: today + 13 days)
    → "Calculate" →
      POST /api/readings/tarabalam { profileIds: [...], startDate, endDate }
        → For each profileId:
            db.profiles.getAny(profileId)
            db.readings.latestByEngine(profileId, "dashaflow")  ← extract birth nakshatra
        → fetchTransit(profiles[0]) once  ← get today's Moon + Sun longitudes
        → toSiderealLon({ sign, degree })  ← reconstruct longitude
        → For each date in range:
            extrapolateMoonLongitude(moonLon, today, date)
            extrapolateSunLongitude(sunLon, today, date)
            For each profile:
              computeTara(birthNakIdx, moonNakIdx)
              computeTithi(moonLon, sunLon)
        → Return grid: { date, moonNakshatra, tithi, taras: {[profileId]: Tara} }

    → Table: Date | Moon in | Tithi | [Profile columns] | All ✦
    → "All ✦" column highlights rows where every selected profile has auspicious Tara
```

---

## 13. Code Organisation Assessment

### What Works Well

**Clear separation of concerns.** The `lib/engines/` pattern keeps all
sidecar HTTP clients in one place, with a consistent call signature. Adding a
new sidecar endpoint means adding one file in `lib/engines/` and one API route
— nothing else changes.

**Server / client split is disciplined.** Pages follow the App Router pattern
correctly: server components fetch data and pass it as props; client components
handle interactivity. No data-fetching in client components except for
user-triggered actions.

**Content at scale.** 538 markdown files with a typed loader and lazy
per-key API fetching means the content library can grow without impacting
initial page load. Only the section explainers are pre-loaded at the server
component level (good trade-off for LCP).

**DB schema simplicity.** Using `schema_version` + `ensureSchema()` with
`ALTER TABLE … ADD COLUMN` in `try/catch` is lightweight and reliable for a
small team — no migration runner required.

**Tarabalam extrapolation.** Computing a two-week calendar with one sidecar
call (instead of one per day) is a clean design. The accuracy trade-off
(mean motion vs true position) is explicitly documented.

### Resolved (2026-05-13)

- ~~Two rate-limiter modules~~ — `lib/security.ts` deleted; `lib/rate-limit.ts` is now the single configurable source.
- ~~`KOOTA_MAX` duplicated~~ — moved to [`lib/compatibility.ts`](https://github.com/socraticsurge/astro-unified-core/blob/main/lib/compatibility.ts) along with all shared compatibility types.
- ~~`db.ts` monolith~~ — split into `lib/db/` modules (see Section 4).
- ~~`any` types in `AdminTables`~~ — replaced with `User[]`, `ProfileWithUser[]`, `CompatibilityCheckWithDetails[]`, `Feedback[]`.

### Still to address

**In-memory rate limiting** — per Lambda instance, not global. See `BACKLOG.md` item D7 for the Upstash Redis upgrade path.

**Sidecar unauthenticated** — low risk currently. See `BACKLOG.md` item D1.

**`scratch_test_rate_limit.ts`** at project root — dev scratch file, should be deleted. See `BACKLOG.md` T1.

**`proxy.ts`** non-standard name — Next.js convention is `middleware.ts`. See `BACKLOG.md` T2.

---

## 14. Observability & Daily Landing Engine

<!-- last-updated: 2026-05-21 -->

This section catalogs the platform-level modules added in the 2026-05-20
sprint (Sentry, PostHog, Resend, `/api/health`) and the daily landing
generation engine. These pieces are cross-cutting and don't belong in any
single section above, so they live here.

### 14.1 Error tracking — Sentry

| File | Purpose |
|---|---|
| `instrumentation.ts` | Next.js entry point — registers server + edge configs by runtime |
| `instrumentation-client.ts` | Browser SDK init; also fires PostHog (single file, two SDKs) |
| `sentry.server.config.ts` | Server SDK init |
| `sentry.edge.config.ts` | Edge runtime SDK init |
| `app/global-error.tsx` | App-Router uncaught-exception capture |
| `next.config.ts` | Wrapped with `withSentryConfig` for build-time source map upload |

**Tuned defaults (DO NOT regress):** `tracesSampleRate: 0.1`,
`sendDefaultPii: false`, `enableLogs: false`. Free tier ≈ 5k events/month
— pure abuse defense. See `lib/posthog-server.ts` and the three Sentry
configs.

**Build-time env:** `SENTRY_AUTH_TOKEN` (Vercel-only, never in client
bundle). Without it source maps don't upload; runtime capture still works
but stack traces are minified.

### 14.2 Product analytics — PostHog

| File | Purpose |
|---|---|
| `instrumentation-client.ts` | `posthog-js` init alongside Sentry |
| `lib/posthog-server.ts` | Lazy singleton for `posthog-node` (flushAt: 1, fire-and-forget) |
| `components/PostHogIdentifier.tsx` | Browser identify on session change |
| `lib/auth.ts` (signIn callback) | Server identify + `user_signed_in` event |

**Tuned defaults:** `capture_exceptions: false` (Sentry owns errors —
don't double-track).

**`/ingest/*` rewrite** in `next.config.ts` proxies browser PostHog
calls through the app domain, defeating ad-blockers.

**Event catalog (current):**

| Event | Source | Properties |
|---|---|---|
| `user_signed_in` | server (auth callback) | provider |
| `profile_created`, `profile_deleted` | server (REST) | relationship, ... |
| `consultation_request_created` | server (REST) | delivery_mode, profile_count, payment_flow_enabled, amount_paise |
| `consultation_feedback_submitted` | client (thumbs on answered) | rating, has_note |
| `feedback_submitted` | server (REST) | rating, has_message, authenticated |
| `ask_panel_opened`, `ai_insight_panel_opened` | client | tab |
| `landing_ascendant_pinned` | client | sign, source, is_stale |
| `today_reading_copied` | client | engine, length |
| `today_reading_shared` | client | engine, surface, length |
| `today_reading_rated` | client | engine, rating |

**Known caveat:** `posthog-node` on Vercel serverless is fire-and-forget.
Most server events land; a small fraction may drop when Lambda freezes
before flush HTTP completes. Acceptable for analytics, not for auditing.

### 14.3 Email notifications — Resend

| File | Purpose |
|---|---|
| `lib/email/client.ts` | Lazy `Resend` singleton; returns `null` when `RESEND_API_KEY` missing |
| `lib/email/admin-notify.ts` | Formats + sends "new consultation request" admin email |
| `app/api/consultation-requests/route.ts` (POST) | Calls `notifyAdminOfConsultationRequest` via Next.js `after()` so the response isn't delayed |

**Hardcoded in `lib/constants.ts`:**
- `ADMIN_EMAIL_NOTIFICATIONS_ENABLED` (kill switch)
- `ADMIN_NOTIFY_EMAIL` (single recipient)
- `EMAIL_FROM` (currently Resend's shared `onboarding@resend.dev`)

**Gotcha:** `onboarding@resend.dev` can only deliver to the email
address you signed up to Resend with. Switch to a verified-domain
sender (`notify@astrochaganti.com`) once the domain's DNS is configured
in Resend.

### 14.4 Health endpoint — `/api/health`

`app/api/health/route.ts` runs `SELECT 1` against Turso and pings the
sidecar's `/health`. Returns 200 with both statuses or 503 if either is
down. Public, no auth, `Cache-Control: no-store`. Point UptimeRobot
here. See `docs/RUNBOOK.md` §"Health monitoring".

### 14.5 Daily landing engine

The unauthenticated landing page calls `/api/landing/today` once on
mount; the response is one row from `daily_landing` (schema v9) that
caches a single LLM call's output — 12 ascendant-specific snippets
plus today's Moon nakshatra, Sun sign, and active retrogrades.

| File | Purpose |
|---|---|
| `app/api/landing/today/route.ts` | Public GET; retry budget (3/day, ≥10-min gap); serves prior day with `is_stale: true` on failure |
| `lib/engines/today-landing.ts` | Synthetic sidecar call for sky facts + single Gemini Flash Lite call grounded in `lookupAscendant` content blocks |
| `lib/db/daily-landing.ts` | CRUD on the new `daily_landing` table (`getByDate`, `getMostRecentSuccess`, `recordAttempt`, `storeSuccess`) |
| `lib/content/landing-fallback.ts` | Static per-ascendant paragraphs used pre-fetch so the panel is never blank |
| `components/CosmicLanding.tsx` | Spinning zodiac wheel is the desktop picker (each sign is a click target); horizontal pill strip is the mobile picker. localStorage remembers the pinned sign |

**Cache invalidation:** keyed by IST date. `PROMPT_VERSION_LANDING` is a
signal-only constant — bumping it does not auto-regenerate today's row
(use the admin shell to delete the row if you need to force regen).

### 14.6 Today reading feedback — `ReadingActions`

`components/tabs/ReadingActions.tsx` adds Copy / Share / Thumbs-Up /
Thumbs-Down to each Today-tab reading card. Reads/writes ratings via
`PATCH /api/readings/[id]/rating` (user-facing, validates ownership via
`db.profiles.get(profile_id, userId)`; admins bypass). The server-side
`db.readings.getById` was added in the same change.

### 14.7 Schema v9

`lib/db/client.ts` bumped `SCHEMA_VERSION` 8 → 9 to add the
`daily_landing` table. See Section 5 (Database Layer) for the schema
version pattern.

---

*For env vars, deployment gotchas, and auth model see [`PROJECT.md`](./PROJECT.md).*
*For health checks, DB backup/restore, and the dev → main promotion runbook see [`RUNBOOK.md`](./RUNBOOK.md).*
*For the full issue/debt list see [`BACKLOG.md`](./BACKLOG.md).*
*For recent changes see [`CHANGELOG.md`](../CHANGELOG.md).*
