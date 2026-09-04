import "server-only";

import { deploymentEnvironment } from "./deployment-environment";

export const PUBLIC_NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const LOCAL_GEOCODER_IDENTITY = "AstroChaganti/1.0 (https://astrochaganti.com)";

export type ManagedGeocoderProvider =
  | "nominatim-public"
  | "locationiq-eu"
  | "locationiq-us"
  | "geoapify";

type ApiKeyGeocoderProvider = Exclude<
  ManagedGeocoderProvider,
  "nominatim-public"
>;

export type GeocoderAttributionLink = {
  label: string;
  url: string;
};

export type GeocoderConfig = {
  provider: "nominatim-local" | ManagedGeocoderProvider;
  searchUrl: string;
  identity: string;
  queryParameter: "q" | "text";
  apiKeyParameter?: "key" | "apiKey";
  apiKey?: string;
  responseEnvelope: "array" | "results";
  attribution: string;
  attributions: readonly GeocoderAttributionLink[];
};

export type GeocoderPublicMetadata = Pick<
  GeocoderConfig,
  "attribution" | "attributions"
>;

const OSM_ATTRIBUTION = {
  label: "© OpenStreetMap contributors",
  url: "https://www.openstreetmap.org/copyright",
} as const;

const MANAGED_PROVIDER_CONFIG = {
  "locationiq-eu": {
    searchUrl: "https://eu1.locationiq.com/v1/search",
    queryParameter: "q",
    apiKeyParameter: "key",
    responseEnvelope: "array",
    attribution: "Search by LocationIQ.com; data © OpenStreetMap contributors",
    attributions: [
      { label: "Search by LocationIQ.com", url: "https://locationiq.com/" },
      OSM_ATTRIBUTION,
    ],
  },
  "locationiq-us": {
    searchUrl: "https://us1.locationiq.com/v1/search",
    queryParameter: "q",
    apiKeyParameter: "key",
    responseEnvelope: "array",
    attribution: "Search by LocationIQ.com; data © OpenStreetMap contributors",
    attributions: [
      { label: "Search by LocationIQ.com", url: "https://locationiq.com/" },
      OSM_ATTRIBUTION,
    ],
  },
  geoapify: {
    searchUrl: "https://api.geoapify.com/v1/geocode/search",
    queryParameter: "text",
    apiKeyParameter: "apiKey",
    responseEnvelope: "results",
    attribution: "Powered by Geoapify; data © OpenStreetMap contributors",
    attributions: [
      { label: "Powered by Geoapify", url: "https://www.geoapify.com/" },
      OSM_ATTRIBUTION,
    ],
  },
} as const satisfies Record<
  ApiKeyGeocoderProvider,
  Omit<GeocoderConfig, "provider" | "identity" | "apiKey">
>;

const MANAGED_PROVIDER_NAMES = new Set<ManagedGeocoderProvider>([
  "nominatim-public",
  "locationiq-eu",
  "locationiq-us",
  "geoapify",
]);

function publicNominatimConfig(
  provider: "nominatim-local" | "nominatim-public" = "nominatim-local",
): GeocoderConfig {
  return {
    provider,
    searchUrl: `${PUBLIC_NOMINATIM_BASE_URL}/search`,
    identity: LOCAL_GEOCODER_IDENTITY,
    queryParameter: "q",
    responseEnvelope: "array",
    attribution: OSM_ATTRIBUTION.label,
    attributions: [OSM_ATTRIBUTION],
  };
}

function managedProvider(
  value: string | undefined,
): ManagedGeocoderProvider | null {
  if (!value || value !== value.trim()) return null;
  return MANAGED_PROVIDER_NAMES.has(value as ManagedGeocoderProvider)
    ? value as ManagedGeocoderProvider
    : null;
}

function validApiKey(value: string | undefined): value is string {
  return typeof value === "string"
    && value === value.trim()
    && value.length >= 8
    && value.length <= 512
    && /^[\x21-\x7E]+$/.test(value);
}

