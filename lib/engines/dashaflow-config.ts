import "server-only";

import { deploymentEnvironment } from "../deployment-environment";

const DEFAULT_SIDECAR = "https://dashaflow-sidecar.vercel.app";
const MIN_SERVICE_TOKEN_LENGTH = 32;
const MAX_SERVICE_TOKEN_LENGTH = 256;

export type DashaflowSidecarConfig = {
  url: string;
  token: string;
};

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === "localhost"
    || normalized === "127.0.0.1"
    || normalized === "[::1]"
    || normalized === "::1";
}

function validServiceToken(value: string | undefined): value is string {
  if (!value) return false;
  if (
    value.length < MIN_SERVICE_TOKEN_LENGTH
    || value.length > MAX_SERVICE_TOKEN_LENGTH
  ) return false;
  return /^[\x21-\x7E]+$/.test(value);
}

/**
 * Resolve a credentialed DashaFlow endpoint without ever attaching the bearer
 * token to an untrusted transport. Vercel Preview and Production require
 * HTTPS. Local development may opt into HTTP only for an exact loopback host.
 */
export function credentialedDashaflowSidecarConfig(
  path: `/${string}`,
  env: Record<string, string | undefined> = process.env,
): DashaflowSidecarConfig | null {
  const token = env.DASHAFLOW_SIDECAR_TOKEN;
  if (!validServiceToken(token)) return null;

  const rawUrl = env.DASHAFLOW_SIDECAR_URL || DEFAULT_SIDECAR;
  if (rawUrl !== rawUrl.trim()) return null;

  try {
    const base = new URL(rawUrl);
    if (
      base.username
      || base.password
      || base.pathname !== "/"
      || base.search
      || base.hash
    ) return null;

    const runtime = deploymentEnvironment(env);
    const secure = base.protocol === "https:";
    const localLoopback = runtime === "local"
      && base.protocol === "http:"
      && isLoopbackHostname(base.hostname);
    if (!secure && !localLoopback) return null;

    return {
      url: `${base.origin}${path}`,
      token,
    };
  } catch {
    return null;
  }
}
