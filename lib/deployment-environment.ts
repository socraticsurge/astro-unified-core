import "server-only";

export type DeploymentEnvironment = "local" | "deployed" | "unknown";

/**
 * Classify the runtime from explicit, mutually consistent markers.
 *
 * Missing or contradictory markers are deliberately not treated as local:
 * guest calculation and abuse-control gates must fail closed when deployment
 * identity cannot be established.
 */
export function deploymentEnvironment(
  env: Record<string, string | undefined> = process.env,
): DeploymentEnvironment {
  const nodeEnv = env.NODE_ENV;
  const vercelEnv = env.VERCEL_ENV;

  if (vercelEnv !== undefined) {
    if (vercelEnv === "development") {
      return nodeEnv === undefined || nodeEnv === "development" || nodeEnv === "test"
        ? "local"
        : "unknown";
    }
    if (vercelEnv === "preview" || vercelEnv === "production") {
      return nodeEnv === undefined || nodeEnv === "production"
        ? "deployed"
        : "unknown";
    }
    return "unknown";
  }

  if (env.VERCEL === "1") return "unknown";
  if (nodeEnv === "development" || nodeEnv === "test") return "local";
  return "unknown";
}
