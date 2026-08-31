import "server-only";

export const GUEST_BIRTH_PROFILE_FLAG = "GUEST_BIRTH_PROFILE_ENABLED";
export const GUEST_ELECTION_CHART_FLAG = "GUEST_ELECTION_CHART_ENABLED";

type GuestCalculationFlag =
  | typeof GUEST_BIRTH_PROFILE_FLAG
  | typeof GUEST_ELECTION_CHART_FLAG;

function isLocalEnvironment(vercelEnv: string | undefined): boolean {
  return vercelEnv === undefined || vercelEnv === "development";
}

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
  const configured = env[flag];
  if (configured !== undefined) return configured === "true";
  return isLocalEnvironment(env.VERCEL_ENV);
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
