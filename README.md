# Astro Chaganti

Vedic-astrology birth-chart application by Dr. Vinay Kumar Chaganti.

- **Live**: https://astro-unified-core-pfni.vercel.app/
- **Docs**: see [`docs/PROJECT.md`](docs/PROJECT.md) for full architecture,
  env vars, schema, lessons learned, and what's not done yet.
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
