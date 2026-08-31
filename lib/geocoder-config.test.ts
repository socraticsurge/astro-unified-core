import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  PUBLIC_NOMINATIM_BASE_URL,
  authenticatedProfileGeocoderConfig,
  guestGeocoderConfig,
} from "./geocoder-config";

const MANAGED_BASE = "https://geocoder.example/nominatim";
const MANAGED_IDENTITY = "AstroChaganti/1.0 (ops@example.com)";

describe("geocoder configuration", () => {
  it("uses the public Nominatim default only outside Vercel deployments", () => {
    expect(guestGeocoderConfig({})).toEqual({
      searchUrl: `${PUBLIC_NOMINATIM_BASE_URL}/search`,
      identity: "AstroChaganti/1.0 (https://astrochaganti.com)",
    });
    expect(guestGeocoderConfig({ VERCEL_ENV: "development" })).not.toBeNull();
  });

  it.each(["preview", "production"])(
    "cannot activate %s against the public Nominatim default",
    (vercelEnv) => {
      expect(guestGeocoderConfig({
        VERCEL_ENV: vercelEnv,
        GEOCODER_USER_AGENT: MANAGED_IDENTITY,
      })).toBeNull();
      expect(guestGeocoderConfig({
        VERCEL_ENV: vercelEnv,
        GEOCODER_BASE_URL: PUBLIC_NOMINATIM_BASE_URL,
        GEOCODER_USER_AGENT: MANAGED_IDENTITY,
      })).toBeNull();
      expect(guestGeocoderConfig({
        VERCEL_ENV: vercelEnv,
        GEOCODER_BASE_URL: `${PUBLIC_NOMINATIM_BASE_URL}/private-proxy`,
        GEOCODER_USER_AGENT: MANAGED_IDENTITY,
      })).toBeNull();
      expect(guestGeocoderConfig({
        VERCEL_ENV: vercelEnv,
        GEOCODER_BASE_URL: "https://nominatim.openstreetmap.org.",
        GEOCODER_USER_AGENT: MANAGED_IDENTITY,
      })).toBeNull();
    },
  );

  it.each(["preview", "production"])(
    "requires an explicit HTTPS base and identity in %s",
    (vercelEnv) => {
      expect(guestGeocoderConfig({
        VERCEL_ENV: vercelEnv,
        GEOCODER_BASE_URL: MANAGED_BASE,
      })).toBeNull();
      expect(guestGeocoderConfig({
        VERCEL_ENV: vercelEnv,
        GEOCODER_USER_AGENT: MANAGED_IDENTITY,
      })).toBeNull();
      expect(guestGeocoderConfig({
        VERCEL_ENV: vercelEnv,
        GEOCODER_BASE_URL: "http://geocoder.example",
        GEOCODER_USER_AGENT: MANAGED_IDENTITY,
      })).toBeNull();
      expect(guestGeocoderConfig({
        VERCEL_ENV: vercelEnv,
        GEOCODER_BASE_URL: MANAGED_BASE,
        GEOCODER_USER_AGENT: MANAGED_IDENTITY,
      })).toEqual({
        searchUrl: "https://geocoder.example/nominatim/search",
        identity: MANAGED_IDENTITY,
      });
    },
  );

  it("permits local HTTP only on exact loopback hosts", () => {
    expect(guestGeocoderConfig({
      GEOCODER_BASE_URL: "http://127.0.0.1:8080/nominatim",
      GEOCODER_USER_AGENT: MANAGED_IDENTITY,
    })?.searchUrl).toBe("http://127.0.0.1:8080/nominatim/search");
    expect(guestGeocoderConfig({
      GEOCODER_BASE_URL: "http://geocoder.example",
      GEOCODER_USER_AGENT: MANAGED_IDENTITY,
    })).toBeNull();
  });

  it("fails closed for an unknown Vercel environment", () => {
    expect(guestGeocoderConfig({
      VERCEL_ENV: "staging",
      GEOCODER_BASE_URL: MANAGED_BASE,
      GEOCODER_USER_AGENT: MANAGED_IDENTITY,
    })).toBeNull();
  });

  it.each([
    "https://user:pass@geocoder.example",
    "https://geocoder.example?key=secret",
    "https://geocoder.example#fragment",
    " https://geocoder.example",
  ])("rejects unsafe provider bases without exposing their contents: %s", (base) => {
    expect(guestGeocoderConfig({
      GEOCODER_BASE_URL: base,
      GEOCODER_USER_AGENT: MANAGED_IDENTITY,
    })).toBeNull();
  });

  it("keeps authenticated profile geocoding independent of guest activation", () => {
    expect(authenticatedProfileGeocoderConfig()).toEqual({
      searchUrl: `${PUBLIC_NOMINATIM_BASE_URL}/search`,
      identity: "AstroChaganti/1.0 (https://astrochaganti.com)",
    });
  });
});
