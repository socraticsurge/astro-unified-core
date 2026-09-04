import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./distributed-rate-limit", () => ({
  reserveDistributedProviderRequest: vi.fn(),
}));

import { reserveDistributedProviderRequest } from "./distributed-rate-limit";
import { enforceGeocoderDailyRequestBudget } from "./geocoder-provider-budget";

const ALLOWED = {
  success: true,
  remaining: 1_499,
  retryAfterSeconds: 0,
  configured: true,
  unavailable: false,
};

describe("enforceGeocoderDailyRequestBudget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reserveDistributedProviderRequest).mockResolvedValue(ALLOWED);
  });

  it.each(["preview", "production"] as const)(
    "delegates one cross-environment UTC-day provider budget in %s",
    async (vercelEnv) => {
      const env = {
        NODE_ENV: "production",
        VERCEL_ENV: vercelEnv,
        GEOCODER_PROVIDER: "locationiq-eu",
        GEOCODER_DAILY_REQUEST_LIMIT: "1500",
      };

      await expect(enforceGeocoderDailyRequestBudget({ env })).resolves.toEqual({
        success: true,
        unavailable: false,
        retryAfterSeconds: 0,
        denialReason: undefined,
      });
      expect(reserveDistributedProviderRequest).toHaveBeenCalledWith(
        "locationiq",
        1_500,
        { env },
      );
    },
  );

  it.each(["1", "1500"])("accepts bounded endpoint value %s", async (limit) => {
    const env = {
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      GEOCODER_PROVIDER: "locationiq-us",
      GEOCODER_DAILY_REQUEST_LIMIT: limit,
    };

    await expect(enforceGeocoderDailyRequestBudget({ env })).resolves
      .toMatchObject({ success: true, unavailable: false });
    expect(reserveDistributedProviderRequest).toHaveBeenCalledWith(
      "locationiq",
      Number(limit),
      { env },
    );
  });

  it("forwards the caller signal to the distributed provider reservation", async () => {
    const controller = new AbortController();
    const env = {
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      GEOCODER_PROVIDER: "geoapify",
      GEOCODER_DAILY_REQUEST_LIMIT: "1500",
    };

    await enforceGeocoderDailyRequestBudget({
      env,
      signal: controller.signal,
    });

    expect(reserveDistributedProviderRequest).toHaveBeenCalledWith(
      "geoapify",
      1_500,
      { env, signal: controller.signal },
    );
  });

  it.each([
    undefined,
    "",
    "0",
    "-1",
    "+1",
    "01",
    "1.5",
    "1e3",
    " 1500",
    "1500 ",
    "1501",
    "5000",
    "5001",
    "999999999999999999999",
  ])("fails closed for malformed or out-of-range limit %j", async (limit) => {
    const env = {
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      GEOCODER_PROVIDER: "locationiq-eu",
      GEOCODER_DAILY_REQUEST_LIMIT: limit,
    };

    await expect(enforceGeocoderDailyRequestBudget({ env })).resolves.toEqual({
      success: false,
      unavailable: true,
      retryAfterSeconds: 10,
    });
    expect(reserveDistributedProviderRequest).not.toHaveBeenCalled();
  });

  it("passes through exhaustion TTL without treating it as storage failure", async () => {
    vi.mocked(reserveDistributedProviderRequest).mockResolvedValue({
      ...ALLOWED,
      success: false,
      remaining: 0,
      retryAfterSeconds: 21_600,
      denialReason: "daily",
    });

    await expect(enforceGeocoderDailyRequestBudget({
      env: {
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        GEOCODER_PROVIDER: "locationiq-eu",
        GEOCODER_DAILY_REQUEST_LIMIT: "1500",
      },
    })).resolves.toEqual({
      success: false,
      unavailable: false,
      retryAfterSeconds: 21_600,
      denialReason: "daily",
    });
  });

  it("fails closed when Turso enforcement is unavailable", async () => {
    vi.mocked(reserveDistributedProviderRequest).mockResolvedValue({
      ...ALLOWED,
      success: false,
      remaining: 0,
      retryAfterSeconds: 10,
      unavailable: true,
    });

    await expect(enforceGeocoderDailyRequestBudget({
      env: {
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
        GEOCODER_PROVIDER: "locationiq-eu",
        GEOCODER_DAILY_REQUEST_LIMIT: "1500",
      },
    })).resolves.toEqual({
      success: false,
      unavailable: true,
      retryAfterSeconds: 10,
      denialReason: undefined,
    });
  });

  it("leaves explicit local Nominatim development independent of shared storage and configuration", async () => {
    await expect(enforceGeocoderDailyRequestBudget({
      env: { NODE_ENV: "test" },
    })).resolves.toEqual({
      success: true,
      unavailable: false,
      retryAfterSeconds: 0,
    });
    expect(reserveDistributedProviderRequest).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { VERCEL: "1", GEOCODER_PROVIDER: "locationiq-eu", GEOCODER_DAILY_REQUEST_LIMIT: "1500" },
    { NODE_ENV: "production", GEOCODER_PROVIDER: "locationiq-eu", GEOCODER_DAILY_REQUEST_LIMIT: "1500" },
    {
      NODE_ENV: "development",
      VERCEL_ENV: "production",
      GEOCODER_PROVIDER: "locationiq-eu",
      GEOCODER_DAILY_REQUEST_LIMIT: "1500",
    },
  ])("fails closed for an ambiguous runtime: %j", async (env) => {
    await expect(enforceGeocoderDailyRequestBudget({ env })).resolves.toEqual({
      success: false,
      unavailable: true,
      retryAfterSeconds: 10,
    });
    expect(reserveDistributedProviderRequest).not.toHaveBeenCalled();
  });
});
