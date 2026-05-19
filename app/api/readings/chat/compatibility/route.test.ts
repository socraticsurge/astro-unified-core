import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {}, getUserId: (s: { user?: { id?: string } } | null) => s?.user?.id ?? "" }));
vi.mock("@/lib/admin", () => ({ isAdmin: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    compatibility: { getAny: vi.fn() },
    profiles: { getAny: vi.fn() },
    readings: { latestByEngine: vi.fn() },
    settings: { getChatLlm: vi.fn() },
  },
}));

vi.mock("@/lib/engines/ai-caller", () => ({ callAIForText: vi.fn() }));
vi.mock("@/lib/engines/models", () => ({
  DEFAULT_CHAT_MODEL: "groq-scout",
  resolveModel: vi.fn((key: unknown, fallback: string) =>
    key === "gemini-flash" || key === "groq-scout" ? key : fallback
  ),
}));
vi.mock("@/lib/chart-summary", () => ({ summarizeDashaflow: vi.fn(() => "chart summary") }));
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

const FAKE_CHECK = {
  id: "c1",
  profile_id_1: "p1",
  profile_id_2: "p2",
  score: 28,
  result_json: JSON.stringify({ total_score: 28, is_match_approved: true, scores: { Varna: 1 } }),
};
const FAKE_PROFILE_1 = { id: "p1", name: "Alice", date_of_birth: "1990-01-01", time_of_birth: "06:00", timezone: "Asia/Kolkata" };
const FAKE_PROFILE_2 = { id: "p2", name: "Bob", date_of_birth: "1988-05-15", time_of_birth: "12:00", timezone: "Asia/Kolkata" };
const FAKE_CHAT_CONFIG = { temperature: 0.65, max_tokens: 8192, top_p: 0.9, custom_instructions: "" };
const MESSAGES = [{ role: "user" as const, content: "Are they compatible?" }];

function makeRequest(body: object) {
  return new NextRequest("http://localhost/api/readings/chat/compatibility", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/readings/chat/compatibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.settings.getChatLlm).mockResolvedValue(FAKE_CHAT_CONFIG as never);
    vi.mocked(db.readings.latestByEngine).mockResolvedValue(undefined);
  });

  it("returns 403 for non-admins", async () => {
    vi.mocked(getServerSession).mockResolvedValue({} as never);
    vi.mocked(isAdmin).mockReturnValue(false);

    const res = await POST(makeRequest({ check_id: "c1", messages: MESSAGES }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when check_id is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({} as never);
    vi.mocked(isAdmin).mockReturnValue(true);

    const res = await POST(makeRequest({ messages: MESSAGES }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("check_id") });
  });

  it("returns 400 when messages array is empty", async () => {
    vi.mocked(getServerSession).mockResolvedValue({} as never);
    vi.mocked(isAdmin).mockReturnValue(true);

    const res = await POST(makeRequest({ check_id: "c1", messages: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when compatibility check is not found", async () => {
    vi.mocked(getServerSession).mockResolvedValue({} as never);
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(db.compatibility.getAny).mockResolvedValue(undefined);

    const res = await POST(makeRequest({ check_id: "missing", messages: MESSAGES }));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("Compatibility check") });
  });

  it("returns 404 when a profile is not found", async () => {
    vi.mocked(getServerSession).mockResolvedValue({} as never);
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(db.compatibility.getAny).mockResolvedValue(FAKE_CHECK as never);
    vi.mocked(db.profiles.getAny).mockResolvedValueOnce(FAKE_PROFILE_1 as never).mockResolvedValueOnce(undefined);

    const res = await POST(makeRequest({ check_id: "c1", messages: MESSAGES }));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("profiles not found") });
  });

  it("returns the AI response on success", async () => {
    vi.mocked(getServerSession).mockResolvedValue({} as never);
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(db.compatibility.getAny).mockResolvedValue(FAKE_CHECK as never);
    vi.mocked(db.profiles.getAny)
      .mockResolvedValueOnce(FAKE_PROFILE_1 as never)
      .mockResolvedValueOnce(FAKE_PROFILE_2 as never);
    vi.mocked(callAIForText).mockResolvedValue("They are highly compatible.");

    const res = await POST(makeRequest({ check_id: "c1", messages: MESSAGES }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=0");
    expect(await res.json()).toEqual({ response: "They are highly compatible." });
  });

  it("returns JSON 500 — not HTML — when the AI provider throws (e.g. Gemini unavailable)", async () => {
    vi.mocked(getServerSession).mockResolvedValue({} as never);
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(db.compatibility.getAny).mockResolvedValue(FAKE_CHECK as never);
    vi.mocked(db.profiles.getAny)
      .mockResolvedValueOnce(FAKE_PROFILE_1 as never)
      .mockResolvedValueOnce(FAKE_PROFILE_2 as never);
    vi.mocked(callAIForText).mockRejectedValue(new Error("Gemini Flash is unavailable due to high demand"));

    const res = await POST(makeRequest({ check_id: "c1", messages: MESSAGES }));
    expect(res.status).toBe(500);
    // Must be JSON — not an HTML crash page
    const body = await res.json();
    expect(body).toMatchObject({ error: expect.stringContaining("Gemini Flash is unavailable") });
  });

  it("returns JSON 500 when chart data fetch throws", async () => {
    vi.mocked(getServerSession).mockResolvedValue({} as never);
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(db.compatibility.getAny).mockResolvedValue(FAKE_CHECK as never);
    vi.mocked(db.profiles.getAny)
      .mockResolvedValueOnce(FAKE_PROFILE_1 as never)
      .mockResolvedValueOnce(FAKE_PROFILE_2 as never);
    vi.mocked(db.readings.latestByEngine).mockRejectedValue(new Error("DB connection timeout"));

    const res = await POST(makeRequest({ check_id: "c1", messages: MESSAGES }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toMatchObject({ error: expect.stringContaining("DB connection timeout") });
  });
});
