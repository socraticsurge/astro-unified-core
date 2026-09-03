import "server-only";

import { deploymentEnvironment } from "./deployment-environment";
import { distributedRateLimit } from "./distributed-rate-limit";

export type GeocoderDailyRequestBudgetResult = {
  success: boolean;
  unavailable: boolean;
  retryAfterSeconds: number;
};

const DAY_MS = 24 * 60 * 60 * 1_000;
const MAX_DAILY_REQUEST_LIMIT = 5_000;
const ALLOWED: GeocoderDailyRequestBudgetResult = {
  success: true,
  unavailable: false,
  retryAfterSeconds: 0,
};
const UNAVAILABLE: GeocoderDailyRequestBudgetResult = {
  success: false,
  unavailable: true,
  retryAfterSeconds: 10,
};

function configuredDailyLimit(
  value: string | undefined,
): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const limit = Number(value);
  return Number.isSafeInteger(limit)
    && limit >= 1
    && limit <= MAX_DAILY_REQUEST_LIMIT
    ? limit
    : null;
}

/**
 * Reserve one managed-provider request from a shared 24-hour allowance.
 *
 * The caller invokes this only after cache lookup and duplicate coalescing, so
 * cache hits and subscribers to existing work do not spend provider quota.
 * The distributed limiter gives Preview and Production distinct Redis keys,
 * while guest and managed authenticated lookups deliberately share this one
 * logical key within each runtime.
 */
export async function enforceGeocoderDailyRequestBudget(
  options: { env?: Record<string, string | undefined> } = {},
): Promise<GeocoderDailyRequestBudgetResult> {
  const env = options.env ?? process.env;
  const runtime = deploymentEnvironment(env);
  if (runtime === "local") return ALLOWED;
  if (runtime !== "deployed") return UNAVAILABLE;

  const vercelEnv = env.VERCEL_ENV;
  if (vercelEnv !== "preview" && vercelEnv !== "production") {
    return UNAVAILABLE;
  }
  const limit = configuredDailyLimit(env.GEOCODER_DAILY_REQUEST_LIMIT);
  if (limit === null) return UNAVAILABLE;

  const result = await distributedRateLimit(
    "geocoder:provider:daily",
    limit,
    DAY_MS,
    { env },
  );
  return {
    success: result.success,
    unavailable: result.unavailable,
    retryAfterSeconds: result.retryAfterSeconds,
  };
}
