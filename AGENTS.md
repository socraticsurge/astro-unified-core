<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Rules for AI Agents (Jules and others)

These rules exist because agents have violated them before and caused rework.
Every rule below maps to a real incident. Follow them without exception.

---

## 1. Branch — PRs must target `development`, never `main`

- All PRs must set **`development`** as the base branch.
- `main` is production. A PR to `main` deploys directly to real users.
- Before opening a PR, run: `gh pr list` and confirm your branch targets `development`.
- Do NOT create new branch names like `feature/*` or `fix/*` to merge into `main`.

**Why this matters:** 13 of 15 Jules PRs in one session targeted `main`. Every one had to be manually retargeted before merging.

---

## 2. Test framework — use Vitest, not Jest

This project uses **Vitest**. Do not use Jest APIs.

| Wrong (Jest) | Correct (Vitest) |
|---|---|
| `jest.fn()` | `vi.fn()` |
| `jest.mock(...)` | `vi.mock(...)` |
| `jest.spyOn(...)` | `vi.spyOn(...)` |
| `jest.Mock` | `ReturnType<typeof vi.fn>` |
| `@jest/globals` | `vitest` |

Config is in `vitest.config.ts`. Globals (`vi`, `describe`, `it`, `expect`) are enabled — no imports needed.
Run tests with: `npx vitest run`

**Why this matters:** PR #22 used Jest syntax throughout. The tests could not run.

---

## 3. Never commit AI working files

Do not commit any files from `.jules/`, `.cursor/`, `.aider/`, or any other AI-tool scratch directories. These are internal agent notes and have no place in the repository.

Add them to `.gitignore` if they are not already listed. Check `git status` before committing — if you see `.jules/` or similar, `rm -rf` it and do not stage it.

**Why this matters:** PRs #18, #23, #26 all included `.jules/bolt.md`, causing a merge conflict that had to be manually resolved.

---

## 4. Check for existing PRs before opening a new one

Before opening a PR, run:
```bash
gh pr list --state open
```
If an open PR already covers the same file or issue, do not open a duplicate. Instead, either build on the existing branch or note the overlap in a comment.

**Why this matters:** Jules opened 3 separate PRs (#6, #11, #15) all targeting the same XSS vulnerability in the same two files.

---

## 5. Test mocks must satisfy TypeScript types

When mocking a typed object in tests, provide all required fields. Use `Partial<T>` or cast via `as T` only when you have verified the test genuinely doesn't need the missing fields.

To check: run `./node_modules/.bin/tsc --noEmit` before submitting. Zero errors required.

**Why this matters:** PR #28 mocked `Profile` as `{ id: string; name: string }`, missing 8 required fields. It failed the type checker.

---

## 6. Never use `public` Cache-Control on authenticated routes

Any API route protected by `getServerSession` must use:
```ts
"Cache-Control": "private, max-age=<seconds>"
```

Never use `public`, `s-maxage`, or `stale-while-revalidate` on routes that check auth. Public CDN caches do not scope by user — one user's data can be served to another.

**Why this matters:** PR #26 added `Cache-Control: public, s-maxage=86400` to an auth-gated endpoint.

---

## 7. Never call `isAdmin(session)` in a client component

`isAdmin()` reads `process.env.ADMIN_EMAILS`. That env var is **not available in the browser**. Calling it in a `"use client"` component always returns `false`.

**Correct pattern for client components:**
```ts
const showAdminTools = (session?.user as { isAdmin?: boolean })?.isAdmin === true;
```

The `isAdmin` flag is stamped into the session server-side in `lib/auth.ts`. Read it from the session object; never re-evaluate it on the client.

**Why this matters:** NavBar, ProfileDetailClient, and CompatibilityDetailClient all had this bug. Admin features were invisible to admin users.

---

## 8. No draft PRs

Do not open draft PRs. Only open a PR when the work is complete and the tests pass. Incomplete drafts queue up and create confusion about what needs review.

---

## 9. One PR per concern

Each PR should do one thing: one bug fix, one feature, one refactor. Do not bundle unrelated changes. If you are fixing a security issue and notice a performance issue, open two PRs.

---

## Summary checklist before opening any PR

- [ ] Base branch is `development`
- [ ] No `.jules/` or other AI scratch files in `git status`
- [ ] `gh pr list` shows no existing PR for the same issue
- [ ] `./node_modules/.bin/tsc --noEmit` passes with zero errors
- [ ] All test mocks satisfy their TypeScript types
- [ ] `npx vitest run` passes
- [ ] No `public` Cache-Control on auth-gated routes
- [ ] No `isAdmin(session)` calls inside `"use client"` components
- [ ] PR is not a draft
