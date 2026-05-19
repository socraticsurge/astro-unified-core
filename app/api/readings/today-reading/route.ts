import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveProfile } from "@/lib/engines/reading-handler";
import { buildTodayReading, PROMPT_VERSION } from "@/lib/engines/today-reading";

export const dynamic = "force-dynamic";

const ENGINE = "today-reading";

function extractPratyantarEnd(chartOutput: Record<string, unknown>): string | null {
  const data = (chartOutput?.data ?? chartOutput) as Record<string, unknown>;
  const dashas = data?.dashas as Record<string, { end?: string }> | undefined;
  return dashas?.pratyantar?.end ?? dashas?.antar?.end ?? null;
}

// Fingerprints the inputs that influence the LLM output beyond the natal chart:
// the prompt template version and the admin-tunable model settings. Bumping
// PROMPT_VERSION or editing custom_instructions in the admin settings will
// invalidate cached readings on next request.
function llmFingerprint(cfg: { temperature: number; max_tokens: number; custom_instructions: string }): string {
  const payload = `v${PROMPT_VERSION}|t${cfg.temperature}|m${cfg.max_tokens}|${cfg.custom_instructions}`;
  return createHash("sha1").update(payload).digest("hex").slice(0, 12);
}

function isStale(
  cachedSnapshotJson: string,
  current: { date_of_birth: string; time_of_birth: string; latitude: number; longitude: number; timezone: string },
  currentPratyantarEnd: string | null,
  currentLlmFingerprint: string,
): boolean {
  try {
    const snap = JSON.parse(cachedSnapshotJson) as Record<string, unknown>;
    return (
      snap.date_of_birth !== current.date_of_birth ||
      snap.time_of_birth !== current.time_of_birth ||
      snap.latitude !== current.latitude ||
      snap.longitude !== current.longitude ||
      snap.timezone !== current.timezone ||
      snap.pratyantar_end !== currentPratyantarEnd ||
      snap.llm_fingerprint !== currentLlmFingerprint
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
  const llmConfig = await db.settings.getTodayReadingLlm();
  const fingerprint = llmFingerprint(llmConfig);

  const cached = await db.readings.latestByEngine(profile_id, ENGINE);
  if (cached && !isStale(cached.input_snapshot as string, input, pratyantarEnd, fingerprint)) {
    try {
      return NextResponse.json({
        output: JSON.parse(cached.output_data as string),
        cached: true,
      });
    } catch {
      // Corrupted cache — fall through to regenerate
    }
  }

  let output;
  try {
    output = await buildTodayReading(profile, chartOutput, llmConfig);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to generate reading" },
      { status: 502 },
    );
  }

  const inputSnapshot = { ...input, pratyantar_end: pratyantarEnd, llm_fingerprint: fingerprint };
  await db.readings.save({
    profile_id,
    engine: ENGINE,
    input_snapshot: inputSnapshot,
    output_data: output,
  });

  return NextResponse.json({ output, cached: false });
}
