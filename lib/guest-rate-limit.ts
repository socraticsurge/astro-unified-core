import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import { RATE_LIMIT_DEFAULT_COUNT, RATE_LIMIT_WINDOW_MS } from "./constants";
import { deploymentEnvironment } from "./deployment-environment";
import {
  distributedRateLimit,
  distributedRateLimitStatus,
} from "./distributed-rate-limit";
import { rateLimit } from "./rate-limit";

export type GuestRateLimitNamespace =
  | "places"
  | "profile-derive"
  | "election-charts";

export type GuestRateLimitResult = {
  success: boolean;
  unavailable: boolean;
  retryAfterSeconds: number;
  scope: "client" | "fleet" | "capacity" | "shared-storage" | null;
};

const FLEET_LIMITS: Record<GuestRateLimitNamespace, number> = {
  // A conservative shared admission ceiling. Public Nominatim is additionally
  // protected by its own exclusive cross-instance send lease; commercial
  // fallbacks retain their provider-family budget and 429 guidance.
  places: 30,
  "profile-derive": 30,
  "election-charts": 10,
};

const FLEET_KEYS: Record<GuestRateLimitNamespace, string> = {
  places: "geocoder:fleet",
  "profile-derive": "guest:profile-derive:fleet",
  "election-charts": "guest:election-charts:fleet",
};
const DAILY_CAPACITY_KEY = "guest:all-routes:daily-capacity";
const DAILY_CAPACITY_WINDOW_MS = 24 * 60 * 60 * 1_000;
// Give each guest source a nominal five-percent share of the public-Nominatim
// pool per anchored 24-hour window. This is charged only for a valid cache miss
// at the provider boundary, not for malformed requests or reusable results.
const PLACES_CLIENT_DAILY_LIMIT = 50;
const DAILY_CAPACITY_LIMITS = {
  preview: 2_000,
  production: 10_000,
} as const;
const DEPLOYED_GUARD_CHAIN_DEADLINE_MS = 2_000;

const ALLOWED: GuestRateLimitResult = {
  success: true,
  unavailable: false,
  retryAfterSeconds: 0,
  scope: null,
};

function sharedStorageUnavailable(): GuestRateLimitResult {
  return {
    success: false,
    unavailable: true,
    retryAfterSeconds: 10,
    scope: "shared-storage",
  };
}

const PROCESS_PSEUDONYM_STATE_VERSION = 1 as const;
type ProcessPseudonymState = {
  version: typeof PROCESS_PSEUDONYM_STATE_VERSION;
  secret: Buffer;
};

const processGlobal = globalThis as typeof globalThis & {
  __astroChagantiGuestLimiterPseudonym?: ProcessPseudonymState;
};
const existingPseudonymState =
  processGlobal.__astroChagantiGuestLimiterPseudonym;
const pseudonymState: ProcessPseudonymState =
  existingPseudonymState?.version === PROCESS_PSEUDONYM_STATE_VERSION
    ? existingPseudonymState
    : {
      version: PROCESS_PSEUDONYM_STATE_VERSION,
      secret: randomBytes(32),
    };
processGlobal.__astroChagantiGuestLimiterPseudonym = pseudonymState;

function processClientKey(
  namespace: GuestRateLimitNamespace,
  clientId: string,
): string {
  const digest = createHmac("sha256", pseudonymState.secret)
    .update(`guest:${namespace}:${clientId}`)
    .digest("hex");
  return `guest:${namespace}:client:${digest}`;
}

/**
 * Apply the inexpensive per-instance guard, reserve the deployment's bounded
 * attempt budget, then enforce fleet before client. Capacity-first ordering
 * makes the Turso mutation envelope hard; fleet-first route ordering bounds
 * client-row creation when an unauthenticated caller rotates source addresses.
 * A later fleet/client denial deliberately does not refund capacity.
 */
