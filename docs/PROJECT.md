# Astro Chaganti — Project Reference

<!-- current-snapshot-verified: 2026-07-26 -->

A Vedic-astrology birth-chart application by Dr. Vinay Kumar Chaganti.
Users sign in with Google, save profiles for themselves and family
members, and see a detailed chart for each profile.

- **Production site**: https://astrochaganti.com/
- **Hosted acceptance site**: https://astro-unified-staging.vercel.app/
- **Main repo**: https://github.com/socraticsurge/astro-unified-core (this repo)
- **Sidecar repo**: https://github.com/socraticsurge/dashaflow-sidecar (private)
- **Panchangam engine repo**: https://github.com/socraticsurge/telugu-calendar-utilities
- **Existing Panchangam site**: https://panchangam.astrochaganti.com/

---

## Current system snapshot — read this first

### Where the programme is

Gates 1–8 of the unification programme are approved. Gate 9, the production
release, is **not approved** and no production alias, DNS, Google OAuth callback,
production Turso data, GitHub Pages workflow, or subscribed calendar-feed URL
has been changed.

The owner-review build is currently:

- `https://astro-unified-staging.vercel.app`
- Vercel project `astro-unified-staging`
- deployment `dpl_CqSecbjJMeceXrabu4aXcjDCAaEV`
- a separate synthetic Turso database and synthetic owner/admin identities
- the staging Telugu Calendar API
- fail-closed `rehearsal` mode and `noindex,nofollow`

The public production domain still resolves to the pre-unification deployment
`dpl_F6yWeNZ2Mx9fzdjwMnan19cM9HdY`, built from
`astro-unified-core/main@519d686`. Production remains the rollback-safe blue
environment while hosted acceptance continues on green.

### The most important release fact

The current hosted acceptance deployment was built from the local
`codex/unification-program` worktree with `gitDirty=1`. The branch is based on
`development@25f0206` but is not present on GitHub. The additive Telugu Calendar
HTTP API is likewise in a dirty local `codex/vercel-api-parity` worktree that is
not present on GitHub.

This is acceptable for isolated owner review, but **not reproducible enough for
production**. Before Gate 9 can be approved, both worktrees must be frozen into
reviewed commits, pushed, merged through their repositories' normal branches,
and redeployed from exact Git SHAs. A CLI deployment from uncommitted files is
never the production source of truth.

### Repository and source-of-truth map

