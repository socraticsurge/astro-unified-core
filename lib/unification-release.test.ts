import { describe, expect, it } from "vitest";
import { getUnificationReleaseConfig } from "./unification-release";

const validStagingEnvironment = {
  UNIFIED_RELEASE_MODE: "rehearsal",
  NEXTAUTH_URL: "https://astro-unified-staging.vercel.app",
  VERCEL_PROJECT_PRODUCTION_URL: "astro-unified-staging.vercel.app",
  TURSO_DATABASE_URL:
    "libsql://astro-unified-staging-vkchaganti.aws-ap-south-1.turso.io",
  PANCHANGAM_API_URL: "https://telugu-calendar-api-staging.vercel.app",
};

const validProductionEnvironment = {
  UNIFIED_RELEASE_MODE: "production",
  NEXTAUTH_URL: "https://astrochaganti.com",
  VERCEL_PROJECT_PRODUCTION_URL: "astrochaganti.com",
  TURSO_DATABASE_URL:
    "libsql://astrounified-live-vkchaganti.aws-ap-south-1.turso.io",
  PANCHANGAM_API_URL: "https://telugu-calendar-api-production.vercel.app",
};

const validLocalReviewEnvironment = {
  ...validStagingEnvironment,
  ASTRO_LOCAL_REVIEW: "enabled",
  NODE_ENV: "development",
  NEXTAUTH_URL: "http://localhost:3001",
  VERCEL_PROJECT_PRODUCTION_URL: "localhost",
  PANCHANGAM_API_URL: "http://127.0.0.1:8000",
};

describe("getUnificationReleaseConfig", () => {
  it("enables the unified root only for the complete staging graph", () => {
    expect(getUnificationReleaseConfig(validStagingEnvironment)).toEqual({
      mode: "rehearsal",
      reason: "staging-boundary-confirmed",
    });
  });

  it("enables local review only for the complete development graph", () => {
    expect(getUnificationReleaseConfig(validLocalReviewEnvironment)).toEqual({
      mode: "rehearsal",
      reason: "local-review-boundary-confirmed",
    });
  });

  it("rejects the local graph outside development", () => {
    expect(getUnificationReleaseConfig({
      ...validLocalReviewEnvironment,
      NODE_ENV: "production",
    })).toEqual({
      mode: "legacy",
      reason: "auth-url-boundary-mismatch",
    });
  });

  it.each([
    ["switch", { UNIFIED_RELEASE_MODE: "disabled" }, "switch-disabled"],
    ["auth URL", { NEXTAUTH_URL: "https://astrochaganti.com" }, "auth-url-boundary-mismatch"],
    ["project", { VERCEL_PROJECT_PRODUCTION_URL: "astrochaganti.com" }, "project-boundary-mismatch"],
    [
      "database",
      { TURSO_DATABASE_URL: "libsql://astrounified-live-vkchaganti.aws-ap-south-1.turso.io" },
      "database-boundary-mismatch",
    ],
    [
      "Panchangam service",
      { PANCHANGAM_API_URL: "https://telugu-calendar-api.vercel.app" },
      "panchangam-boundary-mismatch",
    ],
  ])("fails closed when the %s boundary is wrong", (_name, replacement, reason) => {
    expect(getUnificationReleaseConfig({ ...validStagingEnvironment, ...replacement })).toEqual({
      mode: "legacy",
      reason,
    });
  });

  it("enables a release candidate only for the complete production graph", () => {
    expect(getUnificationReleaseConfig(validProductionEnvironment)).toEqual({
      mode: "production",
      reason: "production-boundary-confirmed",
    });
  });

  it.each([
    ["auth URL", { NEXTAUTH_URL: validStagingEnvironment.NEXTAUTH_URL }, "auth-url-boundary-mismatch"],
    ["project", { VERCEL_PROJECT_PRODUCTION_URL: validStagingEnvironment.VERCEL_PROJECT_PRODUCTION_URL }, "project-boundary-mismatch"],
    ["database", { TURSO_DATABASE_URL: validStagingEnvironment.TURSO_DATABASE_URL }, "database-boundary-mismatch"],
    ["Panchangam service", { PANCHANGAM_API_URL: validStagingEnvironment.PANCHANGAM_API_URL }, "panchangam-boundary-mismatch"],
  ])("rejects a production switch with the %s staging dependency", (_name, replacement, reason) => {
    expect(getUnificationReleaseConfig({ ...validProductionEnvironment, ...replacement })).toEqual({
      mode: "legacy",
      reason,
    });
  });

  it("defaults to the existing production experience", () => {
    expect(getUnificationReleaseConfig({})).toEqual({
      mode: "legacy",
      reason: "switch-disabled",
    });
  });
});
