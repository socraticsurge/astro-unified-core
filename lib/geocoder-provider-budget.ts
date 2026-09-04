import "server-only";

import { deploymentEnvironment } from "./deployment-environment";
import { PUBLIC_NOMINATIM_DAILY_REQUEST_LIMIT_MAX } from "./geocoder-limits";
import {
  completeDistributedProviderRequest,
  reserveDistributedProviderRequest,
} from "./distributed-rate-limit";

export type GeocoderDailyRequestBudgetResult = {
  success: boolean;
  unavailable: boolean;
  retryAfterSeconds: number;
  denialReason?: "pace" | "daily";
  reservationExpiresAtMs?: number;
};

const MAX_DAILY_REQUEST_LIMIT = 1_500;
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
  maximum = MAX_DAILY_REQUEST_LIMIT,
): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const limit = Number(value);
  return Number.isSafeInteger(limit)
    && limit >= 1
    && limit <= maximum
    ? limit
    : null;
}

function configuredProviderFamily(
  value: string | undefined,
): "nominatim-public" | "locationiq" | "geoapify" | null {
  if (value === "nominatim-public") return value;
  if (value === "locationiq-eu" || value === "locationiq-us") {
    return "locationiq";
  }
  return value === "geoapify" ? "geoapify" : null;
}

/**
 * Reserve one managed-provider request from a shared UTC-day allowance plus
 * conservative global per-minute and per-second budgets.
 *
 * The caller invokes this only after process-cache lookup and duplicate
 * coalescing, so warm-instance cache hits and subscribers to existing work do
 * not spend provider quota.
 * Preview and Production deliberately share one Turso provider-family row so
 * both environments stay inside the same external account quota. Guest and
 * managed authenticated lookups also share that row.
 */
export async function enforceGeocoderDailyRequestBudget(
  options: {
    env?: Record<string, string | undefined>;
    signal?: AbortSignal;
  } = {},
): Promise<GeocoderDailyRequestBudgetResult> {
  const env = options.env ?? process.env;
  const runtime = deploymentEnvironment(env);
  if (runtime === "local") return ALLOWED;
  if (runtime !== "deployed") return UNAVAILABLE;

  const vercelEnv = env.VERCEL_ENV;
  if (vercelEnv !== "preview" && vercelEnv !== "production") {
    return UNAVAILABLE;
  }
  const providerFamily = configuredProviderFamily(env.GEOCODER_PROVIDER);
  const limit = configuredDailyLimit(
    env.GEOCODER_DAILY_REQUEST_LIMIT,
    providerFamily === "nominatim-public"
      ? PUBLIC_NOMINATIM_DAILY_REQUEST_LIMIT_MAX
      : MAX_DAILY_REQUEST_LIMIT,
  );
  if (limit === null || providerFamily === null) return UNAVAILABLE;
  if (providerFamily === "nominatim-public" && vercelEnv !== "production") {
    return UNAVAILABLE;
  }

  const result = await reserveDistributedProviderRequest(
    providerFamily,
    limit,
    options.signal ? { env, signal: options.signal } : { env },
  );
  return {
    success: result.success,
    unavailable: result.unavailable,
    retryAfterSeconds: result.retryAfterSeconds,
    denialReason: result.denialReason === "pace"
      || result.denialReason === "daily"
      ? result.denialReason
      : undefined,
    ...(result.reservationExpiresAtMs !== undefined
      ? { reservationExpiresAtMs: result.reservationExpiresAtMs }
      : {}),
  };
}

/** Complete a successful exclusive public-Nominatim reservation. */
export async function completeGeocoderProviderRequest(
  reservationExpiresAtMs: number,
  env: Record<string, string | undefined> = process.env,
): Promise<boolean> {
  if (
    deploymentEnvironment(env) !== "deployed"
    || env.VERCEL_ENV !== "production"
  ) return false;
  const providerFamily = configuredProviderFamily(env.GEOCODER_PROVIDER);
  if (providerFamily !== "nominatim-public") return false;
  return completeDistributedProviderRequest(
    providerFamily,
    reservationExpiresAtMs,
    { env },
  );
}