| Repository | Local folder | Role | Current source-of-truth status |
|---|---|---|---|
| [`socraticsurge/astro-unified-core`](https://github.com/socraticsurge/astro-unified-core) | `AstroRepos/astro-unified-core/` | Canonical Next.js web product, browser-facing API, auth, Turso access, admin, SEO and unified UX | **Active canonical web repo.** `main` is production; `development` is integration. Current unification changes are local and uncommitted. |
| [`socraticsurge/telugu-calendar-utilities`](https://github.com/socraticsurge/telugu-calendar-utilities) | `AstroRepos/telugu-calendar-utilities/` | Canonical Panchangam, Rasi Phalalu, Tarabalam/Chandrabalam, Muhurtam engines, ICS feeds, static site, MCP/PyPI package and versioned FastAPI adapter | **Active canonical Panchangam repo.** `master` is the published baseline. Current Vercel API adapter changes are local and uncommitted. |
| [`socraticsurge/dashaflow-sidecar`](https://github.com/socraticsurge/dashaflow-sidecar) | `AstroRepos/dashaflow-sidecar/` | Stateless FastAPI wrapper for natal charts, Vargas, Dashas, yogas, compatibility, transits and career | **Active supporting service.** `master@2c98ee8`; no database. |
| [`socraticsurge/astrounified`](https://github.com/socraticsurge/astrounified) | `AstroRepos/astrounified/` | Early local predecessor | **Obsolete checkout; not a production source.** Do not implement new work here. |
| [`socraticsurge/astrochaganti`](https://github.com/socraticsurge/astrochaganti) | Not currently checked out | Separate older Next.js product associated with Vercel project `astrochaganti` | **Legacy/uncleared.** Prove traffic, data and dependency disposition before archival or deletion. |

All five GitHub repositories were accessible with administrator permission on
2026-07-26. No open pull request was reported for the four locally checked-out
repositories at that time.

### Runtime and hosting map

| Runtime | Project / provider | Data or dependency boundary | Current role |
|---|---|---|---|
| Astro production web | Vercel `astro-unified-core-pfni` | Production Turso `astrounified-live`, Google OAuth, production AI/observability services, DashaFlow sidecar | Existing live product at `astrochaganti.com`; no unified cutover yet |
| Astro owner-review web | Vercel `astro-unified-staging` | Separate staging Turso, synthetic auth, staging Telugu API, isolated DashaFlow staging sidecar | Current acceptance environment |
| Natal/chart service | Vercel `dashaflow-sidecar` | Stateless DashaFlow/Swiss Ephemeris computation | Called server-to-server by Astro |
| Natal/chart staging service | Vercel `dashaflow-sidecar-staging` | Isolated DashaFlow 1.1.0 with query-date and lazy exact-subperiod contracts | Used only by Astro staging |
| Telugu computation staging | Vercel `telugu-calendar-api-staging` | Bearer-protected FastAPI contract `1.0` | Used only by Astro staging |
| Telugu computation production | Vercel `telugu-calendar-api-production` | Independent production bearer token | Prepared for a future Gate 9 candidate; not yet reached by public Astro traffic |
| Panchangam site and feeds | GitHub Pages from `telugu-calendar-utilities` | Static HTML, dated Rasi artifacts and durable `.ics` paths generated by Actions | Existing public service; remains live through stabilization |
| User data | Turso/libSQL | Production and staging are different databases and tokens | Schema version 11; the browser never connects directly |

#### Vercel CLI naming trap

All active migration worktrees are intentionally linked to their **staging**
projects:

- `astro-unified-core/.vercel/project.json` → `astro-unified-staging`
- `dashaflow-sidecar/.vercel/project.json` → `dashaflow-sidecar-staging`
- `telugu-calendar-utilities/.vercel/project.json` →
  `telugu-calendar-api-staging`

Therefore `vercel deploy --prod` from either folder means “production target of
the linked staging project”; it does **not** mean Astro Chaganti live production.
Before any true production candidate command, resolve and restate the exact
project ID, team ID, deployment target and aliases. Never relink casually, and
never infer the affected domain from the word `--prod`.

### Request flow

```text
Browser
  |
  v
astro-unified-core (Next.js on Vercel)
  |- public pages + SEO
  |- NextAuth + authorization
  |- public/private BFF API routes
  |- admin and consultation workflows
  |
  +--> Turso
  |      users, profiles, readings, compatibility, consultation,
  |      settings, landing cache, feedback and chat
  |
  +--> dashaflow-sidecar
  |      natal chart, Vargas, Dashas, yogas, transits, career,
  |      compatibility
  |
  +--> Telugu Calendar FastAPI
         Panchangam, Rasi Phalalu, public and personalized Muhurtam,
         Tarabalam and Chandrabalam

telugu-calendar-utilities GitHub Actions
  +--> GitHub Pages static site, dated artifacts and durable ICS feeds
```

Browsers do not receive computation-service tokens and do not call either
Python service directly. The Next.js application is the browser-facing backend
for both public and authenticated computation.

### Local workspace map

The shared workspace root is:

`/Users/vinaychaganti/Documents/VibeCodedApps/AstroRepos`

```text
AstroRepos/
├── astro-unified-core/          # work here for the web product
│   ├── app/                     # Next.js pages, layouts and API routes
│   ├── components/
│   │   ├── public/              # unified public homepage
│   │   ├── profiles/            # signed-in profile workspace
│   │   ├── tabs/                # Today and Natal experiences
│   │   ├── engines/             # Muhurtam/Tarabalam/AI presentation
│   │   ├── admin/ and panels/   # protected administration
│   │   └── ui/                  # shared UI primitives
│   ├── lib/
│   │   ├── db/                  # Turso client, schema and scoped queries
│   │   ├── engines/             # DashaFlow and AI clients
│   │   ├── panchangam/          # Telugu API contracts and BFF helpers
│   │   ├── auth.ts              # NextAuth configuration
│   │   └── unification-release.ts # fail-closed environment switch
│   ├── content/                 # 542 Markdown interpretation files
│   ├── docs/                    # product, architecture, testing and runbooks
│   ├── scripts/                 # content build and guarded staging DB tasks
│   ├── proxy.ts                 # public/private routing boundary
│   └── .vercel/project.json     # intentionally linked to staging locally
├── telugu-calendar-utilities/   # canonical Panchangam engines and publishers
│   ├── telugu_panchangam/       # Python engines and FastAPI adapter
│   ├── feeds/ and public/       # generated subscriber/static artifacts
│   ├── .github/workflows/       # generation and Pages publishing
│   ├── tests/                   # engine, compatibility and API parity fixtures
│   └── app.py                   # Vercel FastAPI entrypoint
├── dashaflow-sidecar/           # small stateless Python service
├── astrounified/                # obsolete predecessor; do not use
└── docs/                        # workspace-level notes, not the app reference
```

### Realistic path from here to production

Functional implementation is late-stage, but release engineering is not yet
complete. If owner feedback is mainly polish and no calculation defect appears,
this is realistically a few focused engineering/review sessions rather than a
new build from scratch. The actual alias cutover is short; the confidence work
before and after it is the larger part.

1. **Finish hosted owner acceptance.** Exercise public, owner, admin, mobile and
   representative calculation journeys; record defects and intentional
   follow-ups. Do not promote while review is open.
2. **Close or explicitly accept remaining release gaps.** Provision a dedicated
   staging Gemini key if full non-production AI narrative acceptance is
   required. Decide whether DashaFlow authentication/error redaction is a
   pre-cutover hardening task or a documented post-release risk.
3. **Freeze reproducible source.** Split, commit and push the current web and
   Telugu API work; review PRs; merge through `development`/`master` as
   appropriate; record exact Git SHAs. Reconcile documentation generated during
   the programme before merge.
4. **Rebuild green from clean commits.** Deploy staging from the recorded SHAs,
   rerun the 63-file/487-test web suite, TypeScript, lint, palette, route,
   responsive and owner/admin checks, plus the full Telugu engine/API parity
   suite. The deployment must report `gitDirty=0`.
5. **Create fresh unaliased production candidates.** Deploy Telugu API first,
   then Astro with the fail-closed production dependency graph. Do not assign
   `astrochaganti.com` yet. Verify health, public calculations, SEO, private
   redirects, error logs and responsive presentation.
6. **Prepare the dated go/no-go packet.** Take and verify a fresh Turso export,
   name the exact rollback deployment, record known issues and monitoring
   owners, and obtain explicit Gate 9 approval.
7. **Promote, then smoke-test the authorized domain.** Move the existing tested
   Astro deployment to the production aliases. Immediately test real Google
   sign-in, an existing profile, a disposable profile lifecycle, chart,
   personalized timing, admin allow/deny, consultation and public SEO routes.
8. **Stabilize before consolidation.** Watch health, Vercel errors, Sentry,
   latency, analytics and user feedback for the first hour, 24 hours, 72 hours
   and an agreed longer window. Roll back on the written triggers.
9. **Treat SEO/feed migration and retirement as separate work.** Preserve every
   subscribed `.ics` URL. Inventory indexed URLs and redirects, move canonical
   content deliberately, and retire GitHub Pages/Actions or legacy projects
   only after Gate 10 evidence and a separate Gate 11 approval.

With modest review feedback, Steps 1–6 are plausibly two to four focused work
sessions. A calculation discrepancy, major UX revision, Google OAuth problem,
or sidecar-security hardening would extend that. Stabilization and retirement
are intentionally measured in days or weeks, not in the cutover's minutes.

---

## Architecture at a glance

```
                         ┌─────────────────────────┐
Browser ────────────────►│ astro-unified-core      │
                         │ Next.js + NextAuth + BFF │
                         └──────┬───────┬──────┬───┘
                                │       │      │
                         ┌──────▼──┐ ┌──▼──────▼─────────┐
                         │ Turso   │ │ Python computation │
                         │ libSQL  │ │ services on Vercel │
                         └─────────┘ ├────────────────────┤
                                     │ DashaFlow sidecar  │
                                     │ Telugu Calendar API│
                                     └────────────────────┘

telugu-calendar-utilities GitHub Actions
  └──► GitHub Pages static site, Rasi artifacts and subscribed ICS feeds
```

Why separate Vercel projects? Next.js framework integration claims the web
project's `/api/*` space. Each Python service therefore has its own Vercel
project and contract. This also lets chart computation and Panchangam
computation deploy and roll back independently of the user-facing application.

---

## Stack

| Concern               | Choice                                                                 |
| --------------------- | ---------------------------------------------------------------------- |
| Frontend / API        | Next.js 16 (App Router, Turbopack), React 19, TypeScript               |
| Auth                  | NextAuth v4, Google provider (JWT strategy, no DB adapter)             |
| Database              | Turso (libSQL, hosted)                                                 |
| Natal/chart engine    | DashaFlow 1.1.0 (PyPI) — Swiss Ephemeris, Lahiri sidereal              |
| Panchangam engine     | Telugu Calendar Utilities — Drik, Surya Siddhanta and Vakya             |
| Python runtimes       | Two independent FastAPI services on Vercel                             |
| Geocoding             | OpenStreetMap Nominatim                                                |
| UI                    | Tailwind v4, shadcn/ui                                                 |
| Fonts                 | Inter (body) + Cormorant Garamond (headings) via `next/font`           |
| Hosting               | Vercel web/API projects plus GitHub Pages for static feeds             |

---

## Unification transition controls

The unification programme is governed by `PRODUCT.md §8`. Until its production
release and retirement gates are explicitly approved, the current Astro
Chaganti and Panchangam systems remain independent production services.

### Gate 1 current-state baseline — 2026-07-22

This baseline was collected read-only. It did not query private user rows,
download credentials, mutate Turso, deploy code, change DNS, or trigger a
publishing workflow.

#### Authoritative repositories

| Repository | Production branch / audited head | Access | Open PRs | Role |
|---|---|---|---|---|
| `socraticsurge/astro-unified-core` | `main` / `519d686` | Admin | 0 | Next.js product, NextAuth, Turso, public and authenticated UX |
| `socraticsurge/dashaflow-sidecar` | `master` / `2c98ee8` | Admin | 0 | FastAPI chart, transit, career, compatibility, and legacy Muhurtha computation |
| `socraticsurge/telugu-calendar-utilities` | `master` / `08a113b` | Admin | 0 | Panchangam engines, personal timing, feeds, public toolkit, MCP/PyPI package |
| `socraticsurge/astrochaganti` | `main` / legacy | Admin | Not part of active programme | Older Next.js product matching the legacy Vercel `astrochaganti` deployment; traffic/data disposition unconfirmed |

`astro-unified-core/development` is at `25f0206`, with two unreleased feature
commits beyond the last production merge. Release history contains merge commits
on `main`; migration rehearsals must compare trees and tests rather than assume a
simple fast-forward. The obsolete local `socraticsurge/astrounified` checkout is
not a production source.

#### Live hosting and domains

| Surface | Provider/project | Verified state |
|---|---|---|
| `https://astrochaganti.com` | Vercel `astro-unified-core-pfni` | HTTP 200; production deployment `dpl_F6yWeNZ2Mx9fzdjwMnan19cM9HdY`; Mumbai function region; `/api/health` reports Turso and sidecar healthy |
| `https://astro-unified-staging.vercel.app` | Vercel `astro-unified-staging` | Hosted owner-review deployment `dpl_FQJrDZbnN1dRq3DGHCzdFVjgrTB5`; isolated `astro-unified-staging` Turso DB, synthetic owner/admin auth, Telugu staging BFF, isolated DashaFlow staging service, fail-closed root switch, and no-index policy |
| Unaliased Astro release candidate | Vercel `astro-unified-core-pfni` | `dpl_3VQvBeJransUK8MnN7QB6ksRSUQt`; Ready and fully checked with production dependencies; not assigned to apex/canonical production aliases |
| `https://dashaflow-sidecar.vercel.app` | Vercel `dashaflow-sidecar` | HTTP 200; DashaFlow `1.1.0`; production function in `iad1` |
| `https://dashaflow-sidecar-staging.vercel.app` | Vercel `dashaflow-sidecar-staging` | Deployment `dpl_zKD5qaLJPMnokk5DtXbnK2nkZHeQ`; DashaFlow `1.1.0`; query-date and lazy exact-subperiod checks pass; consumed only by Astro staging |
| `https://panchangam.astrochaganti.com` | GitHub Pages from `gh-pages` | HTTP 200; HTTPS enforced; CNAME points to `socraticsurge.github.io` |
| `https://astrochaganti.vercel.app` | Vercel `astrochaganti`, matching `socraticsurge/astrochaganti` by project name, branch, and 2026-05-16 timestamps | Separate older Next.js product; HTTP 200; no custom domain; traffic/data disposition unconfirmed |
| Telugu Calendar API staging | Vercel `telugu-calendar-api-staging` | Stable staging-only alias; deployment `dpl_6i7AQt7hWqFCNs5sXy6KdpE8gzsm`; FastAPI contract `1.0`, Python 3.12, `bom1`; consumed only by Astro staging |
| `https://telugu-calendar-api-production.vercel.app` | Vercel `telugu-calendar-api-production` | Deployment `dpl_2WpDHW73JjfAc6ENG3L88vdYNL92`; authenticated contract checks and post-QA error-log scan pass |

The apex domain is registered and DNS-hosted on Vercel through 2027-05-07.
The Panchangam subdomain is an external GitHub Pages CNAME and therefore does
not appear in the Vercel domain list.

#### Vercel configuration

- Production contains the expected auth, Turso, sidecar, LLM, Sentry, PostHog,
  Resend, admin, and cron variable names. Secret values were not read.
- Preview contains Turso credentials. The existing runbook states that preview
  and production currently use the same Turso database; treat this as shared
  production access until a separate staging database is proven.
- The dedicated Gate 7 project now uses a fresh `astro-unified-staging` Turso
  database in `aws-ap-south-1`; it was created empty and seeded only with
  `.test` identities. It is not a production branch, dump, or token.
- Gate 7 review auth uses a credentials provider that activates only when the
  stable staging URL, exact staging database host, explicit enable switch,
  synthetic email domain, and strong owner/admin secrets all match. The owner
  approved this as the Gate 8 auth alternative; the production Google callback
  is unchanged and must be smoke-tested at Gate 9.
- The application and Vercel project both target Node `24.x`; the Gate 6
  production build succeeds on the aligned declaration.
- The staging-only Vercel project `telugu-calendar-api-staging` now hosts the
  additive, bearer-protected Gate 5 FastAPI contract. It is not connected to a
  production domain or to Astro Chaganti consumers.
- The Vercel project `telugu-calendar-api-production` hosts isolated, reviewed
  deployment `dpl_2WpDHW73JjfAc6ENG3L88vdYNL92` behind a fresh sensitive
  production token. Its live contract checks pass. Only the unaliased Astro
  Gate 9 candidate consumes it; no public domain does.
- The DashaFlow sidecar has no environment variables, authentication, rate
  limit, or origin restriction (`allow_origins=["*"]`). It is stateless and has
  no database, but accepts private birth inputs in requests and exposes raw
  exception text on failure.

#### Data and authentication

- Turso/libSQL schema version is `11` with `users`, `profiles`,
  `compatibility_checks`, `readings`, `feedback`, `consultation_requests`,
  `settings`, `consultation_slots`, `daily_landing`, and `chat_messages` plus
  indexes and `schema_version`.
- Google NextAuth uses signed JWT sessions. The sign-in callback upserts a Turso
  user; API routes scope profile and compatibility access by `user_id`, with
  explicit admin-only access paths.
- Birth details, current locations, generated readings, consultation text, and
  chat content are production data classes requiring private staging fixtures
  or redaction. They must not be copied wholesale into staging.
- The documented recovery target is RPO 24 hours and RTO under one hour. The
  runbook supports Turso export/SQL dump and restore into a new database.
- The production database is positively identified as `astrounified-live` in
  `aws-ap-south-1`, at schema 11 with 11 application tables, 105 users and 125
  profiles. Only aggregate counts were queried; no private row was inspected.
  Delete protection is now on. A dated, gitignored export on a FileVault-
  encrypted disk passed integrity and exact aggregate parity after restoration
  into a disposable Turso clone on 2026-07-22. The CLI reports the `starter`
  plan, but two native PITR clone attempts returned an internal-server error and
  created no database; manual export/restore remains the verified release path.

#### Panchangam publishing estate

- GitHub Pages is built from `gh-pages`, with 281 live files: 220 under
  `feeds/`, 32 dated `rasi_phalalu/` JSON artifacts, and the site/assets.
- `hyderabad-drik.ics` is healthy (HTTP 200, approximately 884 KB) and currently
  covers 2026-07-01 through 2027-12-31. Its URL is a durable subscriber
  contract.
- Monthly Panchangam, Gochara, and Lagna workflows last succeeded on 2026-07-01.
  Daily Rasi Phalalu last succeeded on 2026-07-21; a 2026-07-19 failure was
  followed by successful runs. Pages deploy and self-heal workflows are healthy.
- The engine is also published as `mcp-server-panchangam` `1.13.0` on PyPI and
  exposes 17 MCP tool implementations. The repository contains 101 Python test
  modules and treats its engine and ICS format as frozen compatibility contracts.
- The live Rasi Phalalu contract is date-addressed
  (`/rasi_phalalu/YYYY-MM-DD.json`); there is no `/rasi_phalalu/latest.json`.

#### SEO and public routing

- The Panchangam subdomain serves `robots.txt` and a one-URL sitemap.
- `astrochaganti.com/robots.txt` and `/sitemap.xml` currently receive a 307 to
  Google sign-in because the auth middleware public-path allowlist excludes
  them. This is a confirmed SEO defect and must be fixed in the new public
  surface before SEO consolidation.
- A complete Search Console/indexed-URL/export and traffic baseline has not yet
  been obtained. Redirect planning cannot be approved without it.

#### Operations and rollback

- Sentry, PostHog, Vercel Analytics, Speed Insights, Resend, and a public health
  endpoint are wired in code and their Vercel variable names exist.
- AstroChaganti's eight-hour landing refresh workflow is healthy. Panchangam's
  publishing and self-heal workflows are healthy.
- The runbook documents promotion of the previous green Vercel deployment and
  Turso restore as rollback mechanisms.
- Actual UptimeRobot configuration, current Sentry/PostHog access and metric
  baselines, Resend domain state, Google Search Console access, and a recent
  measured restore/rollback drill remain unverified.

#### Gate 1 unresolved confirmations

1. ~~Confirm a restorable Turso backup and successful restore test.~~ Completed
   2026-07-22 with delete protection, a dated local/off-account artifact and an
   exact-parity disposable restore. Native PITR separately returned an upstream
   internal error and remains tracked with Turso; add a second encrypted storage
   location as an operational follow-up.
2. Confirm or replace the shared preview/production Turso configuration before
   any preview containing migration code is deployed.
3. Confirm whether the older `socraticsurge/astrochaganti` / Vercel
   `astrochaganti` product has remaining users, data, traffic, or reusable design
   assets before classifying it for preservation or eventual retirement.
4. Export the Search Console/indexed URLs and baseline organic metrics for both
   domains.
5. Confirm access to Sentry, PostHog, Resend, Google OAuth/Search Console, and
   any external uptime monitor; record baseline metrics without user PII.
6. ~~Confirm the owner-reported production user count at aggregate level
   only.~~ Verified as 105 users and 125 profiles on 2026-07-22.

### Parallel environments

| Concern | Production (blue) | Migration/staging (green) |
|---|---|---|
| Web application | Existing `astro-unified-core-pfni` production deployment | Dedicated stable Vercel staging project from the same repository; PR previews remain ephemeral |
| User database | Existing production Turso database | Separate staging Turso database; never a production token |
| Authentication | Production Google OAuth client and callback | Fail-closed synthetic owner/admin identities on the stable staging callback; no production client or session secret |
| Chart computation | Existing `dashaflow-sidecar` | Pinned current service for unchanged calls or an isolated preview when its contract changes |
| Panchangam computation | GitHub Pages artifacts and scheduled Actions | Separate authenticated Vercel Python staging API sourced from `telugu-calendar-utilities` |
| Calendar feeds | Existing `panchangam.astrochaganti.com/feeds/*` URLs | Shadow-generated immutable Blob artifacts compared with production; no subscriber traffic |
| Scheduled generation | Existing GitHub Actions | Shadow jobs only until parity and migration rehearsal pass |

### Safety invariants

- Migration work never writes to the production Turso database unless an
  approved cutover step explicitly requires it.
- Database changes are additive and backward-compatible during stabilization.
- The existing Panchangam GitHub Actions and GitHub Pages deployment remain
  enabled until the retirement gate.
- Existing ICS paths are treated as durable subscriber contracts.
- New calculation APIs run in shadow/parity mode before replacing any current
  consumer.
- Production aliases, DNS, OAuth callbacks, canonical URLs, and redirects only
  change during an approved cutover window.
- Every cutover runbook names the previous Vercel deployment, rollback owner,
  rollback trigger, and maximum acceptable recovery time.

### Intended service boundary

The Next.js application remains the public and authenticated product shell and
browser-facing backend. It owns NextAuth, user/profile authorisation, Turso
persistence, SEO pages, admin, cache policy, and presentation. Browsers never
call the Python services directly. Telugu Calendar Utilities remains the source
of truth for Panchangam, Gochara/Rasi Phalalu, Tarabalam, Chandrabalam,
Lagna/Hora, and both public and personalised Muhurtam. DashaFlow remains the
source for natal charts, Vargas, Dashas, yogas, compatibility, transits, and
career. The web application consumes versioned, authenticated contracts and
does not duplicate calculation rules. Full Gate 3 design: `ARCHITECTURE.md §15`.

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
| `NEXTAUTH_URL`             | **Must equal** the canonical public URL `https://astrochaganti.com` — used in OAuth `redirect_uri` |
| `TURSO_DATABASE_URL`       | libSQL DSN                                                    |
| `TURSO_AUTH_TOKEN`         | Turso token                                                   |
| `DASHAFLOW_SIDECAR_URL`    | `https://dashaflow-sidecar.vercel.app`                        |
| `GOOGLE_GEMINI_API_KEY`    | Default LLM provider for AI insights and today/landing readings (`lib/engines/gemini.ts`). Required for `gemini-flash` model usage. Get from Google AI Studio. |
| `GROQ_API_KEY`             | Secondary LLM provider used by chat / draft generation (`lib/engines/groq.ts`). Get from console.groq.com. |
| `ADMIN_EMAILS` (required)  | Comma-separated list of admin email addresses. If unset, no one has admin access. |
| `SENTRY_AUTH_TOKEN`        | Build-time only. Uploads source maps to Sentry for readable stack traces. From Sentry → Settings → Auth Tokens. |
| `NEXT_PUBLIC_POSTHOG_KEY`  | PostHog Project API key (`phc_…`). Browser-visible (public-prefix is correct). |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog ingest URL — `https://eu.i.posthog.com`. Browser hits `/ingest/*` which `next.config.ts` rewrites to this. |
| `RESEND_API_KEY`           | Resend API key (`re_…`). Used to send the admin notification email on new consultation requests. If unset, notifications are silently skipped (helper short-circuits). Recipient and from-address are hardcoded in `lib/constants.ts`. |
| `CRON_SECRET` (required)   | Shared secret the landing-refresh cron sends as `Authorization: Bearer <secret>` to `/api/cron/regenerate-landing` every 8 hours. Generate a random 32+ char string. Set as both a Vercel env var (so the route can validate) AND a GitHub Actions repo secret (so the workflow can send). The workflow lives at `.github/workflows/landing-cron.yml` — we use GitHub Actions instead of Vercel Cron because the Hobby plan only allows daily cron schedules. |

### Sidecar — none required.

### Google Cloud Console — OAuth consent

- **Authorized redirect URIs**: `https://astrochaganti.com/api/auth/callback/google` (exact match required by Google).
- **Authorized JavaScript origins**: `https://astrochaganti.com`.

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

**Fix**: pin `NEXTAUTH_URL` to the canonical public URL
`https://astrochaganti.com` so production requests use one redirect URI, and
register exactly that callback URL in Google Console. Generated deployment URLs
remain unsuitable for the real Google login smoke test.

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
cd /Users/vinaychaganti/Documents/VibeCodedApps/AstroRepos/astro-unified-core
npm install
npm run dev               # http://localhost:3000

# Sidecar (only needed if you're changing it)
cd /Users/vinaychaganti/Documents/VibeCodedApps/AstroRepos/dashaflow-sidecar
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
- **Custom domain**: resolved — `astrochaganti.com` is the canonical public
  domain. The generated project alias remains a deployment/rollback handle.
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
2. Bump `SCHEMA_VERSION` (currently `11`).
3. Deploy. `ensureSchema()` will auto-run the DDL on the next DB call.
4. Update `docs/ARCHITECTURE.md §5` and `docs/PROJECT.md` schema section.

### Clear stale compatibility history (admin)

1. Sign in as admin → `/admin` → Settings tab → "Clear History" button.
2. Or directly via API: `POST /api/admin/clear-compatibility` with a valid admin session.

---

*See `docs/STANDARDS.md` for coding standards, `docs/ARCHITECTURE.md` for system
design, `docs/BACKLOG.md §Session Decisions` for historical architectural choices.*

*Last updated: 2026-07-26*
