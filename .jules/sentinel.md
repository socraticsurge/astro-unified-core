## 2024-05-13 - Security Headers Configuration
**Vulnerability:** Missing default security headers (CSP, HSTS, Clickjacking prevention).
**Learning:** Next.js applications require explicit configuration in `next.config.ts` using the `async headers()` function to enforce essential HTTP security headers across all routes.
**Prevention:** Always verify `next.config.ts` includes a robust set of security headers, including `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy` as a defense-in-depth measure.
