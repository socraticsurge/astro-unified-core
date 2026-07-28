# Operational Runbook

> Production runbook for keeping the site healthy. Read alongside
> [`PROJECT.md`](PROJECT.md) (env vars / deployment gotchas) and
> [`ARCHITECTURE.md`](ARCHITECTURE.md) (how the parts fit together).

---

## Unification Gate 8 migration rehearsal

This rehearsal proves the release and rollback mechanics without touching the
production Vercel project, production Turso database, custom domains, Google
OAuth client, GitHub Pages deployment, feeds, or GitHub Actions.

### Hard boundary

The unified homepage can replace `/` only when `UNIFIED_RELEASE_MODE` is
`rehearsal` and all four independent staging facts match:

- `NEXTAUTH_URL=https://astro-unified-staging.vercel.app`
- `VERCEL_PROJECT_PRODUCTION_URL=astro-unified-staging.vercel.app`
- Turso host is `astro-unified-staging-vkchaganti.aws-ap-south-1.turso.io`
- `PANCHANGAM_API_URL=https://telugu-calendar-api-staging.vercel.app`

Any mismatch serves the existing `CosmicLanding`. Rehearsal metadata is
`noindex,nofollow`, and `/robots.txt` disallows `/`.

The code now also contains a fail-closed `production` mode for constructing a
Gate 9 release candidate. It activates only when the exact production web URL,
Vercel project host, Turso host and dedicated production Panchangam API URL all
match. The switch must remain unset in the production project until the owner
gives an explicit Gate 9 go/no-go approval; its presence in source is not
release authority.

### Forward rehearsal

1. Confirm `.vercel/project.json` names `astro-unified-staging`; stop if it does
   not.
2. Run tests, TypeScript, lint, palette, route and production-build checks.
3. Confirm only the dedicated staging project has
   `UNIFIED_RELEASE_MODE=rehearsal`.
4. Deploy that linked project with `vercel deploy --prod`. Here `--prod` means
   the stable alias of the staging project, never `astrochaganti.com`.
5. Require `/api/health` to return HTTP 200 with database, DashaFlow and Telugu
   Panchangam healthy, `unification.mode=rehearsal`, and staging auth ready.
6. Require `/` to show the unified home and `/robots.txt` to contain
   `Disallow: /`.
7. Exercise the synthetic owner/admin paths, public Panchangam/Rasi Phalalu,
   public Muhurtam and authenticated multi-profile timing.
8. Recheck `astrochaganti.com`, the Panchangam root and durable feed paths. They
   must remain HTTP 200 and independent of the rehearsal.

Vercel marks sensitive environment values as non-downloadable, so
`vercel env run` cannot supply the Turso token to local migration commands.
Operators must not weaken that setting. Run guarded migration commands only
with an explicitly provisioned one-purpose staging token, or use the
authenticated Turso CLI for non-sensitive schema/count verification.

### URL and subscriber compatibility during rehearsal

| Current URL family | Gate 8 behavior | Later cutover rule |
|---|---|---|
| `astrochaganti.com/` | Existing production homepage remains unchanged | Gate 9 approval is required before replacement |
| `astro-unified-staging.vercel.app/` | Unified homepage at the real root | Remains non-canonical and non-indexed |
| `astro-unified-staging.vercel.app/unified` | Review fallback remains available | Remove only after stabilization |
| `panchangam.astrochaganti.com/` | Existing GitHub Pages site remains HTTP 200 | No redirect before a separately approved mapping |
| `panchangam.astrochaganti.com/feeds/*` | Exact same-path HTTP 200; no redirect | Preserve same-path responses for subscribers |
| `panchangam.astrochaganti.com/rasi_phalalu/YYYY-MM-DD.json` | Exact same-path HTTP 200 | Preserve until every consumer is migrated |

### Rollback drill

1. Record the rehearsal deployment ID and the previous approved deployment ID.
2. Promote the previous deployment with
   `vercel promote <previous-id> --scope vinay-chagantis-projects --yes`.
3. Measure wall-clock recovery; require the stable staging alias and health
   endpoint to return HTTP 200 and confirm the rehearsal marker is absent.
4. Re-promote the rehearsal deployment, measure recovery again, and require
   `unification.mode=rehearsal` plus the unified root marker.
