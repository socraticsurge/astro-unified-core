# Astro Chaganti

Vedic-astrology birth-chart application by Dr. Vinay Kumar Chaganti.

- **Live**: https://astro-unified-core-pfni.vercel.app/
- **Docs**:
  - [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — module reference, file-by-file breakdown, user journey traces, code organisation notes
  - [`docs/PROJECT.md`](docs/PROJECT.md) — env vars, DB schema, deployment gotchas, lessons learned
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
