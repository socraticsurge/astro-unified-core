# Backlog

<!-- last-updated: 2026-07-27 -->

Tracks known bugs, deferred features, tech debt, and session decisions.

**Rule:** When you fix something here, remove it. When you find something new,
add it to the right bucket. Do not add vague or hypothetical items — only things
you are confident exist.

---

## Known Bugs

Issues that are currently broken or produce incorrect behaviour.

| # | Description | File(s) | Severity |
|---|---|---|---|
| B1 | In-memory rate limiting is per Lambda instance, not global. Rapid requests from the same user hitting different Lambda instances bypass the limit. | `lib/rate-limit.ts` | Low (current traffic is low) |
| B2 | Old `readings` rows from removed engines (`bazi`, `vedastro`, `western`, `panchangam`) sit in the DB. Never served but waste storage; could confuse queries if an engine name is reused. | Turso DB | Low |
| B3 | Production `/robots.txt` and `/sitemap.xml` remain intercepted by auth until the approved unification release. The fix is implemented and verified only in Gate 6 staging. | `proxy.ts`, `app/robots.ts`, `app/sitemap.ts` | High for SEO consolidation |

---

## Deferred Features

Conscious decisions not to build yet. Each entry explains *why* it was deferred
so future agents don't re-open the conversation unnecessarily.

