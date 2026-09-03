import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import { deploymentEnvironment } from "./deployment-environment";
import {
  distributedRateLimit,
  distributedRateLimitStatus,
} from "./distributed-rate-limit";
import { rateLimit } from "./rate-limit";

export type AuthenticatedGeocoderRateLimitResult = {
  success: boolean;
  unavailable: boolean;
  retryAfterSeconds: number;
  scope: "user" | "fleet" | "capacity" | "shared-storage" | null;
};

const USER_LIMIT = 10;
const FLEET_LIMIT = 30;
const WINDOW_MS = 60_000;
const DAILY_CAPACITY_KEY = "authenticated-geocoder:daily-capacity";
const DAILY_CAPACITY_WINDOW_MS = 24 * 60 * 60 * 1_000;
const DAILY_CAPACITY_LIMITS = {
  preview: 500,
  production: 2_500,
} as const;
const DEPLOYED_GUARD_CHAIN_DEADLINE_MS = 2_000;
const ALLOWED: AuthenticatedGeocoderRateLimitResult = {
  success: true,
  unavailable: false,
  retryAfterSeconds: 0,
  scope: null,
};

function sharedStorageUnavailable(): AuthenticatedGeocoderRateLimitResult {
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
  __astroChagantiAuthenticatedGeocoderLimiterPseudonym?: ProcessPseudonymState;
};
const existingPseudonymState =
  processGlobal.__astroChagantiAuthenticatedGeocoderLimiterPseudonym;
const pseudonymState: ProcessPseudonymState =
  existingPseudonymState?.version === PROCESS_PSEUDONYM_STATE_VERSION
    ? existingPseudonymState
    : {
      version: PROCESS_PSEUDONYM_STATE_VERSION,
      secret: randomBytes(32),
    };
processGlobal.__astroChagantiAuthenticatedGeocoderLimiterPseudonym =
  pseudonymState;

function processUserKey(userId: string): string {
  const digest = createHmac("sha256", pseudonymState.secret)
    .update(`authenticated-geocoder:${userId}`)
    .digest("hex");
  return `authenticated-geocoder:user:${digest}`;
}

/**
 * Bound every managed authenticated geocoder lookup before cache or provider
 * work. After process-local control, the deployment attempt budget is reserved
 * before the shared user and fleet rows so Turso mutations remain bounded. The
 * later user-first ordering prevents one account from consuming fleet capacity
 * with requests rejected by its lower per-user ceiling. A later denial does not
 * refund the conservative attempt budget.
 */
export async function enforceAuthenticatedGeocoderRateLimit(
  userId: string,
  options: { env?: Record<string, string | undefined> } = {},
): Promise<AuthenticatedGeocoderRateLimitResult> {
  const env = options.env ?? process.env;
  if (!userId || userId.length > 512) {
    return {
      success: false,
      unavailable: true,
      retryAfterSeconds: 10,
      scope: "shared-storage",
    };
  }

  const local = rateLimit(processUserKey(userId), USER_LIMIT, WINDOW_MS);
  if (!local.success) {
    return {
      success: false,
      unavailable: false,
      retryAfterSeconds: Math.ceil(WINDOW_MS / 1_000),
      scope: "user",
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

    // Reserve the account-wide mutation budget before any per-user/fleet Turso
    // row. A later user/fleet denial still consumes this attempt budget, which
    // keeps the total shared-write envelope bounded across instances.
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
    const sharedUser = await distributedRateLimit(
      `authenticated-geocoder:user:${userId}`,
      USER_LIMIT,
      WINDOW_MS,
      distributedOptions,
    );
    if (signal.aborted) return sharedStorageUnavailable();
    if (sharedUser.unavailable) {
      return {
        success: false,
        unavailable: true,
        retryAfterSeconds: sharedUser.retryAfterSeconds,
        scope: "shared-storage",
      };
    }
    if (!sharedUser.success) {
      return {
        success: false,
        unavailable: false,
        retryAfterSeconds: sharedUser.retryAfterSeconds,
        scope: "user",
      };
    }

    if (signal.aborted) return sharedStorageUnavailable();
    const fleet = await distributedRateLimit(
      "geocoder:fleet",
      FLEET_LIMIT,
      WINDOW_MS,
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

    return ALLOWED;
  } catch (error) {
    if (signal.aborted) return sharedStorageUnavailable();
    throw error;
  } finally {
    clearTimeout(deadline);
  }
}
