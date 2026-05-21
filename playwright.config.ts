import { defineConfig } from "@playwright/test";

// Tier-0 layout-only E2E. Vitest already covers component + API + DB
// contracts; Playwright here exists to catch *visual layout* regressions
// at mobile widths — the bug class we've shipped to real users (NavBar
// wordmark crushing the profile chips, snippet overlapping the brand
// row, tab strip with no swipe affordance).
//
// Tests use route interception so they don't need a DB or LLM. The
// only real dependency is `next dev` serving HTML/CSS.

export default defineConfig({
  testDir: "./tests/playwright",
  // Three quick layout tests; no need to parallelize aggressively.
  fullyParallel: false,
  workers: 1,
  // CI not yet wired — keeping retries 0 to surface flake immediately
  // when run locally. When we add CI we can bump to 1.
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    // Capture screenshots on failure for triage — they land in
    // playwright-report/ which is gitignored.
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  // Three mobile viewports, all running in Chromium-headless. We
  // deliberately don't use the "iPhone …" device descriptors here —
  // those switch the engine to WebKit which would force every
  // developer to `playwright install webkit` (~250 MB). Mobile layout
  // bugs we've shipped have been CSS / flexbox issues, not
  // engine-specific. Chromium + a mobile viewport + isMobile catches
  // 99% of them at 1/3 the install cost.
  //
  // Viewports: 360 (small Android), 375 (iPhone SE / 12 mini),
  // 414 (Pixel 7 / iPhone Pro Max). All <700px so the mobile media
  // query (max-width: 700px) fires.
  projects: [
    {
      name: "mobile-360",
      use: {
        browserName: "chromium",
        viewport: { width: 360, height: 800 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "mobile-375",
      use: {
        browserName: "chromium",
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "mobile-414",
      use: {
        browserName: "chromium",
        viewport: { width: 414, height: 896 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  // Reuse an already-running dev server if one is up (faster local
  // iteration), otherwise spawn one. The server takes ~10s to warm
  // up on first request — bump the timeout.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
    // Stub env so the dev server starts without a real .env.local.
    // NextAuth refuses to boot without NEXTAUTH_SECRET; everything else
    // is touched only by API routes the layout tests don't exercise
    // (we route-intercept /api/landing/today). If a future test does
    // hit a DB route, add the relevant stub here rather than depending
    // on the developer's local .env.
    env: {
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "playwright-stub-secret-not-for-production",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
      NODE_ENV: "development",
    },
  },
});