/**
 * Resolve the unauthenticated guest geocoder without accepting operator-supplied
 * endpoints. Unit tests exercise the fixed public-Nominatim contract through
 * mocked fetch; real local development and Preview reject that public service.
 * Production requires one named provider. Public Nominatim is keyless;
 * commercial adapters require their server-only API key. Missing, unknown,
 * ambiguous, or malformed configuration fails closed.
 */
function providerConfig(
  env: Record<string, string | undefined> = process.env,
): GeocoderConfig | null {
  const runtime = deploymentEnvironment(env);
  if (runtime === "unknown") return null;

  const providerValue = env.GEOCODER_PROVIDER;
  const apiKeyValue = env.GEOCODER_API_KEY;
  if (runtime === "local" && providerValue === undefined && apiKeyValue === undefined) {
    // Unit tests use the live provider contract through mocked fetch. Real
    // development must use fixtures or the controlled hosted release path so
    // a laptop cannot silently compete with the production application's
    // public-Nominatim allowance.
    return env.NODE_ENV === "test" ? publicNominatimConfig() : null;
  }

  const provider = managedProvider(providerValue);
  if (provider === null) return null;
  if (provider === "nominatim-public") {
    return runtime === "deployed"
        && env.VERCEL_ENV === "production"
        && apiKeyValue === undefined
      ? publicNominatimConfig("nominatim-public")
      : null;
  }
  if (!validApiKey(apiKeyValue)) return null;
  const definition = MANAGED_PROVIDER_CONFIG[provider];
  return {
    provider,
    ...definition,
    identity: LOCAL_GEOCODER_IDENTITY,
    apiKey: apiKeyValue,
  };
}

/**
 * Registered-profile migration is a separate production activation from the
 * guest journeys. Only the exact string `true` enables the managed adapter in
 * a trusted deployed runtime. Production alone may preserve the legacy path
 * while the flag is off; Preview remains fixture-only.
 */
export function authenticatedProfileManagedGeocoderEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return deploymentEnvironment(env) === "deployed"
    && env.AUTH_PROFILE_MANAGED_GEOCODER_ENABLED === "true";
}

export function guestGeocoderConfig(
  env: Record<string, string | undefined> = process.env,
): GeocoderConfig | null {
  const config = providerConfig(env);
  if (
    config?.provider === "nominatim-public"
    && deploymentEnvironment(env) === "deployed"
    && !authenticatedProfileManagedGeocoderEnabled(env)
  ) {
    // Public Nominatim's ceiling is application-wide. Do not enable a guest
    // caller while signed-in profile geocoding still uses the unbudgeted
    // legacy path to the same public endpoint.
    return null;
  }
  return config;
}

/** Public-only provider metadata suitable for the guest route response. */
export function guestGeocoderPublicMetadata(
  env: Record<string, string | undefined> = process.env,
): GeocoderPublicMetadata | null {
  const config = guestGeocoderConfig(env);
  if (!config) return null;
  return {
    attribution: config.attribution,
    attributions: config.attributions.map((entry) => ({ ...entry })),
  };
}

/**
 * Keep the existing registered-profile path available until its separately
 * reviewed migration flag is enabled. Once enabled, reuse the fixed provider
 * boundary independently of guest feature flags. Ambiguous runtimes fail
 * closed rather than guessing whether this is a trusted deployment.
 */
export function authenticatedProfileGeocoderConfig(
  env: Record<string, string | undefined> = process.env,
): GeocoderConfig | null {
  const runtime = deploymentEnvironment(env);
  if (runtime === "unknown") return null;
  if (runtime === "local") return providerConfig(env);
  if (authenticatedProfileManagedGeocoderEnabled(env)) {
    return providerConfig(env);
  }
  // The legacy public-Nominatim path remains available only in Production
  // while its explicit migration flag is off. Preview must use fixtures so it
  // cannot compete with Production for the service-wide one-request/second
  // allowance.
  return env.VERCEL_ENV === "production" ? publicNominatimConfig() : null;
}
