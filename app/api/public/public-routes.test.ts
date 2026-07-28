import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn() }));
vi.mock("@/lib/panchangam/client", () => ({
  callPanchangamService: vi.fn(),
  PanchangamServiceError: class PanchangamServiceError extends Error {
    constructor(
      public readonly status: number,
      public readonly code: string,
      public readonly requestId?: string,
    ) {
      super(code);
    }
  },
}));

import { GET as getPanchangam } from "./panchangam/route";
import { GET as getHoroscope } from "./horoscope/route";
import { GET as getMuhurtam } from "./muhurtam/route";
import { rateLimit } from "@/lib/rate-limit";
import {
  callPanchangamService,
  PanchangamServiceError,
} from "@/lib/panchangam/client";

const envelope = {
  contract_version: "1.0",
  request_id: "route-test",
  engine: {
    package: "mcp-server-panchangam",
    version: "1.13.0",
    system: "drik",
    ayanamsa: "lahiri",
  },
  data: {},
  evidence: { evaluated_factors: [], not_evaluated: [], provenance: [] },
  warnings: [],
};

describe("public Panchangam BFF routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimit).mockReturnValue({ success: true, limit: 30, remaining: 29 });
    vi.mocked(callPanchangamService).mockResolvedValue(envelope as never);
  });

  it("rejects invalid Panchangam queries before calling the service", async () => {
    const request = new NextRequest(
      "http://localhost/api/public/panchangam?date=not-a-date&city=Hyderabad",
    );
    const response = await getPanchangam(request);
    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(callPanchangamService).not.toHaveBeenCalled();
  });

  it("proxies a bounded Panchangam request with public daily caching", async () => {
    const request = new NextRequest(
      "http://localhost/api/public/panchangam?date=2026-07-22&city=Hyderabad&system=drik&ayanamsa=lahiri",
      { headers: { "X-Request-ID": "public-day-test" } },
    );
    const response = await getPanchangam(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=3600");
    expect(response.headers.get("X-Request-ID")).toBe("public-day-test");
    expect(callPanchangamService).toHaveBeenCalledWith(
      "/v1/panchangam/day",
      {
        date: "2026-07-22",
        city: "Hyderabad",
        system: "drik",
        ayanamsa: "lahiri",
      },
      "public-day-test",
    );
  });

  it("maps the public Moon-sign query to the canonical Rasi field", async () => {
    const request = new NextRequest(
      "http://localhost/api/public/horoscope?date=2026-07-22&city=Hyderabad&rasi=Mesha&ayanamsa=lahiri",
    );
    const response = await getHoroscope(request);
    expect(response.status).toBe(200);
    expect(callPanchangamService).toHaveBeenCalledWith(
      "/v1/rasi-phalalu",
      {
        date: "2026-07-22",
        city: "Hyderabad",
        janma_rasi: "Mesha",
        ayanamsa: "lahiri",
      },
      expect.any(String),
    );
  });

  it("always sends an empty participant list for public Muhurtam", async () => {
    const request = new NextRequest(
      "http://localhost/api/public/muhurtam?start_date=2026-08-01&days=3&activity=travel&city=Hyderabad&system=drik&ayanamsa=lahiri&include_night=false",
    );
    const response = await getMuhurtam(request);
    expect(response.status).toBe(200);
    expect(callPanchangamService).toHaveBeenCalledWith(
      "/v1/muhurtam/search",
      expect.objectContaining({
        activity: "travel",
        days: 3,
        include_night: false,
        participants: [],
      }),
      expect.any(String),
      15_000,
    );
  });

  it("redacts upstream failures and prevents them from being cached", async () => {
    vi.mocked(callPanchangamService).mockRejectedValue(
      new PanchangamServiceError(503, "upstream_timeout", "safe-id"),
    );
    const request = new NextRequest(
      "http://localhost/api/public/panchangam?date=2026-07-22&city=Hyderabad",
    );
    const response = await getPanchangam(request);
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual(expect.objectContaining({
      code: "upstream_timeout",
      request_id: "safe-id",
    }));
  });

  it("rate-limits before contacting the computation service", async () => {
    vi.mocked(rateLimit).mockReturnValue({ success: false, limit: 30, remaining: 0 });
    const request = new NextRequest(
      "http://localhost/api/public/panchangam?date=2026-07-22&city=Hyderabad",
      { headers: { "X-Forwarded-For": "spoofed, 203.0.113.10" } },
    );
    const response = await getPanchangam(request);
    expect(response.status).toBe(429);
    expect(rateLimit).toHaveBeenCalledWith(
      "public-panchangam:panchangam:203.0.113.10",
      30,
      60_000,
    );
    expect(callPanchangamService).not.toHaveBeenCalled();
  });
});
