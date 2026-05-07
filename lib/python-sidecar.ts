// Resolves the URL of the Python astrology sidecar function.
//
// Why VERCEL_PROJECT_PRODUCTION_URL? The deployment-specific URL
// (astro-unified-core-pfni-<hash>-<team>.vercel.app) is gated by Vercel SSO
// Deployment Protection and returns 401 on intra-deployment fetches; the
// stable project alias (astro-unified-core-pfni.vercel.app) is exempt.
//
// Why /api/sidecar (not /api/python)? Next.js framework integration claims
// the entire /api/* URL space and 500s subpaths that have no Next.js
// route handler. A single Python file at api/sidecar.py is auto-detected
// by Vercel and routed to the FastAPI app, which handles the full path.
export const SIDECAR_URL =
  process.env.PYTHON_SIDECAR_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/api/sidecar`
    : "http://localhost:3000/api/sidecar");
