import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { buildInsightForTab, TAB_ENGINE, INSIGHT_TABS } from "@/lib/ai-insight";
import type { InsightTab } from "@/lib/ai-insight";
import { resolveModel, DEFAULT_INSIGHT_MODEL, type AiModelKey } from "@/lib/engines/models";

export const dynamic = "force-dynamic";

// GET /api/readings/ai-insight?profile_id=X&tab=Y
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const profile_id = searchParams.get("profile_id");
  const tab = searchParams.get("tab") as InsightTab | null;

  if (!profile_id || !tab || !INSIGHT_TABS.includes(tab)) {
    return NextResponse.json({ error: "profile_id and valid tab required" }, { status: 400 });
  }

  const reading = await db.readings.latestByEngine(profile_id, TAB_ENGINE[tab]);
  if (!reading) return NextResponse.json({ insight: null, reading_id: null });

  return NextResponse.json({
    insight: JSON.parse(reading.output_data),
    reading_id: reading.id,
    rating: reading.rating ?? null,
  }, { headers: { "Cache-Control": "private, max-age=0" } });
}

// POST /api/readings/ai-insight
// Body: { profile_id, tab, model?, force? }
// force=true bypasses the cache and always regenerates.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { profile_id, tab, model, force } = body as {
    profile_id?: string;
    tab?: InsightTab;
    model?: AiModelKey;
    force?: boolean;
  };

  if (!profile_id || !tab || !INSIGHT_TABS.includes(tab)) {
    return NextResponse.json({ error: "profile_id and valid tab required" }, { status: 400 });
  }

  const chosenModel: AiModelKey = resolveModel(model, DEFAULT_INSIGHT_MODEL);
  const engine = TAB_ENGINE[tab];

  // Return cached unless force=true
  if (!force) {
    const existing = await db.readings.latestByEngine(profile_id, engine);
    if (existing) {
      return NextResponse.json({
        insight: JSON.parse(existing.output_data),
        reading_id: existing.id,
        rating: existing.rating ?? null,
        cached: true,
      }, { headers: { "Cache-Control": "private, max-age=0" } });
    }
  }

  const profile = await db.profiles.getAny(profile_id);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  try {
    const insight = await buildInsightForTab(profile, tab, chosenModel);

    const reading = await db.readings.save({
      profile_id,
      engine,
      input_snapshot: { model: insight.model, prompt_version: insight.prompt_version, tab, profile_id },
      output_data: insight,
    });

    return NextResponse.json({ insight, reading_id: reading.id, rating: null, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate insight";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
