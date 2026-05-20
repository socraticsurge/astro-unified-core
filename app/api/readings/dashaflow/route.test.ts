import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {}, getUserId: (s) => s?.user?.id ?? "" }));
vi.mock("@/lib/admin", () => ({ isAdmin: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn() }));
vi.mock("@/lib/engine-error", () => ({ extractEngineError: vi.fn() }));
vi.mock("@/lib/engines/dashaflow", () => ({ fetchDashaflow: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    profiles: { get: vi.fn(), getAny: vi.fn() },
    readings: { latestByEngine: vi.fn(), save: vi.fn() },
  },
}));

import { GET, POST } from "./route";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { fetchDashaflow } from "@/lib/engines/dashaflow";
import { extractEngineError } from "@/lib/engine-error";
import { rateLimit } from "@/lib/rate-limit";

const session = { user: { id: "user-1" } };
const profile = { id: "prof-1", user_id: "user-1", date_of_birth: "1990-01-01", time_of_birth: "12:00", latitude: 19, longitude: 72, timezone: "Asia/Kolkata" };
// input_snapshot must match the test `profile`'s birth fields so the route's
// `birthDataChanged()` check returns false and the cached value is served.
const cachedReading = {
  id: "read-1",
  profile_id: "prof-1",
  engine: "dashaflow",
  output_data: JSON.stringify({ planets: {} }),
  input_snapshot: JSON.stringify({
    date_of_birth: "1990-01-01",
    time_of_birth: "12:00",
    latitude: 19,
    longitude: 72,
    timezone: "Asia/Kolkata",
  }),
  created_at: "2026-01-01T00:00:00Z",
};

describe("GET /api/readings/dashaflow", () => {
  beforeEach(() => vi.clearAllMocks());

  const makeReq = (params: Record<string, string> = {}) => {
    const url = new URL("http://localhost/api/readings/dashaflow");
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return new NextRequest(url.toString());
  };

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 400 when profile_id is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "profile_id is required" });
  });

  it("returns 404 when profile not found", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(isAdmin).mockReturnValue(false);
    vi.mocked(db.profiles.get).mockResolvedValue(undefined as never);
    const res = await GET(makeReq({ profile_id: "prof-1" }));
    expect(res.status).toBe(404);
  });

  it("returns 200 with cached data and Cache-Control header", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(isAdmin).mockReturnValue(false);
    vi.mocked(db.profiles.get).mockResolvedValue(profile as never);
    vi.mocked(db.readings.latestByEngine).mockResolvedValue(cachedReading as never);

    const res = await GET(makeReq({ profile_id: "prof-1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.cached).toBe(true);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("returns 200 with fresh data when no cache exists", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(isAdmin).mockReturnValue(false);
    vi.mocked(db.profiles.get).mockResolvedValue(profile as never);
    vi.mocked(db.readings.latestByEngine).mockResolvedValue(null as never);
    vi.mocked(fetchDashaflow).mockResolvedValue({ data: { planets: {} } } as never);
    vi.mocked(extractEngineError).mockReturnValue(null);
    vi.mocked(db.readings.save).mockResolvedValue(cachedReading as never);

    const res = await GET(makeReq({ profile_id: "prof-1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.cached).toBe(false);
  });

  it("returns 502 when engine returns an error", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(isAdmin).mockReturnValue(false);
    vi.mocked(db.profiles.get).mockResolvedValue(profile as never);
    vi.mocked(db.readings.latestByEngine).mockResolvedValue(null as never);
    vi.mocked(fetchDashaflow).mockResolvedValue({ data: null, error: "Timeout" } as never);
    vi.mocked(extractEngineError).mockReturnValue("Timeout");

    const res = await GET(makeReq({ profile_id: "prof-1" }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "Timeout" });
  });

  it("admin can access any profile via getAny", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(db.profiles.getAny).mockResolvedValue(profile as never);
    vi.mocked(db.readings.latestByEngine).mockResolvedValue(cachedReading as never);

    const res = await GET(makeReq({ profile_id: "prof-other" }));
    expect(res.status).toBe(200);
    expect(db.profiles.getAny).toHaveBeenCalledWith("prof-other");
  });
});

describe("POST /api/readings/dashaflow (force refresh)", () => {
  beforeEach(() => vi.clearAllMocks());

  const makeReq = (body: object) =>
    new NextRequest("http://localhost/api/readings/dashaflow", {
      method: "POST",
      body: JSON.stringify(body),
    });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await POST(makeReq({ profile_id: "prof-1" }));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(rateLimit).mockReturnValue({ success: false } as never);
    const res = await POST(makeReq({ profile_id: "prof-1" }));
    expect(res.status).toBe(429);
  });

  it("returns 404 when profile not found", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(rateLimit).mockReturnValue({ success: true } as never);
    vi.mocked(isAdmin).mockReturnValue(false);
    vi.mocked(db.profiles.get).mockResolvedValue(undefined as never);
    const res = await POST(makeReq({ profile_id: "prof-1" }));
    expect(res.status).toBe(404);
  });

  it("returns 502 when engine errors", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(rateLimit).mockReturnValue({ success: true } as never);
    vi.mocked(isAdmin).mockReturnValue(false);
    vi.mocked(db.profiles.get).mockResolvedValue(profile as never);
    vi.mocked(fetchDashaflow).mockResolvedValue({ data: null, error: "Sidecar down" } as never);
    vi.mocked(extractEngineError).mockReturnValue("Sidecar down");
    const res = await POST(makeReq({ profile_id: "prof-1" }));
    expect(res.status).toBe(502);
  });

  it("returns 200 with fresh reading and Cache-Control on success", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(rateLimit).mockReturnValue({ success: true } as never);
    vi.mocked(isAdmin).mockReturnValue(false);
    vi.mocked(db.profiles.get).mockResolvedValue(profile as never);
    vi.mocked(fetchDashaflow).mockResolvedValue({ data: { planets: {} } } as never);
    vi.mocked(extractEngineError).mockReturnValue(null);
    vi.mocked(db.readings.save).mockResolvedValue(cachedReading as never);

    const res = await POST(makeReq({ profile_id: "prof-1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.cached).toBe(false);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
