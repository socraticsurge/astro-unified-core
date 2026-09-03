import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  readSharedGeocodeCache,
  writeSharedGeocodeCache,
} from "./shared-geocode-cache";

const ENV = {
  UPSTASH_REDIS_REST_URL: "https://shared-redis.example",
  UPSTASH_REDIS_REST_TOKEN: "private-cache-token",
};

const ROWS = [{
  provider_id: "place-123",
  lat: "17.385",
  lon: "78.4867",
  display_name: "Hyderabad, Telangana, India",
}];

describe("shared geocode cache", () => {
  it("fails closed without one complete Redis credential pair", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(readSharedGeocodeCache("material", {
      env: { UPSTASH_REDIS_REST_URL: ENV.UPSTASH_REDIS_REST_URL },
      fetcher,
    })).resolves.toEqual({ status: "unavailable", configured: false });
    await expect(writeSharedGeocodeCache("material", ROWS, {
      env: { UPSTASH_REDIS_REST_TOKEN: ENV.UPSTASH_REDIS_REST_TOKEN },
      fetcher,
    })).resolves.toEqual({ ok: false, configured: false });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("reads a versioned normalized hit through a pseudonymous key", async () => {
    const privateMaterial = "geoapify\u0000Private Birthplace";
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ result: JSON.stringify({ version: 1, rows: ROWS }) }),
      { status: 200 },
    ));

    await expect(readSharedGeocodeCache(privateMaterial, {
      env: ENV,
      fetcher,
    })).resolves.toEqual({ status: "hit", rows: ROWS });

    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe(ENV.UPSTASH_REDIS_REST_URL);
    expect(init).toMatchObject({
      method: "POST",
      cache: "no-store",
      redirect: "error",
      headers: expect.objectContaining({
        Authorization: `Bearer ${ENV.UPSTASH_REDIS_REST_TOKEN}`,
      }),
    });
    const command = JSON.parse(String(init?.body));
    expect(command).toEqual([
      "GET",
      expect.stringMatching(/^astrochaganti:geocode:v1:[a-f0-9]{64}$/),
    ]);
    expect(String(init?.body)).not.toContain("Private Birthplace");
  });

  it("distinguishes a cache miss from unavailable storage", async () => {
    const miss = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ result: null }),
      { status: 200 },
    ));
    await expect(readSharedGeocodeCache("missing", {
      env: ENV,
      fetcher: miss,
    })).resolves.toEqual({ status: "miss" });

    const unavailable = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ error: "unavailable" }),
      { status: 503 },
    ));
    await expect(readSharedGeocodeCache("missing", {
      env: ENV,
      fetcher: unavailable,
    })).resolves.toEqual({ status: "unavailable", configured: true });
  });

  it.each([
    ["wrong version", { version: 2, rows: ROWS }],
    ["unknown fields", {
      version: 1,
      rows: [{ ...ROWS[0], private_upstream_field: "discard me" }],
    }],
    ["invalid coordinates", {
      version: 1,
      rows: [{ ...ROWS[0], lat: "999" }],
    }],
  ])("fails closed for a %s cache value", async (_case, value) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ result: JSON.stringify(value) }),
      { status: 200 },
    ));
    await expect(readSharedGeocodeCache("material", {
      env: ENV,
      fetcher,
    })).resolves.toEqual({ status: "unavailable", configured: true });
  });

  it("rejects an oversized Redis response", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ result: "x".repeat(64 * 1_024) }),
      { status: 200 },
    ));
    await expect(readSharedGeocodeCache("material", {
      env: ENV,
      fetcher,
    })).resolves.toEqual({ status: "unavailable", configured: true });
  });

  it("writes only normalized rows with a fixed 24-hour expiry", async () => {
    const privateMaterial = "locationiq-eu\u0000Private Birthplace";
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ result: "OK" }),
      { status: 200 },
    ));

    await expect(writeSharedGeocodeCache(privateMaterial, ROWS, {
      env: ENV,
      fetcher,
    })).resolves.toEqual({ ok: true, configured: true });

    const command = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    expect(command[0]).toBe("SET");
    expect(command[1]).toMatch(/^astrochaganti:geocode:v1:[a-f0-9]{64}$/);
    expect(JSON.parse(command[2])).toEqual({ version: 1, rows: ROWS });
    expect(command.slice(3)).toEqual(["EX", "86400"]);
    expect(command[1]).not.toContain("Private Birthplace");
  });

  it("refuses to persist non-normalized provider fields", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(writeSharedGeocodeCache("material", [{
      ...ROWS[0],
      private_upstream_field: "discard me",
    }], { env: ENV, fetcher })).resolves.toEqual({
      ok: false,
      configured: true,
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
