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

### Limiter capacity and cleanup

The shared limiter has hard attempt ceilings before route-specific writes. All
guest routes together allow 2,000 attempts per anchored 24-hour window in
Preview and 10,000 in Production; managed authenticated geocoding allows 500 in
Preview and 2,500 in Production. After a read-only preflight, the capacity row
is always the first atomic mutation. Its slot remains consumed if a later
user/fleet/client guard rejects, so no uncounted route-specific mutation can
escape the envelope. Budgeting four admission-path row mutations per
capacity-admitted attempt produces 60,000 per complete set of windows. Because
the four windows are independently anchored, use 31 window periods for a
conservative 30-day observation bound of 1.86 million before expired-row
deletes and unrelated application traffic. This is below the currently
published Turso Free allowance of 10 million writes/month, but it is not proof
of capacity: inspect current account usage, deletion accounting, and remaining
headroom before enabling traffic.

Every deployed guest or managed-authenticated guard chain has one two-second
cooperative deadline across status, capacity, and route-specific rows. Expiry
returns retryable `503` and prevents any later SQL statement from starting. A
Turso request already dispatched at expiry may still commit; do not manually
refund or automatically retry an ambiguous capacity/fleet/client/user slot.
Allow its anchored window to recover naturally. Measure Preview cold-path
p95/p99 before activation and do not lengthen the two-second budget without
reconciling the 15-second browser and 12.5-second sidecar limits.

Limiter DDL now runs only through the environment-checked operator command.
The command does not independently authenticate a physical database or Vercel
project: exact project linkage, injected database identity, and a restore point
remain operator gates. Cold guest and cleanup processes use the same read-only
compatibility probe and fail closed instead of repairing schema. The coarse
Vercel WAF rule is deliberately staged with exceeded-request logging first; it
is not an enforcing perimeter until the log, Preview `429`, and Production
approval stages are completed. Keep all public flags off until those stages and
the database-headroom evidence pass.

Expired HMAC identity/fleet rows are removed by the authenticated landing cron.
Next.js `after()` starts cleanup after the landing response is committed. The
job uses indexed 5,000-row delete batches, deletes at most 100,000 rows per run,
limits each readiness/query operation to 2.5 seconds, and stops after a 10-second
wall-clock budget. A remaining backlog is reported to Sentry; cleanup failure
does not change the already-produced landing response.

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

Take a manual snapshot first. In [`lib/db/client.ts`](../lib/db/client.ts), add
new idempotent tables/indexes to `bootstrapTables()`; add version-dependent
`ALTER TABLE`, backfill, or seed work to `runMigrations()` via `migrate()`; then
bump `SCHEMA_VERSION` (currently 12). The next DB request always re-runs the
idempotent application bootstrap and runs migrations only when the stored
version is behind.

The public limiter objects are intentionally different. Never add their DDL to
the lazy bootstrap or a route. From a checkout whose `.vercel/project.json`
names `astro-unified-core-pfni`, provision Preview without writing secrets to a
file:

```bash
vercel env run -e preview -- npm run db:provision-rate-limits -- --target preview
```

The command refuses an ambiguous/mismatched `VERCEL_ENV`, accepts only a remote
`libsql://` URL, runs one atomic idempotent DDL batch, then verifies the objects
through the same read-only fingerprint used at runtime. Those checks do not
prove which physical database or Vercel project supplied the variables. Record
both identities separately. After a Preview restore point and successful
evidence, use `-e production` with `--target production`. A missing or
incompatible limiter schema should make guest routes return `503`; do not make
the request path self-repair.

### Guest API perimeter rollout or rollback

Vercel Hobby has one rate-limit rule. Keep it scoped to `POST` plus path prefix
`/api/guest/`, fixed at 60 requests per 60 seconds per IP. Roll it forward in
stages: exceeded-request logging everywhere, traffic review, Preview-only
`429`, then Production enforcement with explicit approval. A saved CLI rule is
only a draft until it is published.

For rollback, disable the three server-side activation flags first. Then stage
the WAF rule back to exceeded-request logging (or disable it), inspect
`vercel firewall diff --json`, and publish that rollback. Do not delete Turso
counter rows during an incident; they expire and are pruned by bounded
maintenance. Vercel's counters are regional and source IPs can rotate, so the
WAF rule never replaces the Turso fleet and daily caps.

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

