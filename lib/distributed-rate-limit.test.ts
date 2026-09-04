import { createHash, createHmac } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  completeDistributedProviderRequest,
  distributedRateLimit,
  distributedRateLimitStatus,
  reserveDistributedProviderRequest,
} from "./distributed-rate-limit";
import {
  MANAGED_PROVIDER_MIN_INTERVAL_MS,
  MANAGED_PROVIDER_REQUEST_DEADLINE_MS,
  MANAGED_PROVIDER_STORAGE_AMBIGUITY_MS,
  PUBLIC_NOMINATIM_LEASE_MS,
} from "./geocoder-limits";

const SECRET = "test-rate-limit-secret-that-is-long-enough";
const ENV = {
  NODE_ENV: "production",
  VERCEL_ENV: "production",
  TURSO_DATABASE_URL: "libsql://test-database.turso.io",
  TURSO_AUTH_TOKEN: "test-turso-token",
  RATE_LIMIT_HMAC_SECRET: SECRET,
};

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function flushMicrotasks(rounds = 10): Promise<void> {
  for (let index = 0; index < rounds; index += 1) {
    await Promise.resolve();
  }
}

async function initializeStorage(client: Client): Promise<void> {
  await client.execute(`
    CREATE TABLE distributed_rate_limits (
      counter_key TEXT PRIMARY KEY
        CHECK(length(counter_key) = 64 AND counter_key NOT GLOB '*[^0-9a-f]*'),
      count INTEGER NOT NULL CHECK(count BETWEEN 1 AND 1000000),
      expires_at_ms INTEGER NOT NULL CHECK(expires_at_ms > 0)
    ) WITHOUT ROWID
  `);
  await client.execute(`
    CREATE TABLE geocoder_provider_budget (
      budget_key TEXT PRIMARY KEY
        CHECK(length(budget_key) = 64 AND budget_key NOT GLOB '*[^0-9a-f]*'),
      utc_day TEXT NOT NULL,
      day_count INTEGER NOT NULL CHECK(day_count BETWEEN 1 AND 1500),
      daily_limit INTEGER NOT NULL CHECK(daily_limit BETWEEN 1 AND 1500),
      next_allowed_at_ms INTEGER NOT NULL CHECK(next_allowed_at_ms > 0),
      CHECK(day_count <= daily_limit)
    ) WITHOUT ROWID
  `);
}

