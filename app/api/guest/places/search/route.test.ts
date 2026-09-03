import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/geocode", () => ({
  searchPlaces: vi.fn(),
}));
vi.mock("@/lib/geocoder-config", () => ({ guestGeocoderPublicMetadata: vi.fn() }));
vi.mock("@/lib/guest-rate-limit", () => ({ enforceGuestRateLimit: vi.fn() }));

import { OPTIONS, POST } from "./route";
import { searchPlaces } from "@/lib/geocode";
import { guestGeocoderPublicMetadata } from "@/lib/geocoder-config";
import { enforceGuestRateLimit } from "@/lib/guest-rate-limit";
import { GeocoderCapacityError } from "@/lib/geocoder-capacity-error";

const ORIGIN = "https://panchangam.astrochaganti.com";

function request(body: unknown, options: { origin?: string; ip?: string } = {}): Request {
  return new Request("https://astrochaganti.com/api/guest/places/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: options.origin ?? ORIGIN,
      "X-Forwarded-For": options.ip ?? "198.51.100.10",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/guest/places/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.VERCEL_ENV;
    delete process.env.GUEST_BIRTH_PROFILE_ENABLED;
    vi.mocked(guestGeocoderPublicMetadata).mockReturnValue({
      attribution: "© OpenStreetMap contributors",
      attributions: [{
        label: "© OpenStreetMap contributors",
        url: "https://www.openstreetmap.org/copyright",
      }],
    });
    vi.mocked(enforceGuestRateLimit).mockResolvedValue({
      success: true, unavailable: false, retryAfterSeconds: 0, scope: null,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.VERCEL_ENV;
    delete process.env.GUEST_BIRTH_PROFILE_ENABLED;
  });

  it("returns the bounded selectable place contract with provider attribution", async () => {
    const places = [{
      id: "osm:relation:456",
      label: "Hyderabad, Telangana, India",
      latitude: 17.385,
      longitude: 78.4867,
      timezone: "Asia/Kolkata",
    }];
    vi.mocked(searchPlaces).mockResolvedValue(places);

    const response = await POST(request({ query: "  Hyderabad  " }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        results: places,
        attribution: "© OpenStreetMap contributors",
        attributions: [{
          label: "© OpenStreetMap contributors",
          url: "https://www.openstreetmap.org/copyright",
        }],
      },
    });
    expect(searchPlaces).toHaveBeenCalledWith(
      "Hyderabad",
      expect.any(AbortSignal),
    );
    expect(enforceGuestRateLimit).toHaveBeenCalledWith(
      "places",
      "198.51.100.10",
    );
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("rejects unknown fields and never sends them upstream", async () => {
    const response = await POST(request({ query: "Hyderabad", name: "Private Name" }));
    expect(response.status).toBe(400);
    expect(searchPlaces).not.toHaveBeenCalled();
  });

  it.each(["", "H", "x".repeat(121), "Hyd\nerabad"])(
    "rejects the unbounded query %j",
    async (query) => {
      const response = await POST(request({ query }));
      expect(response.status).toBe(400);
      expect(searchPlaces).not.toHaveBeenCalled();
    },
  );

  it("rejects bodies over 4 KiB before geocoding", async () => {
    const response = await POST(request({ query: "x".repeat(5000) }));
    expect(response.status).toBe(413);
    expect(searchPlaces).not.toHaveBeenCalled();
  });

  it("rate-limits by the trusted client IP and includes retry guidance", async () => {
    vi.mocked(enforceGuestRateLimit).mockResolvedValue({
      success: false, unavailable: false, retryAfterSeconds: 17, scope: "client",
    });
    const response = await POST(request({ query: "Hyderabad" }, {
      ip: "spoofed, 203.0.113.42",
    }));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("17");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(enforceGuestRateLimit).toHaveBeenCalledWith(
      "places",
      "203.0.113.42",
    );
    expect(searchPlaces).not.toHaveBeenCalled();
  });

  it("does not promise a one-minute retry after daily capacity is full", async () => {
    vi.mocked(enforceGuestRateLimit).mockResolvedValue({
      success: false,
      unavailable: false,
      retryAfterSeconds: 3_600,
      scope: "capacity",
    });
    const response = await POST(request({ query: "Hyderabad" }));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("3600");
    expect(await response.json()).toEqual({
      error: "Shared place-search capacity is temporarily full. Please try again later.",
    });
    expect(searchPlaces).not.toHaveBeenCalled();
  });

  it("fails closed before parsing when shared abuse controls are unavailable", async () => {
    vi.mocked(enforceGuestRateLimit).mockResolvedValue({
      success: false,
      unavailable: true,
      retryAfterSeconds: 10,
      scope: "shared-storage",
    });
    const response = await POST(request('{"private-invalid-json"'));
    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("10");
    expect(searchPlaces).not.toHaveBeenCalled();
  });

  it("fails closed for an unapproved origin", async () => {
    const response = await POST(request({ query: "Hyderabad" }, {
      origin: "https://evil.example",
    }));
    expect(response.status).toBe(403);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(enforceGuestRateLimit).not.toHaveBeenCalled();
    expect(searchPlaces).not.toHaveBeenCalled();
  });

  it("fails before parsing, rate limiting, or geocoding when disabled publicly", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    const response = await POST(request('{"private-invalid-json"'));

    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("300");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      error: "This calculation is temporarily unavailable. Please try again later.",
    });
    expect(guestGeocoderPublicMetadata).not.toHaveBeenCalled();
    expect(enforceGuestRateLimit).not.toHaveBeenCalled();
    expect(searchPlaces).not.toHaveBeenCalled();
  });

  it("cannot activate publicly with an unsafe geocoder configuration", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("GUEST_BIRTH_PROFILE_ENABLED", "true");
    vi.mocked(guestGeocoderPublicMetadata).mockReturnValue(null);

    const response = await POST(request('{"private-invalid-json"'));
    expect(response.status).toBe(503);
    expect(guestGeocoderPublicMetadata).toHaveBeenCalledTimes(1);
    expect(enforceGuestRateLimit).not.toHaveBeenCalled();
    expect(searchPlaces).not.toHaveBeenCalled();
  });

  it("redacts upstream errors and gives bounded retry guidance", async () => {
    vi.mocked(searchPlaces).mockRejectedValue(new Error("secret upstream diagnostic"));
    const response = await POST(request({ query: "Hyderabad" }));
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("10");
    expect(JSON.stringify(body)).not.toContain("secret upstream diagnostic");
  });

  it.each([
    ["rate-limited", 429, 1],
    ["unavailable", 503, 10],
  ] as const)(
    "maps provider capacity %s without exposing internal diagnostics",
    async (code, status, retryAfterSeconds) => {
      vi.mocked(searchPlaces).mockRejectedValue(
        new GeocoderCapacityError(code, retryAfterSeconds),
      );
      const response = await POST(request({ query: "Hyderabad" }));
      expect(response.status).toBe(status);
      expect(response.headers.get("Retry-After")).toBe(
        String(retryAfterSeconds),
      );
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect(JSON.stringify(await response.json())).not.toContain(
        "GeocoderCapacityError",
      );
    },
  );
});

describe("OPTIONS /api/guest/places/search", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.VERCEL_ENV;
    delete process.env.GUEST_BIRTH_PROFILE_ENABLED;
  });

  it("answers allowed preflights without invoking search or rate limiting", () => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    const response = OPTIONS(new Request(
      "https://astrochaganti.com/api/guest/places/search",
      { method: "OPTIONS", headers: { Origin: ORIGIN } },
    ));
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
    expect(searchPlaces).not.toHaveBeenCalled();
    expect(enforceGuestRateLimit).not.toHaveBeenCalled();
  });
});
