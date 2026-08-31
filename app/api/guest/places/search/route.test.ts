import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/geocode", () => ({
  GEOCODER_ATTRIBUTION: "© OpenStreetMap contributors",
  searchPlaces: vi.fn(),
}));
vi.mock("@/lib/geocoder-config", () => ({ guestGeocoderConfigured: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn() }));

import { OPTIONS, POST } from "./route";
import { searchPlaces } from "@/lib/geocode";
import { guestGeocoderConfigured } from "@/lib/geocoder-config";
import { rateLimit } from "@/lib/rate-limit";

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
    vi.mocked(guestGeocoderConfigured).mockReturnValue(true);
    vi.mocked(rateLimit).mockReturnValue({ success: true, limit: 5, remaining: 4 });
  });

  afterEach(() => {
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
      },
    });
    expect(searchPlaces).toHaveBeenCalledWith("Hyderabad");
    expect(rateLimit).toHaveBeenCalledWith("guest:places:198.51.100.10", 5, 60_000);
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
    vi.mocked(rateLimit).mockReturnValue({ success: false, limit: 5, remaining: 0 });
    const response = await POST(request({ query: "Hyderabad" }, {
      ip: "spoofed, 203.0.113.42",
    }));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(rateLimit).toHaveBeenCalledWith("guest:places:203.0.113.42", 5, 60_000);
    expect(searchPlaces).not.toHaveBeenCalled();
  });

  it("fails closed for an unapproved origin", async () => {
    const response = await POST(request({ query: "Hyderabad" }, {
      origin: "https://evil.example",
    }));
    expect(response.status).toBe(403);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(rateLimit).not.toHaveBeenCalled();
    expect(searchPlaces).not.toHaveBeenCalled();
  });

  it("fails before parsing, rate limiting, or geocoding when disabled publicly", async () => {
    process.env.VERCEL_ENV = "production";
    const response = await POST(request('{"private-invalid-json"'));

    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("300");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      error: "This calculation is temporarily unavailable. Please try again later.",
    });
    expect(guestGeocoderConfigured).not.toHaveBeenCalled();
    expect(rateLimit).not.toHaveBeenCalled();
    expect(searchPlaces).not.toHaveBeenCalled();
  });

  it("cannot activate publicly with an unsafe geocoder configuration", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.GUEST_BIRTH_PROFILE_ENABLED = "true";
    vi.mocked(guestGeocoderConfigured).mockReturnValue(false);

    const response = await POST(request('{"private-invalid-json"'));
    expect(response.status).toBe(503);
    expect(rateLimit).not.toHaveBeenCalled();
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
});

describe("OPTIONS /api/guest/places/search", () => {
  afterEach(() => {
    delete process.env.VERCEL_ENV;
    delete process.env.GUEST_BIRTH_PROFILE_ENABLED;
  });

  it("answers allowed preflights without invoking search or rate limiting", () => {
    vi.clearAllMocks();
    process.env.VERCEL_ENV = "production";
    const response = OPTIONS(new Request(
      "https://astrochaganti.com/api/guest/places/search",
      { method: "OPTIONS", headers: { Origin: ORIGIN } },
    ));
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
    expect(searchPlaces).not.toHaveBeenCalled();
    expect(rateLimit).not.toHaveBeenCalled();
  });
});
