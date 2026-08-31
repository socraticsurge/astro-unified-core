import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { distributedRateLimit } from "./distributed-rate-limit";

const ENV = {
  UPSTASH_REDIS_REST_URL: "https://shared-redis.example",
  UPSTASH_REDIS_REST_TOKEN: "private-test-token",
};

describe("distributedRateLimit", () => {
  it.each(["preview", "production"])(
    "fails closed in Vercel %s when shared storage is not configured",
    async (vercelEnv) => {
      await expect(distributedRateLimit("client", 5, 60_000, {
        env: {}, vercelEnv,
      })).resolves.toEqual(expect.objectContaining({
        success: false, configured: false, unavailable: true,
      }));
    },
  );

  it("lets local development rely on the existing process limiter", async () => {
    await expect(distributedRateLimit("client", 5, 60_000, {
      env: {}, vercelEnv: "development",
    })).resolves.toEqual({
      success: true,
      remaining: 5,
      retryAfterSeconds: 0,
      configured: false,
      unavailable: false,
    });
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
      { env: ENV, vercelEnv: "production", fetcher },
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
    expect(init?.headers).toEqual(expect.objectContaining({
      Authorization: "Bearer private-test-token",
    }));
    const command = JSON.parse(String(init?.body));
    expect(command[0]).toBe("EVAL");
    expect(command[2]).toBe("1");
    expect(command[3]).toMatch(/^astrochaganti:rate-limit:[a-f0-9]{64}$/);
    expect(String(init?.body)).not.toContain("203.0.113.21");
  });

  it("reports a shared limit and fails closed on malformed responses", async () => {
    const limited = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ result: [6, 1_001] }), { status: 200 },
    ));
    await expect(distributedRateLimit("client", 5, 60_000, {
      env: ENV, vercelEnv: "production", fetcher: limited,
    })).resolves.toEqual(expect.objectContaining({
      success: false, remaining: 0, retryAfterSeconds: 2,
      configured: true, unavailable: false,
    }));

    const malformed = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ result: "unexpected" }), { status: 200 },
    ));
    await expect(distributedRateLimit("client", 5, 60_000, {
      env: ENV, vercelEnv: "production", fetcher: malformed,
    })).resolves.toEqual(expect.objectContaining({
      success: false, configured: true, unavailable: true,
    }));
  });
});
