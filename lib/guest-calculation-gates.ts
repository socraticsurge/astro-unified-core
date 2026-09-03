import "server-only";

import { deploymentEnvironment } from "./deployment-environment";

export const GUEST_BIRTH_PROFILE_FLAG = "GUEST_BIRTH_PROFILE_ENABLED";
export const GUEST_ELECTION_CHART_FLAG = "GUEST_ELECTION_CHART_ENABLED";

type GuestCalculationFlag =
  | typeof GUEST_BIRTH_PROFILE_FLAG
  | typeof GUEST_ELECTION_CHART_FLAG;

/**
 * Guest calculation routes are convenient by default only in local
 * development. Vercel Preview and Production require the corresponding
 * server-only flag to be the exact string `true`; malformed, false, or unknown
 * deployment configuration fails closed.
 */
function guestCalculationEnabled(
  flag: GuestCalculationFlag,
  env: Record<string, string | undefined>,
): boolean {
  const runtime = deploymentEnvironment(env);
  if (runtime === "unknown") return false;

  const configured = env[flag];
  if (runtime === "local") {
    return configured === undefined || configured === "true";
  }
  return configured === "true";
}

export function guestBirthProfileEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return guestCalculationEnabled(GUEST_BIRTH_PROFILE_FLAG, env);
}

export function guestElectionChartEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return guestCalculationEnabled(GUEST_ELECTION_CHART_FLAG, env);
}
