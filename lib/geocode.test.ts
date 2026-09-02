import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./shared-geocode-cache", () => ({
  readSharedGeocodeCache: vi.fn(),
  writeSharedGeocodeCache: vi.fn(),
}));
vi.mock("./authenticated-geocoder-rate-limit", () => ({
  enforceAuthenticatedGeocoderRateLimit: vi.fn(),
}));

import {
  geocoderProcessStateForTests,
  queryVariants,
  geocodePlace,
  resetGeocoderProcessStateForTests,
  searchPlaces,
} from "./geocode";
import {
  readSharedGeocodeCache,
  writeSharedGeocodeCache,
} from "./shared-geocode-cache";
import { enforceAuthenticatedGeocoderRateLimit } from "./authenticated-geocoder-rate-limit";

global.fetch = vi.fn();

function resetLocalGeocoder(): void {
  vi.resetAllMocks();
  vi.mocked(readSharedGeocodeCache).mockResolvedValue({ status: "miss" });
  vi.mocked(writeSharedGeocodeCache).mockResolvedValue({
    ok: true,
    configured: true,
  });
  vi.mocked(enforceAuthenticatedGeocoderRateLimit).mockResolvedValue({
    success: true,
    unavailable: false,
    retryAfterSeconds: 0,
    scope: null,
  });
  delete process.env.VERCEL_ENV;
  delete process.env.GEOCODER_PROVIDER;
  delete process.env.GEOCODER_API_KEY;
  delete process.env.GEOCODER_BASE_URL;
  delete process.env.GEOCODER_USER_AGENT;
  delete process.env.AUTH_PROFILE_MANAGED_GEOCODER_ENABLED;
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

  it("throws the last error if all fetch attempts fail", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("Network Error"));

    await expect(geocodePlace("Unknown Place")).rejects.toThrow(
      "Geocoder request failed",
    );

    // "Unknown Place" yields 2 variants: ["Unknown Place", "Unknown Place, India"]
    expect(global.fetch).toHaveBeenCalledTimes(2);
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

  it("succeeds if an early variant fails but a later one succeeds", async () => {
    vi.mocked(global.fetch)
      .mockRejectedValueOnce(new Error("Network Error 1"))
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
    expect(readSharedGeocodeCache).not.toHaveBeenCalled();
  });

  it("fails closed after activation without a managed provider", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("AUTH_PROFILE_MANAGED_GEOCODER_ENABLED", "true");

    await expect(geocodePlace("Authenticated Hyderabad", {
      authenticatedUserId: "user-123",
    })).rejects.toThrow(
      "Geocoder configuration unavailable",
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("searchPlaces", () => {
  beforeEach(() => {
    resetLocalGeocoder();
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
  });

  it("redacts provider URLs, queries, and credentials from failures", async () => {
    configureManagedGeocoder("locationiq-eu");
    vi.mocked(global.fetch).mockRejectedValue(new Error(
      "request failed for https://eu1.locationiq.com/v1/search?q=Private+Birthplace&key=test-provider-secret",
    ));

    const error = await searchPlaces("Private Birthplace").catch((value) => value);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Geocoder request failed");
    expect((error as Error).message).not.toMatch(
      /test-provider-secret|locationiq\.com|Private Birthplace/,
    );
  });

  it("uses a deployed shared-cache hit without contacting the provider", async () => {
    configureManagedGeocoder("geoapify");
    vi.mocked(readSharedGeocodeCache).mockResolvedValue({
      status: "hit",
      rows: [{
        provider_id: "cached-place",
        lat: "17.385",
        lon: "78.4867",
        display_name: "Hyderabad, Telangana, India",
      }],
    });

    await expect(searchPlaces("Private Birthplace")).resolves.toEqual([{
      id: "geoapify:cached-place",
      label: "Hyderabad, Telangana, India",
      latitude: 17.385,
      longitude: 78.4867,
      timezone: "Asia/Kolkata",
    }]);
    expect(readSharedGeocodeCache).toHaveBeenCalledWith(
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
    expect(global.fetch).not.toHaveBeenCalled();
    expect(writeSharedGeocodeCache).not.toHaveBeenCalled();
  });

  it("fails closed before provider transit when the deployed cache is unavailable", async () => {
    configureManagedGeocoder("locationiq-eu");
    vi.mocked(readSharedGeocodeCache).mockResolvedValue({
      status: "unavailable",
      configured: true,
    });

    await expect(searchPlaces("Private Birthplace")).rejects.toThrow(
      "Geocoder cache unavailable",
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("does not start provider work after cancellation during a shared-cache read", async () => {
    configureManagedGeocoder("geoapify");
    let resolveCache: ((value: { status: "miss" }) => void) | undefined;
    vi.mocked(readSharedGeocodeCache).mockReturnValue(new Promise((resolve) => {
      resolveCache = resolve;
    }));
    const controller = new AbortController();
    const request = searchPlaces("Private Birthplace", controller.signal);

    controller.abort(new Error("private caller reason"));
    resolveCache?.({ status: "miss" });

    await expect(request).rejects.toThrow("Geocoder request cancelled");
    expect(global.fetch).not.toHaveBeenCalled();
    expect(writeSharedGeocodeCache).not.toHaveBeenCalled();
    expect(geocoderProcessStateForTests().outstandingRequests).toBe(0);
  });

  it("does not return or process-cache a provider result when shared persistence fails", async () => {
    configureManagedGeocoder("locationiq-us");
    vi.mocked(writeSharedGeocodeCache).mockResolvedValue({
      ok: false,
      configured: true,
    });
    vi.mocked(global.fetch).mockResolvedValue(new Response(JSON.stringify([{
      place_id: "uncached-place",
      lat: "17.385",
      lon: "78.4867",
      display_name: "Hyderabad, Telangana, India",
    }]), { status: 200 }));

    await expect(searchPlaces("Private Birthplace")).rejects.toThrow(
      "Geocoder cache unavailable",
    );
    expect(geocoderProcessStateForTests().cacheEntries).toBe(0);
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
      expect(writeSharedGeocodeCache).toHaveBeenCalledWith(
        expect.stringMatching(/^[a-f0-9]{64}$/),
        [],
      );
    },
  );

  it("does not generalize LocationIQ's 404 contract to Geoapify", async () => {
    configureManagedGeocoder("geoapify");
    vi.mocked(global.fetch).mockResolvedValue(new Response("{}", { status: 404 }));

    await expect(searchPlaces("No such place")).rejects.toThrow(
      "Geocoder HTTP 404",
    );
    expect(writeSharedGeocodeCache).not.toHaveBeenCalled();
  });

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

    await expect(searchPlaces("Malformed envelope")).rejects.toThrow(
      "Geocoder response was invalid",
    );
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

    await expect(searchPlaces("Oversized response")).rejects.toThrow(
      "Geocoder response was invalid",
    );
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
    await expect(searchPlaces("Hyderabad, Telangana")).rejects.toThrow(
      "Geocoder request failed",
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("fails closed in a deployed environment without a managed guest provider", async () => {
    process.env.VERCEL_ENV = "production";

    await expect(searchPlaces("Hyderabad")).rejects.toThrow(
      "Geocoder configuration unavailable",
    );
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

    await vi.advanceTimersByTimeAsync(999);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await Promise.all([alpha, duplicateAlpha, beta]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(startedAt[1] - startedAt[0]).toBe(1_000);

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
    await expect(searchPlaces("Seventh distinct")).rejects.toThrow(
      "Geocoder is busy",
    );

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
    await vi.advanceTimersByTimeAsync(0);
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
    await vi.advanceTimersByTimeAsync(1_000);
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
    await vi.advanceTimersByTimeAsync(1_000);
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
      message: "Geocoder request failed",
    }));
    expect(geocoderProcessStateForTests().outstandingRequests).toBe(0);

    const retry = searchPlaces("  SENSITIVE  ");
    await vi.advanceTimersByTimeAsync(1_000);
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
    await vi.advanceTimersByTimeAsync(1_000);
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
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(retry).resolves.toEqual([
      expect.objectContaining({ label: "Recovered coordinates" }),
    ]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(geocoderProcessStateForTests().cacheEntries).toBe(1);
  });
});
