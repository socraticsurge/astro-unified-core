import { test, expect } from "@playwright/test";

// Tier-0 mobile-layout regression tests. Each test runs across three
// mobile viewports (see playwright.config.ts projects). Network calculation
// responses are not assertions here — these tests protect shell geometry.
//
// What these tests catch (= bugs we have actually shipped to mobile):
//   1. The sticky day context overlapping the horoscope hero.
//   2. The primary profile CTA becoming clipped or too small to tap.
//   3. The Moon-sign picker being crushed or pushed outside the viewport.

test.describe("Landing page — mobile layout", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/public/**", (route) => route.abort());
  });

  test("day context does not overlap the horoscope hero", async ({ page }) => {
    await page.goto("/");
    const context = page.getByText("Today across Astro Chaganti");
    const heading = page.getByRole("heading", { name: "Your Moon sign, today." });
    await expect(context).toBeVisible();
    await expect(heading).toBeVisible();

    const contextBox = await context.boundingBox();
    const headingBox = await heading.boundingBox();
    expect(contextBox).not.toBeNull();
    expect(headingBox).not.toBeNull();
    if (!contextBox || !headingBox) return;
    expect(contextBox.y + contextBox.height).toBeLessThan(headingBox.y);
  });

  test("profile CTA is complete and tappable without horizontal overflow", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: /Add your birth profile/i });
    await cta.scrollIntoViewIfNeeded();
    await expect(cta).toBeVisible();

    const box = await cta.boundingBox();
    expect(box).not.toBeNull();
    const viewport = page.viewportSize();
    if (!box || !viewport) return;

    expect(box.height, "CTA should be at least 44px tall").toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    const geometry = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(geometry.scrollWidth).toBe(geometry.clientWidth);
  });

  test("Moon-sign picker is visible and has tappable choices", async ({ page }) => {
    await page.goto("/");
    const picker = page.getByRole("group", { name: "Choose your Moon sign" });
    await expect(picker).toBeVisible();
    const pills = picker.getByRole("button");
    const count = await pills.count();
    expect(count, "expected 12 Moon-sign choices").toBe(12);

    const firstPillBox = await pills.first().boundingBox();
    expect(firstPillBox, "first pill bounding box should exist").not.toBeNull();
    if (!firstPillBox) return;
    expect(firstPillBox.width).toBeGreaterThanOrEqual(44);
    expect(firstPillBox.height).toBeGreaterThanOrEqual(44);
  });
});
