import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {}, getUserId: (s) => s?.user?.id ?? "" }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    compatibility: {
      list: vi.fn(),
      findDuplicate: vi.fn(),
      countByUser: vi.fn(),
      get: vi.fn(),
      save: vi.fn(),
    },
    profiles: {
      get: vi.fn(),
    },
  },
}));

// Sidecar fetch is global fetch — suppress real network calls
vi.stubGlobal("fetch", vi.fn());

import { GET, POST } from "./route";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

const session = { user: { id: "user-1" } };

const p1 = { id: "prof-1", user_id: "user-1", date_of_birth: "1990-01-01", time_of_birth: "12:00", latitude: 19, longitude: 72, timezone: "Asia/Kolkata" };
const p2 = { id: "prof-2", user_id: "user-1", date_of_birth: "1992-06-15", time_of_birth: "08:30", latitude: 28, longitude: 77, timezone: "Asia/Kolkata" };

const existingCheck = {
  id: "compat-1", user_id: "user-1",
  profile_id_1: "prof-1", profile_id_2: "prof-2",
  score: 28, result_json: "{}", created_at: "2026-01-01T00:00:00Z",
};

describe("GET /api/compatibility", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 200 with checks list and private cache header", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(db.compatibility.list).mockResolvedValue([existingCheck] as never);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([existingCheck]);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });
});

describe("POST /api/compatibility", () => {
  beforeEach(() => vi.clearAllMocks());

  const makeReq = (body: object) =>
    new NextRequest("http://localhost/api/compatibility", {
      method: "POST",
      body: JSON.stringify(body),
    });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await POST(makeReq({ profile_id_1: "p1", profile_id_2: "p2" }));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(rateLimit).mockReturnValue({ success: false } as never);
    const res = await POST(makeReq({ profile_id_1: "p1", profile_id_2: "p2" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when profile IDs are missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(rateLimit).mockReturnValue({ success: true } as never);
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Two profiles required" });
  });

  it("returns 400 when both IDs refer to the same profile", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(rateLimit).mockReturnValue({ success: true } as never);
    const res = await POST(
      makeReq({ profile_id_1: "prof-1", profile_id_2: "prof-1" }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Choose two different profiles",
    });
    expect(db.compatibility.findDuplicate).not.toHaveBeenCalled();
  });

  it("returns existing duplicate check without calling sidecar", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(rateLimit).mockReturnValue({ success: true } as never);
    vi.mocked(db.compatibility.findDuplicate).mockResolvedValue(existingCheck as never);
    vi.mocked(db.profiles.get).mockResolvedValueOnce(p1 as never).mockResolvedValueOnce(p2 as never);

    const res = await POST(makeReq({ profile_id_1: "prof-1", profile_id_2: "prof-2" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(existingCheck);
    expect(fetch).not.toHaveBeenCalled();
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("returns 403 when at 6-check cap (no duplicate)", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(rateLimit).mockReturnValue({ success: true } as never);
    vi.mocked(db.compatibility.findDuplicate).mockResolvedValue(undefined as never);
    vi.mocked(db.compatibility.countByUser).mockResolvedValue(6 as never);

    const res = await POST(makeReq({ profile_id_1: "prof-1", profile_id_2: "prof-3" }));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toMatch(/maximum limit/i);
  });

  it("returns 404 when either profile is not found", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(rateLimit).mockReturnValue({ success: true } as never);
    vi.mocked(db.compatibility.findDuplicate).mockResolvedValue(undefined as never);
    vi.mocked(db.compatibility.countByUser).mockResolvedValue(0 as never);
    vi.mocked(db.profiles.get).mockResolvedValue(null as never);

    const res = await POST(makeReq({ profile_id_1: "prof-1", profile_id_2: "prof-2" }));
    expect(res.status).toBe(404);
  });

  it("returns 200 with saved check on sidecar success", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(rateLimit).mockReturnValue({ success: true } as never);
    vi.mocked(db.compatibility.findDuplicate).mockResolvedValue(undefined as never);
    vi.mocked(db.compatibility.countByUser).mockResolvedValue(2 as never);
    vi.mocked(db.profiles.get).mockResolvedValueOnce(p1 as never).mockResolvedValueOnce(p2 as never);
    vi.mocked(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { total_score: 28, details: {} } }),
    } as never);
    vi.mocked(db.compatibility.save).mockResolvedValue(existingCheck as never);

    const res = await POST(makeReq({ profile_id_1: "prof-1", profile_id_2: "prof-2" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    const data = await res.json();
    expect(data.id).toBe("compat-1");
  });
});
