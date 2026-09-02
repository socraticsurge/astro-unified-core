import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/engines/dashaflow", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/engines/dashaflow")>();
  return { ...actual, deriveDashaflowProfile: vi.fn() };
});
vi.mock("@/lib/guest-rate-limit", () => ({ enforceGuestRateLimit: vi.fn() }));

import { OPTIONS, POST } from "./route";
import {
  DashaflowProfileError,
  deriveDashaflowProfile,
} from "@/lib/engines/dashaflow";
import type { DashaflowProfileContract } from "@/lib/engines/dashaflow";
import { enforceGuestRateLimit } from "@/lib/guest-rate-limit";

const ORIGIN = "https://panchangam.astrochaganti.com";
const input = {
  date_of_birth: "1990-01-01",
  time_of_birth: "12:00",
  latitude: 17.385,
  longitude: 78.4867,
  timezone: "Asia/Kolkata",
};
const contract: DashaflowProfileContract = {
  contract_version: "1.0" as const,
  engine: {
    name: "DashaFlow",
    version: "1.1.0",
    ayanamsha: "Lahiri",
    ephemeris: "swiss" as const,
  },
  data: {
    nakshatra: "Rohini",
    pada: 2,
    janma_rashi: "Vrishabha",
    lagna: "Karka",
    lagna_degree: 12.5,
    planets: [
      { name: "Surya", rashi: "Mesha", degree: 0.5, house: 1, retrograde: false },
      { name: "Chandra", rashi: "Vrishabha", degree: 1.5, house: 2, retrograde: false },
      { name: "Kuja", rashi: "Mithuna", degree: 2.5, house: 3, retrograde: true },
      { name: "Budha", rashi: "Karka", degree: 3.5, house: 4, retrograde: false },
      { name: "Guru", rashi: "Simha", degree: 4.5, house: 5, retrograde: false },
      { name: "Shukra", rashi: "Kanya", degree: 5.5, house: 6, retrograde: false },
      { name: "Shani", rashi: "Tula", degree: 6.5, house: 7, retrograde: true },
      { name: "Rahu", rashi: "Vrischika", degree: 7.5, house: 8, retrograde: true },
      { name: "Ketu", rashi: "Dhanu", degree: 8.5, house: 9, retrograde: true },
    ],
  },
};

