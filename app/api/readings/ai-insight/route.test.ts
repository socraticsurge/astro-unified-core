import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/admin", () => ({ isAdmin: vi.fn() }));
vi.mock("@/lib/ai-insight", () => ({
  INSIGHT_TABS: ["natal", "vargas", "dashas", "career", "transit", "tarabalam"],
  TAB_ENGINE: {
    natal: "ai-insight-natal",
    vargas: "ai-insight-vargas",
    dashas: "ai-insight-dashas",
    career: "ai-insight-career",
    transit: "ai-insight-transit",
    tarabalam: "ai-insight-tarabalam",
  },
  buildInsightForTab: vi.fn(),
}));
vi.mock("@/lib/engines/models", () => ({
  resolveModel: vi.fn().mockReturnValue("gemini-2.0-flash"),
  DEFAULT_INSIGHT_MODEL: "gemini-2.0-flash",
}));
vi.mock("@/lib/db", () => ({
  db: {
    profiles: { getAny: vi.fn() },
    readings: { latestByEngine: vi.fn(), save: vi.fn() },
  },
}));

import { GET, POST } from "./route";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { buildInsightForTab } from "@/lib/ai-insight";

const session = { user: { id: "user-1" } };
const profile = {
  id: "prof-1", user_id: "user-1", name: "Test",
  date_of_birth: "1990-01-01", time_of_birth: "12:00", place_of_birth: "Mumbai",
  latitude: 19, longitude: 72, timezone: "Asia/Kolkata", timezone_offset: 5.5,
  created_at: "2026-01-01T00:00:00Z",
};
const cachedReading = {
  id: "read-1", profile_id: "prof-1", engine: "ai-insight-natal",
  output_data: JSON.stringify({ text: "Your chart shows..." }),
  rating: null,
};

describe("GET /api/readings/ai-insight", () => {
  beforeEach(() => vi.clearAllMocks());

  const makeReq = (params: Record<string, string> = {}) => {
    const url = new URL("http://localhost/api/readings/ai-insight");
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return new NextRequest(url.toString());
  };

  it("returns 403 when not admin", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(isAdmin).mockReturnValue(false);
    const res = await GET(makeReq({ profile_id: "prof-1", tab: "natal" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when tab is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(isAdmin).mockReturnValue(true);
    const res = await GET(makeReq({ profile_id: "prof-1" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "profile_id and valid tab required" });
  });

  it("returns 400 for invalid tab value", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(isAdmin).mockReturnValue(true);
    const res = await GET(makeReq({ profile_id: "prof-1", tab: "invalid_tab" }));
    expect(res.status).toBe(400);
  });

  it("returns 200 with insight and Cache-Control when reading exists", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(db.readings.latestByEngine).mockResolvedValue(cachedReading as never);

    const res = await GET(makeReq({ profile_id: "prof-1", tab: "natal" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reading_id).toBe("read-1");
    expect(data.rating).toBeNull();
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=0");
  });

  it("returns 200 with null insight when no reading exists", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(db.readings.latestByEngine).mockResolvedValue(null as never);

    const res = await GET(makeReq({ profile_id: "prof-1", tab: "natal" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.insight).toBeNull();
    expect(data.reading_id).toBeNull();
  });
});

describe("POST /api/readings/ai-insight", () => {
  beforeEach(() => vi.clearAllMocks());

  const makeReq = (body: object) =>
    new NextRequest("http://localhost/api/readings/ai-insight", {
      method: "POST",
      body: JSON.stringify(body),
    });

  it("returns 403 when not admin", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(isAdmin).mockReturnValue(false);
    const res = await POST(makeReq({ profile_id: "prof-1", tab: "natal" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when tab is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(isAdmin).mockReturnValue(true);
    const res = await POST(makeReq({ profile_id: "prof-1" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "profile_id and valid tab required" });
  });

  it("returns cached insight and does not call LLM when not forced", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(db.readings.latestByEngine).mockResolvedValue(cachedReading as never);

    const res = await POST(makeReq({ profile_id: "prof-1", tab: "natal" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.cached).toBe(true);
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=0");
    expect(buildInsightForTab).not.toHaveBeenCalled();
  });

  it("returns 404 when profile not found on force refresh", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(db.profiles.getAny).mockResolvedValue(undefined as never);

    const res = await POST(makeReq({ profile_id: "prof-1", tab: "natal", force: true }));
    expect(res.status).toBe(404);
  });

  it("returns 200 with fresh insight on success", async () => {
    const insight = { text: "Fresh reading...", model: "gemini-2.0-flash", prompt_version: 2 };
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(db.profiles.getAny).mockResolvedValue(profile as never);
    vi.mocked(buildInsightForTab).mockResolvedValue(insight as never);
    vi.mocked(db.readings.save).mockResolvedValue({ ...cachedReading, id: "read-2" } as never);

    const res = await POST(makeReq({ profile_id: "prof-1", tab: "natal", force: true }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.cached).toBe(false);
    expect(data.reading_id).toBe("read-2");
  });

  it("returns 500 when insight generation throws", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(db.profiles.getAny).mockResolvedValue(profile as never);
    vi.mocked(buildInsightForTab).mockRejectedValue(new Error("LLM quota exceeded") as never);

    const res = await POST(makeReq({ profile_id: "prof-1", tab: "natal", force: true }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "LLM quota exceeded" });
  });
});
