import "server-only";

import { createHash, createHmac } from "node:crypto";
import type { Client } from "@libsql/client";
import { ensureRateLimitSchema, getClient } from "./db/client";
import { deploymentEnvironment } from "./deployment-environment";
import {
  MANAGED_PROVIDER_DISTRIBUTED_INTERVAL_MS,
  MANAGED_PROVIDER_MAX_RETRY_AFTER_MS,
  MANAGED_PROVIDER_MIN_INTERVAL_MS,
  MANAGED_PROVIDER_STORAGE_AMBIGUITY_MS,
  PUBLIC_NOMINATIM_LEASE_MS,
} from "./geocoder-limits";

export interface DistributedRateLimitResult {
  success: boolean;
  remaining: number;
  retryAfterSeconds: number;
  configured: boolean;
  unavailable: boolean;
  denialReason?: "window" | "pace" | "daily";
  /**
   * Fencing value for an exclusive public-Nominatim send lease. It is absent
   * for ordinary fixed-window and commercial-provider admissions.
   */
  reservationExpiresAtMs?: number;
}

type RateLimitClient = Pick<Client, "execute">;

export interface DistributedRateLimitOptions {
  env?: Record<string, string | undefined>;
  client?: RateLimitClient;
  ensureStorage?: () => Promise<void>;
  signal?: AbortSignal;
  /** Exact-fence completion delay for public Nominatim only. */
  cooldownMs?: number;
}

const RATE_LIMIT_SECRET = "RATE_LIMIT_HMAC_SECRET";
const RATE_LIMIT_TABLE = "distributed_rate_limits";
const PROVIDER_BUDGET_TABLE = "geocoder_provider_budget";
const STORAGE_TIMEOUT_MS = MANAGED_PROVIDER_STORAGE_AMBIGUITY_MS;

function unavailable(configured: boolean): DistributedRateLimitResult {
  return {
    success: false,
    remaining: 0,
    retryAfterSeconds: 10,
    configured,
    unavailable: true,
  };
}

function hmacSecret(env: Record<string, string | undefined>): string | null {
  const value = env[RATE_LIMIT_SECRET];
  return value && /^[\x21-\x7e]{32,256}$/.test(value) ? value : null;
}

function tursoConfigured(env: Record<string, string | undefined>): boolean {
  return Boolean(
    env.TURSO_DATABASE_URL?.trim()
    && env.TURSO_AUTH_TOKEN?.trim(),
  );
}

function deployedNamespace(
  env: Record<string, string | undefined>,
): "preview" | "production" | null {
  if (deploymentEnvironment(env) !== "deployed") return null;
  return env.VERCEL_ENV === "preview" || env.VERCEL_ENV === "production"
    ? env.VERCEL_ENV
    : null;
}

function boundedFixedWindowInputs(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  return key.length >= 1
    && key.length <= 1_024
    && Number.isSafeInteger(limit)
    && limit >= 1
    && limit <= 1_000_000
    && Number.isSafeInteger(windowMs)
    && windowMs >= 1_000
    && windowMs <= 31 * 24 * 60 * 60 * 1_000;
}

function opaqueClientKey(
  namespace: "preview" | "production",
  key: string,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(`v1\0${namespace}\0${key}`)
    .digest("hex");
}

function opaqueProviderPoolKey(providerFamily: string): string {
  return createHash("sha256")
    .update(`v1\0managed-geocoder\0${providerFamily}`)
    .digest("hex");
}

async function storage(
  options: DistributedRateLimitOptions,
): Promise<RateLimitClient> {
  if (options.client) {
    await options.ensureStorage?.();
    return options.client;
  }
  await ensureRateLimitSchema();
  return getClient();
}

type StorageOperation = <T>(operation: () => Promise<T>) => Promise<T>;

function abortError(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) return signal.reason;
  const error = new Error("Shared limiter storage was aborted");
  error.name = "AbortError";
  return error;
}