describe("Turso-backed distributed rate limits", () => {
  let directory: string;
  let firstClient: Client;
  let secondClient: Client;

  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), "astro-limit-test-"));
    const databaseUrl = `file:${join(directory, "limits.db")}`;
    firstClient = createClient({ url: databaseUrl });
    secondClient = createClient({ url: databaseUrl });
    await initializeStorage(firstClient);
  });

  afterEach(() => {
    vi.useRealTimers();
    firstClient.close();
    secondClient.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it.each(["preview", "production"] as const)(
    "fails closed in Vercel %s when shared storage is incomplete",
    async (vercelEnv) => {
      await expect(distributedRateLimit("client", 5, 60_000, {
        env: { VERCEL_ENV: vercelEnv },
      })).resolves.toEqual(expect.objectContaining({
        success: false,
        configured: false,
        unavailable: true,
      }));
    },
  );

  it("requires a dedicated bounded HMAC secret for identity counters", async () => {
    for (const secret of [undefined, "short", `bad secret ${"x".repeat(30)}`]) {
      await expect(distributedRateLimit("client", 5, 60_000, {
        env: { ...ENV, RATE_LIMIT_HMAC_SECRET: secret },
        client: firstClient,
      })).resolves.toMatchObject({
        success: false,
        configured: false,
        unavailable: true,
      });
    }
  });

  it("lets local development rely on the process limiter", async () => {
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

  it("verifies focused storage before the first deployed admission", async () => {
    const ensureStorage = vi.fn().mockResolvedValue(undefined);
    const execute = vi.fn().mockResolvedValue({
      rows: [[1, 61_000, 1_000]],
      rowsAffected: 1,
    });

    await expect(distributedRateLimit("client", 5, 60_000, {
      env: ENV,
      client: { execute } as never,
      ensureStorage,
    })).resolves.toMatchObject({ success: true, remaining: 4 });
    expect(ensureStorage).toHaveBeenCalledTimes(1);
    expect(ensureStorage.mock.invocationCallOrder[0]).toBeLessThan(
      execute.mock.invocationCallOrder[0],
    );
  });

  it("fails closed before SQL when focused storage readiness fails", async () => {
    const execute = vi.fn();
    const ensureStorage = vi.fn().mockRejectedValue(
      new Error("schema unavailable"),
    );

    await expect(distributedRateLimit("client", 5, 60_000, {
      env: ENV,
      client: { execute } as never,
      ensureStorage,
    })).resolves.toMatchObject({
      success: false,
      configured: true,
      unavailable: true,
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("does not prepare storage or dispatch SQL for a pre-aborted caller", async () => {
    const controller = new AbortController();
    controller.abort();
    const ensureStorage = vi.fn().mockResolvedValue(undefined);
    const execute = vi.fn();
    const options = {
      env: ENV,
      client: { execute } as never,
      ensureStorage,
      signal: controller.signal,
    };

    const results = await Promise.all([
      distributedRateLimitStatus("client", 5, 60_000, options),
      distributedRateLimit("client", 5, 60_000, options),
      reserveDistributedProviderRequest("locationiq", 1_500, options),
    ]);

    for (const result of results) {
      expect(result).toMatchObject({
        success: false,
        configured: true,
        unavailable: true,
      });
    }
    expect(ensureStorage).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it("does not dispatch SQL when storage preparation resolves after abort", async () => {
    const controller = new AbortController();
    const preparation = deferred<void>();
    const ensureStorage = vi.fn().mockReturnValue(preparation.promise);
    const execute = vi.fn();
    const pending = distributedRateLimit("client", 5, 60_000, {
      env: ENV,
      client: { execute } as never,
      ensureStorage,
      signal: controller.signal,
    });
    await flushMicrotasks();
    expect(ensureStorage).toHaveBeenCalledTimes(1);

    controller.abort();
    await expect(pending).resolves.toMatchObject({
      success: false,
      unavailable: true,
    });
    preparation.resolve();
    await flushMicrotasks();
    expect(execute).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { VERCEL: "1" },
    { VERCEL_ENV: "staging" },
    { NODE_ENV: "development", VERCEL_ENV: "production" },
  ])("fails closed for an ambiguous runtime: %j", async (runtime) => {
    await expect(distributedRateLimit("client", 5, 60_000, {
      env: {
        TURSO_DATABASE_URL: ENV.TURSO_DATABASE_URL,
        TURSO_AUTH_TOKEN: ENV.TURSO_AUTH_TOKEN,
        RATE_LIMIT_HMAC_SECRET: ENV.RATE_LIMIT_HMAC_SECRET,
        ...runtime,
      },
      client: firstClient,
    })).resolves.toMatchObject({ success: false, unavailable: true });
  });

  it("atomically enforces a fixed window and stores no raw identifier", async () => {
    const rawKey = "guest:places:203.0.113.21";
    const results = await Promise.all(Array.from({ length: 20 }, (_, index) => (
      distributedRateLimit(rawKey, 5, 60_000, {
        env: ENV,
        client: index % 2 === 0 ? firstClient : secondClient,
      })
    )));
    expect(results.filter((result) => result.success)).toHaveLength(5);
    expect(results.filter((result) => !result.success && !result.unavailable))
      .toHaveLength(15);

    const rows = await firstClient.execute(
      "SELECT counter_key, count FROM distributed_rate_limits",
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0][0]).toBe(createHmac("sha256", SECRET)
      .update(`v1\0production\0${rawKey}`).digest("hex"));
    expect(rows.rows[0][0]).not.toContain("203.0.113.21");
    // Rejected attempts are read-only and cannot spend Turso's write budget.
    expect(Number(rows.rows[0][1])).toBe(5);
  });

  it("reads fixed-window status without creating or incrementing a row", async () => {
    const rawKey = "guest:profile:status-only";

    await expect(distributedRateLimitStatus(rawKey, 5, 60_000, {
      env: ENV,
      client: firstClient,
    })).resolves.toMatchObject({ success: true, remaining: 5 });
    let rows = await firstClient.execute(
      "SELECT count FROM distributed_rate_limits",
    );
    expect(rows.rows).toHaveLength(0);

    await distributedRateLimit(rawKey, 5, 60_000, {
      env: ENV,
      client: firstClient,
    });
    await expect(distributedRateLimitStatus(rawKey, 5, 60_000, {
      env: ENV,
      client: firstClient,
    })).resolves.toMatchObject({ success: true, remaining: 4 });
    rows = await firstClient.execute(
      "SELECT count FROM distributed_rate_limits",
    );
    expect(rows.rows).toHaveLength(1);
    expect(Number(rows.rows[0][0])).toBe(1);
  });

  it("reports an exhausted status without mutating the stored counter", async () => {
    const rawKey = "guest:profile:status-exhausted";
    const digest = createHmac("sha256", SECRET)
      .update(`v1\0production\0${rawKey}`).digest("hex");
    await firstClient.execute({
      sql: `INSERT INTO distributed_rate_limits
        (counter_key, count, expires_at_ms)
        VALUES (
          ?, 5,
          CAST(unixepoch('subsec') * 1000 AS INTEGER) + 60000
        )`,
      args: [digest],
    });

    const result = await distributedRateLimitStatus(rawKey, 5, 60_000, {
      env: ENV,
      client: firstClient,
    });
    expect(result).toMatchObject({
      success: false,
      remaining: 0,
      configured: true,
      unavailable: false,
      denialReason: "window",
    });
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
    const row = await firstClient.execute({
      sql: "SELECT count FROM distributed_rate_limits WHERE counter_key = ?",
      args: [digest],
    });
    expect(Number(row.rows[0][0])).toBe(5);
  });

  it("treats expired status as available without resetting the row", async () => {
    const rawKey = "guest:profile:status-expired";
    const digest = createHmac("sha256", SECRET)
      .update(`v1\0production\0${rawKey}`).digest("hex");
    await firstClient.execute({
      sql: `INSERT INTO distributed_rate_limits
        (counter_key, count, expires_at_ms) VALUES (?, 5, 1)`,
      args: [digest],
    });

    await expect(distributedRateLimitStatus(rawKey, 5, 60_000, {
      env: ENV,
      client: firstClient,
    })).resolves.toEqual({
      success: true,
      remaining: 5,
      retryAfterSeconds: 0,
      configured: true,
      unavailable: false,
    });
    const row = await firstClient.execute({
      sql: `SELECT count, expires_at_ms
        FROM distributed_rate_limits WHERE counter_key = ?`,
      args: [digest],
    });
    expect(Number(row.rows[0][0])).toBe(5);
    expect(Number(row.rows[0][1])).toBe(1);
  });

  it("fails status closed when shared storage rejects", async () => {
    const brokenClient = {
      execute: vi.fn().mockRejectedValue(new Error("database unavailable")),
    };

    await expect(distributedRateLimitStatus("client", 5, 60_000, {
      env: ENV,
      client: brokenClient,
    })).resolves.toEqual({
      success: false,
      remaining: 0,
      retryAfterSeconds: 10,
      configured: true,
      unavailable: true,
    });
  });

  it("fails status closed within the storage timeout when Turso hangs", async () => {
    vi.useFakeTimers();
    const hungClient = {
      execute: vi.fn().mockReturnValue(new Promise(() => undefined)),
    };
    const result = distributedRateLimitStatus("client", 5, 60_000, {
      env: ENV,
      client: hungClient,
    });

    await vi.advanceTimersByTimeAsync(2_500);
    await expect(result).resolves.toEqual({
      success: false,
      remaining: 0,
      retryAfterSeconds: 10,
      configured: true,
      unavailable: true,
    });
  });

  it("resets an expired fixed-window row using the database clock", async () => {
    const rawKey = "guest:profile:expired";
    const digest = createHmac("sha256", SECRET)
      .update(`v1\0production\0${rawKey}`).digest("hex");
    await firstClient.execute({
      sql: `INSERT INTO distributed_rate_limits
        (counter_key, count, expires_at_ms) VALUES (?, 5, 1)`,
      args: [digest],
    });
    await expect(distributedRateLimit(rawKey, 5, 60_000, {
      env: ENV,
      client: firstClient,
    })).resolves.toMatchObject({ success: true, remaining: 4 });
  });

  it("returns a normal denial when cleanup removes the exhausted row before the explanatory read", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce({ rows: [], rowsAffected: 0 })
      .mockResolvedValueOnce({ rows: [], rowsAffected: 0 });

    await expect(distributedRateLimit("client", 5, 60_000, {
      env: ENV,
      client: { execute } as never,
    })).resolves.toEqual({
      success: false,
      remaining: 0,
      retryAfterSeconds: 1,
      configured: true,
      unavailable: false,
      denialReason: "window",
    });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("retries atomic admission when the explanatory read crosses a window boundary", async () => {
    const execute = vi.fn()
      // The first conditional UPSERT observes the old exhausted window.
      .mockResolvedValueOnce({ rows: [], rowsAffected: 0 })
      // Another caller resets it before our explanatory read.
      .mockResolvedValueOnce({ rows: [[1, 61_000, 1_000]], rowsAffected: 0 })
      // This caller must reserve capacity rather than trusting that read.
      .mockResolvedValueOnce({ rows: [[2, 61_000, 1_000]], rowsAffected: 1 });

    await expect(distributedRateLimit("client", 5, 60_000, {
      env: ENV,
      client: { execute } as never,
    })).resolves.toEqual({
      success: true,
      remaining: 3,
      retryAfterSeconds: 0,
      configured: true,
      unavailable: false,
    });
    expect(execute).toHaveBeenCalledTimes(3);
    expect(execute.mock.calls[0][0].sql).toContain("INSERT INTO");
    expect(execute.mock.calls[1][0].sql).toContain("SELECT");
    expect(execute.mock.calls[2][0].sql).toContain("INSERT INTO");
  });

  it("treats a lowered limit below the stored count as a normal denial", async () => {
    const rawKey = "guest:profile:lowered-limit";
    const digest = createHmac("sha256", SECRET)
      .update(`v1\0production\0${rawKey}`).digest("hex");
    await firstClient.execute({
      sql: `INSERT INTO distributed_rate_limits
        (counter_key, count, expires_at_ms)
        VALUES (?, 5, CAST(unixepoch('subsec') * 1000 AS INTEGER) + 60000)`,
      args: [digest],
    });

    await expect(distributedRateLimit(rawKey, 3, 60_000, {
      env: ENV,
      client: firstClient,
    })).resolves.toMatchObject({
      success: false,
      unavailable: false,
      denialReason: "window",
    });
    const row = await firstClient.execute({
      sql: "SELECT count FROM distributed_rate_limits WHERE counter_key = ?",
      args: [digest],
    });
    expect(Number(row.rows[0][0])).toBe(5);
  });

  it("separates Preview and Production identity counters", async () => {
    for (const vercelEnv of ["preview", "production"] as const) {
      await distributedRateLimit("same-key", 5, 60_000, {
        env: { ...ENV, VERCEL_ENV: vercelEnv },
        client: firstClient,
      });
    }
    const rows = await firstClient.execute(
      "SELECT counter_key FROM distributed_rate_limits ORDER BY counter_key",
    );
    expect(rows.rows).toHaveLength(2);
    expect(rows.rows[0][0]).not.toBe(rows.rows[1][0]);
  });

  it("shares one provider pool across Preview and Production", async () => {
    const preview = await reserveDistributedProviderRequest(
      "locationiq",
      1_500,
      {
        env: { ...ENV, VERCEL_ENV: "preview" },
        client: firstClient,
      },
    );
    const production = await reserveDistributedProviderRequest(
      "locationiq",
      1_500,
      {
        env: { ...ENV, VERCEL_ENV: "production" },
        client: secondClient,
      },
    );
    expect(preview.success).toBe(true);
    expect(production).toMatchObject({
      success: false,
      unavailable: false,
      denialReason: "pace",
    });
    expect(production.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(production.retryAfterSeconds).toBeLessThanOrEqual(2);
    const rows = await firstClient.execute(
      "SELECT day_count, daily_limit, next_allowed_at_ms FROM geocoder_provider_budget",
    );
    expect(rows.rows).toHaveLength(1);
    expect(Number(rows.rows[0][0])).toBe(1);
    expect(Number(rows.rows[0][1])).toBe(1_500);
    expect(Number(rows.rows[0][2])).toBeGreaterThan(0);
  });

  it("holds one public-Nominatim send lease through fetch and releases it with fencing", async () => {
    const first = await reserveDistributedProviderRequest(
      "nominatim-public",
      1_000,
      { env: ENV, client: firstClient },
    );
    expect(first).toMatchObject({
      success: true,
      remaining: 999,
      unavailable: false,
    });
    expect(first.reservationExpiresAtMs).toEqual(expect.any(Number));

    await expect(reserveDistributedProviderRequest(
      "nominatim-public",
      1_000,
      { env: ENV, client: secondClient },
    )).resolves.toMatchObject({
      success: false,
      unavailable: false,
      denialReason: "pace",
    });

    await expect(completeDistributedProviderRequest(
      "nominatim-public",
      first.reservationExpiresAtMs!,
      { env: ENV, client: firstClient },
    )).resolves.toBe(true);

    const cooling = await reserveDistributedProviderRequest(
      "nominatim-public",
      1_000,
      { env: ENV, client: secondClient },
    );
    expect(cooling).toMatchObject({
      success: false,
      unavailable: false,
      denialReason: "pace",
    });
    expect(cooling.retryAfterSeconds).toBeGreaterThanOrEqual(1);

    await firstClient.execute(
      "UPDATE geocoder_provider_budget SET next_allowed_at_ms = 1",
    );
    const second = await reserveDistributedProviderRequest(
      "nominatim-public",
      1_000,
      { env: ENV, client: secondClient },
    );
    expect(second).toMatchObject({ success: true, remaining: 998 });
    expect(second.reservationExpiresAtMs).not.toBe(first.reservationExpiresAtMs);

    await expect(completeDistributedProviderRequest(
      "nominatim-public",
      first.reservationExpiresAtMs!,
      { env: ENV, client: firstClient },
    )).resolves.toBe(false);
    const row = await firstClient.execute(
      "SELECT day_count, next_allowed_at_ms FROM geocoder_provider_budget",
    );
    expect(Number(row.rows[0][0])).toBe(2);
    expect(Number(row.rows[0][1])).toBe(second.reservationExpiresAtMs);
  });

  it("recovers an uncompleted public-Nominatim crash lease only after its safe expiry", async () => {
    expect(PUBLIC_NOMINATIM_LEASE_MS).toBeGreaterThan(
      MANAGED_PROVIDER_REQUEST_DEADLINE_MS
        + MANAGED_PROVIDER_STORAGE_AMBIGUITY_MS
        + MANAGED_PROVIDER_MIN_INTERVAL_MS,
    );

    const crashed = await reserveDistributedProviderRequest(
      "nominatim-public",
      1_000,
      { env: ENV, client: firstClient },
    );
    expect(crashed).toMatchObject({ success: true, remaining: 999 });

    const lease = await firstClient.execute(`
      SELECT
        next_allowed_at_ms,
        CAST(unixepoch('subsec') * 1000 AS INTEGER) AS now_ms
      FROM geocoder_provider_budget
    `);
    expect(Number(lease.rows[0][0]) - Number(lease.rows[0][1]))
      .toBeGreaterThanOrEqual(PUBLIC_NOMINATIM_LEASE_MS - 100);

    await expect(reserveDistributedProviderRequest(
      "nominatim-public",
      1_000,
      { env: ENV, client: secondClient },
    )).resolves.toMatchObject({
      success: false,
      unavailable: false,
      denialReason: "pace",
    });

    // Advance the authoritative database state past the abandoned lease
    // without calling completion, modeling crash recovery deterministically.
    await firstClient.execute(`
      UPDATE geocoder_provider_budget
      SET next_allowed_at_ms =
        CAST(unixepoch('subsec') * 1000 AS INTEGER) - 1
    `);
    await expect(reserveDistributedProviderRequest(
      "nominatim-public",
      1_000,
      { env: ENV, client: secondClient },
    )).resolves.toMatchObject({ success: true, remaining: 998 });
  });

  it("fails closed when Preview and Production configure different same-day limits", async () => {
    await expect(reserveDistributedProviderRequest("locationiq", 1_500, {
      env: { ...ENV, VERCEL_ENV: "preview" },
      client: firstClient,
    })).resolves.toMatchObject({ success: true });
    await firstClient.execute(
      "UPDATE geocoder_provider_budget SET next_allowed_at_ms = 1",
    );

    await expect(reserveDistributedProviderRequest("locationiq", 1_000, {
      env: ENV,
      client: secondClient,
    })).resolves.toMatchObject({
      success: false,
      unavailable: true,
    });
    const row = await firstClient.execute(
      "SELECT day_count, daily_limit FROM geocoder_provider_budget",
    );
    expect(row.rows).toHaveLength(1);
    expect(Number(row.rows[0][0])).toBe(1);
    expect(Number(row.rows[0][1])).toBe(1_500);
  });

  it("rejects a provider row whose count exceeds its persisted daily limit", async () => {
    await expect(firstClient.execute({
      sql: `
        INSERT INTO geocoder_provider_budget (
          budget_key, utc_day, day_count, daily_limit, next_allowed_at_ms
        ) VALUES (?, '2000-01-01', 4, 3, 1)
      `,
      args: [providerPoolKey("locationiq")],
    })).rejects.toThrow();

    const rows = await firstClient.execute(
      "SELECT budget_key FROM geocoder_provider_budget",
    );
    expect(rows.rows).toHaveLength(0);
  });

  it("allows only one simultaneous provider reservation", async () => {
    const results = await Promise.all(Array.from({ length: 12 }, (_, index) => (
      reserveDistributedProviderRequest("locationiq", 1_500, {
        env: index % 2 === 0
          ? { ...ENV, VERCEL_ENV: "preview" }
          : ENV,
        client: index % 2 === 0 ? firstClient : secondClient,
      })
    )));
    expect(results.filter((result) => result.success)).toHaveLength(1);
    expect(results.filter((result) => !result.success && !result.unavailable))
      .toHaveLength(11);
    const row = await firstClient.execute(
      "SELECT day_count FROM geocoder_provider_budget",
    );
    expect(Number(row.rows[0][0])).toBe(1);
  });

  it("fails closed after the shared UTC-day allowance is spent", async () => {
    await firstClient.execute({
      sql: `
        INSERT INTO geocoder_provider_budget (
          budget_key, utc_day, day_count, daily_limit, next_allowed_at_ms
        ) VALUES (
          ?, strftime('%Y-%m-%d', 'now'), 3,
          3,
          1
        )
      `,
      args: [providerPoolKey("locationiq")],
    });

    await expect(reserveDistributedProviderRequest("locationiq", 3, {
      env: ENV,
      client: firstClient,
    })).resolves.toMatchObject({
      success: false,
      remaining: 0,
      unavailable: false,
      denialReason: "daily",
    });
  });

  it("resets provider counters on a new UTC day", async () => {
    const key = providerPoolKey("locationiq");
    await firstClient.execute({
      sql: `
        INSERT INTO geocoder_provider_budget (
          budget_key, utc_day, day_count, daily_limit, next_allowed_at_ms
        ) VALUES (?, '2000-01-01', 1500, 1500, 1)
      `,
      args: [key],
    });
    await expect(reserveDistributedProviderRequest("locationiq", 1_500, {
      env: ENV,
      client: firstClient,
    })).resolves.toMatchObject({ success: true, remaining: 1_499 });
    const row = await firstClient.execute(
      "SELECT day_count, daily_limit FROM geocoder_provider_budget",
    );
    expect(row.rows).toHaveLength(1);
    expect(Number(row.rows[0][0])).toBe(1);
    expect(Number(row.rows[0][1])).toBe(1_500);
  });

  it("fails closed on storage errors", async () => {
    const brokenClient = {
      execute: vi.fn().mockRejectedValue(new Error("database unavailable")),
    };
    await expect(distributedRateLimit("client", 5, 60_000, {
      env: ENV,
      client: brokenClient,
    })).resolves.toMatchObject({
      success: false,
      configured: true,
      unavailable: true,
    });
  });

  it("fails closed within the storage timeout when Turso hangs", async () => {
    vi.useFakeTimers();
    const hungClient = {
      execute: vi.fn().mockReturnValue(new Promise(() => undefined)),
    };
    const result = distributedRateLimit("client", 5, 60_000, {
      env: ENV,
      client: hungClient,
    });

    await vi.advanceTimersByTimeAsync(2_500);
    await expect(result).resolves.toMatchObject({
      success: false,
      configured: true,
      unavailable: true,
    });
    vi.useRealTimers();
  });

  it("aborts a hung fixed-window UPSERT without starting an explanatory read", async () => {
    const controller = new AbortController();
    const hung = deferred<never>();
    const execute = vi.fn().mockReturnValue(hung.promise);
    const pending = distributedRateLimit("client", 5, 60_000, {
      env: ENV,
      client: { execute } as never,
      signal: controller.signal,
    });
    await flushMicrotasks();
    expect(execute).toHaveBeenCalledTimes(1);

    controller.abort();
    await expect(pending).resolves.toMatchObject({
      success: false,
      configured: true,
      unavailable: true,
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("aborts a hung status SELECT", async () => {
    const controller = new AbortController();
    const execute = vi.fn().mockReturnValue(new Promise(() => undefined));
    const pending = distributedRateLimitStatus("client", 5, 60_000, {
      env: ENV,
      client: { execute } as never,
      signal: controller.signal,
    });
    await flushMicrotasks();
    expect(execute).toHaveBeenCalledTimes(1);

    controller.abort();
    await expect(pending).resolves.toMatchObject({
      success: false,
      configured: true,
      unavailable: true,
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("aborts a hung provider UPSERT without starting its explanatory SELECT", async () => {
    const controller = new AbortController();
    const execute = vi.fn().mockReturnValue(new Promise(() => undefined));
    const pending = reserveDistributedProviderRequest("locationiq", 1_500, {
      env: ENV,
      client: { execute } as never,
      signal: controller.signal,
    });
    await flushMicrotasks();
    expect(execute).toHaveBeenCalledTimes(1);

    controller.abort();
    await expect(pending).resolves.toMatchObject({
      success: false,
      configured: true,
      unavailable: true,
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it.each(["resolve", "reject"] as const)(
    "consumes a late provider UPSERT %s after abort without explanatory SQL",
    async (settlement) => {
      const controller = new AbortController();
      const upsert = deferred<{ rows: unknown[][]; rowsAffected: number }>();
      const execute = vi.fn().mockReturnValue(upsert.promise);
      const unhandled = vi.fn();
      process.on("unhandledRejection", unhandled);

      try {
        const pending = reserveDistributedProviderRequest(
          "locationiq",
          1_500,
          {
            env: ENV,
            client: { execute } as never,
            signal: controller.signal,
          },
        );
        await flushMicrotasks();
        expect(execute).toHaveBeenCalledTimes(1);

        controller.abort();
        await expect(pending).resolves.toMatchObject({
          success: false,
          unavailable: true,
        });
        if (settlement === "resolve") {
          // An empty row would normally start the provider status SELECT.
          upsert.resolve({ rows: [], rowsAffected: 0 });
        } else {
          upsert.reject(new Error("late provider-budget failure"));
        }
        await flushMicrotasks();

        expect(execute).toHaveBeenCalledTimes(1);
        expect(unhandled).not.toHaveBeenCalled();
      } finally {
        process.off("unhandledRejection", unhandled);
      }
    },
  );

  it.each(["resolve", "reject"] as const)(
    "consumes a late UPSERT %s after abort without follow-on SQL",
    async (settlement) => {
      const controller = new AbortController();
      const upsert = deferred<{ rows: unknown[][]; rowsAffected: number }>();
      const execute = vi.fn().mockReturnValue(upsert.promise);
      const unhandled = vi.fn();
      process.on("unhandledRejection", unhandled);

      try {
        const pending = distributedRateLimit("client", 5, 60_000, {
          env: ENV,
          client: { execute } as never,
          signal: controller.signal,
        });
        await flushMicrotasks();
        expect(execute).toHaveBeenCalledTimes(1);

        controller.abort();
        await expect(pending).resolves.toMatchObject({
          success: false,
          unavailable: true,
        });
        if (settlement === "resolve") {
          // An empty row would normally start the explanatory SELECT.
          upsert.resolve({ rows: [], rowsAffected: 0 });
        } else {
          upsert.reject(new Error("late Turso failure"));
        }
        await flushMicrotasks();

        expect(execute).toHaveBeenCalledTimes(1);
        expect(unhandled).not.toHaveBeenCalled();
      } finally {
        process.off("unhandledRejection", unhandled);
      }
    },
  );

  it("does not start a boundary retry after abort", async () => {
    const controller = new AbortController();
    const explanatoryRead = deferred<{
      rows: unknown[][];
      rowsAffected: number;
    }>();
    const execute = vi.fn()
      .mockResolvedValueOnce({ rows: [], rowsAffected: 0 })
      .mockReturnValueOnce(explanatoryRead.promise);
    const pending = distributedRateLimit("client", 5, 60_000, {
      env: ENV,
      client: { execute } as never,
      signal: controller.signal,
    });
    await flushMicrotasks();
    expect(execute).toHaveBeenCalledTimes(2);

    controller.abort();
    await expect(pending).resolves.toMatchObject({
      success: false,
      unavailable: true,
    });
    // A successful explanatory status would normally dispatch a second UPSERT.
    explanatoryRead.resolve({
      rows: [[1, 61_000, 1_000]],
      rowsAffected: 0,
    });
    await flushMicrotasks();
    expect(execute).toHaveBeenCalledTimes(2);
  });
});

function providerPoolKey(providerFamily: string): string {
  return createHash("sha256")
    .update(`v1\0managed-geocoder\0${providerFamily}`)
    .digest("hex");
}
