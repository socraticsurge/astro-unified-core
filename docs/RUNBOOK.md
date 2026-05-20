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

### Taking a manual snapshot (recommended before risky migrations)

Install the Turso CLI once: `curl -sSfL https://get.tur.so/install.sh | bash`

```bash
turso auth login                       # browser flow, one-time
turso db list                          # find the DB name
turso db shell <db-name> .dump > backups/$(date +%F).sql
```

The dump file is a plain SQL script — re-runnable on any SQLite instance.
Store it somewhere that is NOT the same Turso account (e.g. iCloud,
Google Drive, S3). The `backups/` folder is gitignored so commits don't
balloon.

### Restoring from a manual dump

1. Create a new DB: `turso db create <new-name>`
2. Pipe the dump in: `turso db shell <new-name> < backups/2026-05-20.sql`
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

*Update this runbook every time we discover a new failure mode or
recovery shortcut.*