| # | Feature | Why deferred | Notes |
|---|---|---|---|
| D1 | ~~Sidecar authentication as optional later hardening~~ | Superseded by Gate 3: both Python services receive birth-derived inputs and require server-to-server authentication before unified public launch. | Implement environment-specific bearer tokens, remove wildcard CORS, redact errors, and rotate independently in staging/production. |
| D2 | ~~Custom domain (`astrochaganti.com`)~~ | Completed; the apex domain serves `astro-unified-core-pfni`. | Keep OAuth, canonical URLs, and monitoring pinned to the apex domain. |
| D3 | Lead capture / email sign-up | Contact CTA is currently a `mailto:` link. | Could be wired to Resend or Formspree without backend changes. |
| D4 | Live consultation booking | Users email for a calendar link. | Cal.com or Calendly embed is the low-friction path. No DB changes needed. |
| D5 | Profile sharing (public profile links) | Profiles are private to owner + admin. | Would require a `is_public` flag on profiles and an unauthenticated route. |
| D6 | Family / relationship graph | Profiles are flat. No way to mark "this is spouse of profile X". | A `profile_relationships` join table would enable this. Tarabalam family selector is a workaround. |
| D7 | Global rate limiting | Current limiters are per-Lambda instance. | Requires Upstash Redis + one env var (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`). Drop-in swap in `lib/rate-limit.ts`. |
| D8 | More DashaFlow endpoints in Professional view | Sidecar exposes `evaluate_muhurtha`, deeper career details, more compatibility fields. | Check `dashaflow/__init__.py` for what's available. |
| D9 | Animated daily-transit hero visualization | The Gate 6 orbital hero is directionally approved but can carry richer live detail. | Evaluate a server-rendered DashaFlow daily-transit projection during Gate 7; require a lightweight fallback, no direct browser-side sidecar call, and no material LCP regression before adopting it. |
| D10 | Chart-specific functional benefic/malefic classification | DashaFlow 1.1 does not return this classification in the natal chart response, and dignity is not an adequate substitute. | Add it only as a documented engine output with fixtures and provenance; never infer it in the frontend. |
| D11 | Broader career challenge and trade-off evidence | DashaFlow 1.1 can return a Dusthana 10th-lord challenge or a retrograde 10th-house complexity, but does not provide a comprehensive adverse professional-influence model. | Extend the versioned career engine contract with explicit typed factors and fixtures; keep the frontend honest about absent factors and never infer them from D10 placements alone. |

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
| T14 | **Resolved for stable Gate 7 staging:** fresh `astro-unified-staging` Turso DB, guarded schema/seed commands and synthetic fixtures. Existing generic previews may still share production credentials and remain outside authenticated acceptance. | Vercel env / `scripts/*staging*.ts` | Stable staging resolved; preview cleanup remains |
| T15 | The source declaration is aligned to Node 24 and verified in Gate 6 staging, but production will not consume it until an approved release deployment. | `package.json`, Vercel project settings | Release follow-through |
| T16 | The public DashaFlow sidecar has wildcard CORS, no authentication/rate limit, and returns raw exception text while accepting birth data. Define the computation-service security boundary before adding Panchangam traffic. | `dashaflow-sidecar/api/index.py` | Medium |
| T17 | The older Vercel `astrochaganti` project has no documented current role or retirement state. Prove it has no traffic/dependencies before any cleanup. | Vercel project inventory | Small |
| T19 | Authenticated Muhurtha currently calls DashaFlow's six-activity approximation while Telugu Calendar Utilities has the richer 30-activity explainable scorer. Migrate through the versioned Telugu API and keep `/api/readings/muhurtha` as a compatibility route until clients move. | `app/api/readings/muhurtha/route.ts`, `dashaflow-sidecar/api/index.py` | Medium |
| T20 | New tables are currently created or migrated during request-time `ensureSchema()`. Unification tables need an explicit recorded migration command and expand/migrate/contract release sequence. | `lib/db/client.ts` | Medium |
| T21 | **Resolved for the Gate 9 landing page:** removed the forced hero break, added balanced/pretty wrapping, restored the branded shell and verified desktop/phone layouts without overflow. Continue the same editorial standard as deeper public pages are added. | `components/public/UnifiedPublicHome.tsx`, `UnifiedPublicHome.module.css` | Landing resolved; ongoing standard |
| T22 | **Resolved for Gate 8:** the owner approved fail-closed synthetic staging auth as the no-Google-OAuth rehearsal path. The production callback/domain is unchanged; Gate 9 still requires a live Google sign-in smoke test before release approval. | `lib/staging-auth.ts` + Gate 9 runbook | Resolved |
| T23 | **Manual recovery resolved 2026-07-22:** production delete protection is on; a dated owner-only export passed integrity and exact aggregate parity after a disposable Turso restore. Add a second encrypted storage location as an operational follow-up. | Turso dashboard + `docs/RUNBOOK.md` | Manual blocker resolved |
| T24 | **Resolved 2026-07-22:** deployed the reviewed API to isolated `telugu-calendar-api-production` with a fresh sensitive shared secret; health, auth and daily contract checks pass. The unaliased Astro candidate consumes the matching URL/token; public traffic remains unchanged. | TCU Vercel project + Gate 9 runbook | Resolved |
| T25 | **Resolved:** public `/images/*` assets were redirected by the auth proxy. Explicit public-asset routing and 11 regression cases now protect portraits/editorial assets while keeping dashboard, profiles, admin and consultation private. | `proxy.ts`, `proxy.test.ts` | Resolved |
| T26 | Native Turso PITR is not operationally proven: the CLI reports the `starter` plan and two timestamped clone attempts returned `internal server error`, with no partial database created. Use the proven manual recovery image for Gate 9; confirm entitlement/repair with Turso before claiming native PITR. | Turso support/dashboard + `docs/RUNBOOK.md` | External operational gap |
| T27 | The isolated local/staging review graph has no `GOOGLE_GEMINI_API_KEY`, so stale Today/Natal narratives cannot be regenerated there. The dashboard now degrades safely and keeps deterministic chart/timing content visible, but a dedicated non-production key is required before claiming full AI-narrative acceptance. | Vercel staging env + `app/api/readings/today-reading` | Small operational gap |

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
| S8 | 2026-07-22 | Unification follows migration-before-retirement with eleven owner approval gates | Existing users, feeds, SEO, and services stay live until isolated staging, parity, rehearsal, stabilization, and a separate retirement approval are complete. |
| S9 | 2026-07-22 | Public Muhurtam remains a useful calculator; sign-in adds saved-profile and deeper chart validation | The existing public utility remains valuable and becomes a natural, honest invitation to create a profile instead of being hidden behind authentication. |
| S10 | 2026-07-22 | Admin is a protected first-class unification workstream | Existing controls are preserved and reorganised; Gate 7 adds operations/publishing visibility and auditability without introducing impersonation or casual production-source switches. |
| S11 | 2026-07-22 | Gate 4 visual direction is approved, with detailed refinement deferred to implementation | The prototype establishes the desired character, hierarchy, public/private language, and admin direction; spacing, copy, content, and interaction details will be reviewed on real staging journeys rather than freezing a static mockup. |
| S12 | 2026-07-27 | Signed-in Muhurtam preserves a participant-free general calculation before optional saved-profile validation | The 14-day maximum is an engine contract, not a static-site artifact. General and personal modes use the same canonical search; only personal mode adds anonymous derived participant contexts. |
| S13 | 2026-07-27 | Signed-in Tarabalam uses the canonical exact Drik service and exposes three Chandrabalam policies | The engine owns the group verdict. The browser explains and presents Classic, exclude-cautions, and strict policies without recomputing them or transmitting profile identity and birth details. |

---

## Product Roadmap

Near-term and medium-term feature intentions. For full context see `PRODUCT.md §7`.

### Near-term
- [ ] Expose more DashaFlow sidecar endpoints (D8) in Professional view
- [ ] Live consultation booking via Cal.com embed (D4)
- [ ] Email notification when consultation is answered (D3 variant)

### Medium-term
- [ ] Global rate limiting via Upstash Redis (D7)
- [ ] Family relationship graph (D6)
- [ ] Public profile sharing (D5)

### Long-term / Under review
- [ ] Custom domain — `astrochaganti.com` (D2)
- [ ] Mobile-first redesign
- [ ] Payment integration (Razorpay/Stripe) for consultations

---

*Last updated: 2026-07-22*
