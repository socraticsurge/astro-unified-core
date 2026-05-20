import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db";
import {
  fetchTodayCelestialFacts,
  buildDailyLandingContent,
  type LandingPayload,
} from "@/lib/engines/today-landing";

export const dynamic = "force-dynamic";

const MAX_ATTEMPTS_PER_DAY = 3;
const MIN_GAP_MS = 10 * 60 * 1000;

function istDateString(): string {
  // en-CA gives YYYY-MM-DD format
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function parsePayload(json: string): LandingPayload | null {
  try {
    return JSON.parse(json) as LandingPayload;
  } catch {
    return null;
  }
}

type ResponseShape = {
  ist_date: string;
  sky: LandingPayload["sky"];
  ascendants: LandingPayload["ascendants"];
  is_stale: boolean;
};

export async function GET() {
  const istDate = istDateString();

  // 1. Try today's row. Wrap in try/catch so a DB hiccup (table missing,
  // connection blip, etc.) doesn't 500 the whole handler — we'd rather try
  // to regenerate from scratch.
  let today: Awaited<ReturnType<typeof db.dailyLanding.getByDate>> = null;
  try {
    today = await db.dailyLanding.getByDate(istDate);
  } catch (err) {
    Sentry.captureException(err, {
      tags: { feature: "daily-landing", phase: "getByDate", ist_date: istDate },
    });
  }
  if (today?.payload) {
    const parsed = parsePayload(today.payload);
    if (parsed) {
      return respond({ ist_date: today.ist_date, sky: parsed.sky, ascendants: parsed.ascendants, is_stale: false }, 200, false);
    }
    // Corrupt row — fall through to attempt generation again
  }

  // 2. Compute retry eligibility
  const attempts = today?.attempts ?? 0;
  const lastAttemptMs = today?.last_attempt_at ? new Date(today.last_attempt_at).getTime() : 0;
  const gapMet = !today?.last_attempt_at || (Date.now() - lastAttemptMs) >= MIN_GAP_MS;
  const canRetry = attempts < MAX_ATTEMPTS_PER_DAY && gapMet;

  if (canRetry) {
    try {
      await db.dailyLanding.recordAttempt(istDate);
      const facts = await fetchTodayCelestialFacts();
      const payload = await buildDailyLandingContent(facts);
      await db.dailyLanding.storeSuccess(istDate, payload);
      return respond({ ist_date: istDate, sky: payload.sky, ascendants: payload.ascendants, is_stale: false }, 200, false);
    } catch (err) {
      Sentry.captureException(err, {
        tags: { feature: "daily-landing", phase: "generate", ist_date: istDate },
      });
      // fall through to stale fallback
    }
  }

  // 3. Fall back to most recent successful prior day
  let prior: Awaited<ReturnType<typeof db.dailyLanding.getMostRecentSuccess>> = null;
  try {
    prior = await db.dailyLanding.getMostRecentSuccess();
  } catch (err) {
    Sentry.captureException(err, {
      tags: { feature: "daily-landing", phase: "getMostRecentSuccess", ist_date: istDate },
    });
  }
  if (prior?.payload) {
    const parsed = parsePayload(prior.payload);
    if (parsed) {
      return respond({ ist_date: prior.ist_date, sky: parsed.sky, ascendants: parsed.ascendants, is_stale: true }, 200, true);
    }
  }

  // 4. Cold start — no prior content ever generated.
  return NextResponse.json(
    { error: "no_content_available" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

function respond(body: ResponseShape, status: number, isStale: boolean): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      // Stale content re-checks every 5 minutes (today's gen may have succeeded
      // for the next visitor). Fresh content can sit in the CDN for an hour.
      "Cache-Control": isStale ? "public, max-age=300" : "public, max-age=3600",
    },
  });
}
