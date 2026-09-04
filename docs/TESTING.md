# Astro Chaganti — Testing Log & Coverage

<!-- last-updated: 2026-09-04 -->

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

Last assessed: **2026-09-04** (Turso safeguards, sidecar, and guest gateway rows;
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
| `app/api/profiles/route.ts`, `app/api/profiles/[id]/route.ts` | corresponding route tests | Route | Authentication/ownership, profile cap, birth and current-location geocoding, provider `429`/`503` retry semantics, create/update behavior, and no writes after geocoder failure |
| `app/api/readings/dashaflow/route.ts` | `app/api/readings/dashaflow/route.test.ts` | Route | Auth, cache hit/miss, refresh, and engine failure handling |
| `app/api/compatibility/route.ts` | `app/api/compatibility/route.test.ts` | Route | Auth/ownership/cap, duplicate cache behavior, validated bearer sidecar call, fail-closed config, and upstream-error redaction |
| `app/api/feedback/route.ts` | — | None | Integration |
| `app/api/consultation-requests/route.ts` | — | None | Integration |
| `lib/geocode.ts` | `lib/geocode.test.ts` | Unit | Guest search asserts fixed public Nominatim, LocationIQ EU/US, and Geoapify endpoints; identifying User-Agent; key/no-key policy; safe query encoding; provider normalization; scoped IDs; one upstream call; limit five; coordinates/timezone; malformed-row filtering; redirect rejection; 64 KiB response cap; bounded concurrency/deadline/cancellation/cache; shared admission; authenticated reuse; and safe errors |
| `lib/guest-api.ts` | `lib/guest-api.test.ts` | Unit | Exact production/local origins, safe preflight, JSON media type, 4 KiB stream cap, and trusted forwarded IP |
| `lib/engines/dashaflow.ts` full chart + guest projection | `lib/engines/dashaflow.test.ts` | Unit / contract | Validated bearer destination for both operations, omitted credentials, fail-closed config, full-chart error redaction, exact projection body, strict normalized response, and transient retry guidance |
| `lib/engines/transit.ts`, `lib/engines/career.ts` | `lib/engines/legacy-sidecar-auth.test.ts` | Unit | Validated bearer destinations, omitted credentials, fail-closed config, successful response preservation, and upstream-error redaction |
| `app/api/readings/muhurtha/route.ts` | `app/api/readings/muhurtha/route.test.ts` | Route | Validated bearer destination, fail-closed config, upstream-error redaction, private/no-store response, and proof that the legacy-required birth object is synthetic and no profile birth value enters the wire request |
| `app/api/guest/places/search/route.ts` | `app/api/guest/places/search/route.test.ts` | Route | CORS, deployed activation/provider gates before side effects, query/body bounds, IP rate limit, backward-compatible attribution text plus structured label/URL metadata, no-store, safe upstream failure |
| `app/api/guest/profile/derive/route.ts` | `app/api/guest/profile/derive/route.test.ts` | Route | Deployed activation gate before side effects, exact date/time/coordinates/timezone, unknown/name rejection, direct contract, safe failures, no-store |
| `lib/deployment-environment.ts`, `lib/guest-calculation-gates.ts` | `lib/deployment-environment.test.ts`, `lib/guest-calculation-gates.test.ts` | Unit | Tri-state local/deployed/unknown classification, contradictions, local default, malformed flags, independent controls, deployed exact-`true` opt-in, unknown-runtime fail-closed |
| `lib/geocoder-config.ts`, `lib/geocode.ts` | `lib/geocoder-config.test.ts`, `lib/geocode.test.ts` | Unit | Fixture-only local/Preview public-Nominatim posture, Production fixed-provider selection, keyless public Nominatim, keyed commercial adapters, arbitrary-base non-use, exact authenticated-migration coupling, shared guest/auth admission, exclusive lease completion and late-lease discard, duplicate coalescing, cancellation, normalized-field cache, and expiry |
| `lib/engines/dashaflow-election.ts` | `lib/engines/dashaflow-election.test.ts` | Unit / contract | Bearer credential, cookie omission, exact request, strict chart/provenance validation, order/location binding, safe failures |
| `lib/distributed-rate-limit.ts`, `lib/guest-rate-limit.ts`, `lib/authenticated-geocoder-rate-limit.ts` | corresponding limiter tests | Unit | Atomic conditional SQLite upserts, database-clock decisions, exact Preview/Production namespace separation before HMAC, opaque stored keys, no mutation on normal denial, read-only capacity preflight plus first atomic race-safe reservation, conservative capacity charging after downstream denial, guest caps of 2,000 Preview / 10,000 Production, a provider-bound 50-per-anchored-24-hour guest place-client allowance that does not charge invalid requests, warm cache hits, or coalesced callers, authenticated-geocoder caps of 500 Preview / 2,500 Production, two-client file-backed concurrency, fleet-first guest write bounds, ordered authenticated user/fleet budgets, one 30/minute fleet key shared by guest and authenticated geocoding, one shared two-second signal across each route guard plus a separate bounded signal for the provider-bound client reservation, no SQL dispatch after abort, safe late settlement, local bypass, bounded per-operation storage timeout, and deployed/unknown fail-closed behavior |
| `lib/geocoder-provider-budget.ts` | `lib/geocoder-provider-budget.test.ts`, `lib/distributed-rate-limit.test.ts`, `lib/geocode.test.ts` | Unit | Canonical 1–1,000 public-Nominatim and 1–1,500 commercial bounds persisted per UTC day, atomic UTC-day counting, public-Nominatim exclusive crash lease, fenced normal cooldown, bounded numeric/HTTP-date provider `Retry-After` shared through exact-fence completion, commercial provider-family admission, stale-completion safety, no identity material, daily/lease versus storage-failure mapping, fixture-only non-Production public Nominatim, cache/coalescing behavior, shared guest/auth use, safe `429`/`503`, and fail-closed pre-fetch behavior |
| `lib/db/rate-limit-maintenance.ts` | `lib/db/rate-limit-maintenance.test.ts`, landing cron route tests | Unit / route | Indexed 5,000-row expired-row batches, 100,000-row maximum, input bounds, schema readiness, 2.5-second per-operation and 10-second wall budgets, authenticated invocation through `after()` after the landing response, backlog reporting, and bounded best-effort failure handling |
| `lib/sentry-privacy.ts`, `sentry.server.config.ts` | `lib/sentry-privacy.test.ts` | Unit / configuration | Exact geocoder endpoint suppression, default NodeFetch/Http replacement, server request-body capture disabled, and final URL/query span scrubbing |
| `lib/engines/dashaflow-config.ts` | `lib/engines/dashaflow-config.test.ts` | Unit | Server-only token bounds, HTTPS-before-credential policy, exact local IPv4/IPv6 loopback allowance, and unsafe URL rejection |
| `app/api/guest/muhurta/election-charts/route.ts` | `app/api/guest/muhurta/election-charts/route.test.ts` | Route | Exact origin and deployed activation before body/Turso-limiter work, shared unavailable/expiry mapping, strict private-field rejection, minute/time-window/uniqueness bounds, direct contract, safe failures |
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
| G1-2b | Deployed birth-profile flag is `true` but provider configuration is absent, malformed, unknown, unsafe for the environment, or split from authenticated traffic | Place search remains `503`; no rate or upstream call. `nominatim-public` must be keyless, Production-only, and coupled to the authenticated migration; LocationIQ/Geoapify require a valid server-only key | Unit / route |
| G1-3 | Submit a 2–120 character place query | At most one provider request; public Nominatim uses its fixed endpoint, identifying User-Agent, shared lease, cache, and linked attribution. All adapters return at most five normalized results with ID, label, coordinates, and IANA timezone | Unit / route |
| G1-3a | Duplicate/concurrent and distinct provider queries | Duplicate work coalesces and later hits cache. Public-Nominatim misses acquire one exclusive Production lease, hold it through provider completion, and release into a 1,100 ms cooldown or bounded provider `Retry-After`; a late lease cannot dispatch and a stale release cannot shorten a newer lease or shared pause. Real local/Preview public calls fail closed | Unit / two-client SQL |
| G1-3b | Invalid guest query, warm cache hit, or coalesced duplicate | No provider-bound 50-per-24-hour client reservation and no UTC-day provider reservation; only a valid cache miss is charged immediately before managed-provider admission | Unit / route |
| G1-4 | Body exceeds 4 KiB with or without Content-Length | `413` before geocoder or sidecar call | Unit / route |
| G1-5 | Per-client minute limit, 50-search anchored-24-hour guest allowance, 30/minute route-wide fleet, daily admission cap, provider admission lease, or UTC-day provider budget is exhausted, or shared storage is unavailable | Normal exhaustion returns `429` with `Retry-After`; unavailable Turso enforcement returns retryable `503`; responses are private/no-store and blocked work does not reach the provider or sidecar | Unit / route |
| G1-5b | Any stage of a deployed guest/auth guard chain exceeds the shared two-second deadline or the caller cancels during storage | Retryable `503`; the same signal reaches every stage; no later SQL starts; a late already-dispatched write is handled and may remain conservatively charged; no provider or sidecar call | Unit / route |
| G1-5c | Fresh process probes a complete, missing, or drifted limiter schema | Exactly one shared read-mode batch containing only three `SELECT` statements; complete canonical `sqlite_schema` table/index definitions are memoized, while missing or incompatible columns, keys, constraints, `WITHOUT ROWID`, and index definitions fail closed before limiter SQL. No `CREATE`, `ALTER`, `DROP`, index DDL, or repair runs from guest or cleanup paths | Unit / SQL contract |
| G1-5d | Operator provisions limiter objects for an exact Preview/Production target | Command refuses missing/mismatched target, non-remote URL, or missing token; accepted run performs one atomic write-mode DDL batch and then the read-only verification. Lazy `ensureSchema()` never provisions these objects | Unit / operator integration |
| G1-5e | Many cold instances, rotating client identities, one-account authenticated fanout, exhausted capacity, or unavailable Turso | Readiness remains read-only; rotated guests are bounded by fleet/capacity, authenticated fanout by user/fleet/capacity, exhausted capacity starts no later write, and unavailable storage fails closed within the shared deadline | Unit / adversarial simulation |
| G1-5f | Vercel WAF guest rule staged, then exercised in log and Preview-enforced modes | Only `POST /api/guest/*` matches; OPTIONS and non-guest paths do not. Exceeding 60 requests in one 60-second regional/IP window is first observed without blocking, then returns edge `429` in Preview without a function/Turso invocation | Preview / metrics / manual |
| G1-5a | Managed provider returns HTTP `429`, timeout, transport error, malformed/oversized payload, or `5xx` | Provider `429` is sanitized to app `429` with a bounded `Retry-After`; all listed transient/unavailable failures return sanitized retryable `503`; no provider URL, key, query, or response body leaks | Unit / route |
| G1-6 | Derivation includes `name` or any unknown field | `400`; field is not forwarded | Route |
| G1-7 | Non-calendar date, future date in the supplied birthplace timezone, non-`HH:MM` time, string/out-of-range coordinate, or unknown timezone | `400`; no sidecar call | Route |
| G1-8 | Valid exact birth input | Only after HTTPS/loopback URL and 32–256 character token validation, sidecar receives five approved fields with bearer credential; client receives direct contract v1 projection within a 12.5-second maximum retry budget | Unit / contract / route |
| G1-9 | Sidecar auth, validation, projection, timeout, or transient failure | Sanitized error only; retryable statuses include bounded `Retry-After`; raw upstream body is never read or echoed | Unit / route |
| G1-10 | Static dependency review | Guest route module graph contains no NextAuth, account-profile table access, PostHog, Sentry request logging, or server profile persistence; its only Turso dependency is the dedicated limiter boundary | Review |

---

### G2 — Cross-Site Guest Muhurtam Election-Chart Gateway

**Code path:** Panchangam browser →
`app/api/guest/muhurta/election-charts/route.ts` →
`lib/engines/dashaflow-election.ts` → sidecar `/v1/election-chart/derive`

| # | Test | Expected | Type |
|---|---|---|---|
| G2-1 | Approved production or exact HTTP localhost/127.0.0.1/[::1] preflight | `204`; exact reflected origin; only POST/OPTIONS and Content-Type allowed; no calculation/rate side effect | Unit / route |
| G2-1a | Election-chart flag omitted in Preview/Production, explicitly false locally, or not exact `true` when deployed | Sanitized `503`, `private, no-store`, before body parsing, local rate limiting, Turso limiter access, or sidecar access; birth-profile flag remains independent | Unit / route |
| G2-2 | Missing, malformed, lookalike Origin, body over 4 KiB, or sixth request per minute | Rejected before the sidecar; responses remain `private, no-store`; throttles include `Retry-After` | Route |
| G2-3 | Activity, profile ID/name, birth details, natal chart, nested label, or any unknown field | `400`; no field is forwarded | Route |
| G2-4 | Invalid contract/location/timezone, empty or >24 instants, non-minute/non-offset timestamp, or semantic duplicate | `400`; no sidecar call | Route |
| G2-5 | Instant older than 366 days or beyond 1,830 days | `400`; no sidecar call | Route |
| G2-6 | Valid request with inbound auth cookie | After HTTPS/loopback URL and token-bound validation, sidecar receives only contract version, location, and ordered instants with bearer auth and `credentials: omit` | Unit / contract / route |
| G2-7 | Valid sidecar response | Browser receives the unchanged v1 contract only after exact location/order, Lahiri, `mean` lunar nodes, `whole_sign`, Lagna, and canonical nine-planet validation | Unit / contract / route |
| G2-8 | Expanded, malformed, reordered, auth, timeout, or transient sidecar response | Safe `422`/`429`/`502`/`503`; bounded retry guidance; no upstream body or diagnostic leaks | Unit / route |
| G2-9 | Deployed shared client/fleet limiter missing, unavailable, or exhausted | Fail closed before body parsing or sidecar access; `503` for unavailable and `429` with limiter-expiry retry guidance for exhausted | Unit / route |
| G2-10 | Static dependency review | Route module graph contains no NextAuth, account-profile table access, PostHog, request logging, activity/profile/natal model, or result persistence; its only Turso dependency is the dedicated limiter boundary | Review |

Before recording either guest journey as release-ready, attach evidence that
the active environment points to its intended physical Turso database, record
current Turso usage and quota headroom, record the selected provider policy and
application identity, and run provider `429`/transient-error cases against
fixtures in Preview. Public Nominatim itself is rejected outside Production;
its release evidence must cover two-client exclusivity, late acquire, provider
failure, fenced release, cooldown, and crash expiry before one bounded
Production smoke query.
Also record the deployment-controlled limiter DDL run, verify zero request-time
DDL in Turso logs, publish and observe the WAF in log mode, and attach Preview
evidence that the edge `429` occurs without a corresponding function/Turso hit.
Because WAF counters are per region and IPs can rotate, retain the Turso caps and
record explicit acceptance of bounded capacity-pool exhaustion as an
availability risk rather than claiming a globally strict edge ceiling.

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
