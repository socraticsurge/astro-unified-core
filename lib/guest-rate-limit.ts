import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import { RATE_LIMIT_DEFAULT_COUNT, RATE_LIMIT_WINDOW_MS } from "./constants";
import { deploymentEnvironment } from "./deployment-environment";
import { distributedRateLimit } from "./distributed-rate-limit";
import { rateLimit } from "./rate-limit";

export type GuestRateLimitNamespace =
  | "places"
  | "profile-derive"
  | "election-charts";

export type GuestRateLimitResult = {
  success: boolean;
  unavailable: boolean;
  retryAfterSeconds: number;
  scope: "client" | "fleet" | "shared-storage" | null;
};

const FLEET_LIMITS: Record<GuestRateLimitNamespace, number> = {
  places: 60,
  "profile-derive": 30,
  "election-charts": 10,
};

const FLEET_KEYS: Record<GuestRateLimitNamespace, string> = {
  places: "geocoder:fleet",
  "profile-derive": "guest:profile-derive:fleet",
  "election-charts": "guest:election-charts:fleet",
};

const ALLOWED: GuestRateLimitResult = {
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
 * Apply the inexpensive per-instance guard first, then enforce both a
 * per-client and route-wide fleet budget in deployed runtimes. Rejected
 * clients do not consume the fleet counter.
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

  const sharedClient = await distributedRateLimit(
    clientKey,
    RATE_LIMIT_DEFAULT_COUNT,
    RATE_LIMIT_WINDOW_MS,
    { env },
  );
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

  const fleet = await distributedRateLimit(
    FLEET_KEYS[namespace],
    FLEET_LIMITS[namespace],
    RATE_LIMIT_WINDOW_MS,
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
