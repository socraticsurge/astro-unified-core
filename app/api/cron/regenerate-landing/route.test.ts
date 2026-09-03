import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const { afterCallbacks } = vi.hoisted(() => ({
  afterCallbacks: [] as Array<() => void | Promise<void>>,
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: vi.fn((callback: () => void | Promise<void>) => {
      afterCallbacks.push(callback);
    }),
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    dailyLanding: {
      getByDate: vi.fn(),
      recordAttempt: vi.fn(),
      storeSuccess: vi.fn(),
    },
  },
}));

vi.mock("@/lib/engines/today-landing", () => ({
  fetchTodayCelestialFacts: vi.fn(),
  buildDailyLandingContent: vi.fn(),
}));

vi.mock("@/lib/db/rate-limit-maintenance", () => ({
  cleanupExpiredDistributedRateLimits: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

import { GET } from "./route";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  fetchTodayCelestialFacts,
  buildDailyLandingContent,
} from "@/lib/engines/today-landing";
import { cleanupExpiredDistributedRateLimits } from "@/lib/db/rate-limit-maintenance";
import * as Sentry from "@sentry/nextjs";

const SECRET = "test-cron-secret";
const facts = { moon_nakshatra: "Krittika", sun_sign: "Taurus", retrogrades: [] as string[] };
const payload = {
  prompt_version: 3,
  sky: facts,
  ascendants: {} as Record<string, string>,
};

function makeReq(authHeader?: string) {
  return new NextRequest("http://localhost/api/cron/regenerate-landing", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

async function runAfterCallbacks(): Promise<void> {
  for (const callback of afterCallbacks) await callback();
}

describe("GET /api/cron/regenerate-landing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    afterCallbacks.length = 0;
    process.env.CRON_SECRET = SECRET;
    vi.mocked(cleanupExpiredDistributedRateLimits).mockResolvedValue({
      deletedRows: 0,
      batches: 1,
      backlogRemaining: false,
    });
  });

  it("returns 500 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeReq(`Bearer ${SECRET}`));
    expect(res.status).toBe(500);
  });

  it("returns 401 when authorization header is missing", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(fetchTodayCelestialFacts).not.toHaveBeenCalled();
    expect(cleanupExpiredDistributedRateLimits).not.toHaveBeenCalled();
  });

  it("returns 401 when authorization header is wrong", async () => {
    const res = await GET(makeReq("Bearer wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("skips regeneration when moon nakshatra unchanged", async () => {
    vi.mocked(fetchTodayCelestialFacts).mockResolvedValue(facts);
    vi.mocked(db.dailyLanding.getByDate).mockResolvedValue({
      id: "r1",
      ist_date: "2026-05-21",
      payload: JSON.stringify(payload),
      attempts: 1,
      last_attempt_at: null,
      generated_at: null,
      created_at: "",
    } as never);

    const res = await GET(makeReq(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.action).toBe("skipped");
    expect(buildDailyLandingContent).not.toHaveBeenCalled();
    expect(db.dailyLanding.storeSuccess).not.toHaveBeenCalled();
    expect(cleanupExpiredDistributedRateLimits).not.toHaveBeenCalled();
    await runAfterCallbacks();
    expect(cleanupExpiredDistributedRateLimits).toHaveBeenCalledTimes(1);
  });

  it("regenerates when moon nakshatra has changed since last gen", async () => {
    vi.mocked(fetchTodayCelestialFacts).mockResolvedValue({
      ...facts,
      moon_nakshatra: "Rohini", // CHANGED
    });
    vi.mocked(db.dailyLanding.getByDate).mockResolvedValue({
      id: "r1",
      ist_date: "2026-05-21",
      payload: JSON.stringify(payload), // payload still has "Krittika"
      attempts: 1,
      last_attempt_at: null,
      generated_at: null,
      created_at: "",
    } as never);
    vi.mocked(buildDailyLandingContent).mockResolvedValue({
      ...payload,
      sky: { ...payload.sky, moon_nakshatra: "Rohini" },
    } as never);

    const res = await GET(makeReq(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.action).toBe("regenerated");
    expect(buildDailyLandingContent).toHaveBeenCalledTimes(1);
    expect(db.dailyLanding.storeSuccess).toHaveBeenCalledTimes(1);
  });

  it("regenerates when no row exists yet for today", async () => {
    vi.mocked(fetchTodayCelestialFacts).mockResolvedValue(facts);
    vi.mocked(db.dailyLanding.getByDate).mockResolvedValue(null);
    vi.mocked(buildDailyLandingContent).mockResolvedValue(payload as never);

    const res = await GET(makeReq(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.action).toBe("regenerated");
  });

  it("returns 500 + captures to Sentry when sidecar fails", async () => {
    vi.mocked(fetchTodayCelestialFacts).mockRejectedValue(new Error("sidecar down"));
    const res = await GET(makeReq(`Bearer ${SECRET}`));
    expect(res.status).toBe(500);
  });

  it("continues daily content when bounded limiter cleanup fails", async () => {
    vi.mocked(cleanupExpiredDistributedRateLimits).mockRejectedValue(
      new Error("cleanup unavailable"),
    );
    vi.mocked(fetchTodayCelestialFacts).mockResolvedValue(facts);
    vi.mocked(db.dailyLanding.getByDate).mockResolvedValue(null);
    vi.mocked(buildDailyLandingContent).mockResolvedValue(payload as never);

    const res = await GET(makeReq(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    await runAfterCallbacks();
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: "cleanup unavailable" }),
      expect.objectContaining({
        tags: expect.objectContaining({ feature: "rate-limit-maintenance" }),
      }),
    );
  });

  it("reports a limiter cleanup backlog without exposing keys", async () => {
    vi.mocked(cleanupExpiredDistributedRateLimits).mockResolvedValue({
      deletedRows: 100_000,
      batches: 20,
      backlogRemaining: true,
    });
    vi.mocked(fetchTodayCelestialFacts).mockResolvedValue(facts);
    vi.mocked(db.dailyLanding.getByDate).mockResolvedValue(null);
    vi.mocked(buildDailyLandingContent).mockResolvedValue(payload as never);

    const res = await GET(makeReq(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    await runAfterCallbacks();
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "Expired rate-limit cleanup backlog remains",
      expect.objectContaining({
        level: "warning",
        extra: { deletedRows: 100_000, batches: 20 },
      }),
    );
  });

  it("returns landing content without waiting for a never-settling cleanup", async () => {
    vi.mocked(cleanupExpiredDistributedRateLimits).mockReturnValue(
      new Promise(() => undefined),
    );
    vi.mocked(fetchTodayCelestialFacts).mockResolvedValue(facts);
    vi.mocked(db.dailyLanding.getByDate).mockResolvedValue(null);
    vi.mocked(buildDailyLandingContent).mockResolvedValue(payload as never);

    const res = await GET(makeReq(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(afterCallbacks).toHaveLength(1);
    expect(cleanupExpiredDistributedRateLimits).not.toHaveBeenCalled();
    expect(buildDailyLandingContent).toHaveBeenCalledTimes(1);
    expect(db.dailyLanding.storeSuccess).toHaveBeenCalledTimes(1);
  });
});