Production and Preview are separate environment groups in Vercel. Keep their
shared application variables aligned with environment-appropriate values, but
do not copy Production-only public-Nominatim selection or activation into
Preview; that environment uses fixtures. Walk through this list in
**Vercel → Project → Settings → Environment Variables → Production**:

| Variable | Production value notes |
|---|---|
| `NEXTAUTH_URL` | **`https://astrochaganti.com`** — different from preview/dev. OAuth `redirect_uri` is matched exactly by Google. |
| `NEXTAUTH_SECRET` | Same as preview is OK, but rotating for prod is a good idea. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Same as preview. |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | Production uses its existing live database for authoritative guest/auth limits. Preview certification stays isolated and uses fixtures for public-Nominatim behavior; the public service is rejected outside Production. Limiter tables contain no raw identity, place, birth, coordinate, provider-key, or profile data. |
| `DASHAFLOW_SIDECAR_URL` | Same sidecar URL. |
| `RATE_LIMIT_HMAC_SECRET` | Strong 32–256 character printable non-space server secret required for deployed Turso-backed identity/fleet limits. It may be the same across Preview/Production because the HMAC input includes the exact Vercel environment; never reuse a user/account identifier or expose it to the browser. |
| `GEOCODER_PROVIDER` / `GEOCODER_API_KEY` | Use `nominatim-public` in Production for the initial release; it is fixed, keyless, identifying, attributed, submit-only for guests, cached, and protected by an exclusive send lease. Real local/Preview runtimes reject it. `GEOCODER_API_KEY` is required only for inactive LocationIQ/Geoapify fallbacks. |
| `GEOCODER_DAILY_REQUEST_LIMIT` | Canonical integer from 1 through 1,000 for public Nominatim, or through 1,500 for a commercial fallback. Use `1000` for the initial public-Nominatim release. Guest and authenticated traffic share one Production provider-family row; each miss holds a 12,500 ms crash lease through provider completion, then a fenced release establishes a 1,100 ms cooldown. |
| `ADMIN_EMAILS` | Same list. |
| `GOOGLE_GEMINI_API_KEY`, `GROQ_API_KEY` | Same keys. |
| `SENTRY_AUTH_TOKEN` | Same. |
| `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` | Same. |
| `RESEND_API_KEY` | Same. |
| `CRON_SECRET` | Same value lives in **two** places: Vercel env vars (validates the incoming request) AND GitHub Actions repo secrets (workflow sends it). The cron itself is `.github/workflows/landing-cron.yml`, not Vercel Cron — Hobby blocks sub-daily schedules. Also set `LANDING_CRON_URL` as a GitHub Actions repo secret (e.g. `https://astrochaganti.com/api/cron/regenerate-landing`). The authenticated route schedules limiter cleanup with `after()` after its response: 5,000-row batches, 100,000-row maximum, 2.5-second operation timeout, and 10-second wall budget. |

Managed geocoding is not ready merely because these variables exist. Before any
activation flag changes, verify the selected provider policy, exact target DB,
current Turso usage/headroom, and the complete fixture-backed guest journey in
Preview.
No LocationIQ, Geoapify, Upstash, or Redis account is required for this
Nominatim release.
Verify that an upstream provider `429` becomes a sanitized app `429` with a
bounded `Retry-After`, while provider timeouts, transport failures, malformed
responses, and server errors become retryable `503` responses. For public
Nominatim, verify the exclusive acquire, late-lease discard, provider-failure
release, fenced cooldown, and crash-expiry cases; commercial fallbacks retain
the ordinary admission interval. Capacity-first accounting intentionally
charges attempts that later fail a user/fleet/client guard; before activation,
either accept that pool-exhaustion availability risk or add a fleet-wide
WAF/edge limit or atomic composite guard. Measure the complete cold-path guard
chain against the browser deadline as well: one cooperative two-second ceiling
now prevents later SQL
dispatch, but an operation already in flight may settle conservatively after
the caller receives `503`. Do not refund or auto-retry that ambiguous slot.
Keep the guest and authenticated managed-geocoder flags off until those gates
and the linked licensing/provider issues are closed. Public Nominatim must
remain absent in Preview and real local development.

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
