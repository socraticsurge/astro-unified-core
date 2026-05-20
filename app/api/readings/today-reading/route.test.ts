import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { db } from "@/lib/db";
import {
  buildCurrentReading,
  buildNatalReading,
  PROMPT_VERSION_CURRENT,
  PROMPT_VERSION_NATAL,
} from "@/lib/engines/today-reading";
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

// The actual engine module imports "server-only" which is unavailable under
// vitest. We stub the build functions; PROMPT_VERSION_* values are local.
vi.mock("@/lib/engines/today-reading", () => ({
  PROMPT_VERSION_CURRENT: 1,
  PROMPT_VERSION_NATAL: 1,
  buildCurrentReading: vi.fn(),
  buildNatalReading: vi.fn(),
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

const defaultLlmConfig = {
  temperature: 0.7,
  max_tokens: 800,
  custom_instructions: "",
};

const FRESH_CURRENT_TEXT = "fresh current reading";
const FRESH_NATAL_TEXT   = "fresh natal reading";
const CACHED_CURRENT     = "cached current";
const CACHED_NATAL       = "cached natal";

const BIRTH_FIELDS = {
  date_of_birth: completeProfile.date_of_birth,
  time_of_birth: completeProfile.time_of_birth,
  latitude: completeProfile.latitude,
  longitude: completeProfile.longitude,
  timezone: completeProfile.timezone,
};

// Match the route's fingerprint formula so we can construct snapshots that
// the route considers fresh.
async function fp(version: number) {
  const { createHash } = await import("crypto");
  return createHash("sha1")
    .update(`v${version}|t0.7|m800|`)
    .digest("hex")
    .slice(0, 12);
}

function mockSession(id = "user1") {
  vi.mocked(getServerSession).mockResolvedValue({ user: { id } } as never);
  vi.mocked(db.profiles.get).mockResolvedValue(completeProfile);
}

function makeRequest(profileId = "prof1") {
  return new NextRequest(`http://localhost/api/readings/today-reading?profile_id=${profileId}`);
}

/**
 * Configure `db.readings.latestByEngine` to respond per engine name:
 *   chart  → the dashaflow chart row
 *   today-current → optional cached row
 *   today-natal   → optional cached row
 */
function mockReadings({
  chart = { output_data: JSON.stringify(chartPayload) },
  currentCache = null,
  natalCache = null,
}: {
  chart?: unknown;
  currentCache?: unknown;
  natalCache?: unknown;
}) {
  vi.mocked(db.readings.latestByEngine).mockImplementation(async (_id: string, engine: string) => {
    if (engine === "dashaflow")     return chart as never;
    if (engine === "today-current") return currentCache as never;
    if (engine === "today-natal")   return natalCache as never;
    return null as never;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.settings.getTodayReadingLlm).mockResolvedValue(defaultLlmConfig);
  vi.mocked(buildCurrentReading).mockResolvedValue(FRESH_CURRENT_TEXT);
  vi.mocked(buildNatalReading).mockResolvedValue(FRESH_NATAL_TEXT);
});

describe("GET /api/readings/today-reading", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 400 when chart row is missing", async () => {
    mockSession();
    mockReadings({ chart: null });
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
  });

  it("returns 500 when chart JSON is corrupted", async () => {
    mockSession();
    mockReadings({ chart: { output_data: "not json {{" } });
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });

  it("regenerates both tiers when caches are empty (cold-start)", async () => {
    mockSession();
    mockReadings({});
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(buildCurrentReading).toHaveBeenCalledTimes(1);
    expect(buildNatalReading).toHaveBeenCalledTimes(1);
    expect(body.output.dasha_reading).toBe(FRESH_CURRENT_TEXT);
    expect(body.output.chart_reading).toBe(FRESH_NATAL_TEXT);
    expect(body.cached_tiers).toEqual({ current: false, natal: false });
  });

  it("saves each generated tier to its own engine row", async () => {
    mockSession();
    mockReadings({});
    await GET(makeRequest());
    expect(db.readings.save).toHaveBeenCalledTimes(2);
    const engines = vi
      .mocked(db.readings.save)
      .mock.calls.map((c) => (c[0] as { engine: string }).engine)
      .sort();
    expect(engines).toEqual(["today-current", "today-natal"]);
  });

  it("serves both tiers from cache when both fingerprints match", async () => {
    mockSession();
    const fpCurrent = await fp(PROMPT_VERSION_CURRENT);
    const fpNatal   = await fp(PROMPT_VERSION_NATAL);
    mockReadings({
      currentCache: {
        input_snapshot: JSON.stringify({ ...BIRTH_FIELDS, pratyantar_end: "2026-06-01", llm_fingerprint: fpCurrent }),
        output_data:    JSON.stringify({ dasha_reading: CACHED_CURRENT }),
      },
      natalCache: {
        input_snapshot: JSON.stringify({ ...BIRTH_FIELDS, llm_fingerprint: fpNatal }),
        output_data:    JSON.stringify({ chart_reading: CACHED_NATAL }),
      },
    });

    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.cached).toBe(true);
    expect(body.cached_tiers).toEqual({ current: true, natal: true });
    expect(body.output.dasha_reading).toBe(CACHED_CURRENT);
    expect(body.output.chart_reading).toBe(CACHED_NATAL);
    expect(buildCurrentReading).not.toHaveBeenCalled();
    expect(buildNatalReading).not.toHaveBeenCalled();
  });

  it("regenerates ONLY current when pratyantar has shifted (natal stays cached)", async () => {
    mockSession();
    const fpCurrent = await fp(PROMPT_VERSION_CURRENT);
    const fpNatal   = await fp(PROMPT_VERSION_NATAL);
    mockReadings({
      currentCache: {
        // Stale pratyantar_end
        input_snapshot: JSON.stringify({ ...BIRTH_FIELDS, pratyantar_end: "2025-12-01", llm_fingerprint: fpCurrent }),
        output_data:    JSON.stringify({ dasha_reading: CACHED_CURRENT }),
      },
      natalCache: {
        input_snapshot: JSON.stringify({ ...BIRTH_FIELDS, llm_fingerprint: fpNatal }),
        output_data:    JSON.stringify({ chart_reading: CACHED_NATAL }),
      },
    });

    const res = await GET(makeRequest());
    const body = await res.json();
    expect(buildCurrentReading).toHaveBeenCalledTimes(1);
    expect(buildNatalReading).not.toHaveBeenCalled();
    expect(body.cached_tiers).toEqual({ current: false, natal: true });
    expect(body.output.dasha_reading).toBe(FRESH_CURRENT_TEXT);
    expect(body.output.chart_reading).toBe(CACHED_NATAL);
  });

  it("regenerates ONLY natal when its fingerprint mismatches (current stays cached)", async () => {
    mockSession();
    const fpCurrent = await fp(PROMPT_VERSION_CURRENT);
    mockReadings({
      currentCache: {
        input_snapshot: JSON.stringify({ ...BIRTH_FIELDS, pratyantar_end: "2026-06-01", llm_fingerprint: fpCurrent }),
        output_data:    JSON.stringify({ dasha_reading: CACHED_CURRENT }),
      },
      natalCache: {
        input_snapshot: JSON.stringify({ ...BIRTH_FIELDS, llm_fingerprint: "STALE-NATAL" }),
        output_data:    JSON.stringify({ chart_reading: CACHED_NATAL }),
      },
    });

    const res = await GET(makeRequest());
    const body = await res.json();
    expect(buildCurrentReading).not.toHaveBeenCalled();
    expect(buildNatalReading).toHaveBeenCalledTimes(1);
    expect(body.cached_tiers).toEqual({ current: true, natal: false });
    expect(body.output.dasha_reading).toBe(CACHED_CURRENT);
    expect(body.output.chart_reading).toBe(FRESH_NATAL_TEXT);
  });

  it("returns 502 when the LLM throws", async () => {
    mockSession();
    mockReadings({});
    vi.mocked(buildCurrentReading).mockRejectedValueOnce(new Error("LLM offline"));
    const res = await GET(makeRequest());
    expect(res.status).toBe(502);
  });

  it("falls through to regenerate when cached output JSON is corrupted", async () => {
    mockSession();
    const fpCurrent = await fp(PROMPT_VERSION_CURRENT);
    mockReadings({
      currentCache: {
        input_snapshot: JSON.stringify({ ...BIRTH_FIELDS, pratyantar_end: "2026-06-01", llm_fingerprint: fpCurrent }),
        output_data: "definitely not json",
      },
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(buildCurrentReading).toHaveBeenCalled();
  });
});
