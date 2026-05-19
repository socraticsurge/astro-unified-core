import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { db } from "@/lib/db";
import { buildTodayReading, PROMPT_VERSION } from "@/lib/engines/today-reading";
import { GET } from "./route";

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
  getUserId: (s: { user?: { id?: string } } | null) => s?.user?.id ?? "",
}));

vi.mock("@/lib/admin", () => ({ isAdmin: vi.fn(() => false) }));

vi.mock("@/lib/db", () => ({
  db: {
    profiles: { get: vi.fn(), getAny: vi.fn() },
    readings: { latestByEngine: vi.fn(), save: vi.fn() },
    settings: { getTodayReadingLlm: vi.fn() },
  },
}));

// We export PROMPT_VERSION from this stub so the route can import it. The
// actual module imports "server-only" which isn't available in vitest.
vi.mock("@/lib/engines/today-reading", () => ({
  PROMPT_VERSION: 1,
  buildTodayReading: vi.fn(),
}));

const completeProfile = {
  id: "prof1",
  user_id: "user1",
  name: "Vinay",
  date_of_birth: "1990-01-15",
  time_of_birth: "10:30",
  latitude: 12.97,
  longitude: 77.59,
  timezone: "Asia/Kolkata",
};

const chartPayload = {
  data: {
    dashas: {
      pratyantar: { planet: "Sun", start: "2026-01-01", end: "2026-06-01" },
    },
  },
};

const generatedReading = {
  dasha_reading: "fresh dasha",
  chart_reading: "fresh chart",
};

const cachedReading = {
  dasha_reading: "cached dasha",
  chart_reading: "cached chart",
};

const defaultLlmConfig = {
  temperature: 0.7,
  max_tokens: 800,
  custom_instructions: "",
};

function mockSession(id = "user1") {
  vi.mocked(getServerSession).mockResolvedValue({ user: { id } } as never);
  vi.mocked(db.profiles.get).mockResolvedValue(completeProfile);
}

