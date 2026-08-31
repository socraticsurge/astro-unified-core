import "server-only";

export const PUBLIC_NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const LOCAL_GEOCODER_IDENTITY = "AstroChaganti/1.0 (https://astrochaganti.com)";

export type GeocoderConfig = {
  searchUrl: string;
  identity: string;
};

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === "localhost"
    || normalized === "127.0.0.1"
    || normalized === "[::1]"
    || normalized === "::1";
}

function isDeployedVercelEnvironment(value: string | undefined): boolean {
  return value === "preview" || value === "production";
}

function isLocalEnvironment(value: string | undefined): boolean {
  return value === undefined || value === "development";
}

function validIdentity(value: string): boolean {
  return value === value.trim()
    && value.length >= 16
    && value.length <= 240
    && /^[\x20-\x7E]+$/.test(value);
}

/**
 * Resolve the server-side geocoder endpoint and provider identity.
 *
 * Local development may use the public Nominatim service under the shared
 * process limiter in `lib/geocode.ts`. Vercel Preview and Production require
 * an explicit, non-public provider base and explicit identity. This prevents a
 * feature-flag change from silently directing production traffic at the
 * community Nominatim endpoint.
 */
export function geocoderConfig(
  env: Record<string, string | undefined> = process.env,
): GeocoderConfig | null {
  const deployed = isDeployedVercelEnvironment(env.VERCEL_ENV);
  if (!deployed && !isLocalEnvironment(env.VERCEL_ENV)) return null;
  const configuredBase = env.GEOCODER_BASE_URL;
  const configuredIdentity = env.GEOCODER_USER_AGENT;

  if (deployed && (!configuredBase || !configuredIdentity)) return null;

  const rawBase = configuredBase || PUBLIC_NOMINATIM_BASE_URL;
  const identity = configuredIdentity || LOCAL_GEOCODER_IDENTITY;
  if (rawBase !== rawBase.trim() || !validIdentity(identity)) return null;

  try {
    const base = new URL(rawBase);
    if (base.username || base.password || base.search || base.hash) return null;

    const secure = base.protocol === "https:";
    const localLoopback = !deployed
      && base.protocol === "http:"
      && isLoopbackHostname(base.hostname);
    if (!secure && !localLoopback) return null;

    const dnsHostname = base.hostname.toLowerCase().replace(/\.+$/, "");
    if (deployed && dnsHostname === "nominatim.openstreetmap.org") return null;

    base.pathname = `${base.pathname.replace(/\/+$/, "")}/`;
    return {
      searchUrl: new URL("search", base).toString(),
      identity,
    };
  } catch {
    return null;
  }
}

export function geocoderConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return geocoderConfig(env) !== null;
}
