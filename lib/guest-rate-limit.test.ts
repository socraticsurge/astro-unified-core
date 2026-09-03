import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./rate-limit", () => ({ rateLimit: vi.fn() }));
vi.mock("./distributed-rate-limit", () => ({ distributedRateLimit: vi.fn() }));

import { distributedRateLimit } from "./distributed-rate-limit";
import { enforceGuestRateLimit } from "./guest-rate-limit";
import { rateLimit } from "./rate-limit";

const ALLOWED = {
  success: true,
  remaining: 4,
  retryAfterSeconds: 42,
  configured: true,
  unavailable: false,
};

describe("enforceGuestRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimit).mockReturnValue({ success: true, limit: 5, remaining: 4 });
    vi.mocked(distributedRateLimit).mockResolvedValue(ALLOWED);
  });

  it("rejects locally before shared storage and preserves the fixed retry window", async () => {
    vi.mocked(rateLimit).mockReturnValue({ success: false, limit: 5, remaining: 0 });
    await expect(enforceGuestRateLimit("places", "203.0.113.10", {
      env: { NODE_ENV: "production" },
    })).resolves.toEqual({
      success: false,
      unavailable: false,
      retryAfterSeconds: 60,
      scope: "client",
    });
    expect(distributedRateLimit).not.toHaveBeenCalled();
  });

  it("uses only the process-local layer in an explicit local runtime", async () => {
    await expect(enforceGuestRateLimit("profile-derive", "203.0.113.11", {
      env: { NODE_ENV: "test" },
    })).resolves.toEqual({
      success: true,
      unavailable: false,
      retryAfterSeconds: 0,
      scope: null,
    });
    const processKey = vi.mocked(rateLimit).mock.calls[0][0];
    expect(processKey).toMatch(
      /^guest:profile-derive:client:[a-f0-9]{64}$/,
    );
    expect(processKey).not.toContain("203.0.113.11");
    expect(distributedRateLimit).not.toHaveBeenCalled();
  });

  it("never gives the process limiter a raw client address", async () => {
    const clientId = "2001:db8:85a3::8a2e:370:7334";
    await enforceGuestRateLimit("places", clientId, {
      env: { NODE_ENV: "test" },
    });

    const processKey = vi.mocked(rateLimit).mock.calls[0][0];
    expect(processKey).toMatch(/^guest:places:client:[a-f0-9]{64}$/);
    expect(processKey).not.toContain(clientId);
  });

  it.each([
    ["places", 60, "geocoder:fleet"],
    ["profile-derive", 30, "guest:profile-derive:fleet"],
    ["election-charts", 10, "guest:election-charts:fleet"],
  ] as const)("enforces shared per-client and fleet budgets for %s", async (
    namespace,
    fleetLimit,
    fleetKey,
  ) => {
    await expect(enforceGuestRateLimit(namespace, "203.0.113.12", {
      env: { NODE_ENV: "production" },
    })).resolves.toEqual({
      success: true,
      unavailable: false,
      retryAfterSeconds: 0,
      scope: null,
    });
    expect(distributedRateLimit).toHaveBeenNthCalledWith(
      1,
      `guest:${namespace}:203.0.113.12`,
      5,
      60_000,
      { env: { NODE_ENV: "production" } },
    );
    expect(vi.mocked(rateLimit).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(distributedRateLimit).mock.invocationCallOrder[0],
    );
    expect(vi.mocked(distributedRateLimit).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(distributedRateLimit).mock.invocationCallOrder[1],
    );
    expect(distributedRateLimit).toHaveBeenNthCalledWith(
      2,
      fleetKey,
      fleetLimit,
      60_000,
      { env: { NODE_ENV: "production" } },
    );
  });

  it("does not charge the fleet budget after a shared client rejection", async () => {
    vi.mocked(distributedRateLimit).mockResolvedValueOnce({
      ...ALLOWED,
      success: false,
      remaining: 0,
      retryAfterSeconds: 17,
    });
    await expect(enforceGuestRateLimit("places", "203.0.113.13", {
      env: { NODE_ENV: "production" },
    })).resolves.toEqual({
      success: false,
      unavailable: false,
      retryAfterSeconds: 17,
      scope: "client",
    });
    expect(distributedRateLimit).toHaveBeenCalledTimes(1);
  });

  it("reports a fleet rejection distinctly", async () => {
    vi.mocked(distributedRateLimit)
      .mockResolvedValueOnce(ALLOWED)
      .mockResolvedValueOnce({
        ...ALLOWED,
        success: false,
        remaining: 0,
        retryAfterSeconds: 9,
      });
    await expect(enforceGuestRateLimit("election-charts", "203.0.113.14", {
      env: { NODE_ENV: "production" },
    })).resolves.toEqual({
      success: false,
      unavailable: false,
      retryAfterSeconds: 9,
      scope: "fleet",
    });
  });

  it("fails closed before fleet accounting when shared storage is unavailable", async () => {
    vi.mocked(distributedRateLimit).mockResolvedValueOnce({
      ...ALLOWED,
      success: false,
      unavailable: true,
      remaining: 0,
      retryAfterSeconds: 10,
    });
    await expect(enforceGuestRateLimit("profile-derive", "203.0.113.15", {
      env: { VERCEL_ENV: "staging" },
    })).resolves.toEqual({
      success: false,
      unavailable: true,
      retryAfterSeconds: 10,
      scope: "shared-storage",
    });
    expect(distributedRateLimit).toHaveBeenCalledTimes(1);
  });

  it("fails closed when fleet accounting becomes unavailable", async () => {
    vi.mocked(distributedRateLimit)
      .mockResolvedValueOnce(ALLOWED)
      .mockResolvedValueOnce({
        ...ALLOWED,
        success: false,
        unavailable: true,
        remaining: 0,
        retryAfterSeconds: 11,
      });
    await expect(enforceGuestRateLimit("places", "203.0.113.16", {
      env: { NODE_ENV: "production" },
    })).resolves.toEqual({
      success: false,
      unavailable: true,
      retryAfterSeconds: 11,
      scope: "shared-storage",
    });
    expect(distributedRateLimit).toHaveBeenCalledTimes(2);
  });
});
