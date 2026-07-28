import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {}, getUserId: (s: { user?: { id?: string } } | null) => s?.user?.id ?? "" }));
vi.mock("@/lib/admin", () => ({ isAdmin: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    readings: {
      latestByEngine: vi.fn(),
      save: vi.fn(),
    },
    compatibility: {
      getAny: vi.fn(),
    },
    profiles: {
      getAny: vi.fn(),
    },
  },
}));

vi.mock("@/lib/ai-insight-compat", () => ({
  buildCompatibilityInsight: vi.fn(),
  COMPAT_ENGINE: "ai-compat",
}));

vi.mock("@/lib/engines/models", () => ({
  DEFAULT_INSIGHT_MODEL: "groq-gpt-oss-120b",
  resolveModel: vi.fn((key: unknown, fallback: string) =>
    key === "groq-gpt-oss-120b" ? key : fallback
  ),
}));

import { GET, POST } from "./route";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { buildCompatibilityInsight } from "@/lib/ai-insight-compat";

const FAKE_INSIGHT = { summary: "Compatible", sections: [], model: "groq-gpt-oss-120b" };

describe("GET /api/readings/ai-insight/compatibility", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 for non-admins", async () => {
    vi.mocked(getServerSession).mockResolvedValue({} as never);
    vi.mocked(isAdmin).mockReturnValue(false);

    const req = new NextRequest("http://localhost/api/readings/ai-insight/compatibility?check_id=c1");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 when check_id is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({} as never);
    vi.mocked(isAdmin).mockReturnValue(true);

    const req = new NextRequest("http://localhost/api/readings/ai-insight/compatibility");
    const res = await GET(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("check_id") });
  });

  it("returns null insight when no reading exists", async () => {
    vi.mocked(getServerSession).mockResolvedValue({} as never);
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(db.readings.latestByEngine).mockResolvedValue(undefined);

    const req = new NextRequest("http://localhost/api/readings/ai-insight/compatibility?check_id=c1");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ insight: null, reading_id: null });
  });

  it("returns existing insight with private Cache-Control", async () => {
    vi.mocked(getServerSession).mockResolvedValue({} as never);
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(db.readings.latestByEngine).mockResolvedValue({
      id: "r1",
      output_data: JSON.stringify(FAKE_INSIGHT),
      rating: 1,
    } as never);

    const req = new NextRequest("http://localhost/api/readings/ai-insight/compatibility?check_id=c1");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=0");
    const data = await res.json();
    expect(data.insight).toEqual(FAKE_INSIGHT);
    expect(data.reading_id).toBe("r1");
    expect(data.rating).toBe(1);
  });
});

describe("POST /api/readings/ai-insight/compatibility", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 for non-admins", async () => {
    vi.mocked(getServerSession).mockResolvedValue({} as never);
    vi.mocked(isAdmin).mockReturnValue(false);

    const req = new NextRequest("http://localhost/api/readings/ai-insight/compatibility", {
      method: "POST",
      body: JSON.stringify({ check_id: "c1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 when check_id is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({} as never);
    vi.mocked(isAdmin).mockReturnValue(true);

    const req = new NextRequest("http://localhost/api/readings/ai-insight/compatibility", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns cached insight when one exists and force is not set", async () => {
    vi.mocked(getServerSession).mockResolvedValue({} as never);
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(db.readings.latestByEngine).mockResolvedValue({
      id: "r-cached",
      output_data: JSON.stringify(FAKE_INSIGHT),
      rating: null,
    } as never);

    const req = new NextRequest("http://localhost/api/readings/ai-insight/compatibility", {
      method: "POST",
      body: JSON.stringify({ check_id: "c1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.cached).toBe(true);
    expect(data.reading_id).toBe("r-cached");
    expect(buildCompatibilityInsight).not.toHaveBeenCalled();
  });

  it("generates a new insight when force=true", async () => {
    vi.mocked(getServerSession).mockResolvedValue({} as never);
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(db.compatibility.getAny).mockResolvedValue({
      id: "c1",
      profile_id_1: "p1",
      profile_id_2: "p2",
      result_json: "{}",
    } as never);
    vi.mocked(db.profiles.getAny).mockResolvedValue({ id: "p1", name: "Alice" } as never);
    vi.mocked(buildCompatibilityInsight).mockResolvedValue({ ...FAKE_INSIGHT, model: "groq-gpt-oss-120b" } as never);
    vi.mocked(db.readings.save).mockResolvedValue({ id: "r-new", output_data: "{}" } as never);

    const req = new NextRequest("http://localhost/api/readings/ai-insight/compatibility", {
      method: "POST",
      body: JSON.stringify({ check_id: "c1", force: true }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(buildCompatibilityInsight).toHaveBeenCalled();
    const data = await res.json();
    expect(data.cached).toBe(false);
  });

  it("returns 404 when compatibility check is not found", async () => {
    vi.mocked(getServerSession).mockResolvedValue({} as never);
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(db.readings.latestByEngine).mockResolvedValue(undefined);
    vi.mocked(db.compatibility.getAny).mockResolvedValue(undefined);

    const req = new NextRequest("http://localhost/api/readings/ai-insight/compatibility", {
      method: "POST",
      body: JSON.stringify({ check_id: "missing", force: true }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});
