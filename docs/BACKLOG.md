# Backlog

Tracks known bugs, deferred features, and tech debt.  
**Rule:** When you fix something here, remove it. When you find something new, add it to the right bucket.  
**Do not** add items that are vague or hypothetical — only things you are confident exist.

---

## Known Bugs

Issues that are currently broken or produce incorrect behaviour.

| # | Description | File(s) | Severity |
|---|---|---|---|
| B1 | In-memory rate limiting is per Lambda instance, not global. Rapid requests from the same user hitting different Lambda instances bypass the limit. | `lib/rate-limit.ts` | Low (current traffic is low) |
| B2 | Old `readings` rows from removed engines (`bazi`, `vedastro`, `western`, `panchangam`) sit in the DB. They are never served but waste storage and can confuse queries if an engine name is reused. | Turso DB | Low |

---

## Deferred Features

Conscious decisions not to build yet. Each entry explains *why* it was deferred
so future agents don't re-open the conversation unnecessarily.

| # | Feature | Why deferred | Notes |
|---|---|---|---|
| D1 | Sidecar authentication | Low risk — sidecar is stateless, read-only, no PII stored. Anyone with the URL can POST birth data. | Add a shared-secret header (`X-Sidecar-Secret`) in `lib/engines/*.ts` and validate in the Python sidecar when traffic grows or the sidecar goes public. |
| D2 | Custom domain (`astrochaganti.com` or similar) | Using `astro-unified-core-pfni.vercel.app` for now. | Must update `NEXTAUTH_URL` env var and Google OAuth redirect URIs when switching. See `docs/PROJECT.md` for the exact pitfall. |
| D3 | Lead capture / email sign-up | Contact CTA currently a `mailto:` link. | Could be wired to a simple form + Resend or Formspree without backend changes. |
| D4 | Payment / appointment booking | Users email for a calendar link. | Cal.com or Calendly embed is the low-friction path. No DB changes needed. |
| D5 | Profile sharing (public profile links) | Profiles are private to owner + admin. | Would require a `is_public` flag on profiles and an unauthenticated route. |
| D6 | Family / relationship graph | Profiles are flat. No way to mark "this profile is spouse of profile X". | A `profile_relationships` join table would enable this. Tarabalam family selector is a workaround for now. |
| D7 | Global rate limiting | Current limiters are per-Lambda instance. | Requires Upstash Redis + one env var (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`). Drop-in swap in `lib/rate-limit.ts`. |
| D8 | More DashaFlow endpoints surfaced | Sidecar exposes `evaluate_muhurtha`, deeper career details, more compatibility fields. | The sidecar Python package is the source of truth — check `dashaflow/__init__.py` for what's available. |

---

## Tech Debt

Things that work but are suboptimal. Prioritise these when there is slack.

| # | Description | File(s) | Effort |
|---|---|---|---|
| T1 | `scratch_test_rate_limit.ts` lives in the project root. It's a dev scratch file, not a test. | `scratch_test_rate_limit.ts` | Trivial — delete or move to a `scripts/` directory. |
| T2 | `proxy.ts` is the NextAuth middleware but lives at root with a non-standard name. Next.js convention is `middleware.ts`. | `proxy.ts` | Small — rename + update any references. |
| T3 | `db.users.list()` and `db.feedback.list()` still cast rows to typed arrays via `as unknown as T[]`. Correct but not self-verifying. A proper Zod schema parse would catch DB/schema drift at runtime. | `lib/db/users.ts`, `lib/db/feedback.ts` | Medium |
| T4 | Admin panel `AdminTables.tsx` uses string-indexed sort with a `Record<string, unknown>` cast. A typed sort key union would be safer. | `app/admin/AdminTables.tsx` | Small |
| T5 | `lib/content/loader.ts` caches markdown in memory per Lambda instance. Cold starts on Vercel re-parse all 538 files. Pre-building a static JSON bundle at build time would eliminate this. | `lib/content/loader.ts` | Medium |

---

*Last updated: 2026-05-13*
