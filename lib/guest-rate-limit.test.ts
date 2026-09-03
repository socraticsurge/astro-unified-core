import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./rate-limit", () => ({ rateLimit: vi.fn() }));
vi.mock("./distributed-rate-limit", () => ({
  distributedRateLimit: vi.fn(),
  distributedRateLimitStatus: vi.fn(),
}));

import {
  distributedRateLimit,
  distributedRateLimitStatus,
} from "./distributed-rate-limit";
import { enforceGuestRateLimit } from "./guest-rate-limit";
import { rateLimit } from "./rate-limit";

const ALLOWED = {
  success: true,
  remaining: 4,
  retryAfterSeconds: 42,
  configured: true,
  unavailable: false,
};
const DEPLOYED_ENV = {
  NODE_ENV: "production",
  VERCEL_ENV: "production",
} as const;

function distributedOptions(
  env: Record<string, string | undefined>,
) {
  return { env, signal: expect.any(AbortSignal) };
}

function settleWhenAborted(signal: AbortSignal): Promise<typeof ALLOWED> {
  if (signal.aborted) return Promise.resolve(ALLOWED);
  return new Promise((resolve) => {
    signal.addEventListener("abort", () => resolve(ALLOWED), { once: true });
  });
}

describe("enforceGuestRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimit).mockReturnValue({ success: true, limit: 5, remaining: 4 });
    vi.mocked(distributedRateLimit).mockResolvedValue(ALLOWED);
    vi.mocked(distributedRateLimitStatus).mockResolvedValue(ALLOWED);
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
    expect(distributedRateLimitStatus).not.toHaveBeenCalled();
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
    expect(distributedRateLimitStatus).not.toHaveBeenCalled();
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
    ["places", 30, "geocoder:fleet"],
    ["profile-derive", 30, "guest:profile-derive:fleet"],
    ["election-charts", 10, "guest:election-charts:fleet"],
  ] as const)("enforces shared per-client and fleet budgets for %s", async (
    namespace,
    fleetLimit,
    fleetKey,
  ) => {
    await expect(enforceGuestRateLimit(namespace, "203.0.113.12", {
      env: DEPLOYED_ENV,
    })).resolves.toEqual({
      success: true,
      unavailable: false,
      retryAfterSeconds: 0,
      scope: null,
    });
    expect(distributedRateLimitStatus).toHaveBeenCalledWith(
      "guest:all-routes:daily-capacity",
      10_000,
      86_400_000,
      distributedOptions(DEPLOYED_ENV),
    );
    expect(distributedRateLimit).toHaveBeenNthCalledWith(
      1,
      "guest:all-routes:daily-capacity",
      10_000,
      86_400_000,
      distributedOptions(DEPLOYED_ENV),
    );
    expect(distributedRateLimit).toHaveBeenNthCalledWith(
      2,
      fleetKey,
      fleetLimit,
      60_000,
      distributedOptions(DEPLOYED_ENV),
    );
    expect(vi.mocked(rateLimit).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(distributedRateLimitStatus).mock.invocationCallOrder[0],
    );
    expect(vi.mocked(distributedRateLimitStatus).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(distributedRateLimit).mock.invocationCallOrder[0],
    );
    expect(distributedRateLimit).toHaveBeenNthCalledWith(
      3,
      `guest:${namespace}:203.0.113.12`,
      5,
      60_000,
      distributedOptions(DEPLOYED_ENV),
    );
    const sharedCallOrder = vi.mocked(distributedRateLimit).mock.invocationCallOrder;
    expect(sharedCallOrder[0]).toBeLessThan(sharedCallOrder[1]);
    expect(sharedCallOrder[1]).toBeLessThan(sharedCallOrder[2]);
  });

  it("uses the lower Preview daily capacity for both preflight and admission", async () => {
    const env = {
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
    } as const;

    await expect(enforceGuestRateLimit("places", "203.0.113.19", { env }))
      .resolves.toMatchObject({ success: true });
    expect(distributedRateLimitStatus).toHaveBeenCalledWith(
      "guest:all-routes:daily-capacity",
      2_000,
      86_400_000,
      distributedOptions(env),
    );
    expect(distributedRateLimit).toHaveBeenNthCalledWith(
      1,
      "guest:all-routes:daily-capacity",
      2_000,
      86_400_000,
      distributedOptions(env),
    );
  });

  it("charges capacity but does not create a client row after a fleet rejection", async () => {
    vi.mocked(distributedRateLimit)
      .mockResolvedValueOnce(ALLOWED)
      .mockResolvedValueOnce({
        ...ALLOWED,
        success: false,
        remaining: 0,
        retryAfterSeconds: 17,
      });
    await expect(enforceGuestRateLimit("places", "203.0.113.13", {
      env: DEPLOYED_ENV,
    })).resolves.toEqual({
      success: false,
      unavailable: false,
      retryAfterSeconds: 17,
      scope: "fleet",
    });
    expect(distributedRateLimit).toHaveBeenCalledTimes(2);
    expect(distributedRateLimit).toHaveBeenNthCalledWith(
      1,
      "guest:all-routes:daily-capacity",
      10_000,
      86_400_000,
      distributedOptions(DEPLOYED_ENV),
    );
    expect(distributedRateLimit).toHaveBeenNthCalledWith(
      2,
      "geocoder:fleet",
      30,
      60_000,
      distributedOptions(DEPLOYED_ENV),
    );
  });

  it("keeps rotated identifiers behind the fleet while charging the hard capacity envelope", async () => {
    vi.mocked(distributedRateLimit).mockImplementation(async (key) => (
      key === "guest:all-routes:daily-capacity"
        ? ALLOWED
        : {
          ...ALLOWED,
          success: false,
          remaining: 0,
          retryAfterSeconds: 8,
        }
    ));
    for (let index = 0; index < 50; index += 1) {
      await enforceGuestRateLimit("places", `198.51.100.${index}`, {
        env: { NODE_ENV: "production", VERCEL_ENV: "production" },
      });
    }
    expect(distributedRateLimit).toHaveBeenCalledTimes(100);
    const calls = vi.mocked(distributedRateLimit).mock.calls;
    for (let index = 0; index < calls.length; index += 2) {
      expect(calls[index][0]).toBe("guest:all-routes:daily-capacity");
      expect(calls[index + 1][0]).toBe("geocoder:fleet");
    }
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
      env: DEPLOYED_ENV,
    })).resolves.toEqual({
      success: false,
      unavailable: false,
      retryAfterSeconds: 9,
      scope: "fleet",
    });
    expect(distributedRateLimit).toHaveBeenCalledTimes(2);
  });

  it("fails closed before client accounting when shared storage is unavailable", async () => {
    vi.mocked(distributedRateLimitStatus).mockResolvedValueOnce({
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
    expect(distributedRateLimit).not.toHaveBeenCalled();
  });

  it("stops all shared writes after the deployment daily capacity is full", async () => {
    vi.mocked(distributedRateLimitStatus).mockResolvedValueOnce({
      ...ALLOWED,
      success: false,
      remaining: 0,
      retryAfterSeconds: 3_600,
    });
    await expect(enforceGuestRateLimit("places", "203.0.113.17", {
      env: DEPLOYED_ENV,
    })).resolves.toEqual({
      success: false,
      unavailable: false,
      retryAfterSeconds: 3_600,
      scope: "capacity",
    });
    expect(distributedRateLimit).not.toHaveBeenCalled();
  });

  it("honors the final atomic daily admission under a preflight race", async () => {
    vi.mocked(distributedRateLimit).mockResolvedValueOnce({
      ...ALLOWED,
      success: false,
      remaining: 0,
      retryAfterSeconds: 4_200,
    });
    await expect(enforceGuestRateLimit("places", "203.0.113.18", {
      env: DEPLOYED_ENV,
    })).resolves.toEqual({
      success: false,
      unavailable: false,
      retryAfterSeconds: 4_200,
      scope: "capacity",
    });
    expect(distributedRateLimit).toHaveBeenCalledTimes(1);
  });

  it("fails closed when final daily capacity storage becomes unavailable", async () => {
    vi.mocked(distributedRateLimit).mockResolvedValueOnce({
      ...ALLOWED,
      success: false,
      unavailable: true,
      remaining: 0,
      retryAfterSeconds: 10,
    });
    await expect(enforceGuestRateLimit("places", "203.0.113.20", {
      env: DEPLOYED_ENV,
    })).resolves.toEqual({
      success: false,
      unavailable: true,
      retryAfterSeconds: 10,
      scope: "shared-storage",
    });
    expect(distributedRateLimit).toHaveBeenCalledTimes(1);
  });

  it("fails closed after charging capacity when fleet storage is unavailable", async () => {
    vi.mocked(distributedRateLimit)
      .mockResolvedValueOnce(ALLOWED)
      .mockResolvedValueOnce({
        ...ALLOWED,
        success: false,
        unavailable: true,
        remaining: 0,
        retryAfterSeconds: 12,
      });
    await expect(enforceGuestRateLimit("places", "203.0.113.21", {
      env: DEPLOYED_ENV,
    })).resolves.toEqual({
      success: false,
      unavailable: true,
      retryAfterSeconds: 12,
      scope: "shared-storage",
    });
    expect(distributedRateLimit).toHaveBeenCalledTimes(2);
  });

  it("fails closed when client accounting becomes unavailable", async () => {
    vi.mocked(distributedRateLimit)
      .mockResolvedValueOnce(ALLOWED)
      .mockResolvedValueOnce(ALLOWED)
      .mockResolvedValueOnce({
        ...ALLOWED,
        success: false,
        unavailable: true,
        remaining: 0,
        retryAfterSeconds: 11,
      });
    await expect(enforceGuestRateLimit("places", "203.0.113.16", {
      env: DEPLOYED_ENV,
    })).resolves.toEqual({
      success: false,
      unavailable: true,
      retryAfterSeconds: 11,
      scope: "shared-storage",
    });
    expect(distributedRateLimit).toHaveBeenCalledTimes(3);
  });

  it("reports a normal client rejection after capacity and fleet admission", async () => {
    vi.mocked(distributedRateLimit)
      .mockResolvedValueOnce(ALLOWED)
      .mockResolvedValueOnce(ALLOWED)
      .mockResolvedValueOnce({
        ...ALLOWED,
        success: false,
        remaining: 0,
        retryAfterSeconds: 14,
      });
    await expect(enforceGuestRateLimit("places", "203.0.113.22", {
      env: DEPLOYED_ENV,
    })).resolves.toEqual({
      success: false,
      unavailable: false,
      retryAfterSeconds: 14,
      scope: "client",
    });
    expect(distributedRateLimit).toHaveBeenCalledTimes(3);
    expect(distributedRateLimit).toHaveBeenNthCalledWith(
      1,
      "guest:all-routes:daily-capacity",
      10_000,
      86_400_000,
      distributedOptions(DEPLOYED_ENV),
    );
  });

  it("passes one cooperative abort signal through the entire deployed chain", async () => {
    await expect(enforceGuestRateLimit("places", "203.0.113.23", {
      env: DEPLOYED_ENV,
    })).resolves.toMatchObject({ success: true });

    const signals = [
      vi.mocked(distributedRateLimitStatus).mock.calls[0][3]?.signal,
      ...vi.mocked(distributedRateLimit).mock.calls.map(
        (call) => call[3]?.signal,
      ),
    ];
    expect(signals).toHaveLength(4);
    expect(signals.every((signal) => signal === signals[0])).toBe(true);
    expect(signals[0]).toBeInstanceOf(AbortSignal);
    expect(signals[0]?.aborted).toBe(false);
  });

  it.each([
    ["daily status", -1, []],
    ["daily capacity", 0, ["guest:all-routes:daily-capacity"]],
    ["fleet", 1, ["guest:all-routes:daily-capacity", "geocoder:fleet"]],
    ["client", 2, [
      "guest:all-routes:daily-capacity",
      "geocoder:fleet",
      "guest:places:203.0.113.24",
    ]],
  ] as const)(
    "fails closed when the shared deadline expires during %s and starts no later stage",
    async (_stage, blockedDistributedIndex, expectedWriteKeys) => {
      vi.useFakeTimers();
      try {
        const signals: AbortSignal[] = [];
        vi.mocked(distributedRateLimitStatus).mockImplementation(
          async (_key, _limit, _windowMs, options) => {
            const signal = options.signal;
            signals.push(signal);
            return blockedDistributedIndex === -1
              ? settleWhenAborted(signal)
              : ALLOWED;
          },
        );
        let writeIndex = 0;
        vi.mocked(distributedRateLimit).mockImplementation(
          async (_key, _limit, _windowMs, options) => {
            const signal = options.signal;
            signals.push(signal);
            const currentIndex = writeIndex;
            writeIndex += 1;
            return currentIndex === blockedDistributedIndex
              ? settleWhenAborted(signal)
              : ALLOWED;
          },
        );

        const result = enforceGuestRateLimit("places", "203.0.113.24", {
          env: DEPLOYED_ENV,
        });
        await vi.advanceTimersByTimeAsync(2_000);

        await expect(result).resolves.toEqual({
          success: false,
          unavailable: true,
          retryAfterSeconds: 10,
          scope: "shared-storage",
        });
        expect(vi.mocked(distributedRateLimit).mock.calls.map((call) => call[0]))
          .toEqual(expectedWriteKeys);
        expect(signals.every((signal) => signal === signals[0])).toBe(true);
        expect(signals[0]?.aborted).toBe(true);
        expect(vi.getTimerCount()).toBe(0);
        // Capacity and any earlier per-route counters stay admitted. The chain
        // performs no compensating write after the cooperative abort.
        expect(distributedRateLimit).toHaveBeenCalledTimes(
          expectedWriteKeys.length,
        );
      } finally {
        vi.useRealTimers();
      }
    },
  );
});
