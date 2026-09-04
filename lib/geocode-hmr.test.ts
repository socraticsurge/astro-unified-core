import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type GeocoderGlobal = typeof globalThis & {
  __astroChagantiGeocoderState?: unknown;
};

afterEach(() => {
  delete (globalThis as GeocoderGlobal).__astroChagantiGeocoderState;
  vi.resetModules();
});

describe("geocoder process state upgrades", () => {
  it("discards legacy raw cache keys and request shapes during hot reload", async () => {
    (globalThis as GeocoderGlobal).__astroChagantiGeocoderState = {
      cache: new Map([[
        "https://provider.example/search\u0000private birthplace",
        { expiresAt: Date.now() + 60_000, rows: [] },
      ]]),
      requests: new Map([["legacy", Promise.resolve([])]]),
      queue: Promise.resolve(),
      lastRequestStartedAt: Date.now(),
    };

    vi.resetModules();
    const geocode = await import("./geocode");

    expect(geocode.geocoderProcessStateForTests()).toMatchObject({
      cacheEntries: 0,
      outstandingRequests: 0,
      cacheKeysAreHashed: true,
    });
    expect(() => geocode.resetGeocoderProcessStateForTests()).not.toThrow();
  });
});