/**
 * Dispatch a storage operation only while the caller remains active, then
 * bound the already-started promise by both the storage timeout and abort
 * signal. The explicit settlement handlers intentionally remain attached
 * after a timeout/abort so an uncancellable Turso request can settle late
 * without causing an unhandled rejection.
 */
function createStorageOperation(signal?: AbortSignal): StorageOperation {
  return <T>(operation: () => Promise<T>): Promise<T> => new Promise(
    (resolve, reject) => {
      let settled = false;
      const timeout: { timer?: ReturnType<typeof setTimeout> } = {};

      const cleanup = () => {
        if (timeout.timer !== undefined) clearTimeout(timeout.timer);
        signal?.removeEventListener("abort", onAbort);
      };
      const settle = (
        complete: (value: T | PromiseLike<T>) => void,
        value: T,
      ) => {
        if (settled) return;
        settled = true;
        cleanup();
        complete(value);
      };
      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };
      const onAbort = () => fail(abortError(signal!));

      if (signal?.aborted) {
        fail(abortError(signal));
        return;
      }
      signal?.addEventListener("abort", onAbort, { once: true });
      // Cover a signal aborted synchronously around listener installation,
      // before the storage promise is dispatched.
      if (signal?.aborted) {
        onAbort();
        return;
      }

      timeout.timer = setTimeout(
        () => fail(new Error("Shared limiter storage timed out")),
        STORAGE_TIMEOUT_MS,
      );
      const unref = (timeout.timer as unknown as { unref?: () => void }).unref;
      if (typeof unref === "function") unref.call(timeout.timer);

      let started: Promise<T>;
      try {
        started = operation();
      } catch (error) {
        fail(error);
        return;
      }
      started.then(
        (value) => settle(resolve, value),
        (error: unknown) => fail(error),
      );
    },
  );
}

type FixedWindowStatus = DistributedRateLimitResult & {
  rowPresent: boolean;
};

async function readFixedWindowStatus(
  client: RateLimitClient,
  counterKey: string,
  limit: number,
  runStorageOperation: StorageOperation,
): Promise<FixedWindowStatus> {
  const current = await runStorageOperation(() => client.execute({
    sql: `
      SELECT
        count,
        expires_at_ms,
        CAST(unixepoch('subsec') * 1000 AS INTEGER) AS now_ms
      FROM ${RATE_LIMIT_TABLE}
      WHERE counter_key = ?
      LIMIT 1
    `,
    args: [counterKey],
  }));
  const row = current.rows[0];
  if (!row) {
    return {
      success: true,
      remaining: limit,
      retryAfterSeconds: 0,
      configured: true,
      unavailable: false,
      rowPresent: false,
    };
  }

  const count = Number(row[0]);
  const expiresAtMs = Number(row[1]);
  const nowMs = Number(row[2]);
  if (
    !Number.isSafeInteger(count)
    || count < 1
    || count > 1_000_000
    || !Number.isSafeInteger(expiresAtMs)
    || !Number.isSafeInteger(nowMs)
  ) return { ...unavailable(true), rowPresent: true };

  if (expiresAtMs <= nowMs) {
    return {
      success: true,
      remaining: limit,
      retryAfterSeconds: 0,
      configured: true,
      unavailable: false,
      rowPresent: true,
    };
  }
  if (count < limit) {
    return {
      success: true,
      remaining: limit - count,
      retryAfterSeconds: 0,
      configured: true,
      unavailable: false,
      rowPresent: true,
    };
  }
  return {
    success: false,
    remaining: 0,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((expiresAtMs - nowMs) / 1_000),
    ),
    configured: true,
    unavailable: false,
    denialReason: "window",
    rowPresent: true,
  };
}

/**
 * Read a fixed-window limit without reserving capacity. Callers use this only
 * as an inexpensive preflight before a later atomic admission, never as the
 * final authorization decision.
 */
