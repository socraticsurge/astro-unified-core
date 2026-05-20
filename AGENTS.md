<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Rules for AI Agents (Jules, Gemini, and others)

> **Full coding standards** are in [`docs/STANDARDS.md`](docs/STANDARDS.md).
> Read that file for the complete set of rules.
>
> This file contains the **pre-flight checklist** and the bugs we have seen
> agents introduce repeatedly. Every rule below maps to a real incident.

---

## Pre-flight checklist — required before opening ANY PR

- [ ] Base branch is `development` — NEVER `main`
- [ ] `gh pr list --state open` shows no existing PR for the same issue
- [ ] No `.jules/`, `.cursor/`, `.aider/` entries in `git status`
- [ ] `./node_modules/.bin/tsc --noEmit` — zero errors
- [ ] All test mocks satisfy their TypeScript types
- [ ] `npx vitest run` — all pass
- [ ] `npm run lint` — zero errors (warnings tolerated)
- [ ] No `public` Cache-Control on auth-gated routes
- [ ] No `isAdmin(session)` calls inside `"use client"` components
- [ ] `CHANGELOG.md` updated with today's dated entry
- [ ] PR is not a draft

---

## Repeated agent failures — read before writing code

### 1. PRs must target `development`, never `main`

`main` is production. Every merge triggers a live deploy to real users.
Always: `gh pr create --base development`.

**Why:** 13 of 15 Jules PRs in one session targeted `main`.

---

### 2. Use Vitest, not Jest

| Wrong | Correct |
|---|---|
| `jest.fn()` | `vi.fn()` |
| `jest.mock(...)` | `vi.mock(...)` |
| `jest.Mock` | `ReturnType<typeof vi.fn>` |
| `@jest/globals` | `vitest` |

Run tests with `npx vitest run`. Config is in `vitest.config.ts`.

**Why:** PR #22 used Jest syntax throughout. Tests could not run.

---

### 3. Never commit AI scratch files

If `.jules/`, `.cursor/`, or `.aider/` appear in `git status`, `rm -rf` them.
Do not stage them.

**Why:** PRs #18, #23, #26 all included `.jules/bolt.md`, causing merge conflicts.

---

### 4. Never call `isAdmin(session)` in a `"use client"` component

`process.env.ADMIN_EMAILS` is `undefined` in the browser. Calling `isAdmin()` in
client code always returns `false`.

**Correct client pattern:**
```ts
const showAdminTools = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin === true;
```

**Why:** NavBar, ProfileDetailClient, and CompatibilityDetailClient all had this bug. Admin features were invisible to admins.

---

### 5. Test mocks must satisfy TypeScript types

When mocking typed objects, provide all required fields. Run
`./node_modules/.bin/tsc --noEmit` before submitting. Zero errors required.

**Why:** PR #28 mocked `Profile` with 8 missing required fields. Type checker failed.

---

### 6. No `public` Cache-Control on authenticated routes

Auth-gated API routes must use `"Cache-Control": "private, max-age=N"`. Never
`public`, `s-maxage`, or `stale-while-revalidate` — CDN caches do not scope by user.

**Why:** PR #26 added `public, s-maxage=86400` to an auth-gated endpoint.

---

### 7. One PR per concern; no draft PRs

One PR = one bug fix, one feature, or one refactor. Only open a PR when
work is complete and tests pass.

---

*For the complete standards — branch workflow, DB conventions, rate limiting,
auth patterns, security rules — read [`docs/STANDARDS.md`](docs/STANDARDS.md).*
