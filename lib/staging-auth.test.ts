import { describe, expect, it } from "vitest";
import { getStagingAuthConfig, validateStagingCredentials } from "./staging-auth";

const validEnvironment = {
  ASTRO_STAGING_AUTH: "enabled",
  NEXTAUTH_URL: "https://astro-unified-staging.vercel.app",
  TURSO_DATABASE_URL:
    "libsql://astro-unified-staging-vkchaganti.aws-ap-south-1.turso.io",
  STAGING_AUTH_EMAIL: "owner@staging.astrochaganti.test",
  STAGING_AUTH_PASSWORD: "a-long-synthetic-password",
  STAGING_AUTH_NAME: "Gate 7 Owner",
  STAGING_ADMIN_EMAIL: "admin@staging.astrochaganti.test",
  STAGING_ADMIN_PASSWORD: "another-synthetic-password",
  STAGING_ADMIN_NAME: "Gate 7 Admin",
};

describe("getStagingAuthConfig", () => {
  it("enables credentials only inside the complete staging boundary", () => {
    expect(getStagingAuthConfig(validEnvironment)).toMatchObject({
      enabled: true,
      accounts: expect.arrayContaining([
        expect.objectContaining({
          email: "owner@staging.astrochaganti.test",
          userId: "gate7-owner",
        }),
        expect.objectContaining({
          email: "admin@staging.astrochaganti.test",
          userId: "gate7-admin",
        }),
      ]),
    });
  });

  it("enables the same synthetic identities for an exact local review boundary", () => {
    expect(getStagingAuthConfig({
      ...validEnvironment,
      ASTRO_LOCAL_REVIEW: "enabled",
      NODE_ENV: "development",
      NEXTAUTH_URL: "http://localhost:3001",
    })).toMatchObject({ enabled: true });
  });

  it("rejects a localhost auth URL outside development", () => {
    expect(getStagingAuthConfig({
      ...validEnvironment,
      ASTRO_LOCAL_REVIEW: "enabled",
      NODE_ENV: "production",
      NEXTAUTH_URL: "http://localhost:3001",
    })).toEqual({ enabled: false, reason: "url-boundary-mismatch" });
  });

  it.each([
    ["switch", { ASTRO_STAGING_AUTH: "disabled" }, "switch-disabled"],
    ["URL", { NEXTAUTH_URL: "https://astrochaganti.com" }, "url-boundary-mismatch"],
    [
      "database",
      { TURSO_DATABASE_URL: "libsql://astrounified-live-vkchaganti.aws-ap-south-1.turso.io" },
      "database-boundary-mismatch",
    ],
    ["email", { STAGING_AUTH_EMAIL: "someone@example.com" }, "synthetic-email-required"],
    ["password", { STAGING_AUTH_PASSWORD: "too-short" }, "password-too-short"],
    [
      "admin email",
      { STAGING_ADMIN_EMAIL: "admin@example.com" },
      "synthetic-admin-email-required",
    ],
    [
      "admin password",
      { STAGING_ADMIN_PASSWORD: "too-short" },
      "admin-password-too-short",
    ],
  ])("fails closed when the %s boundary is wrong", (_name, replacement, reason) => {
    expect(getStagingAuthConfig({ ...validEnvironment, ...replacement })).toEqual({
      enabled: false,
      reason,
    });
  });
});

describe("validateStagingCredentials", () => {
  const config = getStagingAuthConfig(validEnvironment);
  if (!config.enabled) throw new Error("Test setup did not enable staging auth");

  it("returns the deterministic synthetic user for exact credentials", () => {
    expect(
      validateStagingCredentials(config, {
        email: "OWNER@staging.astrochaganti.test",
        password: "a-long-synthetic-password",
      }),
    ).toMatchObject({
      id: "gate7-owner",
      email: "owner@staging.astrochaganti.test",
    });
  });

  it("rejects an incorrect email or password", () => {
    expect(
      validateStagingCredentials(config, {
        email: "owner@staging.astrochaganti.test",
        password: "a-long-synthetic-passworD",
      }),
    ).toBeNull();
    expect(
      validateStagingCredentials(config, {
        email: "other@staging.astrochaganti.test",
        password: "a-long-synthetic-password",
      }),
    ).toBeNull();
  });

  it("supports a separate synthetic admin account", () => {
    expect(
      validateStagingCredentials(config, {
        email: "admin@staging.astrochaganti.test",
        password: "another-synthetic-password",
      }),
    ).toMatchObject({
      id: "gate7-admin",
      email: "admin@staging.astrochaganti.test",
    });
  });
});
