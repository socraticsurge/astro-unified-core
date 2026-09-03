import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./distributed-rate-limit", () => ({
  distributedRateLimit: vi.fn(),
}));

import { distributedRateLimit } from "./distributed-rate-limit";
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
    vi.mocked(distributedRateLimit).mockResolvedValue(ALLOWED);
  });

  it.each(["preview", "production"] as const)(
    "delegates one atomic 24-hour counter to the centrally namespaced limiter in %s",
    async (vercelEnv) => {
      const env = {
        NODE_ENV: "production",
        VERCEL_ENV: vercelEnv,
        GEOCODER_DAILY_REQUEST_LIMIT: "1500",
      };

      await expect(enforceGeocoderDailyRequestBudget({ env })).resolves.toEqual({
        success: true,
        unavailable: false,
        retryAfterSeconds: 0,
      });
      expect(distributedRateLimit).toHaveBeenCalledWith(
        "geocoder:provider:daily",
        1_500,
        86_400_000,
        { env },
      );
    },
  );

  it.each(["1", "5000"])("accepts bounded endpoint value %s", async (limit) => {
    const env = {
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      GEOCODER_DAILY_REQUEST_LIMIT: limit,
    };

    await expect(enforceGeocoderDailyRequestBudget({ env })).resolves
      .toMatchObject({ success: true, unavailable: false });
    expect(distributedRateLimit).toHaveBeenCalledWith(
      "geocoder:provider:daily",
      Number(limit),
      86_400_000,
      { env },
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
    "5001",
    "999999999999999999999",
  ])("fails closed for malformed or out-of-range limit %j", async (limit) => {
    const env = {
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      GEOCODER_DAILY_REQUEST_LIMIT: limit,
    };

    await expect(enforceGeocoderDailyRequestBudget({ env })).resolves.toEqual({
      success: false,
      unavailable: true,
      retryAfterSeconds: 10,
    });
    expect(distributedRateLimit).not.toHaveBeenCalled();
  });

  it("passes through exhaustion TTL without treating it as storage failure", async () => {
    vi.mocked(distributedRateLimit).mockResolvedValue({
      ...ALLOWED,
      success: false,
      remaining: 0,
      retryAfterSeconds: 21_600,
    });

    await expect(enforceGeocoderDailyRequestBudget({
      env: {
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        GEOCODER_DAILY_REQUEST_LIMIT: "1500",
      },
    })).resolves.toEqual({
      success: false,
      unavailable: false,
      retryAfterSeconds: 21_600,
    });
  });

  it("fails closed when Redis enforcement is unavailable", async () => {
    vi.mocked(distributedRateLimit).mockResolvedValue({
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
        GEOCODER_DAILY_REQUEST_LIMIT: "1500",
      },
    })).resolves.toEqual({
      success: false,
      unavailable: true,
      retryAfterSeconds: 10,
    });
  });

  it("leaves explicit local Nominatim development independent of Redis and configuration", async () => {
    await expect(enforceGeocoderDailyRequestBudget({
      env: { NODE_ENV: "test" },
    })).resolves.toEqual({
      success: true,
      unavailable: false,
      retryAfterSeconds: 0,
    });
    expect(distributedRateLimit).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { VERCEL: "1", GEOCODER_DAILY_REQUEST_LIMIT: "1500" },
    { NODE_ENV: "production", GEOCODER_DAILY_REQUEST_LIMIT: "1500" },
    {
      NODE_ENV: "development",
      VERCEL_ENV: "production",
      GEOCODER_DAILY_REQUEST_LIMIT: "1500",
    },
  ])("fails closed for an ambiguous runtime: %j", async (env) => {
    await expect(enforceGeocoderDailyRequestBudget({ env })).resolves.toEqual({
      success: false,
      unavailable: true,
      retryAfterSeconds: 10,
    });
    expect(distributedRateLimit).not.toHaveBeenCalled();
  });
});