5. A production cutover must use the same deployment-level rollback pattern.
   Database restore is a separate action and is never inferred from an app
   rollback.

Initial release triggers are any dependency health failure, auth failure,
cross-user privacy failure, calculation mismatch, broken legacy feed path,
unexpected indexing, or sustained error/latency regression. The deployment
rollback target is under five minutes; the database recovery target remains
under one hour.

---

## Unification Gate 9 production release

Gate 9 is a controlled application cutover, not a retirement. The Panchangam
GitHub Pages site, Actions, calendar feeds, dated Rasi artifacts and previous
green Vercel deployments remain intact through stabilization.

### Current verified baseline (2026-07-22)

- Existing Astro production deployment:
  `dpl_F6yWeNZ2Mx9fzdjwMnan19cM9HdY`.
- Production Turso database: `astrounified-live`, schema 11, 11 application
  tables, 105 users and 125 profiles. Only aggregate counts were queried.
- Turso delete protection is `On`. A 2026-07-22 export passed SQLite integrity
  and exact aggregate parity after restoration to a disposable Turso database;
  this is the proven recovery path for Gate 9. The CLI reports the account plan
  as `starter`. Two native PITR clone attempts returned a Turso internal-server
  error and created no database, so native PITR remains an explicit operational
  caveat rather than claimed release evidence.
- Production Google provider advertises
  `https://astrochaganti.com/api/auth/callback/google`.
- Existing production `/robots.txt` and `/sitemap.xml` incorrectly redirect to
  sign-in. The release candidate makes both public and serves a sitemap.
- Telugu Calendar production API deployment
  `dpl_2WpDHW73JjfAc6ENG3L88vdYNL92` is `Ready` in `bom1` at
  `https://telugu-calendar-api-production.vercel.app`. Its fresh bearer token
  is sensitive and production-scoped in both Vercel projects; Astro production
  also has the exact API URL. Only the unaliased Gate 9 candidate consumes those
  values; current public traffic does not.
- Current Gate 9 staging deployment:
  `dpl_AbPww4DyMhD9D2QU4LntfcVh9RoU` on
  `https://astro-unified-staging.vercel.app`.
- Final unaliased Astro release candidate:
  `dpl_3VQvBeJransUK8MnN7QB6ksRSUQt` at
  `https://astro-unified-core-pfni-8h5ofdia0-vinay-chagantis-projects.vercel.app`.
  It is `Ready`; neither `astrochaganti.com` nor
  `astro-unified-core-pfni.vercel.app` points to it.

### Hard stops before go/no-go

Do not promote a production candidate until all of these are recorded:

1. **Complete 2026-07-22:** owner-approved portrait and public claims are in the
   candidate; the biography distinguishes owner-approved astrology experience
   from independently recorded academic credentials.
2. **Manual recovery complete 2026-07-22:** production delete protection is on;
   the owner-only export is gitignored on a FileVault-encrypted disk; integrity,
   schema and aggregate parity passed after a 4.916-second restore. Confirm the
   native PITR entitlement with Turso support/dashboard as an operational
   follow-up; its CLI restore path currently returns an internal-server error.
3. **Complete 2026-07-22:** deployed `telugu-calendar-api-production` from the
   reviewed Telugu Calendar Utilities source with a new shared bearer token.
   The same sensitive token exists only in the API and Astro production
   environments. Public health, rejected unauthenticated catalog,
   authenticated catalog and daily Panchangam contract checks passed.
4. **Candidate checks complete 2026-07-22:** Astro regression/build, public
   route/SEO, dependency health, protected-route and public-computation checks
   pass. Authenticated profile/chart/timing and admin journeys passed in the
   isolated Gate 8 rehearsal and must be repeated against the apex immediately
   after promotion because Google does not authorize generated candidate URLs.
5. **Monitoring path complete 2026-07-22:** Vercel runtime logs, health,
   Sentry, PostHog, Web Analytics and Speed Insights are wired; source maps
   uploaded and post-QA error-log scans were empty. The release owner watches
   the first hour. Roll back for dependency-health failure, elevated 5xx,
   Google sign-in failure, data-access regression or unusable public routes.
6. Receive explicit owner Gate 9 go/no-go approval. Staging approval and source
   readiness do not satisfy this condition.

### Candidate and cutover sequence

