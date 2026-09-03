import "server-only";

import { ensureRateLimitSchema, getClient } from "./client";

const CLEANUP_BATCH_ROWS = 5_000;
const MAX_CLEANUP_ROWS = 100_000;
const MAX_CLEANUP_DURATION_MS = 10_000;
const MAX_OPERATION_DURATION_MS = 2_500;

export type RateLimitCleanupResult = {
  deletedRows: number;
  batches: number;
  backlogRemaining: boolean;
};

async function withCleanupTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error("Rate-limit cleanup timed out")),
          Math.max(1, timeoutMs),
        );
        const unref = (timer as unknown as { unref?: () => void }).unref;
        if (typeof unref === "function") unref.call(timer);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * Remove bounded batches of expired pseudonymous limiter rows.
 *
 * The authenticated eight-hour maintenance job calls this independently of
 * request admission. Current account-wide caps admit at most 15,000 guest and
 * authenticated calls per complete 24-hour window across Preview and
 * Production. Even an eight-hour run that straddles every independently
 * anchored window can create fewer than 30,000 identity rows. The 100,000-row
 * cap therefore drains that bound with headroom, while 5,000-row indexed
 * batches prevent one unbounded DELETE. A final read reports any backlog so it
 * can be monitored without exposing counter keys.
 */
export async function cleanupExpiredDistributedRateLimits(
  maxRows = MAX_CLEANUP_ROWS,
): Promise<RateLimitCleanupResult> {
  if (!Number.isSafeInteger(maxRows) || maxRows < 1 || maxRows > MAX_CLEANUP_ROWS) {
    throw new Error("Invalid rate-limit cleanup bound");
  }
  const deadlineAt = Date.now() + MAX_CLEANUP_DURATION_MS;
  await withCleanupTimeout(ensureRateLimitSchema(), MAX_OPERATION_DURATION_MS);
  const client = getClient();
  let deletedRows = 0;
  let batches = 0;

  while (deletedRows < maxRows) {
    const remainingDurationMs = deadlineAt - Date.now();
    if (remainingDurationMs <= 0) {
      return { deletedRows, batches, backlogRemaining: true };
    }
    const batchRows = Math.min(CLEANUP_BATCH_ROWS, maxRows - deletedRows);
    const result = await withCleanupTimeout(client.execute({
      sql: `
        DELETE FROM distributed_rate_limits
        WHERE counter_key IN (
          SELECT counter_key
          FROM distributed_rate_limits
          WHERE expires_at_ms
            <= CAST(unixepoch('subsec') * 1000 AS INTEGER)
          ORDER BY expires_at_ms
          LIMIT ?
        )
      `,
      args: [batchRows],
    }), Math.min(MAX_OPERATION_DURATION_MS, remainingDurationMs));
    if (
      !Number.isSafeInteger(result.rowsAffected)
      || result.rowsAffected < 0
      || result.rowsAffected > batchRows
    ) {
      throw new Error("Invalid rate-limit cleanup result");
    }
    deletedRows += result.rowsAffected;
    batches += 1;
    if (result.rowsAffected < batchRows) {
      return { deletedRows, batches, backlogRemaining: false };
    }
  }

  const remainingDurationMs = deadlineAt - Date.now();
  if (remainingDurationMs <= 0) {
    return { deletedRows, batches, backlogRemaining: true };
  }
  const backlog = await withCleanupTimeout(client.execute(`
    SELECT EXISTS(
      SELECT 1
      FROM distributed_rate_limits
      WHERE expires_at_ms
        <= CAST(unixepoch('subsec') * 1000 AS INTEGER)
      LIMIT 1
    )
  `), Math.min(MAX_OPERATION_DURATION_MS, remainingDurationMs));
  const marker = Number(backlog.rows[0]?.[0]);
  if (marker !== 0 && marker !== 1) {
    throw new Error("Invalid rate-limit cleanup backlog result");
  }
  return {
    deletedRows,
    batches,
    backlogRemaining: marker === 1,
  };
}
