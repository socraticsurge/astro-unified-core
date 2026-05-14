@AGENTS.md

---

# Astro Chaganti — Claude Code Brief

> This file is the entry point for **Claude Code** sessions. Read it first.
> All rules and standards live in `docs/STANDARDS.md` — this file just
> surfaces the most critical constraints and points you to the right place.

---

## Five files that explain the most

1. [`lib/db/index.ts`](lib/db/index.ts) + siblings in `lib/db/` — full data model.
2. [`app/profiles/[id]/ProfileDetailClient.tsx`](app/profiles/%5Bid%5D/ProfileDetailClient.tsx) — main chart page.
3. [`app/compatibility/[id]/CompatibilityDetailClient.tsx`](app/compatibility/%5Bid%5D/CompatibilityDetailClient.tsx) — compatibility detail.
4. [`lib/tarabalam.ts`](lib/tarabalam.ts) — only TypeScript-native engine; no sidecar.
5. [`proxy.ts`](proxy.ts) — NextAuth middleware; controls public vs auth-gated routes.

---

## Hard constraints (non-negotiable)

- **Always `getServerSession(authOptions)`** — without `authOptions`, `user.id` is `undefined`.
- **Always `export const dynamic = "force-dynamic"`** on any server page that reads DB or auth.
- **Never call `isAdmin(session)` in a `"use client"` component.** Read `session.user.isAdmin` instead.
- **Never use `public` Cache-Control on auth-gated routes.**
- **Never use `NEXT_PUBLIC_` prefix for server secrets** (sidecar URL, admin emails, DB credentials).
- **Never push directly to `main`.** All work goes to `development`.
- **Always update `CHANGELOG.md`** on every push.

---

## Task lifecycle (quick reference)

Full detail in [`docs/STANDARDS.md §1`](docs/STANDARDS.md).

**Start:** `git checkout development && git pull` → read CHANGELOG (last 10) → check `gh pr list --state open`

**Finish:** `./node_modules/.bin/tsc --noEmit` → `npx vitest run` → update CHANGELOG → PR to `development`

---

## Common task patterns

**Adding a new sidecar endpoint:**
1. Add fetcher in `lib/engines/your-engine.ts` (follow `career.ts` as template).
2. Add API route in `app/api/readings/your-engine/route.ts`.
3. Add view component in `components/engines/YourEngineView.tsx`.
4. Wire into `ProfessionalView.tsx` as a new tab.

**Adding a new DB table or column:**
1. Write DDL in `lib/db/client.ts` (`ensureSchema`).
2. Bump `SCHEMA_VERSION` (currently `8`).
3. Add module in `lib/db/your-table.ts`, export from `lib/db/index.ts`.

---

## Documentation map

| File | What it covers |
|---|---|
| `CHANGELOG.md` | Every change, dated |
| `AGENTS.md` | Jules/Gemini-specific rules and pre-flight checklist |
| **`docs/STANDARDS.md`** | **Cross-agent coding standards — the source of truth** |
| `docs/ARCHITECTURE.md` | Server/client boundary, all modules, user journey traces |
| `docs/PROJECT.md` | Env vars, deployment gotchas, auth model, runbook |
| `docs/BACKLOG.md` | Bugs, deferred features, tech debt, session decisions |
| `docs/PRODUCT.md` | Product story, personas, feature map, journeys (plain language) |
| `docs/TESTING.md` | Coverage status, test plans per journey, QA log |

---

*Keep this file under 80 lines. Standards belong in `docs/STANDARDS.md`.*