1. Deploy the Telugu Calendar production API first without changing any public
   domain. Verify authentication, health, Panchangam, Rasi Phalalu and personal
   timing responses against frozen fixtures.
2. Configure Astro production with the exact API URL/token and
   `UNIFIED_RELEASE_MODE=production`; build a deployment without assigning the
   apex domain.
3. On that deployment URL, verify the public homepage, Panchangam, horoscope,
   Muhurtam, robots, sitemap, health, error handling and responsive layout.
   Confirm the health response says `unification.mode=production`.
4. Give the owner the dated evidence and request the one explicit go/no-go.
5. After approval, promote the already-tested deployment to the production
   aliases. Do not run database migrations during the alias promotion.
6. Smoke-test production Google login with the owner's real account; create,
   read and delete a disposable profile; generate a chart and authenticated
   timing validation; verify owner admin access and a non-admin denial.
7. Watch health, Vercel functions, Sentry and analytics continuously for the
   first hour, then at 24 and 72 hours. Keep the old services publishing.

Steps 1–3 were completed on 2026-07-22 for candidate
`dpl_3VQvBeJransUK8MnN7QB6ksRSUQt`. Subsequent owner-review and resilience
changes mean that candidate is historical evidence, not the artifact to
promote. The production release environment retains the exact URL/token and
fail-closed switch, while `astrochaganti.com` still resolves to
`dpl_F6yWeNZ2Mx9fzdjwMnan19cM9HdY`.

After hosted review, freeze both dirty worktrees into reviewed Git commits,
then repeat Steps 1–3 from those exact SHAs. Step 4 is requested only for that
fresh, clean and fully verified candidate; no traffic moves before it.

### 2026-07-22 Astro release-candidate evidence

- Deployment `dpl_3VQvBeJransUK8MnN7QB6ksRSUQt` is `Ready`, unaliased from the
  apex and canonical project URL. Sentry source-map upload completed.
- `/api/health` is HTTP 200: Turso, DashaFlow and Panchangam are healthy and the
  release guard reports `production-boundary-confirmed`.
- `/`, `/robots.txt`, `/sitemap.xml`, Google provider discovery, Panchangam,
  Rasi Phalalu and public Muhurtam are HTTP 200. The root contains the unified
  brand/profile/Muhurtam markers and no rehearsal banner.
- Hyderabad Panchangam returned contract 1.0 with 24 Horas and 13 Lagna
  transitions. Mesha Rasi returned one evaluated condition. Three-day travel
  Muhurtam returned 12 public slots, an empty participant list and explicit
  disclosure that natal/dasha/participant factors were not evaluated.
- Anonymous `/dashboard` and `/admin` requests redirect to sign-in. A real
  Google login must be checked only after promotion on the already-authorized
  apex callback; generated deployment-host callbacks are not release evidence.
- 62 Vitest files / 481 tests, TypeScript, palette and all 27 internal routes
  pass. ESLint has zero errors and one pre-existing unused-type warning.
- Candidate and Telugu API runtime error-log scans after QA returned no errors.

### Hosted owner review

Gate 9 promotion is paused while the owner tests the durable rehearsal at
`https://astro-unified-staging.vercel.app`. Localhost is no longer the
acceptance handoff.

The stable alias currently resolves to
`dpl_AbPww4DyMhD9D2QU4LntfcVh9RoU`. It reports:

- `unification.mode=rehearsal` and `staging-boundary-confirmed`;
- healthy isolated Turso, DashaFlow and Telugu Calendar dependencies;
- synthetic staging auth ready;
- HTTP 200 for the root, sign-in, Panchangam and Rasi Phalalu routes;
- successful synthetic owner and admin login;
- non-admin denial and owner redirection away from `/admin`.

The deployment was produced by CLI from a dirty local worktree. It is valid for
owner review but cannot become the production source. After feedback is closed,
the web and Telugu API work must be committed, pushed, reviewed and rebuilt from
exact clean Git SHAs before a new unaliased production candidate is considered.
Any owner feedback will be implemented and the clean candidate reverified
before a go/no-go request.