export async function distributedRateLimitStatus(
  key: string,
  limit: number,
  windowMs: number,
  options: DistributedRateLimitOptions = {},
): Promise<DistributedRateLimitResult> {
  const env = options.env ?? process.env;
  if (deploymentEnvironment(env) === "local") {
    return {
      success: true,
      remaining: limit,
      retryAfterSeconds: 0,
      configured: false,
      unavailable: false,
    };
  }
  const namespace = deployedNamespace(env);
  const secret = hmacSecret(env);
  const configured = tursoConfigured(env) && Boolean(secret);
  if (
    !namespace
    || !configured
    || !secret
    || !boundedFixedWindowInputs(key, limit, windowMs)
  ) return unavailable(false);

  try {
    const runStorageOperation = createStorageOperation(options.signal);
    const client = await runStorageOperation(() => storage(options));
    const status = await readFixedWindowStatus(
      client,
      opaqueClientKey(namespace, key, secret),
      limit,
      runStorageOperation,
    );
    return {
      success: status.success,
      remaining: status.remaining,
      retryAfterSeconds: status.retryAfterSeconds,
      configured: status.configured,
      unavailable: status.unavailable,
      ...(status.denialReason
        ? { denialReason: status.denialReason }
        : {}),
    };
  } catch {
    return unavailable(true);
  }
}

/**
 * Atomic fixed-window limit shared across Vercel instances through the
 * application's existing Turso database.
 *
 * Only an environment-scoped HMAC digest and integer timing/count fields are
 * stored. Raw IP addresses, account identifiers, place queries, and profile
 * data never enter the shared limiter table. SQLite's clock is authoritative,
 * avoiding clock-skew decisions between separate Vercel instances.
 */
export async function distributedRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  options: DistributedRateLimitOptions = {},
): Promise<DistributedRateLimitResult> {
  const env = options.env ?? process.env;
  if (deploymentEnvironment(env) === "local") {
    return {
      success: true,
      remaining: limit,
      retryAfterSeconds: 0,
      configured: false,
      unavailable: false,
    };
  }

  const namespace = deployedNamespace(env);
  const secret = hmacSecret(env);
  const configured = tursoConfigured(env) && Boolean(secret);
  if (
    !namespace
    || !configured
    || !secret
    || !boundedFixedWindowInputs(key, limit, windowMs)
  ) return unavailable(false);

  const counterKey = opaqueClientKey(namespace, key, secret);

  try {
    const runStorageOperation = createStorageOperation(options.signal);
    const client = await runStorageOperation(() => storage(options));
    for (let boundaryAttempt = 0; boundaryAttempt < 2; boundaryAttempt += 1) {
      const admitted = await runStorageOperation(() => client.execute({
      sql: `
        INSERT INTO ${RATE_LIMIT_TABLE} (counter_key, count, expires_at_ms)
        VALUES (
          ?,
          1,
          CAST(unixepoch('subsec') * 1000 AS INTEGER) + ?
        )
        ON CONFLICT(counter_key) DO UPDATE SET
          count = CASE
            WHEN ${RATE_LIMIT_TABLE}.expires_at_ms
              <= CAST(unixepoch('subsec') * 1000 AS INTEGER)
              THEN 1
            ELSE ${RATE_LIMIT_TABLE}.count + 1
          END,
          expires_at_ms = CASE
            WHEN ${RATE_LIMIT_TABLE}.expires_at_ms
              <= CAST(unixepoch('subsec') * 1000 AS INTEGER)
              THEN CAST(unixepoch('subsec') * 1000 AS INTEGER) + ?
            ELSE ${RATE_LIMIT_TABLE}.expires_at_ms
          END
        WHERE ${RATE_LIMIT_TABLE}.expires_at_ms
            <= CAST(unixepoch('subsec') * 1000 AS INTEGER)
          OR ${RATE_LIMIT_TABLE}.count < ?
        RETURNING
          count,
          expires_at_ms,
          CAST(unixepoch('subsec') * 1000 AS INTEGER) AS now_ms
      `,
      args: [counterKey, windowMs, windowMs, limit],
      }));
      const admittedRow = admitted.rows[0];
      if (admittedRow) {
        const count = Number(admittedRow[0]);
        const expiresAtMs = Number(admittedRow[1]);
        const nowMs = Number(admittedRow[2]);
        if (
          !Number.isSafeInteger(count)
          || count < 1
          || count > limit
          || !Number.isSafeInteger(expiresAtMs)
          || !Number.isSafeInteger(nowMs)
          || expiresAtMs <= nowMs
        ) return unavailable(true);
        return {
          success: true,
          remaining: Math.max(0, limit - count),
          retryAfterSeconds: 0,
          configured: true,
          unavailable: false,
        };
      }

      const current = await readFixedWindowStatus(
        client,
        counterKey,
        limit,
        runStorageOperation,
      );
      const { rowPresent, ...result } = current;
      // Cleanup may delete the exhausted row between the atomic denial and the
      // explanatory read. Preserve a conservative one-second 429 for that
      // ambiguous boundary rather than misclassifying it as storage failure.
      if (!rowPresent) {
        return {
          success: false,
          remaining: 0,
          retryAfterSeconds: 1,
          configured: true,
          unavailable: false,
          denialReason: "window",
        };
      }
      // Another caller may have reset the row between statements. Retry the
      // actual atomic reservation once so an available new window does not
      // inherit the previous window's Retry-After value.
      if (result.success && boundaryAttempt === 0) continue;
      if (!result.success || result.unavailable) return result;
      return {
        success: false,
        remaining: 0,
        retryAfterSeconds: 1,
        configured: true,
        unavailable: false,
        denialReason: "window",
      };
    }
    return unavailable(true);
  } catch {
    return unavailable(true);
  }
}

