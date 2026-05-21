# Operational Runbook

> Production runbook for keeping the site healthy. Read alongside
> [`PROJECT.md`](PROJECT.md) (env vars / deployment gotchas) and
> [`ARCHITECTURE.md`](ARCHITECTURE.md) (how the parts fit together).

---

## Health monitoring

### `/api/health`

Public, unauthenticated. Checks DB + sidecar reachability.

- `200` — both DB and sidecar OK
- `503` — at least one dependency is down (body has details)

Response:

```json
{
  "ok": true,
  "db": { "ok": true },
  "sidecar": { "ok": true, "status": 200 },
  "timestamp": "2026-05-20T08:00:00.000Z"
}
```

**Recommended:** point an external uptime monitor (UptimeRobot, Better
Uptime, etc.) at `https://<prod-domain>/api/health` with a 1–5 minute
interval. Alert on non-2xx.

---

## Database — Turso (libSQL)

### Connection

- Vendor: [Turso](https://turso.tech) (libSQL, SQLite-on-the-edge)
- Library: `@libsql/client`
- Env vars: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
- Admin: account owner is the only admin. Manage from
  <https://app.turso.tech>.

### Backups — what Turso provides

Turso runs continuous point-in-time recovery (PITR) on all paid plans.
Free-tier databases get periodic snapshots only. Confirm the current
retention window in the Turso dashboard under the database's **Settings →
Backups** page; do not rely on numbers cached here, they drift.

### Taking a manual snapshot

You have **two equivalent options**. Pick whichever is faster.

**Option A — Dashboard (no CLI needed).** Turso dashboard → your DB →
**Export Database**. Downloads a binary `.db` SQLite file. This is the
canonical backup format — byte-for-byte exact, includes indexes and
page structure. Store it somewhere that is NOT the same Turso account
(iCloud, Google Drive, S3 — the local `backups/` folder is gitignored,
fine for short-term but back it up off-machine too).

**Option B — CLI `.dump`.** Install once:
`curl -sSfL https://get.tur.so/install.sh | bash`

```bash
turso auth login                       # browser flow, one-time
turso db list                          # find the DB name
turso db shell <db-name> .dump > backups/$(date +%F).sql
```

This produces a plain SQL file. Use it when you want a *text* backup
you can diff between dates or open in a text editor for audit. Less
common.

If you've already downloaded a `.db` from the dashboard and want a
`.sql` alongside it, convert locally without touching Turso:

```bash
sqlite3 your-downloaded.db .dump > backups/$(date +%F).sql
```

### Restoring from a manual snapshot

**If you have a `.db` file** (Option A above): Turso dashboard →
**Databases → Create Database** → choose **Import from existing DB**
→ upload the `.db`. Done in one step.

**If you have a `.sql` file** (Option B above):

1. Create a new DB: `turso db create <new-name>`
2. Pipe the dump in: `turso db shell <new-name> < backups/2026-05-20.sql`

**Either way, then:**

3. Point the app at the new DB by updating `TURSO_DATABASE_URL` (and
   generating a fresh token via `turso db tokens create <new-name>`).
4. Redeploy. The new connection will trigger `ensureSchema()` on first
   request; it idempotently re-applies migrations.

### Restoring via Turso PITR (paid plans)

From the dashboard: **Databases → <your-db> → Restore**. Pick the
target timestamp. Turso clones into a new database — same workflow as
above to repoint the app.

### Targets

- **RPO** (max acceptable data loss): 24 hours (we will lose at most one
  day of work if we have to restore from yesterday's manual dump).
- **RTO** (time to restore): under 1 hour, assuming the dump file is at
  hand.

### Recommended cadence

- **Weekly:** manual `.dump` snapshot, stored off-account. Reasonable
  while we have <100 DAUs.
- **Before any schema bump or destructive migration:** manual snapshot
  immediately before.

---

## Weekly Sentry review (15 minutes)

Tests catch what we anticipate. Sentry catches what we don't. A short
weekly pass keeps prod issues from compounding.

### Cadence

Every Monday morning. Total ~15 minutes. If you skip a week, double the
budget the following week — don't skip twice.

### What to look at, in order

1. **Sentry → Issues, "New issues this week"** filter. Click each:
   - Read the top stack frame. Is it a route handler? a client component?
     a third-party (e.g. dashaflow sidecar)?
   - Check the "Events" count — single user blip or actual recurrence?
   - Check the affected releases column. If only one release, it's a
     regression introduced by that PR.
   - **Triage decision:** fix, ignore (with a note), or watch.

2. **Sentry → Issues, "Frequency" sort, last 7 days**. The top 5 issues
   by count are the actual fires. Even if you fixed something, if the
   count is still climbing, the fix didn't deploy or didn't work.

3. **Sentry → Performance, "Web Vitals"**. Glance at p75 LCP and CLS
   for `/` and `/dashboard`. If LCP is creeping above 2.5s, something
   regressed.

4. **Sentry → Releases**. The most recent release should show its
   issue count. A spike at release time = the release introduced
   something.

### What to ignore

- **AbortError / `signal aborted`** from `fetchWithRetry`. These are
  user-cancelled requests (navigated away), not real failures. Sentry
  groups them; if the count is high it's still benign.
- **`ResizeObserver loop limit exceeded`** — Chrome quirk, not actionable.
- **Bot crawlers hitting unauthenticated routes.** Look at the
  user-agent — `GoogleBot`, `BingBot`, etc. are not real users.
- **Single events from one specific browser/device.** A single Safari
  16.1 user with a JS error is a fluke until it repeats.

### What to act on

- Any 500 from a route handler, ever. We should never 500 — handlers
  must catch and return 4xx/503. The recent
  `/api/landing/today` race was caught this way.
- Repeated errors from the same client component (suggests a
  state-sync bug like the profile-create flow).
- A new high-frequency issue introduced by the most recent release.
- Anything tagged `feature: daily-landing` repeatedly — the LLM /
  sidecar interaction has the most surface area.

### After the review

- Open issues for anything that needs fixing → assign to the next sprint.
- Click "Resolve" on issues you've already shipped fixes for. Sentry
  re-opens them if they recur on a later release.
- Update this RUNBOOK if you spot a new failure mode that needs
  documenting.

---

## Sidecar — Dashaflow service

- Hosted on Vercel (separate project from the main app).
- Internal URL set via `DASHAFLOW_SIDECAR_URL` (never the
  `NEXT_PUBLIC_*` prefix — the URL must stay server-side).
- The main app calls it through [`lib/engines/fetch-with-retry.ts`](../lib/engines/fetch-with-retry.ts),
  which retries once on `502/503/504`.

### If `/api/health` reports sidecar down

1. Check the sidecar's own Vercel deployment dashboard — is the latest
   build healthy?
2. If yes, hit `${DASHAFLOW_SIDECAR_URL}/health` directly with curl. A
   cold start can take 5–10s on the first hit after idle.
3. If consistently failing: redeploy the sidecar's `main` branch from
   the Vercel dashboard.

---

## Common incidents

### "All admin tools have disappeared"

Almost certainly the `ADMIN_EMAILS` env var is missing or wrong on the
deployment. Set on Vercel → Project → Settings → Environment
Variables. Redeploy. See [`AGENTS.md` rule 4](../AGENTS.md) for the
recurring client-side `isAdmin(session)` bug — that pattern returns
`false` in the browser regardless of env state.

### "Schema is out of date"

Bump `SCHEMA_VERSION` in [`lib/db/client.ts`](../lib/db/client.ts), add
the migration as `ALTER TABLE` in `ensureSchema()`, redeploy. The next
request triggers the migration. Take a manual snapshot first.

### "Today's reading is wrong / stale"

LLM responses are cached in the `readings` table per profile + engine.
The cache is keyed by an input snapshot hash; data drift forces a new
row. If a single row is corrupt, delete it from the Turso shell:

```bash
turso db shell <db-name>
> DELETE FROM readings WHERE id = '<row-id>';
```

Next request regenerates.

---

## Promoting `development` → `main` (production deploy)

Every push to `main` triggers a real Vercel production deploy to
`astrochaganti.com`. This runbook captures the checks that should pass
*before* you open the promotion PR, what to do at merge time, and what
to verify after the deploy is live.

### Before opening the PR

Run these locally on a fresh checkout of `development`:

```bash
git fetch origin
git checkout development && git pull
git log main..development --oneline | wc -l   # confirm there's something to ship
./node_modules/.bin/tsc --noEmit              # 0 errors
npx vitest run                                # 100% pass
npm run lint                                  # 0 errors
npm run build                                 # ✓ Compiled successfully
```

If any of those fail, fix on `development` first — never ship a red branch.

### Pre-deploy parity check (Vercel environments)

Production and Preview are separate environment groups in Vercel. Each
must have the same set of env vars set (with appropriate values). Walk
through this list in **Vercel → Project → Settings → Environment
Variables → Production**:

| Variable | Production value notes |
|---|---|
| `NEXTAUTH_URL` | **`https://astrochaganti.com`** — different from preview/dev. OAuth `redirect_uri` is matched exactly by Google. |
| `NEXTAUTH_SECRET` | Same as preview is OK, but rotating for prod is a good idea. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Same as preview. |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | Same DB as preview today (single Turso DB shared). When you grow, split. |
| `DASHAFLOW_SIDECAR_URL` | Same sidecar URL. |
| `ADMIN_EMAILS` | Same list. |
| `GOOGLE_GEMINI_API_KEY`, `GROQ_API_KEY` | Same keys. |
| `SENTRY_AUTH_TOKEN` | Same. |
| `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` | Same. |
| `RESEND_API_KEY` | Same. |

### Google Cloud Console — OAuth consent

Before the first deploy to `main`, add the production URL to the OAuth
client:

- **Authorized redirect URIs:** add `https://astrochaganti.com/api/auth/callback/google` (the preview URI must remain).
- **Authorized JavaScript origins:** add `https://astrochaganti.com`.

If you skip this, sign-in will fail in production with
`redirect_uri_mismatch`.

### Pre-deploy DB safety

Take a manual snapshot before the deploy. Either:

- **Dashboard:** Turso → your DB → **Export Database** → save the `.db`
  file off-machine.
- **CLI:** `turso db shell <db-name> .dump > backups/$(date +%F)-pre-prod.sql`

The `.db` file is the canonical format; the SQL dump is for cases where
you need a text-readable snapshot. See "Taking a manual snapshot" above
for the trade-off.

### Opening the PR

```bash
git checkout main && git pull
gh pr create --base main --head development \
  --title "release: <YYYY-MM-DD>: <short summary>" \
  --body "..."
```

CI runs the same tsc/vitest/lint suite as on `development`. The PR
should be a fast-forward or near-fast-forward — `main` should never
have commits that aren't on `development` (`main` is downstream of
`development` only).

Squash-merge if the dev branch has a lot of intermediate commits;
merge-commit if you want each change individually traceable in
`main`'s history.

### After the deploy is green

In order:

1. **Hit `/api/health` on `astrochaganti.com`**. Confirms DB + sidecar
   are reachable from the production Lambda region.
2. **Sign in with your own Google account** on the live URL. If the
   OAuth redirect URI in Google Cloud Console wasn't updated, this
   step fails — see Google Cloud Console section above.
3. **Create a throwaway profile**, generate a chart, view the Today
   tab. Confirm the AI insight loads and PostHog → Live events shows
   the four expected events (`user_signed_in`, `profile_created`,
   today-reading view, etc.).
4. **Submit a test consultation request.** Confirm:
   - The admin email lands in `astrochaganti@gmail.com` (see Resend
     dashboard → Emails for delivery status).
   - PostHog records `consultation_request_created` with the right
     properties.
5. **Sentry → Issues:** verify no new errors fired during your test
   session.
6. **Sentry deploy log:** the build should show "Uploaded source maps
   to Sentry" — that confirms `SENTRY_AUTH_TOKEN` is wired for the
   production build, so production stack traces will be readable.

### Updating monitoring & third-party services

When `astrochaganti.com` is the canonical production URL, update these
**one-time** after the first prod deploy:

| Service | What to change |
|---|---|
| **UptimeRobot** | Point the monitor at `https://astrochaganti.com/api/health`. Optional but recommended: keep a *second* monitor on the preview URL (`https://astro-unified-core-pfni-git-development.vercel.app/api/health`) so you can tell prod outages apart from dev outages. |
| **PostHog** | No URL change needed — the SDK fires from whatever domain it's served on. Optional: set `posthog.init({ persistence: 'localStorage', loaded: (ph) => ph.register({ deploy_env: process.env.VERCEL_ENV }) })` so prod vs. preview events are filterable in PostHog. Not blocking. |
| **Sentry** | No URL change needed; the DSN is global. Optional: add `environment: process.env.VERCEL_ENV ?? 'development'` to all three Sentry configs so prod errors filter cleanly. Recommended before public launch. |
| **Resend** | No URL change needed. **But:** switch `EMAIL_FROM` in `lib/constants.ts` from `Astro Chaganti <onboarding@resend.dev>` to `Astro Chaganti <notify@astrochaganti.com>` *once* the `astrochaganti.com` domain is verified in Resend (Domains → Add → publish the SPF/DKIM/DMARC DNS records). Until verified, sends from the custom domain bounce — keep the shared sender. |
| **Google Cloud (OAuth)** | Covered above — add the production URI to the OAuth client before the first prod sign-in. |
| **Vercel Custom Domain** | Already configured per user; verify the `Production` environment of the Vercel project has `astrochaganti.com` as the primary domain. |

### Rollback

If a deploy is bad and you need to roll back:

1. **Vercel → Project → Deployments** → find the previous green
   production deploy → **Promote to Production**. This is instant and
   does not touch the DB.
2. If the bad deploy ran a schema migration that broke prod, restore
   from your `backups/<date>-pre-prod.sql` dump (see "Restoring from
   a manual dump").
3. Open an incident issue on the repo with: deploy SHA that broke,
   how it manifested, root cause, fix. Add the failure mode to this
   runbook.

---

*Update this runbook every time we discover a new failure mode or
recovery shortcut.*
