export type GeocoderCapacityErrorCode = "rate-limited" | "unavailable";

/** Sanitized control-plane error safe for route-level status mapping. */
export class GeocoderCapacityError extends Error {
  readonly code: GeocoderCapacityErrorCode;
  readonly retryAfterSeconds: number;

  constructor(code: GeocoderCapacityErrorCode, retryAfterSeconds: number) {
    super(
      code === "rate-limited"
        ? "Geocoder capacity is temporarily limited"
        : "Geocoder capacity is temporarily unavailable",
    );
    this.name = "GeocoderCapacityError";
    this.code = code;
    const normalizedRetryAfter = Number.isFinite(retryAfterSeconds)
      ? Math.ceil(retryAfterSeconds)
      : 10;
    this.retryAfterSeconds = Math.max(1, Math.min(86_400, normalizedRetryAfter));
  }
}

export function isGeocoderCapacityError(
  error: unknown,
): error is GeocoderCapacityError {
  return error instanceof GeocoderCapacityError;
}