export async function enforceGuestRateLimit(
  namespace: GuestRateLimitNamespace,
  clientId: string,
  options: { env?: Record<string, string | undefined> } = {},
): Promise<GuestRateLimitResult> {
  const env = options.env ?? process.env;
  const clientKey = `guest:${namespace}:${clientId}`;
  const local = rateLimit(
    processClientKey(namespace, clientId),
    RATE_LIMIT_DEFAULT_COUNT,
    RATE_LIMIT_WINDOW_MS,
  );
  if (!local.success) {
    return {
      success: false,
      unavailable: false,
      retryAfterSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1_000),
      scope: "client",
    };
  }

  if (deploymentEnvironment(env) === "local") return ALLOWED;

  const controller = new AbortController();
  const deadline = setTimeout(
    () => controller.abort(),
    DEPLOYED_GUARD_CHAIN_DEADLINE_MS,
  );
  deadline.unref?.();
  const signal = controller.signal;
  const distributedOptions = { env, signal };

  try {
    const dailyCapacityLimit = env.VERCEL_ENV === "production"
      ? DAILY_CAPACITY_LIMITS.production
      : DAILY_CAPACITY_LIMITS.preview;
    // Stop all subsequent writes after the deployment's daily ceiling. This is
    // a preflight only; the final atomic reservation below remains authoritative
    // when multiple instances race.
    if (signal.aborted) return sharedStorageUnavailable();
    const dailyStatus = await distributedRateLimitStatus(
      DAILY_CAPACITY_KEY,
      dailyCapacityLimit,
      DAILY_CAPACITY_WINDOW_MS,
      distributedOptions,
    );
    if (signal.aborted) return sharedStorageUnavailable();
    if (dailyStatus.unavailable) {
      return {
        success: false,
        unavailable: true,
        retryAfterSeconds: dailyStatus.retryAfterSeconds,
        scope: "shared-storage",
      };
    }
    if (!dailyStatus.success) {
      return {
        success: false,
        unavailable: false,
        retryAfterSeconds: dailyStatus.retryAfterSeconds,
        scope: "capacity",
      };
    }

    // Reserve the account-wide mutation budget before any per-route Turso row.
    // This attempt remains charged if a later fleet/client guard rejects it;
    // conservative charging is what makes the total shared-write envelope hard.
    if (signal.aborted) return sharedStorageUnavailable();
    const dailyAdmission = await distributedRateLimit(
      DAILY_CAPACITY_KEY,
      dailyCapacityLimit,
      DAILY_CAPACITY_WINDOW_MS,
      distributedOptions,
    );
    if (signal.aborted) return sharedStorageUnavailable();
    if (dailyAdmission.unavailable) {
      return {
        success: false,
        unavailable: true,
        retryAfterSeconds: dailyAdmission.retryAfterSeconds,
        scope: "shared-storage",
      };
    }
    if (!dailyAdmission.success) {
      return {
        success: false,
        unavailable: false,
        retryAfterSeconds: dailyAdmission.retryAfterSeconds,
        scope: "capacity",
      };
    }

    if (signal.aborted) return sharedStorageUnavailable();
    const fleet = await distributedRateLimit(
      FLEET_KEYS[namespace],
      FLEET_LIMITS[namespace],
      RATE_LIMIT_WINDOW_MS,
      distributedOptions,
    );
    if (signal.aborted) return sharedStorageUnavailable();
    if (fleet.unavailable) {
      return {
        success: false,
        unavailable: true,
        retryAfterSeconds: fleet.retryAfterSeconds,
        scope: "shared-storage",
      };
    }
    if (!fleet.success) {
      return {
        success: false,
        unavailable: false,
        retryAfterSeconds: fleet.retryAfterSeconds,
        scope: "fleet",
      };
    }

    if (signal.aborted) return sharedStorageUnavailable();
    const sharedClient = await distributedRateLimit(
      clientKey,
      RATE_LIMIT_DEFAULT_COUNT,
      RATE_LIMIT_WINDOW_MS,
      distributedOptions,
    );
    if (signal.aborted) return sharedStorageUnavailable();
    if (sharedClient.unavailable) {
      return {
        success: false,
        unavailable: true,
        retryAfterSeconds: sharedClient.retryAfterSeconds,
        scope: "shared-storage",
      };
    }
    if (!sharedClient.success) {
      return {
        success: false,
        unavailable: false,
        retryAfterSeconds: sharedClient.retryAfterSeconds,
        scope: "client",
      };
    }
    return ALLOWED;
  } catch (error) {
    if (signal.aborted) return sharedStorageUnavailable();
    throw error;
  } finally {
    clearTimeout(deadline);
  }
}

/**
 * Reserve one guest client's durable place-provider allowance.
 *
 * The place route has already applied capacity, fleet, and minute-client
 * controls before parsing. This narrower guard runs only after validation,
 * process-cache lookup, and duplicate coalescing, immediately before other
 * provider admission. The shared primitive HMACs the logical client key, so no
 * raw address enters Turso.
 */
export async function enforceGuestPlaceProviderDailyLimit(
  clientId: string,
  options: {
    env?: Record<string, string | undefined>;
    signal?: AbortSignal;
  } = {},
): Promise<GuestRateLimitResult> {
  const env = options.env ?? process.env;
  if (!clientId || clientId.length > 512) return sharedStorageUnavailable();
  if (deploymentEnvironment(env) === "local") return ALLOWED;

  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  options.signal?.addEventListener("abort", abortFromCaller, { once: true });
  if (options.signal?.aborted) controller.abort();
  const deadline = setTimeout(
    () => controller.abort(),
    DEPLOYED_GUARD_CHAIN_DEADLINE_MS,
  );
  deadline.unref?.();

  try {
    if (controller.signal.aborted) return sharedStorageUnavailable();
    const result = await distributedRateLimit(
      `guest:places:daily-client:${clientId}`,
      PLACES_CLIENT_DAILY_LIMIT,
      DAILY_CAPACITY_WINDOW_MS,
      { env, signal: controller.signal },
    );
    if (controller.signal.aborted) return sharedStorageUnavailable();
    if (result.unavailable) {
      return {
        success: false,
        unavailable: true,
        retryAfterSeconds: result.retryAfterSeconds,
        scope: "shared-storage",
      };
    }
    if (!result.success) {
      return {
        success: false,
        unavailable: false,
        retryAfterSeconds: result.retryAfterSeconds,
        scope: "client",
      };
    }
    return ALLOWED;
  } catch (error) {
    if (controller.signal.aborted) return sharedStorageUnavailable();
    throw error;
  } finally {
    clearTimeout(deadline);
    options.signal?.removeEventListener("abort", abortFromCaller);
  }
}
