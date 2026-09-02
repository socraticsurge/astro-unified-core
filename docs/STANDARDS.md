# Astro Chaganti — Project Standards

<!-- last-updated: 2026-08-31 -->

> **Agent-neutral.** These rules apply to Claude Code, Jules, Gemini, and any
> future agent. They are the single source of truth for all coding standards.
> `CLAUDE.md` and `AGENTS.md` are thin wrappers that reference this file.

---

## Table of Contents

1. [Task Lifecycle](#1-task-lifecycle)
2. [Branch Workflow](#2-branch-workflow)
3. [Test Framework](#3-test-framework)
4. [TypeScript Standards](#4-typescript-standards)
5. [Authentication Patterns](#5-authentication-patterns)
6. [Security Patterns](#6-security-patterns)
7. [Database Conventions](#7-database-conventions)
8. [Rate Limiting](#8-rate-limiting)
9. [API Route Conventions](#9-api-route-conventions)
10. [Documentation Hygiene](#10-documentation-hygiene)

---

## 1. Task Lifecycle

### Starting a task

1. **Orient first.** Read `CHANGELOG.md` (last 10 entries) to understand recent
   changes. Read the `BACKLOG.md` bucket that relates to your task.
2. **Check for open PRs.** Run `gh pr list --state open`. If a PR already
   targets the same files or issue, build on it — do not open a duplicate.
3. **Checkout `development`.** `git checkout development && git pull origin development`
   before making any change.
4. **Read the ARCHITECTURE.md section** for the component you are about to touch.

### Finishing a task

1. **Run type check.** `./node_modules/.bin/tsc --noEmit` — zero errors required.
2. **Run tests.** `npx vitest run` — all pass required.
3. **Update CHANGELOG.md.** One entry per push, under today's date. Format:
   `## [YYYY-MM-DD] — short title` then `### Added / Changed / Fixed / Removed` bullets.
4. **Update affected docs.** If routes, components, or DB changed → update
   `ARCHITECTURE.md`. If you found or fixed a bug/debt → update `BACKLOG.md`.
5. **Open a PR to `development`**, never to `main`. Use `gh pr create --base development`.
6. **Do not commit AI scratch files.** Check `git status` — if `.jules/`, `.cursor/`,
   `.aider/` appear, `rm -rf` them. Do not stage them.

---

## 2. Branch Workflow

| Branch | Purpose | Deployer |
|---|---|---|
| `main` | **Production.** Every push triggers a live deploy. Never push directly. | Vercel |
| `development` | **Staging / integration.** All PRs target this. Vercel creates a preview URL on every push. | Vercel preview |

**Rules:**
- All PRs must set `development` as the base branch.
- Do NOT create `feature/*` or `fix/*` branches targeting `main`.
- After user confirms the preview looks good: `git checkout main && git merge development && git push origin main`.
- One PR per concern — one bug fix, one feature, one refactor. Do not bundle unrelated changes.
- No draft PRs. Only open when work is complete and tests pass.

---

## 3. Test Framework

This project uses **Vitest**, not Jest.

| Wrong (Jest) | Correct (Vitest) |
|---|---|
| `jest.fn()` | `vi.fn()` |
| `jest.mock(...)` | `vi.mock(...)` |
| `jest.spyOn(...)` | `vi.spyOn(...)` |
| `jest.Mock` | `ReturnType<typeof vi.fn>` |
| `@jest/globals` | `vitest` |

Config is in `vitest.config.ts`. Globals (`vi`, `describe`, `it`, `expect`) are
enabled — no imports needed. Run with: `npx vitest run`.

**Mock completeness:** When mocking a typed object, provide all required fields.
Use `Partial<T>` or cast `as T` only when you have verified the test genuinely
does not need the missing fields. Always pass type check before submitting.

---

## 4. TypeScript Standards

- **No `any` in production code.** Use `unknown` + type-guard or a proper type.
- **No `// @ts-ignore` or `// @ts-expect-error`** without a comment explaining why.
- **Type assertion `as T`** is only acceptable when the runtime shape is guaranteed
  and a full type-safe alternative would require disproportionate abstraction.
- **`tsconfig.json` excludes test files** (`*.test.ts`, `*.test.tsx`) from the
  main compile. Vitest handles test type-checking in its own environment.

---

## 5. Authentication Patterns

### Server components and API routes

Always use `getServerSession(authOptions)` — never `getServerSession()` without `authOptions`.

```ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const session = await getServerSession(authOptions);
if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

### Admin check (server-side only)

```ts
import { isAdmin } from "@/lib/admin";

if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

`isAdmin()` reads `process.env.ADMIN_EMAILS` — this env var is **not available in
the browser**. Never call `isAdmin()` in a `"use client"` component.

### Admin check (client components)

```ts
// lib/auth.ts stamps isAdmin into the JWT server-side at sign-in.
// Client components read it from the session object.
const showAdminTools = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin === true;
```

### `isAdmin` flag lifecycle

1. User signs in → `lib/auth.ts` `session` callback evaluates `ADMIN_EMAILS` and
   stamps `user.isAdmin = true/false` into the JWT.
2. On every request, the JWT is decoded → the `isAdmin` flag is available on the
   session without any further env var access.
3. **If you change who is an admin, users must sign out and sign back in.**

### Pages that touch DB or auth

Every server page/layout component that reads from the DB or calls
`getServerSession()` must export:

```ts
export const dynamic = "force-dynamic";
```

Without it, Next.js may try to pre-render the page at build time when env vars
are not set, causing a build failure.

---

## 6. Security Patterns

### Environment variables

- Never expose server secrets through `NEXT_PUBLIC_` prefixed vars.
  `NEXT_PUBLIC_*` is bundled into the browser JS. Only use it for truly public values.
- **Sidecar URL is a server secret.** Use `DASHAFLOW_SIDECAR_URL` (no `NEXT_PUBLIC_` prefix).

### Cache-Control on authenticated routes

Never use `public`, `s-maxage`, or `stale-while-revalidate` on routes that
check auth. CDN caches do not scope by user.

```ts
// Wrong — CDN can serve one user's data to another
"Cache-Control": "public, s-maxage=86400"

// Correct — browser-only cache, scoped to the user's session
"Cache-Control": "private, max-age=3600"

// Correct for fully static content (credits page, terms)
"Cache-Control": "public, s-maxage=86400"
```

### Input validation at API boundaries

- Validate all body fields for length, type, and format before any DB write.
- Use `MAX_FIELD_LENGTH = 2000` constant (or appropriate limit) for free-text fields.
- Validate date strings with `/^\d{4}-\d{2}-\d{2}$/` before `Date.parse()`.
- Verify that all referenced IDs (e.g. `profile_id`) belong to the requesting user
  before acting on them.

### Admin endpoints

- State-changing admin endpoints must use `POST`, not `GET`.
- The `AppSettings` allowlist in `app/api/admin/settings/route.ts` must be
  updated explicitly before any new setting key is writable via the API.

---

## 7. Database Conventions

### Schema migration

`ensureSchema()` in `lib/db/client.ts` is the only migration mechanism.

1. Write DDL in `ensureSchema()`.
2. Bump `SCHEMA_VERSION` (currently `7`).
3. Wrap `ALTER TABLE … ADD COLUMN` in `try/catch` to handle re-runs on existing DBs.
4. Add the new module in `lib/db/your-table.ts`.
5. Export from `lib/db/index.ts` and add to the `db` object.

Never change `SCHEMA_VERSION` without also adding the corresponding DDL.

### Scoping queries

| Operation | Method |
|---|---|
| Read caller's own profiles | `db.profiles.list(userId)` |
| Read any user's profile (admin) | `db.profiles.getAny(id)` |
| Read any compatibility check (admin) | `db.compatibility.getAny(id)` |

When an admin views another user's profile, use `profile.user_id` (not
`session.user.id`) for subsequent queries that should return the owner's data.

### ID generation

Profile IDs and other entity IDs use `nanoid()`. Keep IDs as `string` throughout;
do not coerce to number.

---

## 8. Rate Limiting

The shared utility is `lib/rate-limit.ts`:

```ts
import { rateLimit } from "@/lib/rate-limit";

const result = rateLimit(key, limit, windowMs);
if (!result.success) {
  return NextResponse.json({ error: "Too many requests" }, {
    status: 429,
    headers: { "Retry-After": "60" },
  });
}
```

**Current limits:**

| Route | Key | Limit |
|---|---|---|
| `POST /api/profiles` | user email | 5 / min |
| `POST /api/feedback` | IP address | 5 / min |
| `POST /api/readings/tarabalam` | user email | 20 / min |
| `GET/POST /api/readings/dashaflow` | user email | implicit via profile cap |

**Known limitation:** most rate limits are per-Lambda instance, not global (see
`BACKLOG.md` D7). The three approval-gated Panchangam guest routes and the
separately gated managed authenticated geocoder are scoped exceptions: they add
required, fail-closed Upstash identity and fleet enforcement in deployed
runtimes. Guest search and managed authenticated geocoding share one fleet key.
Extend that pattern deliberately rather than assuming every route is globally
limited.

---

## 9. API Route Conventions

```ts
// Standard authenticated route shape
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  // ... business logic ...

  return NextResponse.json({ data });
}
```

- Export only the HTTP methods the route supports (no implicit handler).
- Destructure request body: `const { field } = await req.json()`.
- Validate inputs at the top before any DB call.
- Return consistent JSON shapes: `{ data }` on success, `{ error: string }` on failure.
- Set `"Cache-Control": "private, max-age=N"` on all auth-gated responses.

**Adding a new sidecar-backed endpoint:**

1. Add fetcher in `lib/engines/your-engine.ts` (follow `career.ts` as template).
2. Add API route in `app/api/readings/your-engine/route.ts`.
3. Add view component in `components/engines/YourEngineView.tsx`.
4. Wire into `ProfessionalView.tsx` as a new tab.

---

## 10. Documentation Hygiene

This is required on every push — stale docs send future agents down wrong paths.

| Trigger | Doc to update |
|---|---|
| Every push | `CHANGELOG.md` — one dated entry |
| Routes, components, or DB changed | `docs/ARCHITECTURE.md` — affected sections, bump `<!-- last-updated -->` |
| Bug found, feature deferred, debt noted | `docs/BACKLOG.md` |
| Deployment, env vars, or schema changed | `docs/PROJECT.md` |
| Bug fixed from backlog | Remove the item from `BACKLOG.md` |
| New user journey or changed journey | `docs/ARCHITECTURE.md` Section 11 + `docs/TESTING.md` test plan |
| Product direction or fee change | `docs/PRODUCT.md` |

The 8-document ceiling: **CHANGELOG.md, AGENTS.md, CLAUDE.md, STANDARDS.md,
ARCHITECTURE.md, PROJECT.md, BACKLOG.md, PRODUCT.md, TESTING.md** (9 total
including TESTING.md). Resist adding new top-level docs; fold new material
into the correct existing file.

---

*This file is maintained by all agents. Last agent to push: update the
`<!-- last-updated -->` stamp at the top.*
