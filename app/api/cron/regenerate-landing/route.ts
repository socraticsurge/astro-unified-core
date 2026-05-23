import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db";
import {
  fetchTodayCelestialFacts,
  buildDailyLandingContent,
} from "@/lib/engines/today-landing";

export const dynamic = "force-dynamic";

// GET /api/cron/regenerate-landing
//
// Triggered by Vercel Cron every 8 hours (see vercel.json `crons`). The
// landing snippets reference the Moon's current nakshatra, which shifts
// every ~13 hours — without a periodic refresh, today's row would go
// stale by mid-day.
//
// Smart skip: if the moon nakshatra in today's cached payload matches the
// CURRENT sky, we no-op. Most cron runs hit this path → no Gemini call.
// When the nakshatra has actually changed since last generation, we
// regenerate. Net cost: 1–2 LLM calls/day on average.
//
// Auth: Vercel sends `Authorization: Bearer ${CRON_SECRET}` on cron
// invocations. Reject anything else. See docs/PROJECT.md for setting
// the env var.

function istDateString(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export async function GET(req: NextRequest) {
  // Auth: only Vercel Cron (or someone with the secret) may trigger this.
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const istDate = istDateString();

  try {
    const facts = await fetchTodayCelestialFacts();

    // Smart skip: if today's row already has content for the current
    // nakshatra, no work needed.
    const existing = await db.dailyLanding.getByDate(istDate);
    if (existing?.payload) {
      try {
        const parsed = JSON.parse(existing.payload) as {
          sky?: { moon_nakshatra?: string };
        };
        if (parsed.sky?.moon_nakshatra === facts.moon_nakshatra) {
          return NextResponse.json({
            ok: true,
            action: "skipped",
            reason: "moon_nakshatra unchanged",
            ist_date: istDate,
            moon_nakshatra: facts.moon_nakshatra,
          });
        }
      } catch {
        // Corrupt payload — fall through to regenerate
      }
    }

    // Nakshatra has changed (or no row yet for today) — regenerate.
    await db.dailyLanding.recordAttempt(istDate);
    const payload = await buildDailyLandingContent(facts);
    await db.dailyLanding.storeSuccess(istDate, payload);

    return NextResponse.json({
      ok: true,
      action: "regenerated",
      ist_date: istDate,
      moon_nakshatra: facts.moon_nakshatra,
      sun_sign: facts.sun_sign,
      retrogrades: facts.retrogrades,
    });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { feature: "daily-landing", phase: "cron-regenerate", ist_date: istDate },
    });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
}
