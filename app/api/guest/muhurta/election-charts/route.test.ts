import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/engines/dashaflow-election", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/engines/dashaflow-election")>();
  return { ...actual, deriveDashaflowElectionCharts: vi.fn() };
});
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn() }));

import { OPTIONS, POST } from "./route";
import {
  DashaflowElectionChartContract,
  DashaflowElectionChartError,
  deriveDashaflowElectionCharts,
} from "@/lib/engines/dashaflow-election";
import { rateLimit } from "@/lib/rate-limit";

const ORIGIN = "https://panchangam.astrochaganti.com";
const input = {
  contract_version: "1.0" as const,
  location: {
    latitude: 17.385,
    longitude: 78.4867,
    timezone: "Asia/Kolkata",
  },
  instants: ["2026-09-08T05:30:00.000Z", "2026-09-08T06:00:00+00:00"],
};

const planetNames = [
  "Surya",
  "Chandra",
  "Kuja",
  "Budha",
  "Guru",
  "Shukra",
  "Shani",
  "Rahu",
  "Ketu",
] as const;

const contract: DashaflowElectionChartContract = {
  contract_version: "1.0",
  engine: {
    name: "DashaFlow",
    version: "1.1.0",
    ayanamsha: "Lahiri",
    ephemeris: "swiss",
  },
  house_system: "whole_sign",
  location: input.location,
  data: {
    charts: input.instants.map((instant) => ({
      instant,
      lagna: { rashi: "Karka", degree: 12.5 },
      planets: planetNames.map((name, index) => ({
        name,
        rashi: "Mesha",
        degree: index + 0.5,
        house: index + 1,
        retrograde: false,
      })),
    })),
  },
};

function request(body: unknown, origin = ORIGIN): Request {
  return new Request("https://astrochaganti.com/api/guest/muhurta/election-charts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      Cookie: "next-auth.session-token=must-not-cross-service-boundary",
      "X-Forwarded-For": "spoofed, 203.0.113.21",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/guest/muhurta/election-charts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-29T00:00:00.000Z"));
    vi.mocked(rateLimit).mockReturnValue({ success: true, limit: 5, remaining: 4 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the validated sidecar contract unchanged", async () => {
    vi.mocked(deriveDashaflowElectionCharts).mockResolvedValue(contract);
    const response = await POST(request(input));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(contract);
    expect(deriveDashaflowElectionCharts).toHaveBeenCalledWith(input);
    expect(rateLimit).toHaveBeenCalledWith("guest:election-charts:203.0.113.21", 5, 60_000);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it.each([
    [{ ...input, activity: "gold" }, "activity"],
    [{ ...input, profile_id: "private-profile" }, "profile id"],
    [{ ...input, name: "Private Name" }, "name"],
    [{ ...input, birth_details: {} }, "birth details"],
    [{ ...input, natal_chart: {} }, "natal chart"],
    [{ ...input, location: { ...input.location, label: "Private place label" } }, "place label"],
  ])("rejects forbidden or unknown %s fields (%s)", async (body) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(deriveDashaflowElectionCharts).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...input, contract_version: "2.0" }, "unknown contract"],
    [{ ...input, location: { ...input.location, latitude: 91 } }, "latitude"],
    [{ ...input, location: { ...input.location, longitude: -181 } }, "longitude"],
    [{ ...input, location: { ...input.location, latitude: "17.385" } }, "string coordinate"],
    [{ ...input, location: { ...input.location, timezone: "Not/A_Timezone" } }, "timezone"],
    [{ ...input, instants: [] }, "empty instant list"],
    [{ ...input, instants: Array.from({ length: 25 }, (_, index) => `2026-09-08T${String(index % 24).padStart(2, "0")}:00:00Z`) }, "too many instants"],
    [{ ...input, instants: ["2026-09-08T05:30:01Z"] }, "non-zero seconds"],
    [{ ...input, instants: ["2026-09-08T05:30:00"] }, "missing offset"],
    [{ ...input, instants: ["2026-02-30T05:30:00Z"] }, "non-calendar date"],
    [{ ...input, instants: ["2026-09-08T05:30:00.500Z"] }, "sub-minute precision"],
    [{ ...input, instants: ["2026-09-08T05:30:00Z", "2026-09-08T11:00:00+05:30"] }, "semantic duplicate"],
  ])("rejects invalid contract input: %s (%s)", async (body) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(deriveDashaflowElectionCharts).not.toHaveBeenCalled();
  });

  it("rejects instants outside the bounded past and future calculation window", async () => {
    const dayMs = 24 * 60 * 60 * 1_000;
    const tooOld = new Date(Date.now() - 367 * dayMs).toISOString();
    const tooFar = new Date(Date.now() + 1_831 * dayMs).toISOString();

    for (const instant of [tooOld, tooFar]) {
      const response = await POST(request({ ...input, instants: [instant] }));
      expect(response.status).toBe(400);
    }
    expect(deriveDashaflowElectionCharts).not.toHaveBeenCalled();
  });

  it("rejects a body over 4 KiB before calling the sidecar", async () => {
    const response = await POST(request({ ...input, extra: "x".repeat(5_000) }));
    expect(response.status).toBe(413);
    expect(deriveDashaflowElectionCharts).not.toHaveBeenCalled();
  });

  it("rate-limits calculations before calling the sidecar", async () => {
    vi.mocked(rateLimit).mockReturnValue({ success: false, limit: 5, remaining: 0 });
    const response = await POST(request(input));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(deriveDashaflowElectionCharts).not.toHaveBeenCalled();
  });

  it("fails closed for unapproved origins", async () => {
    const response = await POST(request(input, "https://evil.example"));
    expect(response.status).toBe(403);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(rateLimit).not.toHaveBeenCalled();
    expect(deriveDashaflowElectionCharts).not.toHaveBeenCalled();
  });

  it("maps invalid sidecar responses to a safe 502 without diagnostics", async () => {
    vi.mocked(deriveDashaflowElectionCharts).mockRejectedValue(
      new DashaflowElectionChartError("invalid-response"),
    );
    const response = await POST(request(input));
    expect(response.status).toBe(502);
    expect(response.headers.get("Retry-After")).toBe("10");
    expect(JSON.stringify(await response.json())).not.toContain("DashaFlow");
  });

  it("maps transient and unexpected failures to safe retryable errors", async () => {
    vi.mocked(deriveDashaflowElectionCharts).mockRejectedValueOnce(
      new DashaflowElectionChartError("unavailable", 12),
    );
    const unavailable = await POST(request(input));
    expect(unavailable.status).toBe(503);
    expect(unavailable.headers.get("Retry-After")).toBe("12");

    vi.mocked(deriveDashaflowElectionCharts).mockRejectedValueOnce(
      new Error("raw location, cookie, or secret diagnostic"),
    );
    const unexpected = await POST(request(input));
    expect(unexpected.status).toBe(503);
    expect(JSON.stringify(await unexpected.json())).not.toContain("raw location");
  });
});

describe("OPTIONS /api/guest/muhurta/election-charts", () => {
  it("answers allowed preflights without invoking calculation or rate limiting", () => {
    vi.clearAllMocks();
    const response = OPTIONS(new Request(
      "https://astrochaganti.com/api/guest/muhurta/election-charts",
      { method: "OPTIONS", headers: { Origin: ORIGIN } },
    ));
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(deriveDashaflowElectionCharts).not.toHaveBeenCalled();
    expect(rateLimit).not.toHaveBeenCalled();
  });
});
