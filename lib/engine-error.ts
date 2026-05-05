// Detects an engine-level failure in a fetcher's return value so the API
// route can refuse to cache the bad result and surface a 502 to the client.
// Engine fetchers swallow exceptions and return them as fields on the
// payload (`error`, or VedAstro's `errors` map), so a healthy HTTP 200
// from the route does not by itself mean a successful reading.
export function extractEngineError(output: unknown): string | null {
  if (!output || typeof output !== "object") return null;
  const o = output as Record<string, unknown>;

  if (typeof o.error === "string" && o.error.length > 0) return o.error;

  // VedAstro shape: { raw_responses: {...}, errors: {...} }.
  // Treat as a hard failure only when every sub-call errored (no usable data).
  if (
    o.errors && typeof o.errors === "object" &&
    o.raw_responses && typeof o.raw_responses === "object"
  ) {
    const errors = o.errors as Record<string, unknown>;
    const raws = o.raw_responses as Record<string, unknown>;
    if (Object.keys(raws).length === 0 && Object.keys(errors).length > 0) {
      return Object.values(errors).map((v) => String(v)).join("; ");
    }
  }

  // `data: null` with no explicit error message — treat as empty result.
  if ("data" in o && o.data === null) return "Engine returned no data";

  return null;
}