function makeRequest(profileId = "prof1") {
  return new NextRequest(`http://localhost/api/readings/today-reading?profile_id=${profileId}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.settings.getTodayReadingLlm).mockResolvedValue(defaultLlmConfig);
  vi.mocked(buildTodayReading).mockResolvedValue(generatedReading);
});

describe("GET /api/readings/today-reading", () => {
  it("returns 401 when unauthenticated (via resolveProfile)", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 400 when chart has never been generated", async () => {
    mockSession();
    vi.mocked(db.readings.latestByEngine).mockResolvedValueOnce(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
  });

  it("returns 500 when chart row exists but JSON is corrupted", async () => {
    mockSession();
    vi.mocked(db.readings.latestByEngine).mockResolvedValueOnce({
      output_data: "not json {{{",
    } as never);
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });

  it("returns cached reading when input_snapshot matches", async () => {
    mockSession();
    // Build a snapshot whose llm_fingerprint matches what the route will compute
    // from defaultLlmConfig + PROMPT_VERSION. Using a fresh dynamic require so
    // we recompute the same hash here as the route.
    const { createHash } = await import("crypto");
    const fp = createHash("sha1")
      .update(`v${PROMPT_VERSION}|t0.7|m800|`)
      .digest("hex")
      .slice(0, 12);

    const cachedSnapshot = JSON.stringify({
      date_of_birth: completeProfile.date_of_birth,
      time_of_birth: completeProfile.time_of_birth,
      latitude: completeProfile.latitude,
      longitude: completeProfile.longitude,
      timezone: completeProfile.timezone,
      pratyantar_end: "2026-06-01",
      llm_fingerprint: fp,
    });

    vi.mocked(db.readings.latestByEngine)
      .mockResolvedValueOnce({ output_data: JSON.stringify(chartPayload) } as never) // chart
      .mockResolvedValueOnce({
        input_snapshot: cachedSnapshot,
        output_data: JSON.stringify(cachedReading),
      } as never); // today-reading cache

    const res = await GET(makeRequest());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.cached).toBe(true);
    expect(body.output).toEqual(cachedReading);
    expect(buildTodayReading).not.toHaveBeenCalled();
  });

  it("regenerates when the cached fingerprint does not match", async () => {
    mockSession();
    const cachedSnapshot = JSON.stringify({
      date_of_birth: completeProfile.date_of_birth,
      time_of_birth: completeProfile.time_of_birth,
      latitude: completeProfile.latitude,
      longitude: completeProfile.longitude,
      timezone: completeProfile.timezone,
      pratyantar_end: "2026-06-01",
      llm_fingerprint: "STALE",
    });

    vi.mocked(db.readings.latestByEngine)
      .mockResolvedValueOnce({ output_data: JSON.stringify(chartPayload) } as never)
      .mockResolvedValueOnce({
        input_snapshot: cachedSnapshot,
        output_data: JSON.stringify(cachedReading),
      } as never);

    const res = await GET(makeRequest());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.cached).toBe(false);
    expect(body.output).toEqual(generatedReading);
    expect(buildTodayReading).toHaveBeenCalledTimes(1);
  });

  it("regenerates when pratyantar period has rolled over", async () => {
    mockSession();
    const cachedSnapshot = JSON.stringify({
      date_of_birth: completeProfile.date_of_birth,
      time_of_birth: completeProfile.time_of_birth,
      latitude: completeProfile.latitude,
      longitude: completeProfile.longitude,
      timezone: completeProfile.timezone,
      pratyantar_end: "2025-12-01", // earlier than chart's 2026-06-01
      llm_fingerprint: "doesnt matter — pratyantar mismatches first",
    });

    vi.mocked(db.readings.latestByEngine)
      .mockResolvedValueOnce({ output_data: JSON.stringify(chartPayload) } as never)
      .mockResolvedValueOnce({
        input_snapshot: cachedSnapshot,
        output_data: JSON.stringify(cachedReading),
      } as never);

    const res = await GET(makeRequest());
    expect((await res.json()).cached).toBe(false);
    expect(buildTodayReading).toHaveBeenCalledTimes(1);
  });

  it("persists snapshot with pratyantar_end and llm_fingerprint on save", async () => {
    mockSession();
    vi.mocked(db.readings.latestByEngine)
      .mockResolvedValueOnce({ output_data: JSON.stringify(chartPayload) } as never)
      .mockResolvedValueOnce(null); // no cache

    await GET(makeRequest());
    expect(db.readings.save).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(db.readings.save).mock.calls[0][0] as {
      input_snapshot: { pratyantar_end: string; llm_fingerprint: string };
    };
    expect(arg.input_snapshot.pratyantar_end).toBe("2026-06-01");
    expect(arg.input_snapshot.llm_fingerprint).toMatch(/^[0-9a-f]{12}$/);
  });

  it("returns 502 when buildTodayReading throws", async () => {
    mockSession();
    vi.mocked(db.readings.latestByEngine)
      .mockResolvedValueOnce({ output_data: JSON.stringify(chartPayload) } as never)
      .mockResolvedValueOnce(null);
    vi.mocked(buildTodayReading).mockRejectedValueOnce(new Error("LLM offline"));

    const res = await GET(makeRequest());
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("LLM offline");
  });

  it("falls through to regenerate when cached output JSON is corrupted", async () => {
    mockSession();
    const { createHash } = await import("crypto");
    const fp = createHash("sha1")
      .update(`v${PROMPT_VERSION}|t0.7|m800|`)
      .digest("hex")
      .slice(0, 12);
    const validSnapshot = JSON.stringify({
      date_of_birth: completeProfile.date_of_birth,
      time_of_birth: completeProfile.time_of_birth,
      latitude: completeProfile.latitude,
      longitude: completeProfile.longitude,
      timezone: completeProfile.timezone,
      pratyantar_end: "2026-06-01",
      llm_fingerprint: fp,
    });
    vi.mocked(db.readings.latestByEngine)
      .mockResolvedValueOnce({ output_data: JSON.stringify(chartPayload) } as never)
      .mockResolvedValueOnce({
        input_snapshot: validSnapshot,
        output_data: "definitely not json",
      } as never);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect((await res.json()).cached).toBe(false);
    expect(buildTodayReading).toHaveBeenCalled();
  });
});
