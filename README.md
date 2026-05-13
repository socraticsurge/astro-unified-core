# Astro Chaganti

Vedic-astrology birth-chart application by Dr. Vinay Kumar Chaganti.

- **Live**: https://astro-unified-core-pfni.vercel.app/
- **Docs**:
  - [`CHANGELOG.md`](CHANGELOG.md) — what changed in every push
  - [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — module reference, user types, user journey traces, code organisation
  - [`docs/BACKLOG.md`](docs/BACKLOG.md) — known bugs, deferred features, tech debt
  - [`docs/PROJECT.md`](docs/PROJECT.md) — env vars, DB schema, deployment gotchas, lessons learned
  - [`CLAUDE.md`](CLAUDE.md) — agent brief and documentation hygiene rules
- **Sidecar**: the Python service that generates charts lives in a separate
  repo, [socraticsurge/dashaflow-sidecar](https://github.com/socraticsurge/dashaflow-sidecar)
  (private), and is deployed at https://dashaflow-sidecar.vercel.app/.

## Quickstart

```bash
npm install
npm run dev      # http://localhost:3000
```

Required env (production values are set on Vercel; for local dev pull with
`vercel env pull`):

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_URL` (must equal the canonical Vercel alias), `NEXTAUTH_SECRET`
- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
- `DASHAFLOW_SIDECAR_URL` (defaults to the deployed sidecar)

See [`docs/PROJECT.md`](docs/PROJECT.md) for everything else.
