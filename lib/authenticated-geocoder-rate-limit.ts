import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import { deploymentEnvironment } from "./deployment-environment";
import { distributedRateLimit } from "./distributed-rate-limit";
import { rateLimit } from "./rate-limit";

export type AuthenticatedGeocoderRateLimitResult = {
  success: boolean;
  unavailable: boolean;
  retryAfterSeconds: number;
  scope: "user" | "fleet" | "shared-storage" | null;
};

const USER_LIMIT = 10;
const FLEET_LIMIT = 60;
const WINDOW_MS = 60_000;
const ALLOWED: AuthenticatedGeocoderRateLimitResult = {
  success: true,
  unavailable: false,
  retryAfterSeconds: 0,
  scope: null,
};

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
 * work. The fleet key is shared with guest place search, so both paths fit
 * under one provider-request ceiling across horizontally scaled functions.
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

  const sharedUser = await distributedRateLimit(
    `authenticated-geocoder:user:${userId}`,
    USER_LIMIT,
    WINDOW_MS,
    { env },
  );
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

  const fleet = await distributedRateLimit(
    "geocoder:fleet",
    FLEET_LIMIT,
    WINDOW_MS,
    { env },
  );
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
}
