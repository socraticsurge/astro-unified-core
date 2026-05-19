# Astro Chaganti — Testing Log & Coverage

<!-- last-updated: 2026-05-14 -->

> This file tracks: (1) test coverage status per module, (2) how to run tests,
> (3) a manual QA log, and (4) test plans linked to the user journey traces in
> `PRODUCT.md`. Journey IDs (J1–J8) correspond to the numbered journeys there.

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
| `components/unified/tabs/*` | — | `ChartTab`, `PlanetsTab`, `TimeTab`, `IdentityStrip`, `HouseGrid` have render tests | Add coverage for `DashaTab`, `YogasTab`, `JaiminiTab` |

**Priority for first test sprint:**

1. `lib/tarabalam.ts` — pure functions, deterministic, high value (J4 depends on this).
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
