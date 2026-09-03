# Astro Chaganti — Testing Log & Coverage

<!-- last-updated: 2026-09-03 -->

> This file tracks: (1) test coverage status per module, (2) how to run tests,
> (3) a manual QA log, and (4) test plans linked to the user journey traces in
> `PRODUCT.md`. Journey IDs (J1–J8) correspond to the numbered journeys there;
> G1–G2 cover the cross-site guest gateways traced in `ARCHITECTURE.md`
> Journeys 7–8.

---

## Table of Contents

1. [How to Run Tests](#1-how-to-run-tests)
2. [Test Coverage Status](#2-test-coverage-status)
3. [Test Plans by User Journey](#3-test-plans-by-user-journey)
4. [Manual QA Log](#4-manual-qa-log)

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

Last assessed: **2026-09-03** (sidecar authentication and guest gateway rows;
older rows retain their prior assessment)

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
| `app/api/readings/dashaflow/route.ts` | `app/api/readings/dashaflow/route.test.ts` | Route | Auth, cache hit/miss, refresh, and engine failure handling |
| `app/api/compatibility/route.ts` | `app/api/compatibility/route.test.ts` | Route | Auth/ownership/cap, duplicate cache behavior, validated bearer sidecar call, fail-closed config, and upstream-error redaction |
| `app/api/feedback/route.ts` | — | None | Integration |
| `app/api/consultation-requests/route.ts` | — | None | Integration |
| `lib/geocode.ts` | `lib/geocode.test.ts` | Unit | Guest search asserts fixed LocationIQ EU/US and Geoapify endpoints, safe query/key encoding, provider envelope normalization, LocationIQ 404 no-result behavior, scoped IDs, one upstream call, limit five, selectable coordinates/timezone, semantic malformed-row filtering, redirect rejection, pre-parse 64 KiB response cap, eight-work cap with six-guest reservation, end-to-end deadline, cancellation both before and during a shared-cache read, local hashed cache expiry, deployed shared-cache fail-closed behavior, post-cache/coalescing daily provider admission, gated authenticated single-query reuse, and safe provider errors |
| `lib/guest-api.ts` | `lib/guest-api.test.ts` | Unit | Exact production/local origins, safe preflight, JSON media type, 4 KiB stream cap, and trusted forwarded IP |
| `lib/engines/dashaflow.ts` full chart + guest projection | `lib/engines/dashaflow.test.ts` | Unit / contract | Validated bearer destination for both operations, omitted credentials, fail-closed config, full-chart error redaction, exact projection body, strict normalized response, and transient retry guidance |
| `lib/engines/transit.ts`, `lib/engines/career.ts` | `lib/engines/legacy-sidecar-auth.test.ts` | Unit | Validated bearer destinations, omitted credentials, fail-closed config, successful response preservation, and upstream-error redaction |
| `app/api/readings/muhurtha/route.ts` | `app/api/readings/muhurtha/route.test.ts` | Route | Validated bearer destination, fail-closed config, upstream-error redaction, private/no-store response, and proof that the legacy-required birth object is synthetic and no profile birth value enters the wire request |
| `app/api/guest/places/search/route.ts` | `app/api/guest/places/search/route.test.ts` | Route | CORS, deployed activation/provider gates before side effects, query/body bounds, IP rate limit, backward-compatible attribution text plus structured label/URL metadata, no-store, safe upstream failure |
| `app/api/guest/profile/derive/route.ts` | `app/api/guest/profile/derive/route.test.ts` | Route | Deployed activation gate before side effects, exact date/time/coordinates/timezone, unknown/name rejection, direct contract, safe failures, no-store |
| `lib/deployment-environment.ts`, `lib/guest-calculation-gates.ts` | `lib/deployment-environment.test.ts`, `lib/guest-calculation-gates.test.ts` | Unit | Tri-state local/deployed/unknown classification, contradictions, local default, malformed flags, independent controls, deployed exact-`true` opt-in, unknown-runtime fail-closed |
| `lib/geocoder-config.ts`, `lib/geocode.ts` | `lib/geocoder-config.test.ts`, `lib/geocode.test.ts` | Unit | Local public default, deployed fixed-provider enum/key requirement, arbitrary-base non-use, exact LocationIQ/Geoapify request and response contracts, exact authenticated-migration gate, preservation of the deployed legacy authenticated path while off, independence from guest flags, no public fallback after activation, reserved capacity, 1 rps scheduling, duplicate coalescing, cancellation, normalized-field cache, and scheduled expiry |
| `lib/engines/dashaflow-election.ts` | `lib/engines/dashaflow-election.test.ts` | Unit / contract | Bearer credential, cookie omission, exact request, strict chart/provenance validation, order/location binding, safe failures |
| `lib/distributed-rate-limit.ts`, `lib/guest-rate-limit.ts`, `lib/authenticated-geocoder-rate-limit.ts` | corresponding limiter tests | Unit | Atomic Redis command, exact Preview/Production namespace separation before same-token HMAC, opaque transmitted keys, atomic credential pairs, TTL mapping, ordered local/shared-client-or-user/fleet budgets, one fleet key shared by guest and authenticated geocoding, local bypass, and deployed/unknown fail-closed behavior |
| `lib/geocoder-provider-budget.ts` | `lib/geocoder-provider-budget.test.ts`, `lib/geocode.test.ts` | Unit | Canonical 1–5,000 configuration bounds, atomic shared 24-hour counter with inherited deployment namespacing, exhaustion/storage failure mapping, local bypass, no charge for cache hits or duplicate callers, shared guest/auth use, and fail-closed pre-provider behavior |
| `lib/redis-rest.ts`, `lib/shared-geocode-cache.ts` | `lib/shared-geocode-cache.test.ts`, distributed/geocode tests | Unit | Complete Redis pair resolution, bounded responses/values, HMAC cache keys, fixed 24-hour expiry, normalized-field-only storage, hit/miss distinction, and fail-closed missing/malformed/unavailable behavior |
| `lib/sentry-privacy.ts`, `sentry.server.config.ts` | `lib/sentry-privacy.test.ts` | Unit / configuration | Exact geocoder endpoint suppression, default NodeFetch/Http replacement, server request-body capture disabled, and final URL/query span scrubbing |
| `lib/engines/dashaflow-config.ts` | `lib/engines/dashaflow-config.test.ts` | Unit | Server-only token bounds, HTTPS-before-credential policy, exact local IPv4/IPv6 loopback allowance, and unsafe URL rejection |
| `app/api/guest/muhurta/election-charts/route.ts` | `app/api/guest/muhurta/election-charts/route.test.ts` | Route | Exact origin and deployed activation before body/Redis/rate work, shared unavailable/TTL mapping, strict private-field rejection, minute/time-window/uniqueness bounds, direct contract, safe failures |
| `components/NavBar.tsx` | — | None | UI; manual only |
| `components/unified/tabs/*` | — | `ChartTab`, `PlanetsTab`, `TimeTab`, `IdentityStrip`, `HouseGrid` have render tests | Add coverage for `DashaTab`, `YogasTab`, `JaiminiTab` |

**Priority for first test sprint:**

1. `lib/tarabalam.ts` — pure functions, deterministic, high value (J4 depends on this).
2. `lib/astro-utils.ts` — pure functions, no mocking needed.
3. `lib/engine-error.ts` — trivial to test, good CI safety net.
4. `lib/admin.ts` — email-list parsing with edge cases.
5. `app/api/profiles/route.ts` and `app/api/profiles/[id]/route.ts` — validate auth gate, cap/missing-place checks, managed-geocoder success/failure, birth/current-location create/edit projection, timezone fields, and reading invalidation.

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
| J2-3 | Sidecar is unreachable, misconfigured, or rejects its credential | Stable availability error shown; no upstream diagnostic or blank page | Unit / manual |
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
| J3-4 | Sidecar unavailable, misconfigured, or rejects its credential | Stable private/no-store error; no upstream body is exposed | Unit / manual |
| J3-5 | Admin clears compatibility history | List resets to 0 | Manual |

---

### J4 — Auspicious Days (Tarabalam)

**Code path:** `app/api/readings/tarabalam/route.ts` → `lib/tarabalam.ts`

| # | Test | Expected | Type |
|---|---|---|---|
| J4-1 | Request Tarabalam for 7 days | Grid with Tara colour + Tithi per day | Manual |
| J4-2 | Request Tarabalam for >90 days | API returns 400 "Date range too large" | Unit / manual |
| J4-3 | Invalid date format | API returns 400 | Unit |
| J4-4 | `computeTara()` for known birth nakshatra | Returns expected Tara 1–9 | Unit |
| J4-5 | `computeTithi()` for known Moon/Sun positions | Returns expected Tithi 1–30 | Unit |
| J4-6 | Multiple profiles selected | Grid shows a column per profile | Manual |

---

### J5 — Transit Check

**Code path:** `app/api/readings/transit/route.ts` → `lib/engines/transit.ts`

| # | Test | Expected | Type |
|---|---|---|---|
| J5-1 | Admin fetches transit for a date | Planet positions grid shown | Manual |
| J5-2 | Non-admin accesses transit | Same as registered user — transit tab visible in basic view? (verify intended behaviour) | Manual |
| J5-3 | Invalid date string supplied | API returns 400 | Unit |
| J5-4 | Sidecar token/URL is missing or unsafe | No network request; stable availability error | Unit |

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
| J8-4 | Sidecar token/URL is missing or unsafe | No network request; stable private/no-store error | Unit |
| J8-5 | Valid request reaches sidecar | Bearer credential attached only after URL validation; the legacy-required birth object is fixed and synthetic, and no profile birth date/time crosses this operation | Unit |

---

### G1 — Cross-Site Guest Birth-Profile Gateway (Story #227)

**Code path:** Panchangam browser → `app/api/guest/places/search/route.ts` →
`lib/geocode.ts` → `app/api/guest/profile/derive/route.ts` →
`lib/engines/dashaflow.ts` → sidecar `/v1/profile/derive`

| # | Test | Expected | Type |
|---|---|---|---|
| G1-1 | Approved production or exact HTTP localhost/127.0.0.1/[::1] preflight | `204`; exact reflected origin; only POST/OPTIONS and Content-Type allowed; no handler side effect | Unit / route |
| G1-2 | Missing, malformed, or lookalike Origin | `403`; no CORS allow-origin header; no geocoder/sidecar/rate-limit call | Unit / route |
| G1-2a | Birth-profile flag omitted in Preview/Production, explicitly false locally, or not exact `true` when deployed | Sanitized `503`, `private, no-store`, before body parsing, rate limiting, geocoding, or sidecar access; OPTIONS remains unchanged | Unit / route |
| G1-2b | Deployed birth-profile flag is `true` but provider enum/key is absent, malformed, or unknown | Place search remains `503`; no rate or upstream call. Exactly one fixed LocationIQ/Geoapify adapter and server-only key are required | Unit / route |
| G1-3 | Submit a 2–120 character place query | At most one provider request; locally this is the policy-bounded Nominatim path. Managed paths use exact code-owned endpoints, normalize their documented envelope, and return at most five results with provider-scoped ID, label, coordinates, IANA timezone, plus attribution text and links | Unit / route |
| G1-3a | Duplicate/concurrent and distinct local place queries | Duplicate work coalesces and later hits cache; distinct provider request starts are at least one second apart process-wide | Unit |
| G1-4 | Body exceeds 4 KiB with or without Content-Length | `413` before geocoder or sidecar call | Unit / route |
| G1-5 | Per-client or route-wide fleet budget is exhausted, or shared storage is unavailable | `429` with Redis TTL for an exhausted limit; retryable `503` for unavailable enforcement; private no-store; no body/geocoder/sidecar work | Unit / route |
| G1-6 | Derivation includes `name` or any unknown field | `400`; field is not forwarded | Route |
| G1-7 | Non-calendar date, future date in the supplied birthplace timezone, non-`HH:MM` time, string/out-of-range coordinate, or unknown timezone | `400`; no sidecar call | Route |
| G1-8 | Valid exact birth input | Only after HTTPS/loopback URL and 32–256 character token validation, sidecar receives five approved fields with bearer credential; client receives direct contract v1 projection within a 12.5-second maximum retry budget | Unit / contract / route |
| G1-9 | Sidecar auth, validation, projection, timeout, or transient failure | Sanitized error only; retryable statuses include bounded `Retry-After`; raw upstream body is never read or echoed | Unit / route |
| G1-10 | Static dependency review | Guest route module graph contains no DB, NextAuth, PostHog, Sentry logging, or server profile persistence | Review |

---

### G2 — Cross-Site Guest Muhurtam Election-Chart Gateway

**Code path:** Panchangam browser →
`app/api/guest/muhurta/election-charts/route.ts` →
`lib/engines/dashaflow-election.ts` → sidecar `/v1/election-chart/derive`

| # | Test | Expected | Type |
|---|---|---|---|
| G2-1 | Approved production or exact HTTP localhost/127.0.0.1/[::1] preflight | `204`; exact reflected origin; only POST/OPTIONS and Content-Type allowed; no calculation/rate side effect | Unit / route |
| G2-1a | Election-chart flag omitted in Preview/Production, explicitly false locally, or not exact `true` when deployed | Sanitized `503`, `private, no-store`, before body parsing, local rate limiting, Redis, or sidecar access; birth-profile flag remains independent | Unit / route |
| G2-2 | Missing, malformed, lookalike Origin, body over 4 KiB, or sixth request per minute | Rejected before the sidecar; responses remain `private, no-store`; throttles include `Retry-After` | Route |
| G2-3 | Activity, profile ID/name, birth details, natal chart, nested label, or any unknown field | `400`; no field is forwarded | Route |
| G2-4 | Invalid contract/location/timezone, empty or >24 instants, non-minute/non-offset timestamp, or semantic duplicate | `400`; no sidecar call | Route |
| G2-5 | Instant older than 366 days or beyond 1,830 days | `400`; no sidecar call | Route |
| G2-6 | Valid request with inbound auth cookie | After HTTPS/loopback URL and token-bound validation, sidecar receives only contract version, location, and ordered instants with bearer auth and `credentials: omit` | Unit / contract / route |
| G2-7 | Valid sidecar response | Browser receives the unchanged v1 contract only after exact location/order, Lahiri, `mean` lunar nodes, `whole_sign`, Lagna, and canonical nine-planet validation | Unit / contract / route |
| G2-8 | Expanded, malformed, reordered, auth, timeout, or transient sidecar response | Safe `422`/`429`/`502`/`503`; bounded retry guidance; no upstream body or diagnostic leaks | Unit / route |
| G2-9 | Deployed shared client/fleet limiter missing, unavailable, or exhausted | Fail closed before body parsing or sidecar access; `503` for unavailable and `429` with Redis TTL for exhausted | Unit / route |
| G2-10 | Static dependency review | Route module graph contains no DB, NextAuth, PostHog, request logging, activity/profile/natal model, or persistence | Review |

---

## 4. Manual QA Log

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