/**
 * Atomically reserve one managed-geocoder provider request.
 *
 * The aggregate pool is intentionally shared by Preview and Production and
 * keyed only by provider family, so LocationIQ EU/US and key rotations cannot
 * split one account's quota. The first reservation each UTC day persists the
 * canonical daily limit; a same-day caller configured differently fails
 * closed. The single conditional UPSERT enforces that allowance plus a
 * shared cross-instance boundary without charging rejected attempts.
 * Commercial providers use an admission interval. Public Nominatim instead
 * returns a longer exclusive lease that the caller holds through fetch and
 * conditionally completes into a normal or bounded provider-requested
 * cooldown, preventing delayed responses or a public-Nominatim 429 from
 * compressing dispatch starts. The row stores no client,
 * account, query, place, profile, coordinate, or provider-credential material.
 */
export async function reserveDistributedProviderRequest(
  providerFamily: string,
  dailyLimit: number,
  options: DistributedRateLimitOptions = {},
): Promise<DistributedRateLimitResult> {
  const env = options.env ?? process.env;
  if (deploymentEnvironment(env) === "local") {
    return {
      success: true,
      remaining: dailyLimit,
      retryAfterSeconds: 0,
      configured: false,
      unavailable: false,
    };
  }

  const namespace = deployedNamespace(env);
  const configured = tursoConfigured(env);
  if (
    !namespace
    || !configured
    || !/^[a-z0-9-]{1,64}$/.test(providerFamily)
    || !Number.isSafeInteger(dailyLimit)
    || dailyLimit < 1
    || dailyLimit > 1_500
  ) return unavailable(false);

  const budgetKey = opaqueProviderPoolKey(providerFamily);
  const reservationIntervalMs = providerFamily === "nominatim-public"
    ? PUBLIC_NOMINATIM_LEASE_MS
    : MANAGED_PROVIDER_DISTRIBUTED_INTERVAL_MS;

  try {
    const runStorageOperation = createStorageOperation(options.signal);
    const client = await runStorageOperation(() => storage(options));
    const admitted = await runStorageOperation(() => client.execute({
      sql: `
        INSERT INTO ${PROVIDER_BUDGET_TABLE} (
          budget_key,
          utc_day,
          day_count,
          daily_limit,
          next_allowed_at_ms
        )
        VALUES (
          ?,
          strftime('%Y-%m-%d', 'now'),
          1,
          ?,
          CAST(unixepoch('subsec') * 1000 AS INTEGER) + ?
        )
        ON CONFLICT(budget_key) DO UPDATE SET
          utc_day = excluded.utc_day,
          day_count = CASE
            WHEN ${PROVIDER_BUDGET_TABLE}.utc_day = excluded.utc_day
              THEN ${PROVIDER_BUDGET_TABLE}.day_count + 1
            ELSE 1
          END,
          daily_limit = excluded.daily_limit,
          next_allowed_at_ms = excluded.next_allowed_at_ms
        WHERE (
          ${PROVIDER_BUDGET_TABLE}.utc_day <> excluded.utc_day
          OR (
            ${PROVIDER_BUDGET_TABLE}.daily_limit = excluded.daily_limit
            AND ${PROVIDER_BUDGET_TABLE}.day_count
              < ${PROVIDER_BUDGET_TABLE}.daily_limit
          )
        )
          AND ${PROVIDER_BUDGET_TABLE}.next_allowed_at_ms
            <= CAST(unixepoch('subsec') * 1000 AS INTEGER)
        RETURNING
          day_count,
          daily_limit,
          next_allowed_at_ms,
          CAST(unixepoch('subsec') * 1000 AS INTEGER) AS now_ms
      `,
      args: [
        budgetKey,
        dailyLimit,
        reservationIntervalMs,
      ],
    }));

    const row = admitted.rows[0];
    if (row) {
      const dayCount = Number(row[0]);
      const storedDailyLimit = Number(row[1]);
      const nextAllowedAtMs = Number(row[2]);
      const nowMs = Number(row[3]);
      if (
        !Number.isSafeInteger(dayCount)
        || dayCount < 1
        || dayCount > dailyLimit
        || storedDailyLimit !== dailyLimit
        || !Number.isSafeInteger(nextAllowedAtMs)
        || !Number.isSafeInteger(nowMs)
        || nextAllowedAtMs <= nowMs
      ) return unavailable(true);
      return {
        success: true,
        remaining: Math.max(0, dailyLimit - dayCount),
        retryAfterSeconds: 0,
        configured: true,
        unavailable: false,
        ...(providerFamily === "nominatim-public"
          ? { reservationExpiresAtMs: nextAllowedAtMs }
          : {}),
      };
    }

    const current = await runStorageOperation(() => client.execute({
      sql: `
        SELECT
          day_count,
          utc_day,
          daily_limit,
          next_allowed_at_ms,
          strftime('%Y-%m-%d', 'now') AS current_day,
          CAST(unixepoch('subsec') * 1000 AS INTEGER) AS now_ms,
          unixepoch(date('now', '+1 day')) - unixepoch('now')
            AS seconds_to_next_day
        FROM ${PROVIDER_BUDGET_TABLE}
        WHERE budget_key = ?
        LIMIT 1
      `,
      args: [budgetKey],
    }));
    const stored = current.rows[0];
    if (!stored) return unavailable(true);

    const dayCount = Number(stored[0]);
    const utcDay = String(stored[1]);
    const storedDailyLimit = Number(stored[2]);
    const nextAllowedAtMs = Number(stored[3]);
    const currentDay = String(stored[4]);
    const nowMs = Number(stored[5]);
    const secondsToNextDay = Number(stored[6]);
    if (
      !Number.isSafeInteger(dayCount)
      || dayCount < 1
      || dayCount > 1_500
      || !Number.isSafeInteger(storedDailyLimit)
      || storedDailyLimit < 1
      || storedDailyLimit > 1_500
      || dayCount > storedDailyLimit
      || !/^\d{4}-\d{2}-\d{2}$/.test(utcDay)
      || !/^\d{4}-\d{2}-\d{2}$/.test(currentDay)
      || !Number.isSafeInteger(nextAllowedAtMs)
      || !Number.isSafeInteger(nowMs)
      || !Number.isSafeInteger(secondsToNextDay)
      || secondsToNextDay < 1
    ) return unavailable(true);

    if (utcDay === currentDay && storedDailyLimit !== dailyLimit) {
      return unavailable(true);
    }

    const retries: number[] = [1];
    const dailyBlocked = utcDay === currentDay
      && dayCount >= storedDailyLimit;
    if (nextAllowedAtMs > nowMs) {
      retries.push(Math.ceil((nextAllowedAtMs - nowMs) / 1_000));
    }
    if (dailyBlocked) {
      retries.push(secondsToNextDay);
    }
    return {
      success: false,
      remaining: utcDay === currentDay
        ? Math.max(0, storedDailyLimit - dayCount)
        : dailyLimit,
      retryAfterSeconds: Math.max(...retries),
      configured: true,
      unavailable: false,
      denialReason: dailyBlocked ? "daily" : "pace",
    };
  } catch {
    return unavailable(true);
  }
}

