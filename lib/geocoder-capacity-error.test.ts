import { describe, expect, it } from "vitest";

import { GeocoderCapacityError } from "./geocoder-capacity-error";

describe("GeocoderCapacityError", () => {
  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "replaces a non-finite Retry-After value %s with a bounded fallback",
    (retryAfterSeconds) => {
      expect(
        new GeocoderCapacityError("unavailable", retryAfterSeconds)
          .retryAfterSeconds,
      ).toBe(10);
    },
  );

  it.each([
    [-1, 1],
    [0, 1],
    [1.01, 2],
    [86_400, 86_400],
    [100_000, 86_400],
  ])(
    "bounds a finite Retry-After value %s to %s seconds",
    (retryAfterSeconds, expected) => {
      expect(
        new GeocoderCapacityError("rate-limited", retryAfterSeconds)
          .retryAfterSeconds,
      ).toBe(expected);
    },
  );
});
