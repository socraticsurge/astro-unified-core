import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./authenticated-geocoder-rate-limit", () => ({
  enforceAuthenticatedGeocoderRateLimit: vi.fn(),
}));
vi.mock("./guest-rate-limit", () => ({
  enforceGuestPlaceProviderDailyLimit: vi.fn(),
}));
vi.mock("./distributed-rate-limit", () => ({
  completeDistributedProviderRequest: vi.fn(),
  reserveDistributedProviderRequest: vi.fn(),
}));

import {
  geocoderProcessStateForTests,
  queryVariants,
  geocodePlace,
  resetGeocoderProcessStateForTests,
  searchPlaces as searchPlacesImpl,
} from "./geocode";
import { enforceAuthenticatedGeocoderRateLimit } from "./authenticated-geocoder-rate-limit";
import { enforceGuestPlaceProviderDailyLimit } from "./guest-rate-limit";
import {
  completeDistributedProviderRequest,
  reserveDistributedProviderRequest,
} from "./distributed-rate-limit";
import { MANAGED_PROVIDER_MIN_INTERVAL_MS } from "./geocoder-limits";
import { PUBLIC_NOMINATIM_BASE_URL } from "./geocoder-config";

global.fetch = vi.fn();

function searchPlaces(query: string, signal?: AbortSignal) {
  return searchPlacesImpl(query, signal, "203.0.113.10");
}

function resetLocalGeocoder(): void {
  vi.resetAllMocks();
  vi.mocked(enforceAuthenticatedGeocoderRateLimit).mockResolvedValue({
    success: true,
    unavailable: false,
    retryAfterSeconds: 0,
    scope: null,
  });
  vi.mocked(enforceGuestPlaceProviderDailyLimit).mockImplementation(
    async (clientId) => clientId
      ? {
        success: true,
        unavailable: false,
        retryAfterSeconds: 0,
        scope: null,
      }
      : {
        success: false,
        unavailable: true,
        retryAfterSeconds: 10,
        scope: "shared-storage",
      },
  );
  vi.mocked(reserveDistributedProviderRequest).mockResolvedValue({
    success: true,
    remaining: 1_499,
    unavailable: false,
    retryAfterSeconds: 0,
    configured: true,
    reservationExpiresAtMs: 12_500,
  });
  vi.mocked(completeDistributedProviderRequest).mockResolvedValue(true);
  delete process.env.VERCEL_ENV;
  delete process.env.GEOCODER_PROVIDER;
  delete process.env.GEOCODER_API_KEY;
  delete process.env.GEOCODER_BASE_URL;
  delete process.env.GEOCODER_USER_AGENT;
  delete process.env.AUTH_PROFILE_MANAGED_GEOCODER_ENABLED;
  delete process.env.GEOCODER_DAILY_REQUEST_LIMIT;
  resetGeocoderProcessStateForTests();
}

function configureManagedGeocoder(
  provider: "locationiq-eu" | "locationiq-us" | "geoapify",
  apiKey = "test-provider-secret",
): void {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("GEOCODER_PROVIDER", provider);
  vi.stubEnv("GEOCODER_API_KEY", apiKey);
  vi.stubEnv("AUTH_PROFILE_MANAGED_GEOCODER_ENABLED", "true");
  vi.stubEnv("GEOCODER_DAILY_REQUEST_LIMIT", "1500");
}

function configurePublicNominatim(): void {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("GEOCODER_PROVIDER", "nominatim-public");
  vi.stubEnv("AUTH_PROFILE_MANAGED_GEOCODER_ENABLED", "true");
  vi.stubEnv("GEOCODER_DAILY_REQUEST_LIMIT", "1000");
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  delete process.env.VERCEL_ENV;
  delete process.env.GEOCODER_PROVIDER;
  delete process.env.GEOCODER_API_KEY;
  delete process.env.GEOCODER_BASE_URL;
  delete process.env.GEOCODER_USER_AGENT;
  delete process.env.AUTH_PROFILE_MANAGED_GEOCODER_ENABLED;
  delete process.env.GEOCODER_DAILY_REQUEST_LIMIT;
});

describe("queryVariants", () => {
  it("handles a simple string without comma", () => {
    const res = queryVariants("Hyderabad");
    expect(res).toEqual(["Hyderabad", "Hyderabad, India"]);
  });

  it("handles a string with leading/trailing whitespace", () => {
    const res = queryVariants("  Mumbai  ");
    expect(res).toEqual(["Mumbai", "Mumbai, India"]);
  });

  it("handles a string with one comma", () => {
    const res = queryVariants("Vishakhapatnam, AP");
    expect(res).toContain("Vishakhapatnam, AP");
    expect(res).toContain("Vishakhapatnam");
    expect(res).toContain("Vishakhapatnam, India");
    expect(res).toContain("AP");
    expect(res.length).toBe(4);
  });

  it("handles multiple segments", () => {
    const res = queryVariants("Village, Mandal, District, State");
    expect(res).toContain("Village, Mandal, District, State");
    expect(res).toContain("Village");
    expect(res).toContain("Village, India");
    expect(res).toContain("State");
    expect(res).toContain("Village, Mandal, District");
  });

  it("handles empty string", () => {
    const res = queryVariants("");
    expect(res).toEqual(["", ", India"]);
  });

  it("handles single comma only", () => {
    const res = queryVariants(",");
    expect(res).toEqual([","]);
  });
});