function request(body: unknown, origin = ORIGIN): Request {
  return new Request("https://astrochaganti.com/api/guest/profile/derive", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "X-Forwarded-For": "spoofed, 203.0.113.20",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/guest/profile/derive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.VERCEL_ENV;
    delete process.env.GUEST_BIRTH_PROFILE_ENABLED;
    vi.mocked(enforceGuestRateLimit).mockResolvedValue({
      success: true, unavailable: false, retryAfterSeconds: 0, scope: null,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    delete process.env.VERCEL_ENV;
    delete process.env.GUEST_BIRTH_PROFILE_ENABLED;
  });

  it("returns only the normalized sidecar contract", async () => {
    vi.mocked(deriveDashaflowProfile).mockResolvedValue(contract);
    const response = await POST(request(input));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(contract);
    expect(deriveDashaflowProfile).toHaveBeenCalledWith(input);
    expect(enforceGuestRateLimit).toHaveBeenCalledWith(
      "profile-derive",
      "203.0.113.20",
    );
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("rejects name and every other unknown field without forwarding it", async () => {
    const response = await POST(request({ ...input, name: "Private Name" }));
    expect(response.status).toBe(400);
    expect(deriveDashaflowProfile).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...input, date_of_birth: "2024-02-30" }, "invalid calendar date"],
    [{ ...input, date_of_birth: "9999-01-01" }, "future date"],
    [{ ...input, date_of_birth: "1990-1-01" }, "non-ISO date"],
    [{ ...input, time_of_birth: "7:05" }, "non-ISO time"],
    [{ ...input, time_of_birth: "24:00" }, "out-of-range time"],
    [{ ...input, latitude: 91 }, "out-of-range latitude"],
    [{ ...input, longitude: -181 }, "out-of-range longitude"],
    [{ ...input, timezone: "Not/A_Timezone" }, "unknown timezone"],
    [{ ...input, timezone: " Asia/Kolkata" }, "whitespace-padded timezone"],
    [{ ...input, latitude: "17.385" }, "string coordinate"],
  ])("rejects %s (%s)", async (body) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(deriveDashaflowProfile).not.toHaveBeenCalled();
  });

  it("rejects a date that is still tomorrow in the supplied birthplace timezone", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T00:30:00.000Z"));

    const response = await POST(request({
      ...input,
      date_of_birth: "2026-09-01",
      timezone: "America/Los_Angeles",
    }));

    expect(response.status).toBe(400);
    expect(deriveDashaflowProfile).not.toHaveBeenCalled();
  });

  it("accepts the current birthplace date across the UTC date line", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T10:30:00.000Z"));
    vi.mocked(deriveDashaflowProfile).mockResolvedValue(contract);
    const birthInput = {
      ...input,
      date_of_birth: "2026-09-01",
      timezone: "Pacific/Kiritimati",
    };

    const response = await POST(request(birthInput));

    expect(response.status).toBe(200);
    expect(deriveDashaflowProfile).toHaveBeenCalledWith(birthInput);
  });

  it("rejects a body over 4 KiB", async () => {
    const response = await POST(request({ ...input, extra: "x".repeat(5000) }));
    expect(response.status).toBe(413);
    expect(deriveDashaflowProfile).not.toHaveBeenCalled();
  });

  it("rate-limits calculations before calling the sidecar", async () => {
    vi.mocked(enforceGuestRateLimit).mockResolvedValue({
      success: false, unavailable: false, retryAfterSeconds: 23, scope: "client",
    });
    const response = await POST(request(input));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("23");
    expect(deriveDashaflowProfile).not.toHaveBeenCalled();
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
    expect(deriveDashaflowProfile).not.toHaveBeenCalled();
  });

  it("fails closed for unapproved origins", async () => {
    const response = await POST(request(input, "https://evil.example"));
    expect(response.status).toBe(403);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(enforceGuestRateLimit).not.toHaveBeenCalled();
    expect(deriveDashaflowProfile).not.toHaveBeenCalled();
  });

  it("fails before parsing, rate limiting, or sidecar access when disabled publicly", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    const response = await POST(request('{"private-invalid-json"'));

    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("300");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      error: "This calculation is temporarily unavailable. Please try again later.",
    });
    expect(enforceGuestRateLimit).not.toHaveBeenCalled();
    expect(deriveDashaflowProfile).not.toHaveBeenCalled();
  });

  it("maps transient sidecar failures to safe retryable errors", async () => {
    vi.mocked(deriveDashaflowProfile).mockRejectedValue(
      new DashaflowProfileError("unavailable", 12),
    );
    const response = await POST(request(input));
    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("12");
    expect(JSON.stringify(await response.json())).not.toContain("DashaFlow");
  });

  it("maps sanitized sidecar input rejection without exposing its internals", async () => {
    vi.mocked(deriveDashaflowProfile).mockRejectedValue(
      new DashaflowProfileError("invalid-input"),
    );
    const response = await POST(request(input));
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: "The birth details could not be calculated. Check the selected place, date, and time.",
    });
  });

  it("does not expose raw unexpected exception messages", async () => {
    vi.mocked(deriveDashaflowProfile).mockRejectedValue(
      new Error("raw birth payload or secret diagnostic"),
    );
    const response = await POST(request(input));
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(JSON.stringify(body)).not.toContain("raw birth payload");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});

describe("OPTIONS /api/guest/profile/derive", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.VERCEL_ENV;
    delete process.env.GUEST_BIRTH_PROFILE_ENABLED;
  });

  it("answers allowed preflights without invoking the calculation path", () => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    const response = OPTIONS(new Request(
      "https://astrochaganti.com/api/guest/profile/derive",
      { method: "OPTIONS", headers: { Origin: ORIGIN } },
    ));
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
    expect(deriveDashaflowProfile).not.toHaveBeenCalled();
    expect(enforceGuestRateLimit).not.toHaveBeenCalled();
  });
});
