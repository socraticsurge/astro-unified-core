import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  authenticatedProfileManagedGeocoderEnabled,
  PUBLIC_NOMINATIM_BASE_URL,
  authenticatedProfileGeocoderConfig,
  guestGeocoderConfig,
  guestGeocoderPublicMetadata,
} from "./geocoder-config";

const API_KEY = "test-provider-key";

describe("geocoder configuration", () => {
  it("uses the fixed public Nominatim default only in an explicit local runtime", () => {
    expect(guestGeocoderConfig({ NODE_ENV: "development" })).toMatchObject({
      provider: "nominatim-local",
      searchUrl: `${PUBLIC_NOMINATIM_BASE_URL}/search`,
      identity: "AstroChaganti/1.0 (https://astrochaganti.com)",
      queryParameter: "q",
      responseEnvelope: "array",
      attribution: "© OpenStreetMap contributors",
    });
    expect(guestGeocoderConfig({
      NODE_ENV: "development",
      VERCEL_ENV: "development",
    })).not.toBeNull();
  });

  it.each([
    ["locationiq-eu", "https://eu1.locationiq.com/v1/search", "q", "key", "array", "Search by LocationIQ.com; data © OpenStreetMap contributors"],
    ["locationiq-us", "https://us1.locationiq.com/v1/search", "q", "key", "array", "Search by LocationIQ.com; data © OpenStreetMap contributors"],
    ["geoapify", "https://api.geoapify.com/v1/geocode/search", "text", "apiKey", "results", "Powered by Geoapify; data © OpenStreetMap contributors"],
  ] as const)(
    "maps %s to its immutable endpoint and response contract",
    (
      provider,
      searchUrl,
      queryParameter,
      apiKeyParameter,
      responseEnvelope,
      attribution,
    ) => {
      expect(guestGeocoderConfig({
        VERCEL_ENV: "production",
        GEOCODER_PROVIDER: provider,
        GEOCODER_API_KEY: API_KEY,
        GEOCODER_BASE_URL: "https://attacker.invalid/collect",
      })).toMatchObject({
        provider,
        searchUrl,
        queryParameter,
        apiKeyParameter,
        apiKey: API_KEY,
        responseEnvelope,
        attribution,
      });
    },
  );

  it.each(["preview", "production"])(
    "fails closed without a complete named provider configuration in %s",
    (vercelEnv) => {
      expect(guestGeocoderConfig({ VERCEL_ENV: vercelEnv })).toBeNull();
      expect(guestGeocoderConfig({
        VERCEL_ENV: vercelEnv,
        GEOCODER_PROVIDER: "locationiq-eu",
      })).toBeNull();
      expect(guestGeocoderConfig({
        VERCEL_ENV: vercelEnv,
        GEOCODER_API_KEY: API_KEY,
      })).toBeNull();
      expect(guestGeocoderConfig({
        VERCEL_ENV: vercelEnv,
        GEOCODER_PROVIDER: "unknown-provider",
        GEOCODER_API_KEY: API_KEY,
      })).toBeNull();
    },
  );

  it("allows a named managed provider locally but never an arbitrary endpoint", () => {
    expect(guestGeocoderConfig({
      NODE_ENV: "test",
      GEOCODER_PROVIDER: "geoapify",
      GEOCODER_API_KEY: API_KEY,
      GEOCODER_BASE_URL: "http://127.0.0.1:8080/secret-proxy",
    })?.searchUrl).toBe("https://api.geoapify.com/v1/geocode/search");
    expect(guestGeocoderConfig({
      NODE_ENV: "test",
      GEOCODER_BASE_URL: "http://127.0.0.1:8080/secret-proxy",
    })?.searchUrl).toBe(`${PUBLIC_NOMINATIM_BASE_URL}/search`);
  });

  it("fails closed for an unknown Vercel environment", () => {
    expect(guestGeocoderConfig({
      VERCEL_ENV: "staging",
      GEOCODER_PROVIDER: "locationiq-eu",
      GEOCODER_API_KEY: API_KEY,
    })).toBeNull();
  });

  it("keeps ambiguous self-hosted production closed", () => {
    expect(guestGeocoderConfig({
      NODE_ENV: "production",
      GEOCODER_PROVIDER: "locationiq-eu",
      GEOCODER_API_KEY: API_KEY,
    })).toBeNull();
  });

  it.each([
    "short",
    " key-with-leading-space",
    "key-with-trailing-space ",
    "key with spaces",
    "x".repeat(513),
  ])("rejects malformed server-only API keys", (apiKey) => {
    expect(guestGeocoderConfig({
      NODE_ENV: "development",
      GEOCODER_PROVIDER: "locationiq-us",
      GEOCODER_API_KEY: apiKey,
    })).toBeNull();
  });

  it("projects attribution metadata without returning the provider secret", () => {
    const metadata = guestGeocoderPublicMetadata({
      VERCEL_ENV: "preview",
      GEOCODER_PROVIDER: "geoapify",
      GEOCODER_API_KEY: API_KEY,
    });
    expect(metadata).toEqual({
      attribution: "Powered by Geoapify; data © OpenStreetMap contributors",
      attributions: [
        { label: "Powered by Geoapify", url: "https://www.geoapify.com/" },
        {
          label: "© OpenStreetMap contributors",
          url: "https://www.openstreetmap.org/copyright",
        },
      ],
    });
    expect(JSON.stringify(metadata)).not.toContain(API_KEY);
  });

  it("keeps local authenticated profile geocoding independent of guest activation", () => {
    expect(authenticatedProfileGeocoderConfig({ NODE_ENV: "test" })).toMatchObject({
      provider: "nominatim-local",
      searchUrl: `${PUBLIC_NOMINATIM_BASE_URL}/search`,
      identity: "AstroChaganti/1.0 (https://astrochaganti.com)",
    });
  });

  it("preserves the deployed authenticated legacy path until exact activation", () => {
    for (const flag of [undefined, "false", "TRUE", " true", "true "]) {
      expect(authenticatedProfileManagedGeocoderEnabled({
        VERCEL_ENV: "production",
        AUTH_PROFILE_MANAGED_GEOCODER_ENABLED: flag,
        GEOCODER_PROVIDER: "geoapify",
        GEOCODER_API_KEY: API_KEY,
      })).toBe(false);
      expect(authenticatedProfileGeocoderConfig({
        VERCEL_ENV: "production",
        AUTH_PROFILE_MANAGED_GEOCODER_ENABLED: flag,
        GEOCODER_PROVIDER: "geoapify",
        GEOCODER_API_KEY: API_KEY,
      })).toMatchObject({
        provider: "nominatim-local",
        searchUrl: `${PUBLIC_NOMINATIM_BASE_URL}/search`,
      });
    }
  });

  it("requires the same named managed provider after authenticated activation", () => {
    expect(authenticatedProfileGeocoderConfig({
      VERCEL_ENV: "production",
      AUTH_PROFILE_MANAGED_GEOCODER_ENABLED: "true",
    })).toBeNull();
    expect(authenticatedProfileGeocoderConfig({
      VERCEL_ENV: "production",
      GUEST_BIRTH_PROFILE_ENABLED: "false",
      AUTH_PROFILE_MANAGED_GEOCODER_ENABLED: "true",
      GEOCODER_PROVIDER: "geoapify",
      GEOCODER_API_KEY: API_KEY,
    })).toMatchObject({
      provider: "geoapify",
      searchUrl: "https://api.geoapify.com/v1/geocode/search",
    });
    expect(authenticatedProfileManagedGeocoderEnabled({
      VERCEL_ENV: "production",
      AUTH_PROFILE_MANAGED_GEOCODER_ENABLED: "true",
    })).toBe(true);
  });

  it("fails closed for authenticated profiles in an ambiguous runtime", () => {
    expect(authenticatedProfileGeocoderConfig({
      NODE_ENV: "production",
      AUTH_PROFILE_MANAGED_GEOCODER_ENABLED: "true",
      GEOCODER_PROVIDER: "geoapify",
      GEOCODER_API_KEY: API_KEY,
    })).toBeNull();
  });
});
