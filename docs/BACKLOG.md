# Backlog

<!-- last-updated: 2026-05-14 -->

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

---

## Deferred Features

Conscious decisions not to build yet. Each entry explains *why* it was deferred
so future agents don't re-open the conversation unnecessarily.

| # | Feature | Why deferred | Notes |
|---|---|---|---|
| D1 | Sidecar authentication | Low risk — sidecar is stateless, read-only, no PII stored. | Add a shared-secret header (`X-Sidecar-Secret`) in `lib/engines/*.ts` and validate in Python sidecar when traffic grows. |
| D2 | Custom domain (`astrochaganti.com`) | Using `astro-unified-core-pfni.vercel.app` for now. | Must update `NEXTAUTH_URL` env var and Google OAuth redirect URIs when switching. |
| D3 | Lead capture / email sign-up | Contact CTA is currently a `mailto:` link. | Could be wired to Resend or Formspree without backend changes. |
| D4 | Live consultation booking | Users email for a calendar link. | Cal.com or Calendly embed is the low-friction path. No DB changes needed. |
| D5 | Profile sharing (public profile links) | Profiles are private to owner + admin. | Would require a `is_public` flag on profiles and an unauthenticated route. |
| D6 | Family / relationship graph | Profiles are flat. No way to mark "this is spouse of profile X". | A `profile_relationships` join table would enable this. Tarabalam family selector is a workaround. |
| D7 | Global rate limiting | Current limiters are per-Lambda instance. | Requires Upstash Redis + one env var (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`). Drop-in swap in `lib/rate-limit.ts`. |
| D8 | More DashaFlow endpoints in Professional view | Sidecar exposes `evaluate_muhurtha`, deeper career details, more compatibility fields. | Check `dashaflow/__init__.py` for what's available. |

---

## Tech Debt

Things that work but are suboptimal. Prioritise when there is slack.

| # | Description | File(s) | Effort |
|---|---|---|---|
| T1 | `scratch_test_rate_limit.ts` in project root. Dev scratch file, not a real test. | `scratch_test_rate_limit.ts` | Trivial — delete or move to `scripts/` |
| T2 | `proxy.ts` is the NextAuth middleware but uses a non-standard name. Next.js convention is `middleware.ts`. | `proxy.ts` | Small — rename + update any references |
| T3 | `db.users.list()` and `db.feedback.list()` cast rows via `as unknown as T[]`. A Zod schema parse would catch DB/schema drift at runtime. | `lib/db/users.ts`, `lib/db/feedback.ts` | Medium |
| T4 | Admin panel `AdminTables.tsx` sort uses string-indexed sort with `Record<string, unknown>` cast. | `app/admin/AdminTables.tsx` | Small |
| T5 | `lib/content/loader.ts` caches markdown in memory per Lambda instance. Cold starts re-parse all 538 files. Pre-building a static JSON bundle at build time would eliminate this. | `lib/content/loader.ts` | Medium |

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

*Last updated: 2026-05-14*