/**
 * Release one exclusive public-Nominatim send lease into the normal or
 * provider-requested cooldown.
 *
 * `reservationExpiresAtMs` is a fencing value returned by the atomic acquire.
 * A late or duplicate completion cannot shorten a newer lease or re-pin an
 * already expired lease because the conditional update must match that exact,
 * still-future value. Failure is
 * conservative: the original lease simply remains until its bounded expiry.
 * Provider attempts are never refunded from the daily count.
 */
export async function completeDistributedProviderRequest(
  providerFamily: string,
  reservationExpiresAtMs: number,
  options: DistributedRateLimitOptions = {},
): Promise<boolean> {
  const env = options.env ?? process.env;
  const cooldownMs = options.cooldownMs ?? MANAGED_PROVIDER_MIN_INTERVAL_MS;
  if (
    deploymentEnvironment(env) !== "deployed"
    || deployedNamespace(env) !== "production"
    || !tursoConfigured(env)
    || providerFamily !== "nominatim-public"
    || !Number.isSafeInteger(reservationExpiresAtMs)
    || reservationExpiresAtMs < 1
    || !Number.isSafeInteger(cooldownMs)
    || cooldownMs < MANAGED_PROVIDER_MIN_INTERVAL_MS
    || cooldownMs > MANAGED_PROVIDER_MAX_RETRY_AFTER_MS
  ) return false;

  try {
    const runStorageOperation = createStorageOperation(options.signal);
    const client = await runStorageOperation(() => storage(options));
    const released = await runStorageOperation(() => client.execute({
      sql: `
        UPDATE ${PROVIDER_BUDGET_TABLE}
        SET next_allowed_at_ms =
          CAST(unixepoch('subsec') * 1000 AS INTEGER) + ?
        WHERE budget_key = ?
          AND next_allowed_at_ms = ?
          AND next_allowed_at_ms
            > CAST(unixepoch('subsec') * 1000 AS INTEGER)
        RETURNING
          next_allowed_at_ms,
          CAST(unixepoch('subsec') * 1000 AS INTEGER) AS now_ms
      `,
      args: [
        cooldownMs,
        opaqueProviderPoolKey(providerFamily),
        reservationExpiresAtMs,
      ],
    }));
    const row = released.rows[0];
    const nextAllowedAtMs = Number(row?.[0]);
    const nowMs = Number(row?.[1]);
    return Number.isSafeInteger(nextAllowedAtMs)
      && Number.isSafeInteger(nowMs)
      && nextAllowedAtMs > nowMs;
  } catch {
    return false;
  }
}
