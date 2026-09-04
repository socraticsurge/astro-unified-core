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
  and is deployed at https://dashaflow-sidecar.vercel.app/. Public calculation
  activation requires both repositories to expose the exact deployed source.

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
- `DASHAFLOW_SIDECAR_TOKEN` (server-only bearer credential required for every
  sidecar compute call; must match the sidecar's `DASHAFLOW_API_TOKEN`)

See [`docs/PROJECT.md`](docs/PROJECT.md) for everything else.

## License and corresponding source

Astro Chaganti is licensed under the
[GNU Affero General Public License v3.0 or later](LICENSE). The corresponding
source is this repository. Network calculation responses also include a
`Link` header with `rel="source"` and `rel="license"`; `/api/health` reports the
same source offer and exact deployed revision when Vercel provides its commit
SHA. Third-party notices are recorded in
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

Earlier releases retain the grants made under their original license terms.
