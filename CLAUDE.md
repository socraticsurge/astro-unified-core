@AGENTS.md

---

# Astro Chaganti — Agent Brief

> Read this file first. It tells you where everything is, what matters, and
> what you are required to maintain. All rules here apply to every agent
> working on this project.

---

## Project in one paragraph

Astro Chaganti is a Vedic astrology web application. Authenticated users
create birth profiles, view full 17-section Vedic charts, run marriage
compatibility checks (Ashtakoota Milan), and explore dashas, transits,
career analysis, and Tarabalam (auspicious-day calendar). An admin tier
unlocks professional views with deeper analysis. All heavy astronomical
computation runs in a separate Python sidecar
(`https://dashaflow-sidecar.vercel.app`). The main app handles auth, DB,
caching, and UI. Stack: Next.js 16 (App Router), NextAuth v4, Turso (libSQL),
Tailwind v4, shadcn/ui. Deployed on Vercel.

---

## User types (always design and test against all three)

| Type | Access | Key restrictions |
|---|---|---|
| **Guest** | Landing page, `/privacy`, `/terms` only | No session; all `/dashboard`, `/profiles`, `/compatibility` routes redirect to `/auth/signin` |
| **Registered User** | Full app — create profiles (max 10), view charts, run compatibility (max 6 checks) | Scoped to own data; cannot see other users' profiles or checks |
| **Admin** | Everything + admin panel, Professional view on all profiles and compatibility checks, can view any user's data, can trigger sidecar backfill, can clear compatibility history | Defined by `ADMIN_EMAILS` env var; currently `cvk.atreya@gmail.com`, `astrochaganti@gmail.com` |

---

## Five files that explain the most

1. [`lib/db/index.ts`](lib/db/index.ts) + siblings in `lib/db/` — the full data
   model; every table, type, and query lives here.
2. [`app/profiles/[id]/ProfileDetailClient.tsx`](app/profiles/%5Bid%5D/ProfileDetailClient.tsx) —
   the main user-facing chart page; entry point for most feature work.
3. [`app/compatibility/[id]/CompatibilityDetailClient.tsx`](app/compatibility/%5Bid%5D/CompatibilityDetailClient.tsx) —
   compatibility detail with Basic/Professional toggle.
4. [`lib/tarabalam.ts`](lib/tarabalam.ts) — the only engine computed entirely in
   TypeScript (no sidecar); good reference for how to add TypeScript-native calculations.
5. [`proxy.ts`](proxy.ts) — NextAuth middleware; controls which routes are
   public vs auth-gated.

---

## Common task patterns

**Adding a new sidecar endpoint:**
1. Add a fetcher in `lib/engines/your-engine.ts`
2. Add an API route in `app/api/readings/your-engine/route.ts` (follow `career/route.ts` as template)
3. Add a view component in `components/engines/YourEngineView.tsx`
4. Wire it into `ProfessionalView.tsx` as a new tab

**Adding a new DB table or column:**
1. Write the DDL in `lib/db/client.ts` (`ensureSchema`)
2. Bump `SCHEMA_VERSION` in `lib/db/client.ts`
3. Add the namespace module in `lib/db/your-table.ts`
4. Export it from `lib/db/index.ts` and add to the `db` object

**Adding a compatibility or tarabalam calculation:**
- Shared types/constants → `lib/compatibility.ts` or `lib/tarabalam.ts`
- Never duplicate constants across components

**Rate-limiting a new route:**
- Use `rateLimit(key, limit, windowMs)` from `lib/rate-limit.ts`
- Returns `{ success, limit, remaining }`; check `.success`

---

## Branch workflow — required for every feature or fix

**Never push directly to `main`.** The workflow is:

1. **Work on `development`** — the branch already exists. Always `git checkout development` before starting work.
2. **Push `development`** — Vercel automatically creates a preview deployment for every push to a non-production branch. Share or visit the preview URL to verify the feature works end-to-end.
3. **Only merge to `main` after the user confirms** the preview looks good. Then: `git checkout main && git merge development && git push origin main`.

`main` = production. Every push to `main` triggers a live deployment visible to real users.
Do NOT create new branches (e.g. `develop`, `feature/*`) — use `development`.

---

## Hard constraints

- **Always pass `authOptions` to `getServerSession(authOptions)`** — without it,
  `user.id` is undefined and every DB write fails silently.
- **Always `export const dynamic = "force-dynamic"`** on any server component
  that touches the DB, auth, or request context — otherwise Next.js prerenders
  it at build time with no env vars and the build fails.
- **Never change `SCHEMA_VERSION` without also writing the DDL** in
  `ensureSchema()`. The version gate is the only migration mechanism.
- **Admin scope**: `db.profiles.getAny()` and `db.compatibility.getAny()` bypass
  user scoping — only call these after `isAdmin(session)` check.
- **Profile owner vs. caller**: when an admin views another user's profile,
  use `profile.user_id` (not `session.user.id`) for any subsequent queries that
  should return the *owner's* data (e.g. Tarabalam family list).
- **Transit output shape**: sidecar returns `{ sign: string, degree: number }`
  per planet — NOT a raw longitude. Reconstruct with
  `SIGNS.indexOf(sign) * 30 + degree` before any longitude arithmetic.

---

## Documentation hygiene — required on every push

This is not optional. Stale docs send future agents down wrong paths.

### On EVERY push
- [ ] Update [`CHANGELOG.md`](../CHANGELOG.md) — add an entry under today's date.
      Format: `## [YYYY-MM-DD] — short title` then `### Added / Changed / Fixed / Removed` bullets.
      One push = one entry (group multiple commits under one date entry if pushing at end of session).

### When routes, components, or DB change
- [ ] Update [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) — the affected section(s).
      Update the `<!-- last-updated: -->` comment at the top of any section you touch.
      If adding a new user journey or changing an existing one, update Section 11.

### When you find a bug, defer a feature, or spot tech debt
- [ ] Update [`docs/BACKLOG.md`](BACKLOG.md) — move items between buckets as appropriate.
      If you fix something from the backlog, remove it.

### When making a deployment, env, or schema change
- [ ] Update [`docs/PROJECT.md`](PROJECT.md) — env vars table, schema section, or
      lessons-learned section as appropriate.

### Signal to the next agent
The combination of `CHANGELOG.md` (what changed) + `ARCHITECTURE.md` (where things are)
+ `BACKLOG.md` (what's pending) means any agent can get fully oriented in under
5 minutes without reading source code. Keep these three accurate and the project
stays efficient regardless of context window resets.

---

*This file is the single source of agent onboarding. Keep it under 150 lines.*
