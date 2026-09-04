# Backlog

<!-- last-updated: 2026-09-04 -->

Tracks known bugs, deferred features, tech debt, and session decisions.

**Rule:** When you fix something here, remove it. When you find something new,
add it to the right bucket. Do not add vague or hypothetical items — only things
you are confident exist.

---

## Known Bugs

Issues that are currently broken or produce incorrect behaviour.

| # | Description | File(s) | Severity |
|---|---|---|---|
| B1 | Most authenticated and legacy route limits remain per Lambda instance. The three approval-gated Panchangam guest routes and the separately gated managed authenticated geocoder have fail-closed shared identity/fleet limits, but other routes can still be spread across instances. | `lib/rate-limit.ts`, `lib/guest-rate-limit.ts`, `lib/authenticated-geocoder-rate-limit.ts`, `lib/distributed-rate-limit.ts` | Low (current traffic is low) |
| B2 | Old `readings` rows from removed engines (`bazi`, `vedastro`, `western`, `panchangam`) sit in the DB. Never served but waste storage; could confuse queries if an engine name is reused. | Turso DB | Low |

---

## Deferred Features

Conscious decisions not to build yet. Each entry explains *why* it was deferred
so future agents don't re-open the conversation unnecessarily.

| # | Feature | Why deferred | Notes |
|---|---|---|---|
| D1 | Complete legacy sidecar authentication rollout | The Astro caller migration and sidecar enforcement change are prepared, but production enforcement is not complete until the credentialed callers deploy first and the sidecar follows with successful fixture verification. | Keep this item open through the coordinated production rollout. Roll back sidecar enforcement first if registered-user calculations fail. |
| D3 | Lead capture / email sign-up | Contact CTA is currently a `mailto:` link. | Could be wired to Resend or Formspree without backend changes. |
| D4 | Live consultation booking | Users email for a calendar link. | Cal.com or Calendly embed is the low-friction path. No DB changes needed. |
| D5 | Profile sharing (public profile links) | Profiles are private to owner + admin. | Would require a `is_public` flag on profiles and an unauthenticated route. |
| D6 | Family / relationship graph | Profiles are flat. No way to mark "this is spouse of profile X". | A `profile_relationships` join table would enable this. Tarabalam family selector is a workaround. |
| D7 | Complete global rate limiting | All three Panchangam guest routes have required fail-closed Turso-backed per-client and route-wide fleet enforcement. The managed authenticated geocoder candidate adds per-user enforcement and shares the guest-search provider fleet ceiling, but its migration flag is off. Other authenticated and legacy route limiters remain per-Lambda instance. | Migrate remaining routes deliberately with route-specific identity, bounded-write, and rollout tests. Reuse the existing Turso database and `RATE_LIMIT_HMAC_SECRET`; do not add a second shared-counter vendor by default. |
| D8 | More DashaFlow endpoints in Professional view | Sidecar exposes `evaluate_muhurtha`, deeper career details, more compatibility fields. | Check `dashaflow/__init__.py` for what's available. |
| D9 | Complete AGPL public-source release (Panchangam #231) | The owner selected the AGPL-compatible public-source path on 2026-09-04. Application and sidecar release candidates now carry AGPL licensing and exact-revision source offers, but the repositories and deployed revisions still require coordinated publication and verification. | Keep `GUEST_BIRTH_PROFILE_ENABLED` and `GUEST_ELECTION_CHART_ENABLED` off in Vercel Preview/Production until both source repositories are public, the deployed health/source links resolve to their exact commits, and #231 records that evidence. Local verification remains available. |
| D10 | Production geocoder/provider selection (Panchangam #233) | The initial candidate reuses fixed public Nominatim without a new account or key. Guest search is submit-only and one-query; guest and authenticated paths must share a Turso-backed Production provider pool, 1,000-attempt UTC-day ceiling, exclusive crash-recovery send lease with fenced normal/provider-requested cooldown, bounded process cache, identifying User-Agent, linked OSM attribution, per-user/fleet controls, a 50-search guest-client allowance per anchored 24 hours, and no arbitrary endpoint. The guest adapter fails closed unless the authenticated migration is active. Real local/Preview runtimes reject public Nominatim and use fixtures. LocationIQ/Geoapify remain inactive fixed fallbacks. Request-time limiter readiness is read-only and the WAF observation rule is staged but unpublished. | Certify provider behavior with unit, route, browser, and two-client SQL fixtures; verify linked attribution, signed-in profile parity, exact DashaFlow token pairing, and the Production limiter schema. After owner review, activate the authenticated migration with guest search and run one bounded Production smoke query. Review and publish the WAF stage separately. |

---

## Tech Debt

Things that work but are suboptimal. Prioritise when there is slack.

| # | Description | File(s) | Effort |
|---|---|---|---|
| T3 | `db.users.list()` and `db.feedback.list()` cast rows via `as unknown as T[]`. A Zod schema parse would catch DB/schema drift at runtime. | `lib/db/users.ts`, `lib/db/feedback.ts` | Medium |
| T4 | Admin panel `AdminTables.tsx` sort uses string-indexed sort with `Record<string, unknown>` cast. | `app/admin/AdminTables.tsx` | Small |
| T5 | `lib/content/loader.ts` caches markdown in memory per Lambda instance. Cold starts re-parse all 538 files. Pre-building a static JSON bundle at build time would eliminate this. | `lib/content/loader.ts` | Medium |
| T6 | ~~Five reading routes each independently implement session→profile→cache→engine→save. Extracted to `lib/engines/reading-handler.ts` `resolveProfile()` helper. Done 2026-05-19.~~ | `lib/engines/reading-handler.ts` | Done |
| T7 | All DB row casts use `as unknown as T[]` with no runtime validation. If the sidecar schema drifts, these silently return undefined fields. Add typed row-mapper functions per table. | `lib/db/*.ts` | Medium |
| T8 | Incremental migrations share one coarse `schema_version` row and infer idempotent `ALTER` completion from duplicate/already-exists errors; there is no per-step migration ledger. Add a `schema_migrations` table before the migration surface grows. | `lib/db/client.ts` | Medium |
| T9 | ~~Magic numbers consolidated into `lib/constants.ts`. Done 2026-05-19.~~ | `lib/constants.ts` | Done |
| T10 | ~~Error states added to TransitsTab and CareerTab with inline retry button. Done 2026-05-19.~~ | `components/unified/tabs/TransitsTab.tsx`, `CareerTab.tsx` | Done |
| T11 | ~~API documentation written to `docs/api.md`. Done 2026-05-19.~~ | `docs/api.md` | Done |
| T12 | ~~Batch-fetch profiles in compatibility route via `Promise.all`. Done 2026-05-19.~~ | `app/api/compatibility/route.ts` | Done |
| T13 | `AIAdminPanel` swallows AI insight fetch failures with `catch { /* silently ignore */ }` — admin sees a blank panel with no signal. Wrap in `Sentry.captureException` and surface an inline error state. Found in 2026-05-21 production audit. | `components/panels/AIAdminPanel.tsx:119` | Small |

---

## Session Decisions

Architectural and product decisions made in working sessions. Recorded here so
future agents understand the reasoning and don't relitigate resolved discussions.

| # | Date | Decision | Rationale |
|---|---|---|---|
| S1 | 2026-05-13 | Removed hardcoded admin email fallback from `lib/admin.ts` | Hardcoded credentials are a security smell. `ADMIN_EMAILS` env var is now the only source of truth. If it is unset, no one is admin. |
| S2 | 2026-05-13 | Admin `isAdmin` evaluated server-side in JWT, not in client components | Client components have no access to `process.env`. The session callback in `lib/auth.ts` now stamps `user.isAdmin` into the JWT so client components can read it without re-evaluating. |
| S3 | 2026-05-13 | Admin endpoints changed from `GET` to `POST` for state-changing operations | `GET` requests can be triggered by prefetching, browser extensions, and cached by CDNs. State mutations must be `POST`. |
| S4 | 2026-05-13 | `AppSettings` uses an explicit allowlist for writable keys | Open-ended `PATCH` to settings would allow any key to be written. Allowlist (`live_consultation_enabled`, `written_fee_paise`, `live_fee_paise`) makes the surface explicit. |
| S5 | 2026-05-13 | Rate limiter consolidated in `lib/rate-limit.ts`; `lib/security.ts` deleted | Two rate-limiter modules with similar APIs created confusion. One canonical module reduces the surface area. |
| S6 | 2026-05-13 | `DASHAFLOW_SIDECAR_URL` — removed `NEXT_PUBLIC_` prefix | The sidecar URL is a server secret (points to an internal service). `NEXT_PUBLIC_` would have bundled it into browser JS, making it publicly visible in the page source. |
| S7 | 2026-05-14 | Documentation reorganised into 9 files with a strict ceiling | More than ~8–9 docs becomes unmaintainable for a small team with multi-agent collaboration. STANDARDS.md is the new cross-agent source of truth. |
| S8 | 2026-08-29 | `https://astrochaganti.com` is the verified production custom domain | The linked Vercel project `astro-unified-core-pfni` currently serves this domain; guest Panchangam clients use its `/api/guest` routes. OAuth environment and redirect values remain separately controlled and must not be inferred from the browser API base. |
| S9 | 2026-09-03 | Every DashaFlow compute route uses one server-to-server bearer credential; only health is public | One validated destination/token resolver prevents a secret from being attached to an unsafe URL. Deploy credentialed Astro callers before turning on sidecar enforcement so registered-user calculations do not experience a cutover gap. |
| S10 | 2026-09-03 | Upstash is counter-only for geocoder controls | [Upstash's April 2025 terms](https://upstash.com/trust/terms.pdf) prohibit content containing personally sensitive information. To avoid storing birthplace-derived labels or coordinates with an external processor, Redis receives only deployment-scoped HMAC counter keys and integer values. Normalized geocoder results use a bounded, expiring process cache instead. |
| S11 | 2026-09-03 | Existing Turso supersedes the proposed Upstash dependency | S10 remains the historical data-minimization decision, but no Upstash service is required. The intended topology uses the existing Turso database to atomically store only environment-scoped HMAC identity/fleet counters and one cross-environment, non-personal provider-family quota/admission-lease row. Provider results remain process-memory-only. This removes a vendor and processor boundary while preserving fail-closed shared enforcement. Exact Preview/Production DB identity still requires pre-activation verification. |
| S12 | 2026-09-04 | Bound limiter writes with account-wide attempt caps | Guest traffic is capped at 2,000 attempts per anchored 24-hour window in Preview and 10,000 in Production; managed authenticated geocoding is capped at 500 in Preview and 2,500 in Production. A read-only preflight avoids normal row mutations after exhaustion and the capacity row is the first atomic admission mutation. Capacity remains charged after a later user/fleet/client denial so route-specific writes cannot escape the envelope. Guest place search adds a final 50-per-client anchored-24-hour row. Successful place paths may therefore write five rows and authenticated geocoding four; the 12,000 guest plus 3,000 authenticated cross-environment ceilings give 72,000 per complete set of windows. Allowing 31 independently anchored periods to touch a 30-day observation gives a conservative 2.232-million bound before cleanup and unrelated traffic. This is designed below Turso Free's published 10-million-write allowance, but current usage, deletion accounting, and remaining headroom must be measured before activation. The cold-path status reads sit outside that row-mutation calculation. Public rollout must retain read-only fail-closed readiness and the perimeter bound for rotating-source pressure. |
| S13 | 2026-09-04 | Provision limiter schema only through an explicit deployment command; retain capacity-first admission behind a staged WAF perimeter | Lazy full-schema, guest, and cleanup paths no longer call limiter DDL. They use a three-`SELECT` read-only fingerprint of the canonical table/index definitions and fail closed when objects are absent or structurally drifted; the environment-checked operator command owns one atomic DDL batch and verifies it. Exact Vercel-project and physical-database identity plus the restore point remain operator gates. The Hobby project's single WAF rate-limit rule covers `POST /api/guest/*` at 60/minute/IP, beginning with logged exceedances. Capacity-first charging is retained because it keeps a hard write ceiling and avoids a multi-row remote interactive transaction inside the two-second deadline. This explicitly accepts a bounded fail-closed availability risk from valid or rotating-source attempts after the WAF is enforcing; regional WAF counters do not replace Turso. |

---

## Product Roadmap

Near-term and medium-term feature intentions. For full context see `PRODUCT.md §7`.

### Near-term
- [ ] Publish the AGPL Astro and DashaFlow repositories, verify each deployed exact-revision source offer, and record the evidence before closing Panchangam licensing issue #231 or enabling either guest calculation route in Vercel
- [ ] Close Panchangam geocoder/provider issue #233 and configure the managed provider before enabling guest birth profiles
- [ ] Expose more DashaFlow sidecar endpoints (D8) in Professional view
- [ ] Live consultation booking via Cal.com embed (D4)
- [ ] Email notification when consultation is answered (D3 variant)

### Medium-term
- [ ] Extend the guest routes' Turso-backed shared-limit pattern to remaining routes (D7)
- [ ] Family relationship graph (D6)
- [ ] Public profile sharing (D5)

### Long-term / Under review
- [ ] Mobile-first redesign
- [ ] Payment integration (Razorpay/Stripe) for consultations

---

*Last updated: 2026-09-04*
