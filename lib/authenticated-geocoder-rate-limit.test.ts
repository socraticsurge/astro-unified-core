import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./rate-limit", () => ({ rateLimit: vi.fn() }));
vi.mock("./distributed-rate-limit", () => ({ distributedRateLimit: vi.fn() }));

import { distributedRateLimit } from "./distributed-rate-limit";
import { rateLimit } from "./rate-limit";
import { enforceAuthenticatedGeocoderRateLimit } from "./authenticated-geocoder-rate-limit";

const ALLOWED = {
  success: true,
  remaining: 9,
  retryAfterSeconds: 42,
  configured: true,
  unavailable: false,
};

describe("enforceAuthenticatedGeocoderRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimit).mockReturnValue({
      success: true,
      limit: 10,
      remaining: 9,
    });
    vi.mocked(distributedRateLimit).mockResolvedValue(ALLOWED);
  });

  it("uses a pseudonymous process key and skips shared storage locally", async () => {
    const userId = "private-user-id";
    await expect(enforceAuthenticatedGeocoderRateLimit(userId, {
      env: { NODE_ENV: "test" },
    })).resolves.toEqual({
      success: true,
      unavailable: false,
      retryAfterSeconds: 0,
      scope: null,
    });
    const processKey = vi.mocked(rateLimit).mock.calls[0][0];
    expect(processKey).toMatch(
      /^authenticated-geocoder:user:[a-f0-9]{64}$/,
    );
    expect(processKey).not.toContain(userId);
    expect(distributedRateLimit).not.toHaveBeenCalled();
  });

  it("enforces shared per-user and cross-journey fleet budgets", async () => {
    const env = { NODE_ENV: "production", VERCEL_ENV: "production" };
    await expect(enforceAuthenticatedGeocoderRateLimit("user-123", { env }))
      .resolves.toEqual({
        success: true,
        unavailable: false,
        retryAfterSeconds: 0,
        scope: null,
      });
    expect(distributedRateLimit).toHaveBeenNthCalledWith(
      1,
      "authenticated-geocoder:user:user-123",
      10,
      60_000,
      { env },
    );
    expect(distributedRateLimit).toHaveBeenNthCalledWith(
      2,
      "geocoder:fleet",
      60,
      60_000,
      { env },
    );
  });

  it("does not charge the fleet after a user rejection", async () => {
    vi.mocked(distributedRateLimit).mockResolvedValueOnce({
      ...ALLOWED,
      success: false,
      remaining: 0,
      retryAfterSeconds: 17,
    });
    await expect(enforceAuthenticatedGeocoderRateLimit("user-123", {
      env: { NODE_ENV: "production", VERCEL_ENV: "production" },
    })).resolves.toMatchObject({
      success: false,
      unavailable: false,
      retryAfterSeconds: 17,
      scope: "user",
    });
    expect(distributedRateLimit).toHaveBeenCalledTimes(1);
  });

  it("reports shared-storage and fleet failures without exposing the user", async () => {
    vi.mocked(distributedRateLimit).mockResolvedValueOnce({
      ...ALLOWED,
      success: false,
      unavailable: true,
      retryAfterSeconds: 10,
    });
    await expect(enforceAuthenticatedGeocoderRateLimit("user-123", {
      env: { NODE_ENV: "production", VERCEL_ENV: "production" },
    })).resolves.toMatchObject({
      success: false,
      unavailable: true,
      scope: "shared-storage",
    });

    vi.mocked(distributedRateLimit)
      .mockResolvedValueOnce(ALLOWED)
      .mockResolvedValueOnce({
        ...ALLOWED,
        success: false,
        remaining: 0,
        retryAfterSeconds: 9,
      });
    await expect(enforceAuthenticatedGeocoderRateLimit("user-456", {
      env: { NODE_ENV: "production", VERCEL_ENV: "production" },
    })).resolves.toMatchObject({
      success: false,
      unavailable: false,
      retryAfterSeconds: 9,
      scope: "fleet",
    });
  });

  it("rejects a missing or oversized user identifier before Redis", async () => {
    for (const userId of ["", "x".repeat(513)]) {
      await expect(enforceAuthenticatedGeocoderRateLimit(userId, {
        env: { NODE_ENV: "production", VERCEL_ENV: "production" },
      })).resolves.toMatchObject({
        success: false,
        unavailable: true,
        scope: "shared-storage",
      });
    }
    expect(rateLimit).not.toHaveBeenCalled();
    expect(distributedRateLimit).not.toHaveBeenCalled();
  });
});
