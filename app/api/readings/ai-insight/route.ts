import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { buildInsightForTab, TAB_ENGINE, INSIGHT_TABS } from "@/lib/ai-insight";
import type { InsightTab } from "@/lib/ai-insight";

// GET /api/readings/ai-insight?profile_id=X&tab=Y
// Returns cached insight if it exists, or null.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const profile_id = searchParams.get("profile_id");
  const tab = searchParams.get("tab") as InsightTab | null;

  if (!profile_id || !tab || !INSIGHT_TABS.includes(tab)) {
    return NextResponse.json({ error: "profile_id and valid tab required" }, { status: 400 });
  }

  const engine = TAB_ENGINE[tab];
  const reading = await db.readings.latestByEngine(profile_id, engine);
  if (!reading) return NextResponse.json({ insight: null, reading_id: null });

  return NextResponse.json({
    insight: JSON.parse(reading.output_data),
    reading_id: reading.id,
    rating: reading.rating ?? null,
  }, {
    headers: { "Cache-Control": "private, max-age=0" },
  });
}

// POST /api/readings/ai-insight
// Generates a new insight for the given tab and caches it.
// For the transit tab, overwrites any existing cached insight.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { profile_id, tab } = body as { profile_id?: string; tab?: InsightTab };

  if (!profile_id || !tab || !INSIGHT_TABS.includes(tab)) {
    return NextResponse.json({ error: "profile_id and valid tab required" }, { status: 400 });
  }

  const engine = TAB_ENGINE[tab];

  // For non-transit tabs, return existing cached insight if present
  if (tab !== "transit") {
    const existing = await db.readings.latestByEngine(profile_id, engine);
    if (existing) {
      return NextResponse.json({
        insight: JSON.parse(existing.output_data),
        reading_id: existing.id,
        rating: existing.rating ?? null,
        cached: true,
      });
    }
  }

  // Verify profile exists and caller can access it
  const profile = await db.profiles.getAny(profile_id);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  try {
    const insight = await buildInsightForTab(profile, tab);

    const reading = await db.readings.save({
      profile_id,
      engine,
      input_snapshot: { model: insight.model, prompt_version: insight.prompt_version, tab, profile_id },
      output_data: insight,
    });

    return NextResponse.json({
      insight,
      reading_id: reading.id,
      rating: null,
      cached: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate insight";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
