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
import { rateLimit } from "./rate-limit";
import { enforceAuthenticatedGeocoderRateLimit } from "./authenticated-geocoder-rate-limit";

const ALLOWED = {
  success: true,
  remaining: 9,
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

describe("enforceAuthenticatedGeocoderRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimit).mockReturnValue({
      success: true,
      limit: 10,
      remaining: 9,
    });
    vi.mocked(distributedRateLimit).mockResolvedValue(ALLOWED);
    vi.mocked(distributedRateLimitStatus).mockResolvedValue(ALLOWED);
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
    expect(distributedRateLimitStatus).not.toHaveBeenCalled();
  });

  it("rejects at the process layer before any shared-storage work", async () => {
    vi.mocked(rateLimit).mockReturnValue({
      success: false,
      limit: 10,
      remaining: 0,
    });

    await expect(enforceAuthenticatedGeocoderRateLimit("user-local-limit", {
      env: DEPLOYED_ENV,
    })).resolves.toEqual({
      success: false,
      unavailable: false,
      retryAfterSeconds: 60,
      scope: "user",
    });
    expect(distributedRateLimitStatus).not.toHaveBeenCalled();
    expect(distributedRateLimit).not.toHaveBeenCalled();
  });

  it("enforces shared per-user and cross-journey fleet budgets", async () => {
    const env = DEPLOYED_ENV;
    await expect(enforceAuthenticatedGeocoderRateLimit("user-123", { env }))
      .resolves.toEqual({
        success: true,
        unavailable: false,
        retryAfterSeconds: 0,
        scope: null,
      });
    expect(distributedRateLimitStatus).toHaveBeenCalledWith(
      "authenticated-geocoder:daily-capacity",
      2_500,
      86_400_000,
      distributedOptions(env),
    );
    expect(distributedRateLimit).toHaveBeenNthCalledWith(
      1,
      "authenticated-geocoder:daily-capacity",
      2_500,
      86_400_000,
      distributedOptions(env),
    );
    expect(distributedRateLimit).toHaveBeenNthCalledWith(
      2,
      "authenticated-geocoder:user:user-123",
      10,
      60_000,
      distributedOptions(env),
    );
    expect(distributedRateLimit).toHaveBeenNthCalledWith(
      3,
      "geocoder:fleet",
      30,
      60_000,
      distributedOptions(env),
    );
    expect(vi.mocked(distributedRateLimitStatus).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(distributedRateLimit).mock.invocationCallOrder[0]);
    const sharedCallOrder = vi.mocked(distributedRateLimit).mock.invocationCallOrder;
    expect(sharedCallOrder[0]).toBeLessThan(sharedCallOrder[1]);
    expect(sharedCallOrder[1]).toBeLessThan(sharedCallOrder[2]);
  });

  it("uses the lower Preview authenticated daily capacity", async () => {
    const env = {
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
    } as const;

    await expect(enforceAuthenticatedGeocoderRateLimit("user-preview", { env }))
      .resolves.toMatchObject({ success: true });
    expect(distributedRateLimitStatus).toHaveBeenCalledWith(
      "authenticated-geocoder:daily-capacity",
      500,
      86_400_000,
      distributedOptions(env),
    );
    expect(distributedRateLimit).toHaveBeenNthCalledWith(
      1,
      "authenticated-geocoder:daily-capacity",
      500,
      86_400_000,
      distributedOptions(env),
    );
  });

  it("charges capacity but does not charge the fleet after a user rejection", async () => {
    vi.mocked(distributedRateLimit)
      .mockResolvedValueOnce(ALLOWED)
      .mockResolvedValueOnce({
        ...ALLOWED,
        success: false,
        remaining: 0,
        retryAfterSeconds: 17,
      });
    await expect(enforceAuthenticatedGeocoderRateLimit("user-123", {
      env: DEPLOYED_ENV,
    })).resolves.toMatchObject({
      success: false,
      unavailable: false,
      retryAfterSeconds: 17,
      scope: "user",
    });
    expect(distributedRateLimit).toHaveBeenCalledTimes(2);
    expect(distributedRateLimit).toHaveBeenNthCalledWith(
      1,
      "authenticated-geocoder:daily-capacity",
      2_500,
      86_400_000,
      distributedOptions(DEPLOYED_ENV),
    );
  });

  it("reports a daily-status storage failure without exposing the user", async () => {
    vi.mocked(distributedRateLimitStatus).mockResolvedValueOnce({
      ...ALLOWED,
      success: false,
      unavailable: true,
      retryAfterSeconds: 10,
    });
    await expect(enforceAuthenticatedGeocoderRateLimit("user-123", {
      env: DEPLOYED_ENV,
    })).resolves.toMatchObject({
      success: false,
      unavailable: true,
      scope: "shared-storage",
    });
    expect(distributedRateLimit).not.toHaveBeenCalled();
  });

  it("reports a normal fleet rejection after capacity and user admission", async () => {
    vi.mocked(distributedRateLimit)
      .mockResolvedValueOnce(ALLOWED)
      .mockResolvedValueOnce(ALLOWED)
      .mockResolvedValueOnce({
        ...ALLOWED,
        success: false,
        remaining: 0,
        retryAfterSeconds: 9,
      });
    await expect(enforceAuthenticatedGeocoderRateLimit("user-456", {
      env: DEPLOYED_ENV,
    })).resolves.toMatchObject({
      success: false,
      unavailable: false,
      retryAfterSeconds: 9,
      scope: "fleet",
    });
    expect(distributedRateLimit).toHaveBeenCalledTimes(3);
  });

  it("fails closed after charging capacity when user storage is unavailable", async () => {
    vi.mocked(distributedRateLimit)
      .mockResolvedValueOnce(ALLOWED)
      .mockResolvedValueOnce({
        ...ALLOWED,
        success: false,
        unavailable: true,
        remaining: 0,
        retryAfterSeconds: 11,
      });
    await expect(enforceAuthenticatedGeocoderRateLimit("user-storage", {
      env: DEPLOYED_ENV,
    })).resolves.toMatchObject({
      success: false,
      unavailable: true,
      retryAfterSeconds: 11,
      scope: "shared-storage",
    });
    expect(distributedRateLimit).toHaveBeenCalledTimes(2);
  });

  it("fails closed after capacity and user admission when fleet storage is unavailable", async () => {
    vi.mocked(distributedRateLimit)
      .mockResolvedValueOnce(ALLOWED)
      .mockResolvedValueOnce(ALLOWED)
      .mockResolvedValueOnce({
        ...ALLOWED,
        success: false,
        unavailable: true,
        remaining: 0,
        retryAfterSeconds: 12,
      });
    await expect(enforceAuthenticatedGeocoderRateLimit("fleet-storage", {
      env: DEPLOYED_ENV,
    })).resolves.toMatchObject({
      success: false,
      unavailable: true,
      retryAfterSeconds: 12,
      scope: "shared-storage",
    });
    expect(distributedRateLimit).toHaveBeenCalledTimes(3);
  });

  it("stops all shared writes after authenticated daily capacity is full", async () => {
    vi.mocked(distributedRateLimitStatus).mockResolvedValueOnce({
      ...ALLOWED,
      success: false,
      remaining: 0,
      retryAfterSeconds: 7_200,
    });
    await expect(enforceAuthenticatedGeocoderRateLimit("user-789", {
      env: DEPLOYED_ENV,
    })).resolves.toMatchObject({
      success: false,
      unavailable: false,
      retryAfterSeconds: 7_200,
      scope: "capacity",
    });
    expect(distributedRateLimit).not.toHaveBeenCalled();
  });

  it("honors the final atomic authenticated daily admission", async () => {
    vi.mocked(distributedRateLimit).mockResolvedValueOnce({
      ...ALLOWED,
      success: false,
      remaining: 0,
      retryAfterSeconds: 1_800,
    });
    await expect(enforceAuthenticatedGeocoderRateLimit("user-789", {
      env: DEPLOYED_ENV,
    })).resolves.toMatchObject({
      success: false,
      unavailable: false,
      retryAfterSeconds: 1_800,
      scope: "capacity",
    });
    expect(distributedRateLimit).toHaveBeenCalledTimes(1);
  });

  it("fails closed when final authenticated daily admission is unavailable", async () => {
    vi.mocked(distributedRateLimit).mockResolvedValueOnce({
      ...ALLOWED,
      success: false,
      unavailable: true,
      remaining: 0,
      retryAfterSeconds: 10,
    });
    await expect(enforceAuthenticatedGeocoderRateLimit("user-789", {
      env: DEPLOYED_ENV,
    })).resolves.toMatchObject({
      success: false,
      unavailable: true,
      retryAfterSeconds: 10,
      scope: "shared-storage",
    });
    expect(distributedRateLimit).toHaveBeenCalledTimes(1);
  });

  it("rejects a missing or oversized user identifier before shared storage", async () => {
    for (const userId of ["", "x".repeat(513)]) {
      await expect(enforceAuthenticatedGeocoderRateLimit(userId, {
        env: DEPLOYED_ENV,
      })).resolves.toMatchObject({
        success: false,
        unavailable: true,
        scope: "shared-storage",
      });
    }
    expect(rateLimit).not.toHaveBeenCalled();
    expect(distributedRateLimit).not.toHaveBeenCalled();
    expect(distributedRateLimitStatus).not.toHaveBeenCalled();
  });

  it("passes one cooperative abort signal through the entire deployed chain", async () => {
    await expect(enforceAuthenticatedGeocoderRateLimit("user-signal", {
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
    ["daily capacity", 0, ["authenticated-geocoder:daily-capacity"]],
    ["user", 1, [
      "authenticated-geocoder:daily-capacity",
      "authenticated-geocoder:user:user-deadline",
    ]],
    ["fleet", 2, [
      "authenticated-geocoder:daily-capacity",
      "authenticated-geocoder:user:user-deadline",
      "geocoder:fleet",
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

        const result = enforceAuthenticatedGeocoderRateLimit(
          "user-deadline",
          { env: DEPLOYED_ENV },
        );
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
        // Capacity and any earlier per-user counters stay admitted. The chain
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
