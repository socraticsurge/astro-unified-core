import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { distributedRateLimit } from "./distributed-rate-limit";

const ENV = {
  NODE_ENV: "production",
  VERCEL_ENV: "production",
  UPSTASH_REDIS_REST_URL: "https://shared-redis.example",
  UPSTASH_REDIS_REST_TOKEN: "private-test-token",
};

describe("distributedRateLimit", () => {
  it.each(["preview", "production"])(
    "fails closed in Vercel %s when shared storage is not configured",
    async (vercelEnv) => {
      await expect(distributedRateLimit("client", 5, 60_000, {
        env: { VERCEL_ENV: vercelEnv },
      })).resolves.toEqual(expect.objectContaining({
        success: false, configured: false, unavailable: true,
      }));
    },
  );

  it("lets local development rely on the existing process limiter", async () => {
    await expect(distributedRateLimit("client", 5, 60_000, {
      env: { NODE_ENV: "development" },
    })).resolves.toEqual({
      success: true,
      remaining: 5,
      retryAfterSeconds: 0,
      configured: false,
      unavailable: false,
    });
  });

  it.each([
    [{}, "missing runtime markers"],
    [{ VERCEL: "1" }, "Vercel without a recognized environment"],
    [{ VERCEL_ENV: "staging" }, "unknown Vercel environment"],
    [{ NODE_ENV: "development", VERCEL_ENV: "production" }, "contradictory markers"],
  ])("fails closed for %s", async (env) => {
    await expect(distributedRateLimit("client", 5, 60_000, { env })).resolves
      .toEqual(expect.objectContaining({
        success: false, configured: false, unavailable: true,
      }));
  });

  it("fails closed for self-hosted production without a trusted-proxy contract", async () => {
    await expect(distributedRateLimit("client", 5, 60_000, {
      env: { NODE_ENV: "production" },
    })).resolves.toEqual(expect.objectContaining({
      success: false, configured: false, unavailable: true,
    }));
  });

  it.each([
    [{
      UPSTASH_REDIS_REST_URL: "https://upstash.example",
      KV_REST_API_TOKEN: "kv-token",
    }],
    [{
      KV_REST_API_URL: "https://kv.example",
      UPSTASH_REDIS_REST_TOKEN: "upstash-token",
    }],
  ])("never composes a Redis URL and token from different namespaces: %j", async (partial) => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(distributedRateLimit("client", 5, 60_000, {
      env: { NODE_ENV: "production", VERCEL_ENV: "production", ...partial },
      fetcher,
    })).resolves.toEqual(expect.objectContaining({
      success: false, configured: false, unavailable: true,
    }));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("prefers a complete Upstash pair when both namespaces are complete", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ result: [1, 60_000] }), { status: 200 },
    ));
    await distributedRateLimit("client", 5, 60_000, {
      env: {
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        UPSTASH_REDIS_REST_URL: "https://complete-upstash.example",
        UPSTASH_REDIS_REST_TOKEN: "complete-upstash-token",
        KV_REST_API_URL: "https://complete-kv.example",
        KV_REST_API_TOKEN: "complete-kv-token",
      },
      fetcher,
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://complete-upstash.example",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer complete-upstash-token" }),
      }),
    );
  });

  it("falls back to a complete KV pair without mixing a partial Upstash pair", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ result: [1, 60_000] }), { status: 200 },
    ));
    await expect(distributedRateLimit("client", 5, 60_000, {
      env: {
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        UPSTASH_REDIS_REST_URL: "https://partial-upstash.example",
        KV_REST_API_URL: "https://complete-kv.example",
        KV_REST_API_TOKEN: "complete-kv-token",
      },
      fetcher,
    })).resolves.toEqual(expect.objectContaining({ success: true, configured: true }));
    expect(fetcher).toHaveBeenCalledWith(
      "https://complete-kv.example",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer complete-kv-token" }),
      }),
    );
  });

  it("uses one atomic Redis script and never sends the raw client key", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ result: [3, 42_001] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));

    const result = await distributedRateLimit(
      "guest:election-charts:203.0.113.21",
      5,
      60_000,
      { env: ENV, fetcher },
    );

    expect(result).toEqual({
      success: true,
      remaining: 2,
      retryAfterSeconds: 43,
      configured: true,
      unavailable: false,
    });
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://shared-redis.example");
    expect(init?.cache).toBe("no-store");
    expect(init?.redirect).toBe("error");
    expect(init?.headers).toEqual(expect.objectContaining({
      Authorization: "Bearer private-test-token",
    }));
    const command = JSON.parse(String(init?.body));
    expect(command[0]).toBe("EVAL");
    expect(command[2]).toBe("1");
    expect(command[3]).toMatch(/^astrochaganti:rate-limit:[a-f0-9]{64}$/);
    expect(command[3]).toBe(`astrochaganti:rate-limit:${createHmac(
      "sha256",
      ENV.UPSTASH_REDIS_REST_TOKEN,
    ).update("vercel:production:guest:election-charts:203.0.113.21").digest("hex")}`);
    expect(String(init?.body)).not.toContain("203.0.113.21");
    expect(String(init?.body)).not.toContain("production");
  });

  it("derives different opaque Redis keys for the same limiter key in Preview and Production", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ result: [1, 60_000] }), { status: 200 },
    ));
    const rawKey = "guest:geocoding:203.0.113.21";

    await distributedRateLimit(rawKey, 5, 60_000, {
      env: { ...ENV, VERCEL_ENV: "preview" },
      fetcher,
    });
    await distributedRateLimit(rawKey, 5, 60_000, {
      env: { ...ENV, VERCEL_ENV: "production" },
      fetcher,
    });

    const redisKeys = fetcher.mock.calls.map(([, init]) => (
      JSON.parse(String(init?.body))[3] as string
    ));
    expect(redisKeys).toEqual([
      `astrochaganti:rate-limit:${createHmac("sha256", ENV.UPSTASH_REDIS_REST_TOKEN)
        .update(`vercel:preview:${rawKey}`).digest("hex")}`,
      `astrochaganti:rate-limit:${createHmac("sha256", ENV.UPSTASH_REDIS_REST_TOKEN)
        .update(`vercel:production:${rawKey}`).digest("hex")}`,
    ]);
    expect(redisKeys[0]).not.toBe(redisKeys[1]);
    for (const [, init] of fetcher.mock.calls) {
      expect(String(init?.body)).not.toContain(rawKey);
      expect(String(init?.body)).not.toContain("preview");
      expect(String(init?.body)).not.toContain("production");
    }
  });

  it("fails closed before Redis when the exact deployed environment is ambiguous", async () => {
    const fetcher = vi.fn<typeof fetch>();

    await expect(distributedRateLimit("client", 5, 60_000, {
      env: { ...ENV, VERCEL_ENV: "staging" },
      fetcher,
    })).resolves.toEqual(expect.objectContaining({
      success: false, configured: false, unavailable: true,
    }));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("reports a shared limit and fails closed on malformed responses", async () => {
    const limited = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ result: [6, 1_001] }), { status: 200 },
    ));
    await expect(distributedRateLimit("client", 5, 60_000, {
      env: ENV, fetcher: limited,
    })).resolves.toEqual(expect.objectContaining({
      success: false, remaining: 0, retryAfterSeconds: 2,
      configured: true, unavailable: false,
    }));

    const malformed = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ result: "unexpected" }), { status: 200 },
    ));
    await expect(distributedRateLimit("client", 5, 60_000, {
      env: ENV, fetcher: malformed,
    })).resolves.toEqual(expect.objectContaining({
      success: false, configured: true, unavailable: true,
    }));
  });
});
