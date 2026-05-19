import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveProfile } from "@/lib/engines/reading-handler";
import { buildTodayReading } from "@/lib/engines/today-reading";

export const dynamic = "force-dynamic";

const ENGINE = "today-reading";

function extractPratyantarEnd(chartOutput: Record<string, unknown>): string | null {
  const data = (chartOutput?.data ?? chartOutput) as Record<string, unknown>;
  const dashas = data?.dashas as Record<string, { end?: string }> | undefined;
  return dashas?.pratyantar?.end ?? dashas?.antar?.end ?? null;
}

function isStale(
  cachedSnapshotJson: string,
  current: { date_of_birth: string; time_of_birth: string; latitude: number; longitude: number; timezone: string },
  currentPratyantarEnd: string | null,
): boolean {
  try {
    const snap = JSON.parse(cachedSnapshotJson) as Record<string, unknown>;
    return (
      snap.date_of_birth !== current.date_of_birth ||
      snap.time_of_birth !== current.time_of_birth ||
      snap.latitude !== current.latitude ||
      snap.longitude !== current.longitude ||
      snap.timezone !== current.timezone ||
      snap.pratyantar_end !== currentPratyantarEnd
    );
  } catch {
    return true;
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const r = await resolveProfile(req.nextUrl.searchParams.get("profile_id"), session);
  if (!r.ok) return r.response;
  const { profile_id, profile, input } = r;

  const chartReading = await db.readings.latestByEngine(profile_id, "dashaflow");
  if (!chartReading) {
    return NextResponse.json({ error: "Generate the chart first" }, { status: 400 });
  }

  let chartOutput: Record<string, unknown>;
  try {
    chartOutput = JSON.parse(chartReading.output_data as string) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Chart data is corrupted" }, { status: 500 });
  }

  const pratyantarEnd = extractPratyantarEnd(chartOutput);

  const cached = await db.readings.latestByEngine(profile_id, ENGINE);
  if (cached && !isStale(cached.input_snapshot as string, input, pratyantarEnd)) {
    try {
      return NextResponse.json({
        output: JSON.parse(cached.output_data as string),
        cached: true,
      });
    } catch {
      // Corrupted cache — fall through to regenerate
    }
  }

  const llmConfig = await db.settings.getTodayReadingLlm();

  let output;
  try {
    output = await buildTodayReading(profile, chartOutput, llmConfig);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to generate reading" },
      { status: 502 },
    );
  }

  const inputSnapshot = { ...input, pratyantar_end: pratyantarEnd };
  await db.readings.save({
    profile_id,
    engine: ENGINE,
    input_snapshot: inputSnapshot,
    output_data: output,
  });

  return NextResponse.json({ output, cached: false });
}