The 2026-07-26 acceptance pass has one explicit limitation: the isolated
review graph has no `GOOGLE_GEMINI_API_KEY`. Optional Today/Natal prose therefore
shows a redacted retry state when regeneration is required; calculated chart,
dasha, transit, Muhurtam, and Tarabalam remain available. Do not represent this
as a successful non-production LLM-generation check. Provision a dedicated
staging key or repeat that journey only on an approved candidate with its
production-scoped key before closing the acceptance item. The current source
passes 63 Vitest files / 487 tests after the graceful-degradation coverage.

### 2026-07-22 Telugu Calendar production API evidence

- Deployment: `dpl_2WpDHW73JjfAc6ENG3L88vdYNL92`, `Ready`, FastAPI on Python
  3.12, function region `bom1`, 60-second maximum.
- Stable alias: `https://telugu-calendar-api-production.vercel.app`.
- `GET /health`: HTTP 200, contract `1.0`, `private, no-store`.
- `GET /v1/catalog` without a token: HTTP 401 with the stable `unauthorized`
  error shape; with the production token: HTTP 200, 22 cities and all three
  calculation systems. An untrusted Origin received no CORS allowance.
- `POST /v1/panchangam/day` for Hyderabad on 2026-07-22: HTTP 200, request ID
  propagated, 24 Horas and 13 Lagna transitions.
- Authenticated Rasi Phalalu, two-day single-profile Tarabalam and two-day
  single-profile travel Muhurtam checks each returned HTTP 200. Only the
  request-local label `p1` crossed the service boundary; the Muhurtam response
  contained nine slots and the expected evaluated/not-evaluated disclosures.
- Vercel historical error-log scan after the smoke tests returned no errors.
- The secret was generated locally, sent only through stdin, never printed or
  committed, and removed from the workstation after verification.

### Rollback

Promote `dpl_F6yWeNZ2Mx9fzdjwMnan19cM9HdY` back to the Astro production aliases
if a release trigger fires. Disable traffic to the new Panchangam API only after
the Astro rollback is healthy. Application rollback does not imply database
restore; use PITR/export recovery only for proven data corruption and only with
an incident record. GitHub Pages, feeds and Actions remain the compatibility
fallback throughout Gate 9 and Gate 10.

### 2026-07-22 Turso recovery evidence

- Production source: `astrounified-live`; delete protection verified `On`
  before and after the exercise.
- Export directory: `backups/gate9-2026-07-22/` (gitignored, mode 700,
  FileVault on); database artifacts are mode 600.
- Self-contained recovery image SHA-256:
  `7cf73903a84382578b2dce148d29dff765f44e0c354a0187023684f4cd2d5b8e`.
- Local integrity: `ok`; schema 11; 105 users and 125 profiles.
- Disposable clone: `astrounified-gate9-recovery-20260722`, created from the
  consolidated SQLite image in 4.916 seconds.
- Remote integrity: `ok`; 11 tables; exact parity of 105 users, 125 profiles,
  743 readings and 27 consultation requests. Only aggregates were queried.
- Clone destroyed in 1.149 seconds after verification; the final inventory is
  again staging, development and protected production only.
- The local recovery image remains the dated off-account artifact. Move a copy
  to a second encrypted device/location according to the weekly backup cadence.
- The Turso CLI identifies the account as `starter`, with overages disabled.
  Native PITR clone attempts at two timestamps returned `internal server error`;
  inventory checks confirmed no partial clone was created. Use the proven manual
  image workflow for Gate 9 recovery and raise the native PITR failure with
  Turso before treating PITR as an available rollback mechanism.

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

Turso documents point-in-time recovery with plan-dependent retention and a
restore that creates a new database. The public documentation currently lists
24 hours for Free, 10 days for Developer, 30 days for Scaler and 90 days for
Pro, with a possible gap of up to 15 seconds. The local CLI calls this account
`starter`, so do not infer an entitlement mapping from that label. The 2026-07-22
native restore test failed as recorded above; manual export/restore remains the
verified recovery path.

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
| `CRON_SECRET` | Same value lives in **two** places: Vercel env vars (validates the incoming request) AND GitHub Actions repo secrets (workflow sends it). The cron itself is `.github/workflows/landing-cron.yml`, not Vercel Cron — Hobby blocks sub-daily schedules. Also set `LANDING_CRON_URL` as a GitHub Actions repo secret (e.g. `https://astrochaganti.com/api/cron/regenerate-landing`). |

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
