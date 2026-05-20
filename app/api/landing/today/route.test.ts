import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  db: {
    dailyLanding: {
      getByDate: vi.fn(),
      getMostRecentSuccess: vi.fn(),
      recordAttempt: vi.fn(),
      storeSuccess: vi.fn(),
    },
  },
}));

vi.mock("@/lib/engines/today-landing", () => ({
  fetchTodayCelestialFacts: vi.fn(),
  buildDailyLandingContent: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { GET } from "./route";
import { db } from "@/lib/db";
import {
  fetchTodayCelestialFacts,
  buildDailyLandingContent,
} from "@/lib/engines/today-landing";

const validPayload = {
  prompt_version: 1,
  sky: { moon_nakshatra: "Krittika", sun_sign: "Taurus", retrogrades: [] as string[] },
  ascendants: {
    aries: "x", taurus: "x", gemini: "x", cancer: "x", leo: "x", virgo: "x",
    libra: "x", scorpio: "x", sagittarius: "x", capricorn: "x", aquarius: "x", pisces: "x",
  },
};

describe("GET /api/landing/today", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns today's cached content when payload is present", async () => {
    vi.mocked(db.dailyLanding.getByDate).mockResolvedValue({
      id: "row-1", ist_date: "2026-05-20",
      payload: JSON.stringify(validPayload),
      attempts: 1, last_attempt_at: "2026-05-20T00:00:00Z",
      generated_at: "2026-05-20T00:00:01Z", created_at: "2026-05-20T00:00:00Z",
    } as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.is_stale).toBe(false);
    expect(body.ascendants.aries).toBe("x");
    expect(fetchTodayCelestialFacts).not.toHaveBeenCalled();
  });

  it("attempts generation when no row exists, returns fresh content on success", async () => {
    vi.mocked(db.dailyLanding.getByDate).mockResolvedValue(null);
    vi.mocked(fetchTodayCelestialFacts).mockResolvedValue(validPayload.sky as never);
    vi.mocked(buildDailyLandingContent).mockResolvedValue(validPayload as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.is_stale).toBe(false);
    expect(db.dailyLanding.recordAttempt).toHaveBeenCalledTimes(1);
    expect(db.dailyLanding.storeSuccess).toHaveBeenCalledTimes(1);
  });

  it("returns most recent prior day with is_stale=true when retry is blocked by 10-min gap", async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    vi.mocked(db.dailyLanding.getByDate).mockResolvedValue({
      id: "row-today", ist_date: "2026-05-20", payload: null,
      attempts: 1, last_attempt_at: fiveMinutesAgo,
      generated_at: null, created_at: fiveMinutesAgo,
    } as never);
    vi.mocked(db.dailyLanding.getMostRecentSuccess).mockResolvedValue({
      id: "row-yesterday", ist_date: "2026-05-19",
      payload: JSON.stringify(validPayload),
      attempts: 1, last_attempt_at: null,
      generated_at: "2026-05-19T00:00:00Z", created_at: "2026-05-19T00:00:00Z",
    } as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.is_stale).toBe(true);
    expect(body.ist_date).toBe("2026-05-19");
    expect(fetchTodayCelestialFacts).not.toHaveBeenCalled();
  });

  it("returns prior day with is_stale=true when generation throws", async () => {
    vi.mocked(db.dailyLanding.getByDate).mockResolvedValue(null);
    vi.mocked(fetchTodayCelestialFacts).mockRejectedValue(new Error("sidecar down"));
    vi.mocked(db.dailyLanding.getMostRecentSuccess).mockResolvedValue({
      id: "row-prior", ist_date: "2026-05-19",
      payload: JSON.stringify(validPayload),
      attempts: 1, last_attempt_at: null,
      generated_at: "2026-05-19T00:00:00Z", created_at: "2026-05-19T00:00:00Z",
    } as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.is_stale).toBe(true);
    expect(db.dailyLanding.recordAttempt).toHaveBeenCalledTimes(1);
  });

  it("returns 503 when retry exhausted and no prior day exists", async () => {
    vi.mocked(db.dailyLanding.getByDate).mockResolvedValue({
      id: "row-today", ist_date: "2026-05-20", payload: null,
      attempts: 3, last_attempt_at: new Date().toISOString(),
      generated_at: null, created_at: new Date().toISOString(),
    } as never);
    vi.mocked(db.dailyLanding.getMostRecentSuccess).mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(503);
    expect(fetchTodayCelestialFacts).not.toHaveBeenCalled();
  });
});