describe("geocodePlace", () => {
  beforeEach(() => {
    resetLocalGeocoder();
  });

  it("classifies a provider network failure without cascading queries", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("Network Error"));

    await expect(geocodePlace("Unknown Place")).rejects.toMatchObject({
      name: "GeocoderCapacityError",
      code: "unavailable",
      retryAfterSeconds: 10,
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("throws a default error if no results are found and no HTTP errors occur", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    await expect(geocodePlace("Nowhere")).rejects.toThrow(
      'We couldn\'t find "Nowhere". Try the nearest larger city — for example, the closest district headquarters.'
    );
  });

  it("succeeds if an early variant is empty but a later one matches", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ lat: "17.3850", lon: "78.4867", display_name: "Hyderabad" }],
      } as Response);

    const result = await geocodePlace("Hyderabad");
    expect(result.latitude).toBe(17.385);
    expect(result.longitude).toBe(78.4867);
    expect(result.display_name).toBe("Hyderabad");
    expect(result.timezone).toBe("Asia/Kolkata");
  });

  it("uses the managed provider for authenticated profiles without depending on guest flags", async () => {
    configureManagedGeocoder("geoapify");
    vi.stubEnv("GUEST_BIRTH_PROFILE_ENABLED", "false");
    vi.mocked(global.fetch).mockResolvedValue(new Response(JSON.stringify({
      results: [{
        place_id: "authenticated-place",
        lat: 17.385,
        lon: 78.4867,
        formatted: "Hyderabad",
      }],
    }), { status: 200 }));

    await expect(geocodePlace("Authenticated Hyderabad", {
      authenticatedUserId: "user-123",
    })).resolves.toMatchObject({
      latitude: 17.385,
      longitude: 78.4867,
    });
    expect(enforceAuthenticatedGeocoderRateLimit).toHaveBeenCalledWith(
      "user-123",
    );
    const providerUrl = new URL(String(vi.mocked(global.fetch).mock.calls[0][0]));
    expect(providerUrl.origin).toBe("https://api.geoapify.com");
    expect(providerUrl.searchParams.get("text")).toBe("Authenticated Hyderabad");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["rate-limited", false, 7],
    ["unavailable", true, 10],
  ] as const)(
    "maps an authenticated limiter %s result before provider work",
    async (code, unavailable, retryAfterSeconds) => {
      configureManagedGeocoder("locationiq-eu");
      vi.mocked(enforceAuthenticatedGeocoderRateLimit).mockResolvedValue({
        success: false,
        unavailable,
        retryAfterSeconds,
        scope: unavailable ? "shared-storage" : "user",
      });

      await expect(geocodePlace("Authenticated Hyderabad", {
        authenticatedUserId: "user-123",
      })).rejects.toMatchObject({
        name: "GeocoderCapacityError",
        code,
        retryAfterSeconds,
      });
      expect(reserveDistributedProviderRequest).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    },
  );

  it("preserves deployed authenticated Nominatim until migration activation", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.mocked(global.fetch).mockResolvedValue(new Response(JSON.stringify([{
      place_id: 1,
      lat: "17.385",
      lon: "78.4867",
      display_name: "Authenticated Hyderabad",
    }]), { status: 200 }));

    await expect(geocodePlace("Authenticated Hyderabad")).resolves
      .toMatchObject({ latitude: 17.385, longitude: 78.4867 });
    expect(String(vi.mocked(global.fetch).mock.calls[0][0])).toMatch(
      /^https:\/\/nominatim\.openstreetmap\.org\/search\?/,
    );
    expect(enforceAuthenticatedGeocoderRateLimit).not.toHaveBeenCalled();
    expect(reserveDistributedProviderRequest).not.toHaveBeenCalled();
  });

  it("fails closed after activation without a managed provider", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("AUTH_PROFILE_MANAGED_GEOCODER_ENABLED", "true");

    await expect(geocodePlace("Authenticated Hyderabad", {
      authenticatedUserId: "user-123",
    })).rejects.toMatchObject({
      name: "GeocoderCapacityError",
      code: "unavailable",
      retryAfterSeconds: 10,
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("fails closed when a managed authenticated lookup has no user identity", async () => {
    configureManagedGeocoder("locationiq-eu");

    await expect(geocodePlace("Authenticated Hyderabad")).rejects.toMatchObject({
      name: "GeocoderCapacityError",
      code: "unavailable",
      retryAfterSeconds: 10,
    });
    expect(enforceAuthenticatedGeocoderRateLimit).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("searchPlaces", () => {
  beforeEach(() => {
    resetLocalGeocoder();
  });

  it("reuses public Nominatim through the shared deployed budget", async () => {
    configurePublicNominatim();
    vi.mocked(global.fetch).mockResolvedValue(new Response(JSON.stringify([{
      place_id: 123,
      osm_type: "relation",
      osm_id: 456,
      lat: "17.3850",
      lon: "78.4867",
      display_name: "Hyderabad, Telangana, India",
    }]), { status: 200 }));

    await expect(searchPlaces("Hyderabad")).resolves.toEqual([{
      id: "nominatim-public:123",
      label: "Hyderabad, Telangana, India",
      latitude: 17.385,
      longitude: 78.4867,
      timezone: "Asia/Kolkata",
    }]);

    expect(reserveDistributedProviderRequest).toHaveBeenCalledWith(
      "nominatim-public",
      1_000,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(completeDistributedProviderRequest).toHaveBeenCalledWith(
      "nominatim-public",
      12_500,
      expect.objectContaining({
        cooldownMs: MANAGED_PROVIDER_MIN_INTERVAL_MS,
        env: expect.objectContaining({
          VERCEL_ENV: "production",
          GEOCODER_PROVIDER: "nominatim-public",
        }),
      }),
    );
    const [input, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(new URL(String(input)).origin).toBe(PUBLIC_NOMINATIM_BASE_URL);
    expect(init?.headers).toMatchObject({
      "User-Agent": "AstroChaganti/1.0 (https://astrochaganti.com)",
    });
  });

  it("releases the public-Nominatim lease after a provider failure", async () => {
    configurePublicNominatim();
    vi.mocked(global.fetch).mockRejectedValue(new Error("provider offline"));

    await expect(searchPlaces("Hyderabad")).rejects.toMatchObject({
      name: "GeocoderCapacityError",
      code: "unavailable",
    });
    expect(completeDistributedProviderRequest).toHaveBeenCalledWith(
      "nominatim-public",
      12_500,
      expect.objectContaining({
        cooldownMs: MANAGED_PROVIDER_MIN_INTERVAL_MS,
      }),
    );
  });

  it.each([
    ["numeric", "120", 120, 120_000],
    ["missing", undefined, 60, 60_000],
    ["zero", "0", 60, 60_000],
    ["malformed", "later", 60, 60_000],
    ["bounded", "999999", 86_400, 86_400_000],
  ] as const)(
    "shares a %s provider Retry-After through fenced completion",
    async (_kind, retryAfter, expectedSeconds, expectedCooldownMs) => {
      configurePublicNominatim();
      vi.mocked(global.fetch).mockResolvedValue(new Response("", {
        status: 429,
        ...(retryAfter ? { headers: { "Retry-After": retryAfter } } : {}),
      }));

      await expect(searchPlaces(`Retry ${_kind}`)).rejects.toMatchObject({
        name: "GeocoderCapacityError",
        code: "rate-limited",
        retryAfterSeconds: expectedSeconds,
      });
      expect(completeDistributedProviderRequest).toHaveBeenCalledWith(
        "nominatim-public",
        12_500,
        expect.objectContaining({ cooldownMs: expectedCooldownMs }),
      );
    },
  );

  it("shares an HTTP-date Retry-After through fenced completion", async () => {
    configurePublicNominatim();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T00:00:00.000Z"));
    vi.mocked(global.fetch).mockResolvedValue(new Response("", {
      status: 429,
      headers: {
        "Retry-After": new Date("2026-09-04T00:02:00.000Z").toUTCString(),
      },
    }));

    await expect(searchPlaces("Retry dated")).rejects.toMatchObject({
      code: "rate-limited",
      retryAfterSeconds: 120,
    });
    expect(completeDistributedProviderRequest).toHaveBeenCalledWith(
      "nominatim-public",
      12_500,
      expect.objectContaining({ cooldownMs: 120_000 }),
    );
  });

  it("uses the safe default for a past HTTP-date Retry-After", async () => {
    configurePublicNominatim();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T00:02:00.000Z"));
    vi.mocked(global.fetch).mockResolvedValue(new Response("", {
      status: 429,
      headers: {
        "Retry-After": new Date("2026-09-04T00:00:00.000Z").toUTCString(),
      },
    }));

    await expect(searchPlaces("Retry past date")).rejects.toMatchObject({
      code: "rate-limited",
      retryAfterSeconds: 60,
    });
    expect(completeDistributedProviderRequest).toHaveBeenCalledWith(
      "nominatim-public",
      12_500,
      expect.objectContaining({ cooldownMs: 60_000 }),
    );
  });

  it("never dispatches a public-Nominatim lease that arrives at the request deadline", async () => {
    configurePublicNominatim();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T00:00:00.000Z"));
    vi.mocked(reserveDistributedProviderRequest).mockImplementation(() => (
      new Promise((resolve) => {
        setTimeout(() => resolve({
          success: true,
          remaining: 999,
          unavailable: false,
          retryAfterSeconds: 0,
          configured: true,
          reservationExpiresAtMs: Date.now() + 12_500,
        }), 8_000);
      })
    ));

    const result = expect(searchPlaces("Hyderabad")).rejects.toMatchObject({
      name: "GeocoderCapacityError",
      code: "unavailable",
    });
    await vi.advanceTimersByTimeAsync(8_000);

    await result;
    expect(global.fetch).not.toHaveBeenCalled();
    expect(completeDistributedProviderRequest).not.toHaveBeenCalled();
  });

  it("shares public Nominatim pacing with authenticated profile geocoding", async () => {
    configurePublicNominatim();
    vi.mocked(global.fetch).mockImplementation(async (input) => {
      const query = new URL(String(input)).searchParams.get("q") ?? "Unknown";
      return new Response(JSON.stringify([{
        place_id: query,
        lat: "17.385",
        lon: "78.4867",
        display_name: query,
      }]), { status: 200 });
    });

    await searchPlaces("Guest place");
    await geocodePlace("Authenticated place", {
      authenticatedUserId: "private-user-id",
    });

    expect(reserveDistributedProviderRequest).toHaveBeenCalledTimes(2);
    for (const call of vi.mocked(reserveDistributedProviderRequest).mock.calls) {
      expect(call.slice(0, 2)).toEqual(["nominatim-public", 1_000]);
    }
    expect(enforceAuthenticatedGeocoderRateLimit).toHaveBeenCalledWith(
      "private-user-id",
    );
  });

  it("uses one bounded upstream request and returns selectable IANA-timezone results", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => [{
        place_id: 123,
        osm_type: "relation",
        osm_id: 456,
        lat: "17.3850",
        lon: "78.4867",
        display_name: "Hyderabad, Telangana, India",
      }],
    } as Response);

    await expect(searchPlaces("  Hyderabad  ")).resolves.toEqual([{
      id: "osm:relation:456",
      label: "Hyderabad, Telangana, India",
      latitude: 17.385,
      longitude: 78.4867,
      timezone: "Asia/Kolkata",
    }]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(String(url)).toContain("q=Hyderabad");
    expect(String(url)).toContain("limit=5");
    expect(String(url)).toContain("format=json");
    expect(init).toMatchObject({
      cache: "no-store",
      redirect: "error",
      headers: {
        Accept: "application/json",
        "User-Agent": "AstroChaganti/1.0 (https://astrochaganti.com)",
      },
    });
    expect(reserveDistributedProviderRequest).not.toHaveBeenCalled();
  });

  it("redacts provider URLs, queries, and credentials from failures", async () => {
    configureManagedGeocoder("locationiq-eu");
    vi.mocked(global.fetch).mockRejectedValue(new Error(
      "request failed for https://eu1.locationiq.com/v1/search?q=Private+Birthplace&key=test-provider-secret",
    ));

    const error = await searchPlaces("Private Birthplace").catch((value) => value);
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      name: "GeocoderCapacityError",
      code: "unavailable",
      retryAfterSeconds: 10,
    });
    expect((error as Error).message).not.toMatch(
      /test-provider-secret|locationiq\.com|Private Birthplace/,
    );
  });

  it("keeps deployed normalized rows in bounded process memory, not Turso", async () => {
    configureManagedGeocoder("geoapify");
    vi.mocked(global.fetch).mockResolvedValue(new Response(JSON.stringify({
      results: [{
        place_id: "cached-place",
        lat: "17.385",
        lon: "78.4867",
        formatted: "Hyderabad, Telangana, India",
      }],
    }), { status: 200 }));
    const expected = [{
      id: "geoapify:cached-place",
      label: "Hyderabad, Telangana, India",
      latitude: 17.385,
      longitude: 78.4867,
      timezone: "Asia/Kolkata",
    }];

    await expect(searchPlaces("Private Birthplace")).resolves.toEqual(expected);
    await expect(searchPlaces("  PRIVATE   BIRTHPLACE ")).resolves.toEqual(expected);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(enforceGuestPlaceProviderDailyLimit).toHaveBeenCalledTimes(1);
    expect(enforceGuestPlaceProviderDailyLimit).toHaveBeenCalledWith(
      "203.0.113.10",
      { signal: expect.any(AbortSignal) },
    );
    expect(reserveDistributedProviderRequest).toHaveBeenCalledTimes(1);
    expect(reserveDistributedProviderRequest).toHaveBeenCalledWith(
      "geoapify",
      1_500,
      expect.any(Object),
    );
    expect(JSON.stringify(vi.mocked(reserveDistributedProviderRequest).mock.calls)).not.toMatch(
      /Private Birthplace|Hyderabad|17\.385|78\.4867/,
    );
    expect(geocoderProcessStateForTests()).toMatchObject({
      cacheEntries: 1,
      cacheKeysAreHashed: true,
      cachedRowsContainUnknownFields: false,
    });
  });

  it("fails closed without a guest client identity before managed provider work", async () => {
    configurePublicNominatim();

    await expect(searchPlacesImpl("Private Birthplace")).rejects.toMatchObject({
      name: "GeocoderCapacityError",
      code: "unavailable",
      retryAfterSeconds: 10,
    });
    expect(enforceGuestPlaceProviderDailyLimit).toHaveBeenCalledWith(
      "",
      { signal: expect.any(AbortSignal) },
    );
    expect(reserveDistributedProviderRequest).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("stops a daily-denied guest cache miss before provider admission", async () => {
    configurePublicNominatim();
    vi.mocked(enforceGuestPlaceProviderDailyLimit).mockResolvedValue({
      success: false,
      unavailable: false,
      retryAfterSeconds: 43_200,
      scope: "client",
    });

    await expect(searchPlaces("Private Birthplace")).rejects.toMatchObject({
      name: "GeocoderCapacityError",
      code: "rate-limited",
      retryAfterSeconds: 43_200,
    });
    expect(reserveDistributedProviderRequest).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("fails closed before provider transit when the deployed daily limit is missing", async () => {
    configureManagedGeocoder("geoapify");
    delete process.env.GEOCODER_DAILY_REQUEST_LIMIT;

    await expect(searchPlaces("Private Birthplace")).rejects.toMatchObject({
      name: "GeocoderCapacityError",
      code: "unavailable",
      retryAfterSeconds: 10,
    });
    expect(reserveDistributedProviderRequest).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["unavailable", true],
    ["exhausted", false],
  ] as const)(
    "fails closed before provider transit when the daily budget is %s",
    async (_case, unavailable) => {
      configureManagedGeocoder("geoapify");
      vi.mocked(reserveDistributedProviderRequest).mockResolvedValue({
        success: false,
        remaining: 0,
        unavailable,
        retryAfterSeconds: unavailable ? 10 : 21_600,
        configured: true,
      });

      await expect(searchPlaces("Private Birthplace")).rejects.toMatchObject({
        name: "GeocoderCapacityError",
        code: unavailable ? "unavailable" : "rate-limited",
        retryAfterSeconds: unavailable ? 10 : 21_600,
      });
      expect(reserveDistributedProviderRequest).toHaveBeenCalledTimes(1);
      expect(global.fetch).not.toHaveBeenCalled();
    },
  );

  it("retries one explicit paced denial inside the end-to-end deadline", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T00:00:00.000Z"));
    configureManagedGeocoder("locationiq-eu");
    vi.mocked(reserveDistributedProviderRequest)
      .mockResolvedValueOnce({
        success: false,
        remaining: 1_499,
        unavailable: false,
        retryAfterSeconds: 1,
        configured: true,
        denialReason: "pace",
      })
      .mockResolvedValueOnce({
        success: true,
        remaining: 1_498,
        unavailable: false,
        retryAfterSeconds: 0,
        configured: true,
      });
    vi.mocked(global.fetch).mockResolvedValue(new Response(JSON.stringify([{
      place_id: 1,
      lat: "17.385",
      lon: "78.4867",
      display_name: "Hyderabad, India",
    }]), { status: 200 }));

    const result = searchPlaces("Hyderabad");
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(result).resolves.toEqual([
      expect.objectContaining({ label: "Hyderabad, India" }),
    ]);
    expect(reserveDistributedProviderRequest).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("completes sequential birth and current-place geocoding across one paced retry", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T00:00:00.000Z"));
    configureManagedGeocoder("locationiq-eu");
    vi.mocked(reserveDistributedProviderRequest)
      .mockResolvedValueOnce({
        success: true,
        remaining: 1_499,
        unavailable: false,
        retryAfterSeconds: 0,
        configured: true,
      })
      .mockResolvedValueOnce({
        success: false,
        remaining: 1_499,
        unavailable: false,
        retryAfterSeconds: 1,
        configured: true,
        denialReason: "pace",
      })
      .mockResolvedValueOnce({
        success: true,
        remaining: 1_498,
        unavailable: false,
        retryAfterSeconds: 0,
        configured: true,
      });
    vi.mocked(global.fetch).mockImplementation(async (input) => {
      const query = new URL(String(input)).searchParams.get("q") ?? "Unknown";
      return new Response(JSON.stringify([{
        place_id: query,
        lat: "17.385",
        lon: "78.4867",
        display_name: query,
      }]), { status: 200 });
    });

    await expect(geocodePlace("Birth place", {
      authenticatedUserId: "user-123",
    })).resolves.toMatchObject({ display_name: "Birth place" });
    const current = geocodePlace("Current place", {
      authenticatedUserId: "user-123",
    });
    await vi.advanceTimersByTimeAsync(MANAGED_PROVIDER_MIN_INTERVAL_MS);
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(current).resolves.toMatchObject({ display_name: "Current place" });
    expect(reserveDistributedProviderRequest).toHaveBeenCalledTimes(3);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("keeps a hung shared limiter inside the eight-second request deadline", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T00:00:00.000Z"));
    configureManagedGeocoder("locationiq-eu");
    vi.mocked(reserveDistributedProviderRequest).mockReturnValue(
      new Promise(() => undefined),
    );

    const result = searchPlaces("Hyderabad");
    const rejection = expect(result).rejects.toMatchObject({
      name: "GeocoderCapacityError",
      code: "unavailable",
      retryAfterSeconds: 10,
    });
    await vi.advanceTimersByTimeAsync(7_999);
    expect(global.fetch).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await rejection;
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("classifies an in-flight provider timeout and releases process state", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T00:00:00.000Z"));
    configureManagedGeocoder("locationiq-eu");
    vi.mocked(global.fetch).mockImplementation((_input, init) => (
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("aborted", "AbortError")),
          { once: true },
        );
      })
    ));

    const result = searchPlaces("Hung provider");
    const rejection = expect(result).rejects.toMatchObject({
      name: "GeocoderCapacityError",
      code: "unavailable",
      retryAfterSeconds: 10,
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(reserveDistributedProviderRequest).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(8_000);
    await rejection;
    expect(geocoderProcessStateForTests()).toMatchObject({
      cacheEntries: 0,
      outstandingRequests: 0,
    });
  });

  it("charges one admitted daily slot even when the provider attempt fails", async () => {
    configureManagedGeocoder("locationiq-eu");
    vi.mocked(global.fetch).mockRejectedValue(new Error("Network Error"));

    await expect(searchPlaces("Private Birthplace")).rejects.toMatchObject({
      name: "GeocoderCapacityError",
      code: "unavailable",
      retryAfterSeconds: 10,
    });
    expect(reserveDistributedProviderRequest).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("coalesces duplicate managed misses before charging the daily budget", async () => {
    configureManagedGeocoder("geoapify");
    let resolveProvider: ((response: Response) => void) | undefined;
    vi.mocked(global.fetch).mockReturnValue(new Promise((resolve) => {
      resolveProvider = resolve;
    }));

    const first = searchPlaces("Private Birthplace");
    const duplicate = searchPlaces("  PRIVATE   BIRTHPLACE ");
    await vi.waitFor(() => {
      expect(enforceGuestPlaceProviderDailyLimit).toHaveBeenCalledTimes(1);
      expect(reserveDistributedProviderRequest).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    resolveProvider?.(new Response(JSON.stringify({ results: [{
      place_id: "shared-place",
      lat: 17.385,
      lon: 78.4867,
      formatted: "Hyderabad, Telangana, India",
    }] }), { status: 200 }));

    await expect(Promise.all([first, duplicate])).resolves.toEqual([
      [expect.objectContaining({ id: "geoapify:shared-place" })],
      [expect.objectContaining({ id: "geoapify:shared-place" })],
    ]);
    expect(reserveDistributedProviderRequest).toHaveBeenCalledTimes(1);
    expect(enforceGuestPlaceProviderDailyLimit).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("uses the same central daily budget for guest and managed-auth provider attempts", async () => {
    configureManagedGeocoder("locationiq-eu");
    vi.mocked(global.fetch).mockImplementation(async (input) => {
      const query = new URL(String(input)).searchParams.get("q") ?? "Unknown";
      return new Response(JSON.stringify([{
        place_id: query,
        lat: "17.385",
        lon: "78.4867",
        display_name: query,
      }]), { status: 200 });
    });

    await searchPlaces("Guest place");
    await geocodePlace("Authenticated place", {
      authenticatedUserId: "private-user-id",
    });

    expect(reserveDistributedProviderRequest).toHaveBeenCalledTimes(2);
    for (const call of vi.mocked(reserveDistributedProviderRequest).mock.calls) {
      expect(call.slice(0, 2)).toEqual([
        "locationiq",
        1_500,
      ]);
    }
    expect(enforceAuthenticatedGeocoderRateLimit).toHaveBeenCalledWith(
      "private-user-id",
    );
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["locationiq-eu", "eu1.locationiq.com"],
    ["locationiq-us", "us1.locationiq.com"],
  ] as const)(
    "uses the fixed %s request contract and normalizes its array envelope",
    async (provider, expectedHost) => {
      configureManagedGeocoder(provider);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => [{
          place_id: "loc-123",
          lat: "17.3850",
          lon: "78.4867",
          display_name: "Hyderabad, Telangana, India",
          unexpected_private_field: "discard me",
        }],
      } as Response);

      await expect(searchPlaces("München & Hyderabad")).resolves.toEqual([{
        id: `${provider}:loc-123`,
        label: "Hyderabad, Telangana, India",
        latitude: 17.385,
        longitude: 78.4867,
        timezone: "Asia/Kolkata",
      }]);

      const [input, init] = vi.mocked(global.fetch).mock.calls[0];
      const url = new URL(String(input));
      expect(url.hostname).toBe(expectedHost);
      expect(url.pathname).toBe("/v1/search");
      expect(url.searchParams.get("q")).toBe("München & Hyderabad");
      expect(url.searchParams.get("key")).toBe("test-provider-secret");
      expect(url.searchParams.get("limit")).toBe("5");
      expect(url.searchParams.get("format")).toBe("json");
      expect(url.searchParams.get("source")).toBe("nom");
      expect(init).toMatchObject({ redirect: "error", cache: "no-store" });
      expect(geocoderProcessStateForTests().cachedRowsContainUnknownFields).toBe(false);
    },
  );

  it.each(["locationiq-eu", "locationiq-us"] as const)(
    "treats %s's documented 404 no-results response as an empty result",
    async (provider) => {
      configureManagedGeocoder(provider);
      vi.mocked(global.fetch).mockResolvedValue(new Response(
        JSON.stringify({ error: "Unable to geocode" }),
        { status: 404 },
      ));

      await expect(searchPlaces("No such place")).resolves.toEqual([]);
      await expect(searchPlaces("NO SUCH PLACE")).resolves.toEqual([]);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(reserveDistributedProviderRequest).toHaveBeenCalledTimes(1);
      expect(geocoderProcessStateForTests().cacheEntries).toBe(1);
    },
  );

  it("does not generalize LocationIQ's 404 contract to Geoapify", async () => {
    configureManagedGeocoder("geoapify");
    vi.mocked(global.fetch).mockResolvedValue(new Response("{}", { status: 404 }));

    await expect(searchPlaces("No such place")).rejects.toMatchObject({
      name: "GeocoderCapacityError",
      code: "unavailable",
      retryAfterSeconds: 10,
    });
    expect(geocoderProcessStateForTests().cacheEntries).toBe(0);
  });

  it("preserves a bounded provider Retry-After for HTTP 429", async () => {
    configureManagedGeocoder("locationiq-eu");
    vi.mocked(global.fetch).mockResolvedValue(new Response("", {
      status: 429,
      headers: { "Retry-After": "37" },
    }));

    await expect(searchPlaces("Busy place")).rejects.toMatchObject({
      name: "GeocoderCapacityError",
      code: "rate-limited",
      retryAfterSeconds: 37,
    });
  });

  it.each([
    ["missing", undefined, 60],
    ["HTTP-date", "Fri, 04 Sep 2026 01:00:00 GMT", 60],
    ["zero", "0", 60],
    ["oversized", "999999", 86_400],
  ] as const)(
    "uses bounded default guidance for a %s Retry-After",
    async (_case, retryAfter, expectedSeconds) => {
      configureManagedGeocoder("locationiq-eu");
      vi.mocked(global.fetch).mockResolvedValue(new Response("", {
        status: 429,
        ...(retryAfter === undefined
          ? {}
          : { headers: { "Retry-After": retryAfter } }),
      }));

      await expect(searchPlaces("Busy place")).rejects.toMatchObject({
        name: "GeocoderCapacityError",
        code: "rate-limited",
        retryAfterSeconds: expectedSeconds,
      });
    },
  );

  it("uses safe retry guidance for a provider 5xx response", async () => {
    configureManagedGeocoder("geoapify");
    vi.mocked(global.fetch).mockResolvedValue(new Response("", { status: 503 }));

    await expect(searchPlaces("Unavailable place")).rejects.toMatchObject({
      name: "GeocoderCapacityError",
      code: "unavailable",
      retryAfterSeconds: 10,
    });
  });

  it.each(["429", "5xx", "malformed"] as const)(
    "does not cache a %s failure and charges a fresh retry",
    async (failure) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-08-31T00:00:00.000Z"));
      configureManagedGeocoder("locationiq-eu");
      const failedResponse = failure === "429"
        ? new Response("", { status: 429, headers: { "Retry-After": "3" } })
        : failure === "5xx"
          ? new Response("", { status: 503 })
          : new Response("{", { status: 200 });
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(failedResponse)
        .mockResolvedValueOnce(new Response(JSON.stringify([{
          place_id: "recovered-place",
          lat: "17.385",
          lon: "78.4867",
          display_name: "Recovered place",
        }]), { status: 200 }));

      await expect(searchPlaces("Recoverable place")).rejects.toMatchObject({
        name: "GeocoderCapacityError",
        code: failure === "429" ? "rate-limited" : "unavailable",
      });
      expect(geocoderProcessStateForTests().cacheEntries).toBe(0);
      expect(reserveDistributedProviderRequest).toHaveBeenCalledTimes(1);

      const retry = searchPlaces("Recoverable place");
      await vi.advanceTimersByTimeAsync(MANAGED_PROVIDER_MIN_INTERVAL_MS);
      await expect(retry).resolves.toEqual([
        expect.objectContaining({ label: "Recovered place" }),
      ]);
      expect(reserveDistributedProviderRequest).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(geocoderProcessStateForTests().cacheEntries).toBe(1);
    },
  );

  it("uses Geoapify's fixed text/API-key contract and normalizes its results envelope", async () => {
    configureManagedGeocoder("geoapify", "test/key?with&reserved=chars");
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{
          place_id: "geo/place:123",
          lat: 51.5072,
          lon: -0.1276,
          formatted: "London, United Kingdom",
        }],
      }),
    } as Response);

    await expect(searchPlaces("London / UK")).resolves.toEqual([{
      id: "geoapify:geo%2Fplace%3A123",
      label: "London, United Kingdom",
      latitude: 51.5072,
      longitude: -0.1276,
      timezone: "Europe/London",
    }]);

    const [input] = vi.mocked(global.fetch).mock.calls[0];
    const url = new URL(String(input));
    expect(`${url.origin}${url.pathname}`).toBe(
      "https://api.geoapify.com/v1/geocode/search",
    );
    expect(url.searchParams.get("text")).toBe("London / UK");
    expect(url.searchParams.get("apiKey")).toBe("test/key?with&reserved=chars");
    expect(url.searchParams.get("format")).toBe("json");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.has("q")).toBe(false);
    expect(url.searchParams.has("key")).toBe(false);
  });

  it.each([
    ["expanded", "&".repeat(80)],
    ["malformed Unicode", "\ud800"],
  ])("bounds a provider result ID with %s input", async (_case, placeId) => {
    configureManagedGeocoder("geoapify");
    vi.mocked(global.fetch).mockResolvedValue(new Response(JSON.stringify({
      results: [{
        place_id: placeId,
        lat: 51.5072,
        lon: -0.1276,
        formatted: "London, United Kingdom",
      }],
    }), { status: 200 }));

    const results = await searchPlaces("London");
    expect(results[0].id).toMatch(/^geoapify:sha256-[a-f0-9]{32}$/);
    expect(results[0].id.length).toBeLessThanOrEqual(160);
  });

  it("keeps distinct malformed provider IDs distinct in the bounded fallback", async () => {
    configureManagedGeocoder("geoapify");
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({
        results: [{
          place_id: "\ud800",
          lat: 51.5072,
          lon: -0.1276,
          formatted: "London, United Kingdom",
        }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        results: [{
          place_id: "\ud801",
          lat: 48.8566,
          lon: 2.3522,
          formatted: "Paris, France",
        }],
      }), { status: 200 }));

    const [london] = await searchPlaces("London");
    const [paris] = await searchPlaces("Paris");
    expect(london.id).not.toBe(paris.id);
    expect(london.id).toMatch(/^geoapify:sha256-[a-f0-9]{32}$/);
    expect(paris.id).toMatch(/^geoapify:sha256-[a-f0-9]{32}$/);
  });

  it.each([
    ["locationiq-eu", { results: [] }],
    ["geoapify", []],
    ["geoapify", { results: "not-an-array" }],
  ] as const)("rejects a malformed %s response envelope", async (provider, payload) => {
    configureManagedGeocoder(provider);
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => payload,
    } as Response);

    await expect(searchPlaces("Malformed envelope")).rejects.toMatchObject({
      name: "GeocoderCapacityError",
      code: "unavailable",
      retryAfterSeconds: 10,
    });
    expect(geocoderProcessStateForTests().cacheEntries).toBe(0);
  });

  it.each([
    [
      "declared length",
      new Response("[]", {
        status: 200,
        headers: { "Content-Length": String(64 * 1_024 + 1) },
      }),
    ],
    [
      "streamed length without a declaration",
      new Response(JSON.stringify([{
        lat: "17",
        lon: "78",
        display_name: "x".repeat(64 * 1_024),
      }]), { status: 200 }),
    ],
  ])("rejects an oversized provider response by %s", async (_case, response) => {
    vi.mocked(global.fetch).mockResolvedValue(response);

    await expect(searchPlaces("Oversized response")).rejects.toMatchObject({
      name: "GeocoderCapacityError",
      code: "unavailable",
      retryAfterSeconds: 10,
    });
    expect(geocoderProcessStateForTests().cacheEntries).toBe(0);
  });

  it("returns at most five valid results", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => Array.from({ length: 7 }, (_, index) => ({
        place_id: index,
        lat: String(10 + index),
        lon: String(70 + index),
        display_name: `Place ${index}`,
      })),
    } as Response);

    const results = await searchPlaces("Places");
    expect(results).toHaveLength(5);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("drops malformed upstream rows", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => [
        { place_id: 1, lat: "not-a-number", lon: "78", display_name: "Bad" },
        { place_id: 2, lat: "17", lon: "78", display_name: "  " },
      ],
    } as Response);

    await expect(searchPlaces("Bad rows")).resolves.toEqual([]);
  });

  it("does not cascade into relaxed queries after an upstream failure", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("Network Error"));
    await expect(searchPlaces("Hyderabad, Telangana")).rejects.toMatchObject({
      name: "GeocoderCapacityError",
      code: "unavailable",
      retryAfterSeconds: 10,
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("fails closed in a deployed environment without a managed guest provider", async () => {
    process.env.VERCEL_ENV = "production";

    await expect(searchPlaces("Hyderabad")).rejects.toMatchObject({
      name: "GeocoderCapacityError",
      code: "unavailable",
      retryAfterSeconds: 10,
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("coalesces duplicate work, caches success, and starts distinct requests at most once per second", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T00:00:00.000Z"));
    const startedAt: number[] = [];

    vi.mocked(global.fetch).mockImplementation(async (input) => {
      startedAt.push(Date.now());
      const query = new URL(String(input)).searchParams.get("q") ?? "Unknown";
      return {
        ok: true,
        json: async () => [{
          place_id: query === "Beta" ? 2 : 1,
          lat: query === "Beta" ? "18" : "17",
          lon: "78",
          display_name: query,
        }],
      } as Response;
    });

    const alpha = searchPlaces("Alpha");
    const duplicateAlpha = searchPlaces("  ALPHA  ");
    const beta = searchPlaces("Beta");

    await vi.advanceTimersByTimeAsync(0);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(MANAGED_PROVIDER_MIN_INTERVAL_MS - 1);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await Promise.all([alpha, duplicateAlpha, beta]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(startedAt[1] - startedAt[0]).toBe(
      MANAGED_PROVIDER_MIN_INTERVAL_MS,
    );

    await expect(searchPlaces("alpha")).resolves.toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("caps outstanding distinct provider work while still coalescing duplicates", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T00:00:00.000Z"));
    const fetches = vi.mocked(global.fetch);
    fetches.mockImplementation((_input, init) => new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (signal?.aborted) {
        reject(new DOMException("aborted", "AbortError"));
        return;
      }
      signal?.addEventListener(
        "abort",
        () => reject(new DOMException("aborted", "AbortError")),
        { once: true },
      );
    }));

    const admitted = Array.from(
      { length: 6 },
      (_, index) => searchPlaces(`Distinct ${index}`),
    );
    const duplicate = searchPlaces("  DISTINCT 0  ");
    const outcomesPromise = Promise.allSettled([...admitted, duplicate]);
    await expect(searchPlaces("Seventh distinct")).rejects.toMatchObject({
      name: "GeocoderCapacityError",
      code: "rate-limited",
      retryAfterSeconds: 1,
    });

    await vi.advanceTimersByTimeAsync(8_000);
    const outcomes = await outcomesPromise;
    expect(outcomes).toHaveLength(7);
    expect(outcomes.every(({ status }) => status === "rejected")).toBe(true);
    expect(fetches).toHaveBeenCalledTimes(6);
    expect(geocoderProcessStateForTests().outstandingRequests).toBe(0);
  });

  it("reserves provider capacity for authenticated profile geocoding", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T00:00:00.000Z"));
    vi.mocked(global.fetch).mockImplementation((input, init) => {
      const query = new URL(String(input)).searchParams.get("q") ?? "Unknown";
      if (query === "Authenticated place") {
        return Promise.resolve({
          ok: true,
          json: async () => [{
            place_id: 99,
            lat: "17",
            lon: "78",
            display_name: query,
          }],
        } as Response);
      }
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (signal?.aborted) {
          reject(new DOMException("aborted", "AbortError"));
          return;
        }
        signal?.addEventListener(
          "abort",
          () => reject(new DOMException("aborted", "AbortError")),
          { once: true },
        );
      });
    });

    const guests = Array.from(
      { length: 6 },
      (_, index) => searchPlaces(`Guest ${index}`),
    );
    const authenticated = geocodePlace("Authenticated place");
    const outcomesPromise = Promise.allSettled([...guests, authenticated]);
    expect(geocoderProcessStateForTests()).toMatchObject({
      outstandingRequests: 7,
      guestOutstandingRequests: 6,
      authenticatedOutstandingRequests: 1,
    });

    await vi.advanceTimersByTimeAsync(8_000);
    const outcomes = await outcomesPromise;
    expect(outcomes.slice(0, 6).every(({ status }) => status === "rejected"))
      .toBe(true);
    expect(outcomes[6]).toEqual(expect.objectContaining({ status: "fulfilled" }));
    expect(geocoderProcessStateForTests().outstandingRequests).toBe(0);
  });

  it("expires a queued ticket at the end-to-end deadline without a later fetch", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T00:00:00.000Z"));
    const fetches = vi.mocked(global.fetch);
    const fetchedQueries: string[] = [];
    fetches.mockImplementation(async (input) => {
      const query = new URL(String(input)).searchParams.get("q") ?? "Unknown";
      fetchedQueries.push(query);
      return {
        ok: true,
        json: async () => [{
          place_id: query,
          lat: "17",
          lon: "78",
          display_name: query,
        }],
      } as Response;
    });

    await searchPlaces("Seed");
    const queued = Array.from(
      { length: 6 },
      (_, index) => searchPlaces(`Queued ${index}`),
    );
    const authenticated = geocodePlace("Authenticated queued");
    const expiring = geocodePlace(",");
    const outcomesPromise = Promise.allSettled([
      ...queued,
      authenticated,
      expiring,
    ]);
    await vi.advanceTimersByTimeAsync(8_000);
    const outcomes = await outcomesPromise;

    expect(outcomes.filter(({ status }) => status === "rejected")).toHaveLength(1);
    expect(outcomes[7]).toEqual(expect.objectContaining({ status: "rejected" }));
    expect(fetchedQueries).not.toContain(",");
    expect(fetches).toHaveBeenCalledTimes(8);

    const retry = geocodePlace(",");
    await vi.advanceTimersByTimeAsync(MANAGED_PROVIDER_MIN_INTERVAL_MS);
    expect(fetchedQueries).toContain(",");
    await retry;
    expect(fetches).toHaveBeenCalledTimes(9);

    await vi.advanceTimersByTimeAsync(5_000);
    expect(fetches).toHaveBeenCalledTimes(9);
    expect(geocoderProcessStateForTests().outstandingRequests).toBe(0);
  });

  it("cancels queued work when its only caller disconnects", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T00:00:00.000Z"));
    const fetchedQueries: string[] = [];
    vi.mocked(global.fetch).mockImplementation(async (input) => {
      const query = new URL(String(input)).searchParams.get("q") ?? "Unknown";
      fetchedQueries.push(query);
      return {
        ok: true,
        json: async () => [{
          place_id: query,
          lat: "17",
          lon: "78",
          display_name: query,
        }],
      } as Response;
    });

    await searchPlaces("Seed");
    const controller = new AbortController();
    const cancelled = searchPlaces("Cancelled", controller.signal);
    await vi.advanceTimersByTimeAsync(0);
    controller.abort(new Error("private caller reason"));

    await expect(cancelled).rejects.toThrow("Geocoder request cancelled");
    await vi.advanceTimersByTimeAsync(2_000);
    expect(fetchedQueries).toEqual(["Seed"]);
    expect(geocoderProcessStateForTests().outstandingRequests).toBe(0);
  });

  it("cancels in-flight provider work when its only caller disconnects", async () => {
    configureManagedGeocoder("locationiq-eu");
    vi.mocked(global.fetch).mockImplementation((_input, init) => (
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("aborted", "AbortError")),
          { once: true },
        );
      })
    ));
    const controller = new AbortController();
    const cancelled = searchPlaces("In-flight cancellation", controller.signal);
    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    controller.abort(new Error("private caller reason"));
    await expect(cancelled).rejects.toThrow("Geocoder request cancelled");
    await vi.waitFor(() => {
      expect(geocoderProcessStateForTests().outstandingRequests).toBe(0);
    });
    expect(reserveDistributedProviderRequest).toHaveBeenCalledTimes(1);
    expect(geocoderProcessStateForTests().cacheEntries).toBe(0);
  });

  it("does not fetch when the last caller cancels during a pending provider-budget reservation", async () => {
    configureManagedGeocoder("locationiq-eu");
    let settleReservation: (() => void) | undefined;
    vi.mocked(reserveDistributedProviderRequest).mockImplementation(() => (
      new Promise((resolve) => {
        settleReservation = () => resolve({
          success: true,
          remaining: 1_499,
          unavailable: false,
          retryAfterSeconds: 0,
          configured: true,
        });
      })
    ));

    const controller = new AbortController();
    const cancelled = searchPlaces("Pending budget cancellation", controller.signal);
    await vi.waitFor(() => {
      expect(reserveDistributedProviderRequest).toHaveBeenCalledTimes(1);
    });
    const reservationSignal = vi.mocked(reserveDistributedProviderRequest)
      .mock.calls[0][2]?.signal;
    expect(reservationSignal).toBeInstanceOf(AbortSignal);
    expect(reservationSignal?.aborted).toBe(false);

    controller.abort(new Error("private caller reason"));
    await expect(cancelled).rejects.toThrow("Geocoder request cancelled");
    expect(reservationSignal?.aborted).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();

    // Turso HTTP writes cannot be cancelled after dispatch. Let the underlying
    // reservation settle and prove it cannot revive the abandoned request.
    settleReservation?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(geocoderProcessStateForTests().outstandingRequests).toBe(0);
  });

  it("handles a late provider-budget rejection after the last caller cancels", async () => {
    configureManagedGeocoder("locationiq-eu");
    let rejectReservation: ((reason: Error) => void) | undefined;
    vi.mocked(reserveDistributedProviderRequest).mockImplementation(() => (
      new Promise((_resolve, reject) => {
        rejectReservation = reject;
      })
    ));

    const controller = new AbortController();
    const cancelled = searchPlaces("Late budget rejection", controller.signal);
    await vi.waitFor(() => {
      expect(reserveDistributedProviderRequest).toHaveBeenCalledTimes(1);
    });

    controller.abort();
    await expect(cancelled).rejects.toThrow("Geocoder request cancelled");
    rejectReservation?.(new Error("late private Turso failure"));
    await Promise.resolve();
    await Promise.resolve();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(geocoderProcessStateForTests().outstandingRequests).toBe(0);
  });

  it("lets an immediate same-query retry replace cancelled shared work", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T00:00:00.000Z"));
    vi.mocked(global.fetch).mockImplementation(async (input) => {
      const query = new URL(String(input)).searchParams.get("q") ?? "Unknown";
      return {
        ok: true,
        json: async () => [{
          place_id: query,
          lat: "17",
          lon: "78",
          display_name: query,
        }],
      } as Response;
    });

    await searchPlaces("Seed");
    const controller = new AbortController();
    const cancelled = searchPlaces("Immediate retry", controller.signal);
    controller.abort();
    const retry = searchPlaces("Immediate retry");

    await expect(cancelled).rejects.toThrow("Geocoder request cancelled");
    await vi.advanceTimersByTimeAsync(MANAGED_PROVIDER_MIN_INTERVAL_MS);
    await expect(retry).resolves.toEqual([
      expect.objectContaining({ label: "Immediate retry" }),
    ]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(geocoderProcessStateForTests().outstandingRequests).toBe(0);
  });

  it("keeps shared work alive when only one duplicate caller disconnects", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T00:00:00.000Z"));
    vi.mocked(global.fetch).mockImplementation(async (input) => {
      const query = new URL(String(input)).searchParams.get("q") ?? "Unknown";
      return {
        ok: true,
        json: async () => [{
          place_id: query,
          lat: "17",
          lon: "78",
          display_name: query,
        }],
      } as Response;
    });

    await searchPlaces("Seed");
    const cancelledController = new AbortController();
    const cancelled = searchPlaces("Shared", cancelledController.signal);
    const retained = searchPlaces("  SHARED  ");
    cancelledController.abort();

    await expect(cancelled).rejects.toThrow("Geocoder request cancelled");
    await vi.advanceTimersByTimeAsync(MANAGED_PROVIDER_MIN_INTERVAL_MS);
    await expect(retained).resolves.toEqual([
      expect.objectContaining({ label: "Shared" }),
    ]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(geocoderProcessStateForTests().outstandingRequests).toBe(0);
  });

  it("cleans up failed work so the same normalized query can be retried", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T00:00:00.000Z"));
    vi.mocked(global.fetch)
      .mockRejectedValueOnce(new Error(
        "https://managed.example/search?q=Sensitive&key=secret-key",
      ))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          place_id: 1,
          lat: "17",
          lon: "78",
          display_name: "Recovered",
        }],
      } as Response);

    const first = searchPlaces("Sensitive").catch((error) => error);
    await vi.advanceTimersByTimeAsync(0);
    await expect(first).resolves.toEqual(expect.objectContaining({
      name: "GeocoderCapacityError",
      code: "unavailable",
      retryAfterSeconds: 10,
    }));
    expect(geocoderProcessStateForTests().outstandingRequests).toBe(0);

    const retry = searchPlaces("  SENSITIVE  ");
    await vi.advanceTimersByTimeAsync(MANAGED_PROVIDER_MIN_INTERVAL_MS);
    await expect(retry).resolves.toEqual([
      expect.objectContaining({ label: "Recovered" }),
    ]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(geocoderProcessStateForTests().outstandingRequests).toBe(0);
  });

  it("purges expired process-cache rows instead of retaining them indefinitely", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T00:00:00.000Z"));
    vi.mocked(global.fetch).mockImplementation(async (input) => {
      const query = new URL(String(input)).searchParams.get("q") ?? "Unknown";
      return {
        ok: true,
        json: async () => [{
          place_id: query,
          lat: "17",
          lon: "78",
          display_name: query,
          provider_private_field: "must not be cached",
        }],
      } as Response;
    });

    await searchPlaces("Old one");
    await vi.advanceTimersByTimeAsync(MANAGED_PROVIDER_MIN_INTERVAL_MS);
    await searchPlaces("Old two");
    expect(geocoderProcessStateForTests().cacheEntries).toBe(2);

    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1_000 - 500);
    await searchPlaces("Fresh");
    expect(geocoderProcessStateForTests()).toMatchObject({
      cacheEntries: 2,
      cacheKeysAreHashed: true,
      cachedRowsContainUnknownFields: false,
    });
    const callsBeforeRetainedLookup = vi.mocked(global.fetch).mock.calls.length;
    await searchPlaces("Old two");
    expect(global.fetch).toHaveBeenCalledTimes(callsBeforeRetainedLookup);
  });

  it("expires cached rows on schedule even when no later lookup occurs", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T00:00:00.000Z"));
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => [{
        place_id: 1,
        lat: "17",
        lon: "78",
        display_name: "Idle cache entry",
      }],
    } as Response);

    await searchPlaces("Idle cache entry");
    expect(geocoderProcessStateForTests().cacheEntries).toBe(1);
    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1_000 + 1);
    expect(geocoderProcessStateForTests().cacheEntries).toBe(0);
  });

  it("does not cache a nonempty provider response with invalid coordinates", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T00:00:00.000Z"));
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          place_id: 1,
          lat: "17junk",
          lon: "78",
          display_name: "Invalid coordinates",
        }],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          place_id: 1,
          lat: "17",
          lon: "78",
          display_name: "Recovered coordinates",
        }],
      } as Response);

    await expect(searchPlaces("Coordinate retry")).resolves.toEqual([]);
    expect(geocoderProcessStateForTests().cacheEntries).toBe(0);

    const retry = searchPlaces("Coordinate retry");
    await vi.advanceTimersByTimeAsync(MANAGED_PROVIDER_MIN_INTERVAL_MS);
    await expect(retry).resolves.toEqual([
      expect.objectContaining({ label: "Recovered coordinates" }),
    ]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(geocoderProcessStateForTests().cacheEntries).toBe(1);
  });
});
