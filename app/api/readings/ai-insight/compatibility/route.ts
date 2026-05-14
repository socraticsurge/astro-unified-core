import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { buildCompatibilityInsight, COMPAT_ENGINE } from "@/lib/ai-insight-compat";
import { resolveModel, DEFAULT_INSIGHT_MODEL, type AiModelKey } from "@/lib/engines/models";

export const dynamic = "force-dynamic";

// GET /api/readings/ai-insight/compatibility?check_id=X
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const check_id = new URL(req.url).searchParams.get("check_id");
  if (!check_id) return NextResponse.json({ error: "check_id required" }, { status: 400 });

  // check.id is stored as profile_id in readings for compatibility insights
  const reading = await db.readings.latestByEngine(check_id, COMPAT_ENGINE);
  if (!reading) return NextResponse.json({ insight: null, reading_id: null });

  return NextResponse.json({
    insight: JSON.parse(reading.output_data),
    reading_id: reading.id,
    rating: reading.rating ?? null,
  }, { headers: { "Cache-Control": "private, max-age=0" } });
}

// POST /api/readings/ai-insight/compatibility
// Body: { check_id, model?, force? }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { check_id, model, force } = body as {
    check_id?: string;
    model?: AiModelKey;
    force?: boolean;
  };

  if (!check_id) return NextResponse.json({ error: "check_id required" }, { status: 400 });

  const chosenModel: AiModelKey = resolveModel(model, DEFAULT_INSIGHT_MODEL);

  if (!force) {
    const existing = await db.readings.latestByEngine(check_id, COMPAT_ENGINE);
    if (existing) {
      return NextResponse.json({
        insight: JSON.parse(existing.output_data),
        reading_id: existing.id,
        rating: existing.rating ?? null,
        cached: true,
      }, { headers: { "Cache-Control": "private, max-age=0" } });
    }
  }

  const check = await db.compatibility.getAny(check_id);
  if (!check) return NextResponse.json({ error: "Compatibility check not found" }, { status: 404 });

  const [profile1, profile2] = await Promise.all([
    db.profiles.getAny(check.profile_id_1),
    db.profiles.getAny(check.profile_id_2),
  ]);
  if (!profile1 || !profile2) {
    return NextResponse.json({ error: "One or both profiles not found" }, { status: 404 });
  }

  let compatResult: Record<string, unknown> = {};
  try { compatResult = JSON.parse(check.result_json) as Record<string, unknown>; } catch { /* use empty */ }

  try {
    const insight = await buildCompatibilityInsight(profile1, profile2, compatResult, chosenModel);

    const reading = await db.readings.save({
      profile_id: check_id,
      engine: COMPAT_ENGINE,
      input_snapshot: { model: insight.model, check_id },
      output_data: insight,
    });

    return NextResponse.json({ insight, reading_id: reading.id, rating: null, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate insight";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
