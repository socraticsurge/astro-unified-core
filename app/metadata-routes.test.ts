import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "./robots";
import sitemap from "./sitemap";

describe("public crawler metadata", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("publishes the canonical sitemap while excluding private and staging routes", () => {
    const result = robots();
    expect(result.sitemap).toBe("https://astrochaganti.com/sitemap.xml");
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rule.disallow).toEqual(expect.arrayContaining([
      "/admin/",
      "/api/",
      "/dashboard/",
      "/profiles/",
      "/unified",
    ]));
  });

  it("blocks all crawlers during the isolated migration rehearsal", () => {
    vi.stubEnv("UNIFIED_RELEASE_MODE", "rehearsal");
    vi.stubEnv("NEXTAUTH_URL", "https://astro-unified-staging.vercel.app");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "astro-unified-staging.vercel.app");
    vi.stubEnv(
      "TURSO_DATABASE_URL",
      "libsql://astro-unified-staging-vkchaganti.aws-ap-south-1.turso.io",
    );
    vi.stubEnv(
      "PANCHANGAM_API_URL",
      "https://telugu-calendar-api-staging.vercel.app",
    );

    expect(robots()).toEqual({
      rules: { userAgent: "*", disallow: "/" },
    });
  });

  it("publishes the production crawler policy only on the exact release graph", () => {
    vi.stubEnv("UNIFIED_RELEASE_MODE", "production");
    vi.stubEnv("NEXTAUTH_URL", "https://astrochaganti.com");
    vi.stubEnv(
      "VERCEL_PROJECT_PRODUCTION_URL",
      "astrochaganti.com",
    );
    vi.stubEnv(
      "TURSO_DATABASE_URL",
      "libsql://astrounified-live-vkchaganti.aws-ap-south-1.turso.io",
    );
    vi.stubEnv(
      "PANCHANGAM_API_URL",
      "https://telugu-calendar-api-production.vercel.app",
    );

    const result = robots();
    expect(result.sitemap).toBe("https://astrochaganti.com/sitemap.xml");
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rule.allow).toContain("/");
    expect(rule.disallow).not.toBe("/");
  });

  it("lists only intentional public production pages", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toEqual([
      "https://astrochaganti.com",
      "https://astrochaganti.com/privacy",
      "https://astrochaganti.com/terms",
      "https://astrochaganti.com/credits",
    ]);
  });
});
