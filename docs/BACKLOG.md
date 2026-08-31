# Backlog

<!-- last-updated: 2026-08-31 -->

Tracks known bugs, deferred features, tech debt, and session decisions.

**Rule:** When you fix something here, remove it. When you find something new,
add it to the right bucket. Do not add vague or hypothetical items — only things
you are confident exist.

---

## Known Bugs

Issues that are currently broken or produce incorrect behaviour.

| # | Description | File(s) | Severity |
|---|---|---|---|
| B1 | Most in-memory rate limits are per Lambda instance, not global. Rapid requests hitting different instances can bypass those limits; the election-chart guest route is already protected by its additional fail-closed Upstash layer. | `lib/rate-limit.ts`, `lib/distributed-rate-limit.ts` | Low (current traffic is low) |
| B2 | Old `readings` rows from removed engines (`bazi`, `vedastro`, `western`, `panchangam`) sit in the DB. Never served but waste storage; could confuse queries if an engine name is reused. | Turso DB | Low |

---

## Deferred Features

Conscious decisions not to build yet. Each entry explains *why* it was deferred
so future agents don't re-open the conversation unnecessarily.

| # | Feature | Why deferred | Notes |
|---|---|---|---|
| D1 | Legacy sidecar authentication | The versioned `/v1/profile/derive` and `/v1/election-chart/derive` operations are bearer-authenticated as of 2026-08-29; legacy `/calculate` and other registered-user operations remain unchanged for rollout compatibility. | Coordinate a separate migration before requiring credentials on legacy callers. Do not treat the protected guest projections as protection for every sidecar route. |
| D3 | Lead capture / email sign-up | Contact CTA is currently a `mailto:` link. | Could be wired to Resend or Formspree without backend changes. |
| D4 | Live consultation booking | Users email for a calendar link. | Cal.com or Calendly embed is the low-friction path. No DB changes needed. |
| D5 | Profile sharing (public profile links) | Profiles are private to owner + admin. | Would require a `is_public` flag on profiles and an unauthenticated route. |
| D6 | Family / relationship graph | Profiles are flat. No way to mark "this is spouse of profile X". | A `profile_relationships` join table would enable this. Tarabalam family selector is a workaround. |
| D7 | Complete global rate limiting | The election-chart guest route has required fail-closed Upstash enforcement; other route limiters remain per-Lambda instance. | Generalize the proven helper and migrate remaining routes with route-specific rollout tests. Requires `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. |
| D8 | More DashaFlow endpoints in Professional view | Sidecar exposes `evaluate_muhurtha`, deeper career details, more compatibility fields. | Check `dashaflow/__init__.py` for what's available. |
| D9 | Guest Swiss Ephemeris production clearance (Panchangam #231) | Distribution/public-service licensing for the Swiss Ephemeris dependency is not yet recorded as resolved. | Keep `GUEST_BIRTH_PROFILE_ENABLED` and `GUEST_ELECTION_CHART_ENABLED` off in Vercel Preview/Production until the owner closes #231 with the selected license path. Local verification remains available. |
| D10 | Production geocoder/provider selection (Panchangam #233) | The public Nominatim endpoint is suitable only for the rate-limited local workflow, not this public service traffic. | Select and approve a managed provider, then configure server-only `GEOCODER_BASE_URL` and `GEOCODER_USER_AGENT`. Production code rejects the public Nominatim host even when the birth-profile flag is enabled. |

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
| T8 | Schema migrations use `try { ALTER TABLE } catch {}` — no record of which columns are applied on which DB. Add a `schema_migrations` table to track applied versions. | `lib/db/client.ts` | Medium |
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

---

## Product Roadmap

Near-term and medium-term feature intentions. For full context see `PRODUCT.md §7`.

### Near-term
- [ ] Close Panchangam licensing issue #231 before enabling either guest calculation route in Vercel
- [ ] Close Panchangam geocoder/provider issue #233 and configure the managed provider before enabling guest birth profiles
- [ ] Expose more DashaFlow sidecar endpoints (D8) in Professional view
- [ ] Live consultation booking via Cal.com embed (D4)
- [ ] Email notification when consultation is answered (D3 variant)

### Medium-term
- [ ] Extend the election route's Upstash enforcement to remaining routes (D7)
- [ ] Family relationship graph (D6)
- [ ] Public profile sharing (D5)

### Long-term / Under review
- [ ] Mobile-first redesign
- [ ] Payment integration (Razorpay/Stripe) for consultations

---

*Last updated: 2026-08-31*
