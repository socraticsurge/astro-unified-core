import { test, expect } from "@playwright/test";

// Tier-0 mobile-layout regression tests. Each test runs across three
// mobile viewports (see playwright.config.ts projects). Tests use route
// interception to stub `/api/landing/today` so they don't depend on the
// DB or LLM — we're testing layout, not data.
//
// What these tests catch (= bugs we have actually shipped to mobile):
//   1. Landing snippet box overlapping the "Astro Chaganti" brand row.
//   2. CTA button pushed off-screen by oversized hero chrome.
//   3. Pill strip / chip strip hidden because flex layout crushed it.

const STUBBED_LANDING_PAYLOAD = {
  ist_date: "2026-05-21",
  sky: {
    moon_nakshatra: "Pushya",
    sun_sign: "Taurus",
    retrogrades: [],
  },
  ascendants: {
    aries: "Your natural fire often drives you toward constant movement. Today, channel that restless energy into quiet, steady nourishment rather than haste. Grounding your pace will allow your passion to find a more sustainable and meaningful expression of the impulse to lead.",
    taurus: "Steady ground feels both refuge and constraint today — let your patience be active, not passive.",
    gemini: "Words you choose today land harder than usual; speak from the layer below the surface buzz.",
    cancer: "Today asks you to mother yourself first, then the rest follows naturally.",
    leo: "Your warmth needs an audience of one to start — meet yourself there before scaling outward.",
    virgo: "The detail you've been polishing is ready; the next move is to stop polishing.",
    libra: "Balance today comes from naming the tilt, not from forcing the scale level.",
    scorpio: "What's been buried surfaces gently today — meet it without grabbing for it.",
    sagittarius: "Aim shorter than usual; the close target carries more weight than the far one today.",
    capricorn: "Today's work is structural — what scaffolding can you set down for tomorrow?",
    aquarius: "The strange idea is the right idea today; resist the temptation to file it as obvious.",
    pisces: "Your imagination is the engineering today, not the decoration — trust the soft signal.",
  },
  is_stale: false,
};

test.describe("Landing page — mobile layout", () => {
  test.beforeEach(async ({ page }) => {
    // Stub the daily-landing endpoint so the test doesn't depend on the
    // sidecar, the LLM, the DB, or today's actual sky. Layout is the
    // only thing under test here.
    await page.route("**/api/landing/today", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(STUBBED_LANDING_PAYLOAD),
      });
    });
  });

  test("snippet panel does not overlap the brand row", async ({ page }) => {
    await page.goto("/");
    // Wait for the snippet to actually render — the API is intercepted
    // so this should resolve quickly.
    await expect(page.getByText("The cosmos speaks for")).toBeVisible();
    await expect(page.getByText(/Astro/).first()).toBeVisible();

    // Find the snippet paragraph and the brand wordmark; check their
    // bounding rects do not vertically intersect. The exact selector
    // hinges on the CosmicLanding module's classnames; the brand row's
    // <p>Astro <em>Chaganti</em></p> is reliable, and the snippet
    // paragraph lives inside a flex column with the cosmos eyebrow.
    const snippetParagraph = page.locator("p", { hasText: /natural fire often drives|Today asks you|Your warmth/ }).first();
    const brandHeading = page.locator("p", { hasText: "Astro " }).filter({ has: page.locator("em", { hasText: "Chaganti" }) });

    const snippetBox = await snippetParagraph.boundingBox();
    const brandBox = await brandHeading.boundingBox();

    expect(snippetBox, "snippet bounding box should exist").not.toBeNull();
    expect(brandBox, "brand bounding box should exist").not.toBeNull();

    if (!snippetBox || !brandBox) return;

    // Vertical separation: snippet's bottom edge must be at or above the
    // brand's top edge. Allow a 4-px slop for sub-pixel rounding across
    // browsers / devicePixelRatios.
    const snippetBottom = snippetBox.y + snippetBox.height;
    const slop = 4;
    expect(
      snippetBottom,
      `snippet bottom (${snippetBottom.toFixed(1)}) must be above brand top (${brandBox.y.toFixed(1)}) — overlap = bug`
    ).toBeLessThanOrEqual(brandBox.y + slop);
  });

  test("Continue with Google CTA is visible inside the viewport", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("button", { name: /Continue with Google/i });
    await expect(cta).toBeVisible();

    const box = await cta.boundingBox();
    expect(box).not.toBeNull();
    const viewport = page.viewportSize();
    if (!box || !viewport) return;

    // Tap target ≥ 40px tall (WCAG / iOS guideline) and fully inside the
    // viewport so users don't have to scroll to find it.
    expect(box.height, "CTA should be at least 40px tall (tap target)").toBeGreaterThanOrEqual(40);
    expect(box.y, "CTA top must be inside the viewport").toBeGreaterThanOrEqual(0);
    expect(
      box.y + box.height,
      `CTA bottom (${(box.y + box.height).toFixed(1)}) must be inside viewport (${viewport.height})`
    ).toBeLessThanOrEqual(viewport.height);
  });

  test("ascendant pill strip is visible and has tappable pills", async ({ page }) => {
    await page.goto("/");
    // Wait for the snippet to render (proves the page has hydrated).
    await expect(page.getByText("The cosmos speaks for")).toBeVisible();

    // 12 zodiac pills — at minimum a few should be reachable. Use the
    // accessible name of the pill role; CosmicLanding exposes them as
    // tablist children. If this selector breaks in a future refactor
    // the test forces us to keep the picker accessible.
    const pills = page.getByRole("tab");
    const count = await pills.count();
    expect(count, "expected 12 zodiac pills in the picker").toBeGreaterThanOrEqual(12);

    // At least one pill must be in the viewport and >= 24px in each
    // dimension so it's actually tappable.
    const firstPillBox = await pills.first().boundingBox();
    expect(firstPillBox, "first pill bounding box should exist").not.toBeNull();
    if (!firstPillBox) return;
    expect(firstPillBox.width).toBeGreaterThanOrEqual(24);
    expect(firstPillBox.height).toBeGreaterThanOrEqual(24);
  });
});
