import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {}, getUserId: (s: { user?: { id?: string } } | null) => s?.user?.id ?? "" }));
vi.mock("@/lib/admin", () => ({ isAdmin: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    consultationRequests: { getById: vi.fn() },
    profiles: { getManyAny: vi.fn() },
    readings: { latestByEngineMany: vi.fn() },
    settings: { getDraftLlm: vi.fn() },
  },
}));

vi.mock("@/lib/engines/ai-caller", () => ({ callAIForText: vi.fn() }));

vi.mock("@/lib/engines/models", () => ({
  DEFAULT_DRAFT_MODEL: "groq-gpt-oss-120b",
  resolveModel: vi.fn((_key: unknown, fallback: string) => fallback),
}));

vi.mock("@/lib/chart-summary", () => ({ summarizeDashaflow: vi.fn(() => "Chart summary") }));
vi.mock("@/lib/consultation", () => ({ assembleStatement: vi.fn(() => "Will I get a promotion?") }));
vi.mock("@/lib/content/lookup", () => ({
  lookupAscendant: vi.fn(() => null),
  lookupNakshatra: vi.fn(() => null),
  lookupDashaPair: vi.fn(() => null),
  lookupPlanetInHouse: vi.fn(() => null),
}));

import { POST } from "./route";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { callAIForText } from "@/lib/engines/ai-caller";

const FAKE_REQUEST = {
  id: "req-1",
  profile_ids: JSON.stringify(["p1"]),
  life_area: "career-profession",
  observation: "I have been in the same role",
  constraint_text: "for 3 years",
  objective: "Will I get a promotion?",
  options: null,
};

const FAKE_PROFILE = { id: "p1", name: "Alice", date_of_birth: "1990-01-01", time_of_birth: "08:00", timezone: "UTC" };

describe("POST /api/admin/consultation-draft", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 for non-admins", async () => {
    vi.mocked(getServerSession).mockResolvedValue({} as never);
    vi.mocked(isAdmin).mockReturnValue(false);

    const req = new NextRequest("http://localhost/api/admin/consultation-draft", {
      method: "POST",
      body: JSON.stringify({ request_id: "req-1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 when request_id is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({} as never);
    vi.mocked(isAdmin).mockReturnValue(true);

    const req = new NextRequest("http://localhost/api/admin/consultation-draft", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("request_id") });
  });

  it("returns 404 when the consultation request is not found", async () => {
    vi.mocked(getServerSession).mockResolvedValue({} as never);
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(db.consultationRequests.getById).mockResolvedValue(undefined);

    const req = new NextRequest("http://localhost/api/admin/consultation-draft", {
      method: "POST",
      body: JSON.stringify({ request_id: "missing" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns 200 with a draft on success", async () => {
    vi.mocked(getServerSession).mockResolvedValue({} as never);
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(db.consultationRequests.getById).mockResolvedValue(FAKE_REQUEST as never);
    vi.mocked(db.profiles.getManyAny).mockResolvedValue([FAKE_PROFILE] as never);
    vi.mocked(db.readings.latestByEngineMany).mockResolvedValue([]);
    vi.mocked(db.settings.getDraftLlm).mockResolvedValue({ temperature: 0.55, max_tokens: 4096, custom_instructions: "" });
    vi.mocked(callAIForText).mockResolvedValue("Here is the draft answer for Alice…");

    const req = new NextRequest("http://localhost/api/admin/consultation-draft", {
      method: "POST",
      body: JSON.stringify({ request_id: "req-1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=0");
    const data = await res.json();
    expect(data.draft).toBe("Here is the draft answer for Alice…");
  });

  it("passes model, temperature, and max_tokens to callAIForText", async () => {
    vi.mocked(getServerSession).mockResolvedValue({} as never);
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(db.consultationRequests.getById).mockResolvedValue(FAKE_REQUEST as never);
    vi.mocked(db.profiles.getManyAny).mockResolvedValue([FAKE_PROFILE] as never);
    vi.mocked(db.readings.latestByEngineMany).mockResolvedValue([]);
    vi.mocked(db.settings.getDraftLlm).mockResolvedValue({ temperature: 0.7, max_tokens: 2048, custom_instructions: "" });
    vi.mocked(callAIForText).mockResolvedValue("draft");

    const req = new NextRequest("http://localhost/api/admin/consultation-draft", {
      method: "POST",
      body: JSON.stringify({ request_id: "req-1" }),
    });
    await POST(req);

    expect(callAIForText).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({ temperature: 0.7, maxTokens: 2048 }),
    );
  });

  it("fetches profiles and readings with batch calls, not one-by-one", async () => {
    vi.mocked(getServerSession).mockResolvedValue({} as never);
    vi.mocked(isAdmin).mockReturnValue(true);
    const multiProfile = { ...FAKE_REQUEST, profile_ids: JSON.stringify(["p1", "p2"]) };
    vi.mocked(db.consultationRequests.getById).mockResolvedValue(multiProfile as never);
    vi.mocked(db.profiles.getManyAny).mockResolvedValue([FAKE_PROFILE, { ...FAKE_PROFILE, id: "p2", name: "Bob" }] as never);
    vi.mocked(db.readings.latestByEngineMany).mockResolvedValue([]);
    vi.mocked(db.settings.getDraftLlm).mockResolvedValue({ temperature: 0.55, max_tokens: 4096, custom_instructions: "" });
    vi.mocked(callAIForText).mockResolvedValue("draft");

    const req = new NextRequest("http://localhost/api/admin/consultation-draft", {
      method: "POST",
      body: JSON.stringify({ request_id: "req-1" }),
    });
    await POST(req);

    expect(db.profiles.getManyAny).toHaveBeenCalledWith(["p1", "p2"]);
    expect(db.readings.latestByEngineMany).toHaveBeenCalledWith(["p1", "p2"], "dashaflow");
  });
});
