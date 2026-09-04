const SENSITIVE_GEOCODER_ENDPOINTS = new Set([
  "https://eu1.locationiq.com/v1/search",
  "https://us1.locationiq.com/v1/search",
  "https://api.geoapify.com/v1/geocode/search",
  "https://nominatim.openstreetmap.org/search",
]);

type IntegrationLike = { name: string };
type NodeFetchPrivacyOptions = {
  ignoreOutgoingRequests: (url: string) => boolean;
};
type HttpPrivacyOptions = {
  maxRequestBodySize: "none";
  ignoreOutgoingRequests: (url: string) => boolean;
};
type SpanLike = {
  attributes?: Record<string, unknown>;
};

export function isSensitiveGeocoderUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return SENSITIVE_GEOCODER_ENDPOINTS.has(`${url.origin}${url.pathname}`);
  } catch {
    return false;
  }
}

/** Defense in depth if a fetch span bypasses the configured integration filter. */
export function scrubSensitiveGeocoderSpan<T extends SpanLike>(span: T): T {
  const attributes = span.attributes;
  if (!attributes) return span;
  const urlKeys = ["url.full", "http.url"];
  const sensitive = urlKeys.some((key) => (
    typeof attributes[key] === "string"
    && isSensitiveGeocoderUrl(attributes[key] as string)
  ));
  if (!sensitive) return span;

  const scrubbed = { ...attributes };
  for (const key of urlKeys) {
    const value = scrubbed[key];
    if (typeof value !== "string" || !isSensitiveGeocoderUrl(value)) continue;
    const url = new URL(value);
    scrubbed[key] = `${url.origin}${url.pathname}`;
  }
  for (const key of ["url.query", "http.query"]) {
    if (key in scrubbed) scrubbed[key] = "[Filtered]";
  }
  return { ...span, attributes: scrubbed };
}

/**
 * Replace Sentry's default native-fetch integration with an equivalent that
 * ignores fixed geocoder endpoints, and retain a final span scrubber.
 */
export function sentryServerPrivacyOptions<T extends IntegrationLike>(
  nativeNodeFetchIntegration: (
    options: NodeFetchPrivacyOptions,
  ) => T,
  httpIntegration: (options: HttpPrivacyOptions) => T,
) {
  return {
    integrations(defaultIntegrations: T[]): T[] {
      return [
        ...defaultIntegrations.filter(
          ({ name }) => name !== "NodeFetch" && name !== "Http",
        ),
        httpIntegration({
          maxRequestBodySize: "none",
          ignoreOutgoingRequests: isSensitiveGeocoderUrl,
        }),
        nativeNodeFetchIntegration({
          ignoreOutgoingRequests: isSensitiveGeocoderUrl,
        }),
      ];
    },
    beforeSendSpan: scrubSensitiveGeocoderSpan,
  };
}
