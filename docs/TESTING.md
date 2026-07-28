# Astro Chaganti — Testing Log & Coverage

<!-- last-updated: 2026-07-26 -->

> This file tracks: (1) test coverage status per module, (2) how to run tests,
> (3) a manual QA log, and (4) test plans linked to the user journey traces in
> `PRODUCT.md`. Journey IDs (J1–J8) correspond to the numbered journeys there.

---

## Table of Contents

1. [How to Run Tests](#1-how-to-run-tests)
2. [Test Coverage Status](#2-test-coverage-status)
3. [Test Plans by User Journey](#3-test-plans-by-user-journey)
4. [Unification Release Gates](#4-unification-release-gates)
5. [Manual QA Log](#5-manual-qa-log)

---

## 1. How to Run Tests

```bash
# Run all tests (Vitest)
npx vitest run

# Run in watch mode during development
npx vitest

# Run with coverage report
npx vitest run --coverage

# TypeScript check (zero errors required before any PR)
./node_modules/.bin/tsc --noEmit
```

**Test framework:** Vitest (not Jest). See `STANDARDS.md §3` for the full API
mapping. Config is in `vitest.config.ts`. Globals are enabled — no imports needed.

**Test file conventions:**
- Unit tests: `lib/**/*.test.ts`, `components/**/*.test.tsx`
- Integration tests: `app/api/**/*.test.ts`
- Test files are excluded from the main `tsconfig.json` to avoid type conflicts.

---

## 2. Test Coverage Status

Last assessed: **2026-05-14**

| Module | Test file | Coverage | Notes |
|---|---|---|---|
| `lib/tarabalam.ts` | — | None | High-value target: pure functions, no deps |
| `lib/astro-utils.ts` | — | None | Pure functions; easy to test |
| `lib/rate-limit.ts` | `scratch_test_rate_limit.ts` (not a real test) | Scratch only | Needs a proper Vitest file |
| `lib/admin.ts` | — | None | Trivial; covers email-list parsing |
| `lib/engine-error.ts` | — | None | Trivial; covers error detection |
| `lib/db/client.ts` | — | None | Integration; needs live Turso or mock |
| `lib/db/profiles.ts` | — | None | Integration |
| `app/api/profiles/route.ts` | — | None | Integration |
| `app/api/readings/dashaflow/route.ts` | — | None | Integration |
| `app/api/compatibility/route.ts` | — | None | Integration |
| `app/api/feedback/route.ts` | — | None | Integration |
| `app/api/consultation-requests/route.ts` | — | None | Integration |
| `components/NavBar.tsx` | — | None | UI; manual only |
| `components/unified/tabs/*` and `components/tabs/CompareTab.tsx` | Focused render tests | `ChartTab`, `PlanetsTab`, `TimeTab`, `IdentityStrip`, `HouseGrid`, `DashaTab`, `TransitsTab`, `HousesVargasTab`, `YogasTab`, `JaiminiTab`, `AshtakavargaTab`, `ShadabalaTab`, `CareerTab`, and the complete Marriage compatibility journey have render contracts | Add coverage as each remaining signed-in surface is accepted |

**Priority for first test sprint:**

1. `lib/tarabalam.ts` — legacy compatibility helpers; the authenticated J4
   path is now covered at the canonical adapter and BFF boundaries.
2. `lib/astro-utils.ts` — pure functions, no mocking needed.
3. `lib/engine-error.ts` — trivial to test, good CI safety net.
4. `lib/admin.ts` — email-list parsing with edge cases.
5. `app/api/profiles/route.ts` — validates auth gate, cap check, geocoding mock.

---

## 3. Test Plans by User Journey

Each plan is linked to a journey in `PRODUCT.md §5`. Use these as a QA checklist
before releasing any change that touches the journey's code path.

---

### J1 — New User Onboarding

**Code path:** `proxy.ts` → `/auth/signin` → `lib/auth.ts` → `app/api/profiles/route.ts`

| # | Test | Expected | Type |
|---|---|---|---|
| J1-1 | Guest visits `/dashboard` | Redirected to `/auth/signin` | Manual / e2e |
| J1-2 | Guest visits `/profiles/any-id` | Redirected to `/auth/signin` | Manual / e2e |
| J1-3 | Guest visits `/` | Landing page shown, no redirect | Manual |
| J1-4 | Guest visits `/privacy`, `/terms`, `/credits` | Pages load without auth | Manual |
| J1-5 | User completes Google OAuth | Redirected to `/dashboard` | Manual |
| J1-6 | New user has no profiles | Dashboard shows "Create your first profile" nudge | Manual |
| J1-7 | User creates profile with valid data | Profile appears in dashboard | Manual |
| J1-8 | User attempts to create 11th profile | API returns 400 with "Profile limit reached" | Unit / manual |
| J1-9 | User creates profile with unrecognised place | Geocoding fails gracefully with error message | Manual |

---

### J2 — Viewing a Chart

**Code path:** `app/profiles/[id]/page.tsx` → `ProfileDetailClient.tsx` → `GET /api/readings/dashaflow`

| # | Test | Expected | Type |
|---|---|---|---|
| J2-1 | Authenticated user loads their own profile chart | 17 sections render | Manual |
| J2-2 | User loads profile for a different user | 401 or redirect | Manual |
| J2-3 | Sidecar is unreachable | Error banner shown, not a blank page | Manual |
| J2-4 | User clicks "Refresh" | Spinner shown, fresh data loads | Manual |
| J2-5 | User taps ⓘ on any section | Explainer drawer opens with correct content | Manual |
| J2-6 | Admin loads any user's profile | Chart loads; Professional toggle visible | Manual |
| J2-7 | Non-admin user | Professional toggle NOT visible | Manual |

---

### J3 — Compatibility Check

**Code path:** `app/compatibility/page.tsx` → `POST /api/compatibility`

| # | Test | Expected | Type |
|---|---|---|---|
| J3-1 | Select two profiles, run check | Score, kuta breakdown, narrative shown | Manual |
| J3-2 | Same profile selected twice | Error or UI prevents it | Manual |
| J3-3 | User has 6 checks, tries a 7th | API returns 403 "Limit reached" | Manual / unit |
| J3-4 | Sidecar unavailable | Error state shown gracefully | Manual |
| J3-5 | Admin clears compatibility history | List resets to 0 | Manual |

---

### J4 — Auspicious Days (Tarabalam)

**Code path:** `app/api/readings/tarabalam/route.ts` →
`lib/panchangam/personal-search.ts` → Telugu Calendar Utilities
`/v1/tarabalam`

| # | Test | Expected | Type |
|---|---|---|---|
| J4-1 | Request Tarabalam for 7 days | The exact comparison table shows star, transition, Tithi, overall verdict, and per-profile Tara and Chandrabalam reasoning | Unit / manual |
| J4-2 | Request Tarabalam for 91 inclusive days | API returns 400 without calling the engine | Unit / manual |
| J4-3 | Invalid date format | API returns 400 | Unit |
| J4-4 | Switch among Classic, exclude-cautions, and strict modes | Request policy and engine group verdict are preserved | Unit / manual |
| J4-5 | Select two owned profiles | Active profile is first; both receive complete per-day reasoning | Unit / manual |
| J4-6 | Inspect upstream request | Only anonymous derived contexts are transmitted; names and birth details stay in the BFF | Unit |
| J4-7 | Review 15+ returned days | First 14 appear, with an explicit show-all action | Unit / manual |
| J4-8 | Phone and desktop review | Same details, no horizontal overflow, 44 px controls, colour-independent verdicts | Manual |

---

### J5 — Transit Check

**Code path:** `app/api/readings/transit/route.ts` → `lib/engines/transit.ts`

| # | Test | Expected | Type |
|---|---|---|---|
| J5-1 | Admin fetches transit for a date | Planet positions grid shown | Manual |
| J5-2 | Non-admin accesses transit | Same as registered user — transit tab visible in basic view? (verify intended behaviour) | Manual |
| J5-3 | Invalid date string supplied | API returns 400 | Unit |

---

### J6 — Consultation Request

**Code path:** `app/consultation/page.tsx` → `POST /api/consultation-requests`

| # | Test | Expected | Type |
|---|---|---|---|
| J6-1 | User submits a question | Confirmation shown; pending indicator appears | Manual |
| J6-2 | User tries to submit while one is pending | UI prevents second submission | Manual |
| J6-3 | Text field > 2000 chars | API returns 400 | Unit |
| J6-4 | Admin marks consultation answered | Status updates for user on next visit | Manual |
| J6-5 | Slot booking fails after request creation | Slot automatically unbooked (compensating txn) | Unit / manual |

---

### J7 — Admin Oversight

**Code path:** `app/admin/page.tsx` → multiple admin API routes

| # | Test | Expected | Type |
|---|---|---|---|
| J7-1 | Admin signs in | Admin link visible in NavBar and mobile bottom nav | Manual |
| J7-2 | Non-admin signs in | No Admin link | Manual |
| J7-3 | Admin visits `/admin` | Dashboard loads with all tables | Manual |
| J7-4 | Non-admin visits `/admin` directly | 403 response | Manual |
| J7-5 | Admin updates `live_consultation_enabled` | Setting persists across Lambda restarts | Manual |
| J7-6 | Admin triggers backfill | Success message; no 500 errors | Manual |

---

### J8 — Muhurtha

**Code path:** `app/api/readings/muhurtha/route.ts`

| # | Test | Expected | Type |
|---|---|---|---|
| J8-1 | Profile has current location; request muhurtha | Quality rating + reasoning shown | Manual |
| J8-2 | Profile missing current location | UI shows "Complete Profile" nudge | Manual |
| J8-3 | Invalid event type | API returns 400 | Unit |

---

## 4. Unification Release Gates

The programme gates in `PRODUCT.md §8` require recorded evidence, not an
informal sense that the feature works. No result in this table authorizes the
next gate until the owner explicitly approves it.

| Gate | Minimum acceptance evidence |
|---|---|
| Current-state audit | Inventory of production repositories, Vercel projects, environment-variable names, Turso schema/backup procedure, GitHub Actions, DNS, analytics, feed URLs, and current health checks |
| Target experience | Approved route map, journey flows, content ownership, mobile priorities, and explicit public/authenticated boundary |
| Technical architecture | Reviewed API schemas, threat model, cache policy, staging isolation, scheduled-work design, cost estimate, failure modes, and rollback design |
| Visual direction | Approved responsive prototypes with accessibility review for homepage, Panchangam, horoscope, profile onboarding, chart navigation, and Muhurtam |
| Backend parity | Automated fixture comparison across all calculation systems, representative cities/timezones, boundary dates, festivals, eclipses, and Muhurtam rules; documented tolerances and zero unexplained mismatches |
| Public experience | Unit/integration/e2e suites green; structured data and metadata validated; performance, accessibility, sharing, error, stale-data, and mobile tests passed |
| Personalized experience | Auth and cross-user isolation tests; staging profile journeys; chart regression; multi-profile Muhurtam validation; no public caching of private responses |
| Migration rehearsal | Fresh staging rehearsal from written runbook; feed URL checks; redirect/canonical map validation; observability checks; successful rollback drill with measured recovery time |
| Production release | Dated evidence bundle, production backup verification, named owner, approved maintenance window, known-issue acceptance, and signed go/no-go |
| Stabilization | Agreed observation window with Sentry, latency, calculation errors, auth failures, user feedback, analytics, SEO, and feed health compared with baseline |
| Retirement | Every old runtime dependency mapped to a verified replacement; rollback window elapsed; feed contracts preserved; separate written approval |

### Parity rules

- The current service is the behavioral baseline, but independently verified
  reference fixtures remain authoritative for known correctness issues.
- A mismatch is never silently normalized. It is classified as a new defect,
  an existing defect, an intentional improvement, or an understood tolerance.
- Intentional calculation changes require owner approval and regression fixtures.
- Shadow traffic and comparison logs must exclude or redact private birth data.

### Gate 3 contract and isolation evidence

Before Gate 3 can advance, the reviewed design must make the following tests
possible; Gate 5 and later gates execute them:

- Matching Pydantic and Zod fixtures for every Telugu computation endpoint,
  including stable error codes and explicit contract/engine versions.
- Proof that anonymous Muhurtam requests contain no participant context and
  personalised responses use `private, no-store` headers.
- Cross-user profile-ID tests at the BFF boundary, including mixed owned and
  unowned participant lists.
- Missing/invalid service-token, oversized body, invalid coordinate/timezone,
  maximum-range, timeout, retry, and redacted-error tests.
- Environment assertions that prevent staging/preview from starting with the
  production Turso URL or production computation token.
- Feed artifact and manifest comparison without changing any subscribed URL.
- Admin route, role, pagination, and mutation-audit tests; operations panels use
  aggregate status only and never expose computation credentials.

### Gate 4 prototype evidence

The non-production prototype at `prototypes/unification-gate4/` provides the
review surface for Gate 4. It is excluded from Vercel builds and contains no
production integrations or real user data.

| Check | Result | Evidence / remaining work |
|---|---|---|
| Principal journeys represented | Pass | Public home, Panchangam, Rasi Phalalu, public Muhurtam, private dashboard, onboarding, and admin are selectable views. |
| Public/private Muhurtam boundary | Pass | Baseline results remain visible; participant validation is presented as the optional signed-in extension. |
| Responsive design rules | Pass (static) | Desktop, tablet, and mobile breakpoints cover navigation, utilities, results, forms, private workspace, and admin. Owner visual inspection remains required. |
| Keyboard and control basics | Pass (static) | Semantic buttons/landmarks, skip link, labelled fields, visible focus, 44-pixel targets, and reduced-motion handling are present. |
| Script syntax and whitespace | Pass | `node --check prototype.js` and `git diff --check`. |
| Local asset loading | Pass | Local server returned `200` for HTML, CSS, and JavaScript; the missing optional favicon was the only `404`. |
| Automated visual screenshots | Not available | The in-app browser safety policy declined the local screenshot action. No alternate browser path was used; owner manual review is the visual acceptance evidence for this gate. |
| Production impact | Pass | Prototype is under `prototypes/`, listed in `.vercelignore`, and makes no application, database, auth, service, or deployment change. |

Before approval, inspect the prototype at a wide desktop size and a phone-size
window, exercise every top-level view, change Rasi, toggle the theme, open the
mobile menu, and confirm that the public/private wording feels accurate.

### Gate 5 backend-parity evidence

Gate 5 adds a new consumer boundary to `telugu-calendar-utilities`; it does not
alter its frozen engines, ICS generator, GitHub workflows, static site, feeds,
or the Astro Chaganti production application.

| Check | Result | Evidence |
|---|---|---|
| Versioned computation boundary | Pass | FastAPI contract `1.0`: catalog, day/range Panchangam, Rasi Phalalu, Tarabalam, and public/profile-aware Muhurtam. |
| Canonical implementation | Pass | The adapter serializes existing MCP-tool outputs; no Jyotisha formula is reimplemented in the HTTP layer. |
| Cross-system/date/location parity | Pass | Twelve frozen cases cover Drik, Surya Siddhanta, Vakya, Indian and international zones, DST start/end, leap day, eclipse, and festival dates with zero unexplained mismatches. |
| Public/profile Muhurtam boundary | Pass | Empty participants return useful public slots; `p1`–`p4` contexts add canonical personal factors without names, account IDs, or raw birth data. |
| Security and cache boundary | Pass | Bearer auth on all `/v1/*`, minimal public health, no browser CORS, `private, no-store`, bounded bodies/models, safe request IDs, and redacted errors. |
| Repository regression | Pass | `tools/verify_project.py`: 1,299 of 1,300 Python cases passed with one optional browser skip, all 56 Vitest tests passed, TypeScript checking passed, and the Vite production build passed. |
| Vercel build/runtime | Pass | Protected preview `dpl_6yMexfG5oCKjUKoxMrRndbQFCTfb`; Python 3.12 FastAPI function, 101.87 MB, `bom1`, 60-second cap. Live health and every computation family returned HTTP 200. |
| Warm live latency sample | Pass for Gate 5 | Range 0.425 s, Rasi 0.462 s, Tarabalam 0.156 s, 3-day public Muhurtam 0.668 s, and profile Muhurtam 0.129 s. These are smoke samples, not production SLO claims. |
| Production impact | Pass | No Astro Chaganti route, Turso database, production Vercel alias, DNS record, GitHub Pages workflow, feed URL, or consumer was changed. |

The deployment URL remains Vercel-protected and the computation token remains
server-side. Gate 5 approval authorizes Gate 6 staging integration only; it does
not authorize production traffic, DNS, data migration, or retirement.

### Gate 6 public-experience implementation evidence

Gate 6 is isolated at `/unified`; `/` and all existing authenticated journeys
retain their current components and contracts.

| Check | Current result | Evidence |
|---|---|---|
| Public BFF contracts | Pass locally | Six route tests cover invalid input, canonical field mapping, empty public participants, cache policy, safe errors, trusted proxy IP selection, and rate limiting. |
| Crawler metadata | Pass locally | `robots.txt` and `sitemap.xml` have direct metadata-route tests; private routes and `/unified` are excluded from indexing during staging. |
| Repository regression | Pass locally | 53 Vitest files / 421 tests, TypeScript, palette and route checks pass. ESLint has one pre-existing unused-type warning and no errors. |
| Production build | Pass locally | Next.js 16.2.4 compiled all routes with Node 24 declared; `/unified` and all three public BFF routes appear in the build manifest. |
| Production impact | Pass | No root-page replacement, Turso access, OAuth callback, production alias, DNS, feed, GitHub Action, or existing computation consumer changed. |
| Stable staging | Pass | `astro-unified-staging` deployment `dpl_6wbwGRwzFX4LXHvrhTFyGpbvi9LS` consumes only Telugu staging deployment `dpl_6i7AQt7hWqFCNs5sXy6KdpE8gzsm`; secrets persist only in the staging projects. |
| Responsive interaction review | Pass | At 1440×900 and 390×844: live day/location/system data, Rasi selection, seven-day public Muhurtam, profile invitation, and feed continuity rendered correctly; the document had no horizontal overflow. |
| Semantic/browser review | Pass | One main landmark and H1, no duplicate IDs, unnamed controls, or missing image alternatives; no browser console errors after the analytics-optional fix. |

Owner biography, portrait and approved practice claims intentionally remain a
clearly labelled placeholder. Staging Google OAuth is disabled and no Turso
credential is present because authenticated acceptance belongs to Gate 7.

### Gate 7 personalized-experience implementation evidence

Gate 7 uses only the dedicated web project, a fresh Turso database, synthetic
`.test` identities, the stateless DashaFlow calculator, and the Gate 5 Telugu
staging API. No production record, token, alias, route, or feed is used.

| Check | Result | Evidence |
|---|---|---|
| Staging isolation | Pass | Fresh `astro-unified-staging` DB in `aws-ap-south-1`, schema 11 / 11 tables, three synthetic users and four synthetic profiles; guarded migration/seed commands refuse every other database host. |
| Auth boundary | Pass | Owner and admin credential paths activate only under the exact stable staging URL/database/email boundary; `/api/health` reports `staging_auth: ready` without exposing values. |
| Ownership/privacy | Pass | Mixed owned/unowned profile lists fail before chart or Telugu calls; unit tests prove upstream payloads omit names, profile/account IDs, dates and birth times. All authenticated timing responses use `private, no-store`. |
| Canonical timing | Pass | Single- and two-profile Tarabalam returned day-by-day Drik data; two-profile Muhurtam applied Panchangam, activity, avoid-window, slot, Tara, Chandra and derived-Lagna factors with unevaluated chart/manual factors stated explicitly. |
| Signed-in UX | Pass | Owner profiles generate/load charts; Overview, Birth Chart, Timing, Life Areas and Compare are visible to the owner; specialist Patterns remains admin-only; Muhurtam and Tarabalam accept up to four owned profiles. |
| Admin UX | Pass | Separate admin identity reaches People, Consultations, Content & Publishing, Operations and Settings; user/profile counts and synthetic IDs align. No impersonation or production-source switch was introduced. |
| Repository regression | Pass | 58 Vitest files / 451 tests, TypeScript, palette and route checks, Next.js production build, and focused ESLint all pass. Full ESLint has one pre-existing unused-type warning and no errors. |
| Responsive/semantic browser audit | Pass | At 390×844 the owner/admin workspaces have no page overflow, duplicate IDs, unnamed controls or missing image alternatives; console warning/error log is empty. |
| Stable staging | Pass | `astro-unified-staging` deployment `dpl_9Z9dcoq5vgz7o21h2ajqha3FRyF9`; health reports Turso and DashaFlow ready; Telugu computation remains on `telugu-calendar-api-staging`. |
| Production impact | Pass | No production Vercel project, Turso row/token, OAuth client, DNS/domain, root route, feed URL, GitHub Action, or old Panchangam service changed or retired. |

The Gate 7 review credentials are stored only in Vercel and the owner handoff;
they are intentionally absent from source control. The owner approved this
fail-closed synthetic path for Gate 8 instead of configuring a separate Google
client. Gate 9 still requires a production Google sign-in smoke test.

Owner approved Gate 7 on 2026-07-22, with detailed experience review deferred.
Gate 8 may now rehearse the migration and rollback path in isolation; this
approval does not authorise a production deployment or cutover.

### Gate 8 migration-rehearsal evidence

The final rehearsal is deployed only to `astro-unified-staging` as
`dpl_DkvRBucDzEQxnoxj4WozSHtMfnCq`. The existing production application,
production Turso database, Google OAuth configuration, Panchangam GitHub Pages,
feeds, workflows, aliases and DNS were not changed.

| Check | Result | Evidence |
|---|---|---|
| Fail-closed root switch | Pass | The Gate 8 source required the exact staging auth URL, Vercel project host, Turso host and Telugu API URL; every mismatch returned the legacy mode and no production switch existed at rehearsal time. |
| Root/SEO rehearsal | Pass | Staging `/` serves the unified experience as a statically prerendered page; canonical metadata remains the production domain, robots are `noindex,nofollow`, and `/robots.txt` disallows `/`. |
| Dependency/observability check | Pass | `/api/health` reports HTTP 200 with Turso, DashaFlow and Telugu Panchangam healthy, release mode `rehearsal`, and staging auth `ready` without exposing endpoints or credentials. |
| Staging data | Pass | Authenticated Turso CLI verification reports schema version 11, 11 application tables, three synthetic `.test` users and four synthetic profiles. No production rows were queried or copied. |
| Repository/build regression | Pass | 59 Vitest files / 459 tests, TypeScript, palette and 26-route checks pass; ESLint has zero errors and one pre-existing unused-type warning. Local and Vercel production builds pass, with `/` confirmed static. |
| Published-estate inventory | Pass | The live `gh-pages` tree contains 220 `feeds/` paths and 32 dated Rasi Phalalu artifacts. Existing Actions and GitHub Pages remain the publishers. |
| Subscriber compatibility | Pass | Hyderabad Drik, Surya Siddhanta and Vakya calendars; Dallas Drik; festival and observance calendars; Hyderabad Lagna JSON; and the 2026-07-22 Rasi artifact all returned exact-path HTTP 200 with expected content types. |
| Rollback drill | Pass | Promoting approved Gate 7 deployment `dpl_9Z9dcoq5vgz7o21h2ajqha3FRyF9` restored a healthy pre-rehearsal app in 5.34 seconds. Re-promoting the final Gate 8 deployment restored the unified root and complete health marker in 5.23 seconds. |
| Production isolation | Pass | After the drill, `astrochaganti.com/api/health`, `panchangam.astrochaganti.com/`, and the durable Hyderabad Drik feed all remained HTTP 200. |

Owner approved Gate 8 functionality and migration safety on 2026-07-22. The
logo and hero feedback is carried as a required Gate 9 visual correction. Gate
9 preparation may proceed, but every production change remains unauthorised
until a separate explicit go/no-go decision.

### Gate 9 release-preparation evidence

The branded, responsive public candidate is deployed only to staging as
`dpl_BnfRNuvjj63MGxd932EbyifoZPJs`. It restores the Astro Chaganti mark and
shell on `/`, replaces the generic hero with a live Panchangam-derived lunar-day
portrait, removes forced headline breaks, balances headings and supporting copy,
and respects reduced-motion preferences. Desktop (1440×900) and phone (390×844)
checks found no horizontal overflow, duplicate IDs, missing image alternatives,
unnamed controls or console warnings/errors.

The production release switch is implemented and active only in the unaliased
candidate. It requires exact matches for the production auth URL, Vercel project
hostname, Turso host and the dedicated Telugu Calendar production API. Unit
tests prove that inserting any staging dependency makes it fail closed to the
legacy homepage. Current public traffic remains on the old deployment.
Production Google OAuth advertises the correct apex callback, but a real
post-promotion login smoke test remains mandatory.

Production release-candidate QA now passes, and three prior blockers closed on
2026-07-22: the owner supplied and approved the public portrait plus the
claims of 14+ years studying/practising astrology and 400+ consultations. The
profile candidate uses only those astrology claims and separately substantiated
academic credentials. Turso delete protection is now on. A production export
passed local integrity, schema/count verification and a disposable cloud restore
with exact aggregate parity (105 users, 125 profiles, 743 readings, 27
consultation requests); the clone was removed after verification. No private row
was printed or inspected. The isolated Telugu API is now `Ready` as
`dpl_2WpDHW73JjfAc6ENG3L88vdYNL92`; public health, rejected unauthenticated
access, authenticated catalog and Hyderabad daily Panchangam checks all passed.
Its fresh sensitive token and exact URL are configured in the Astro production
environment. The final unaliased candidate is
`dpl_3VQvBeJransUK8MnN7QB6ksRSUQt`: health reports all dependencies green and
`production-boundary-confirmed`; root, robots, sitemap, provider discovery and
all three public calculations are HTTP 200; private workspaces redirect to
sign-in; runtime error scans are empty. The apex and canonical project alias
remain on `dpl_F6yWeNZ2Mx9fzdjwMnan19cM9HdY`.

Native Turso PITR is not counted as a pass. The CLI reports `starter`; two
timestamped clone attempts returned `internal server error`, and inventory
checks found no partial clone. The tested manual export/disposable-restore path
is therefore the Gate 9 recovery mechanism. Remaining hard stops are explicit
owner acceptance of that caveat/go-no-go and the immediate post-promotion
Google/profile/admin smoke test.

Owner approval is deliberately deferred for hosted review at
`https://astro-unified-staging.vercel.app`. The durable acceptance deployment
is `dpl_AbPww4DyMhD9D2QU4LntfcVh9RoU`, backed by the synthetic staging Turso
database and authenticated Telugu staging API. Health reports
`staging-boundary-confirmed`; synthetic owner login reaches the dashboard,
synthetic administrator login reaches `/admin`, and the owner is denied admin
access. The earlier localhost harness remains a tested development-only
fallback, not the acceptance handoff. A fresh clean-Git, unaliased production
candidate is required after review is complete.

On 2026-07-26 the acceptance pass reconfirmed the public Panchangam and
Rasi interactions, a 12-window public Muhurtam response, two-profile
participant validation, owner/admin separation, non-admin denial, the public
portrait, and phone-width layout without overflow. It also exposed that the
isolated environment has no Gemini key: stale Today/Natal narrative
regeneration returned 502 while chart and transit remained healthy. The
dashboard now shows a redacted, retryable unavailable state while preserving
deterministic dasha/chart/timing content; provider and environment details are
not reflected to the browser. The updated source passes 63 Vitest files / 487
tests, TypeScript, lint, palette, and all 27 route checks. Full non-production
AI-generation acceptance remains open until a dedicated staging key is
provisioned; production traffic and credentials remain unchanged.

The final hosted smoke pass returned HTTP 200 for the root, sign-in,
Panchangam, Rasi Phalalu and health. Synthetic owner/admin role checks passed.
The accepted staging build was produced from a dirty CLI worktree, so its next
release requirement is reproducibility: commit and review both web and Telugu
API worktrees, then rebuild from recorded Git SHAs before Gate 9 go/no-go.

The current source passes 62 Vitest files / 481 tests, TypeScript, palette and
all 27 internal-route checks. ESLint reports zero errors and one pre-existing
unused-type warning. Local and Vercel optimized builds pass with `/`,
`/robots.txt` and `/sitemap.xml` statically generated. Live staging health is
HTTP 200 with every dependency healthy, release mode `rehearsal`, synthetic auth
ready, `Disallow: /`, and unified-brand/no-index markers in the root HTML.
Desktop and phone browser checks confirm the optimized portrait loads, the
claims and heading are present, and there is no overflow, missing alt text,
duplicate ID or console warning/error. A staging-only build whose context
incorrectly included the gitignored recovery directory was cancelled and
deleted before aliasing; `.vercelignore` now excludes `backups/` and every
SQLite/WAL/info artifact explicitly.

#### Homepage rebuild verification — 2026-07-26

The approved horoscope-first rebuild is deployed only to
`astro-unified-staging.vercel.app` as
`dpl_CqSecbjJMeceXrabu4aXcjDCAaEV`. Its calculation dependency is the isolated
staging deployment `dpl_H5LZCWuAPG6fMjVXhzR2ucYtaMoX`.

| Evidence | Result |
|---|---|
| Telugu Calendar full regression | 1,297 passed, 1 browser-only skip on Python 3.12 |
| Astro full regression | 64 Vitest files, 492 tests passed |
| Static checks | TypeScript, route literals, palette policy and targeted ESLint pass |
| Production build | Next.js 16.2.4 optimized build passes; `/` remains statically generated |
| Live public data | Rasi reading includes nine graha positions; hero plots computed Surya/Chandra longitudes; exact traditional calendar context, day/night Horas and Choghadiya, Lagna transitions and 12 public Muhurtam results render from engine 1.13.0 |
| Desktop browser | 1280 px document equals viewport width; one top navigation row, real 98.84°/239.16° marker styles and no console error |
| Phone browser | 390×844 document equals viewport width; sticky context, manuscript framing and section snapping render without horizontal overflow or console error |
| Interaction | Page-level settings open and update location; the Muhurtam occasion → place/date → people/results flow works; results show 6 of 12, then exactly 12 of 12 after Show all; WhatsApp sharing remains available |
| Calendar subscription | 22 locations, 3 systems and 3 feed types render in-page; selection changes the URL, copy succeeds, webcal launch remains available and Google/Apple/Outlook instructions switch without navigation |
| Feed estate | All 198 generated combinations return HTTP 200; representative full and variant responses return `text/calendar`; the unified page has zero links to the legacy Panchangam landing page |
| Adversarial checks | No duplicate IDs, unlabeled form controls, horizontal overflow or console errors; the phone sticky context is 60 px and numbered instructions retain decimal markers |
| Production impact | None: no production alias, DNS, OAuth, Turso production row, existing feed or GitHub Pages service changed |

---

## 5. Manual QA Log

Template for logging QA runs. Add a new entry every time you do a manual verification
pass on a staging or production deployment.

---

### QA Run — 2026-05-13 (Pre-release security audit + admin auth fix)

**Deployment:** Preview (development branch, Vercel preview URL)
**Tester:** Claude Code (automated review)
**Scope:** Security fixes from the prior session + admin authentication rewrite

| Journey | Tests run | Result | Notes |
|---|---|---|---|
| J2-7 | Non-admin does not see Professional toggle | Pass | After sign-out/sign-in |
| J7-1 | Admin sees Admin link after signing in | Pass | Required sign-out/sign-in to refresh JWT |
| J7-2 | Non-admin has no Admin link | Pass | |
| J7-4 | Non-admin hits `/admin` directly | Pass | 403 returned |
| J3-3 | 7th compatibility check blocked | Pass | 403 "Limit reached" |
| J1-8 | 11th profile blocked | Not tested | Needs manual verification |
| J6-5 | Consultation slot rollback | Not tested | Code path added; needs live test |

**Open gaps to test next time:**
- J1-8 (profile cap), J4-4 / J4-5 (tarabalam unit tests), J6-5 (slot rollback),
  J8-2 (muhurtha location nudge)

---

*Add new QA run entries above this line. Oldest entries may be archived to
`docs/archive/` after 6 months.*
