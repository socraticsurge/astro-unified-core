// Resolves the URL of the Python sidecar function.
//
// Why not VERCEL_URL? The deployment-specific URL (e.g.
// astro-unified-core-pfni-<hash>-<team>.vercel.app) is gated by Vercel SSO
// Deployment Protection and returns 401 for intra-deployment fetches.
// VERCEL_PROJECT_PRODUCTION_URL is the stable alias
// (astro-unified-core-pfni.vercel.app) which the SSO config exempts.
export const SIDECAR_URL =
  process.env.PYTHON_SIDECAR_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/api/python`
    : "http://localhost:3000/api/python");
