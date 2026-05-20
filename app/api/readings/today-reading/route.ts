import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveProfile } from "@/lib/engines/reading-handler";
import {
  buildCurrentReading,
  buildNatalReading,
  PROMPT_VERSION_CURRENT,
  PROMPT_VERSION_NATAL,
  type LlmConfig,
} from "@/lib/engines/today-reading";

export const dynamic = "force-dynamic";

const ENGINE_CURRENT = "today-current";
const ENGINE_NATAL   = "today-natal";

function extractPratyantarEnd(chartOutput: Record<string, unknown>): string | null {
  const data = (chartOutput?.data ?? chartOutput) as Record<string, unknown>;
  const dashas = data?.dashas as Record<string, { end?: string }> | undefined;
  return dashas?.pratyantar?.end ?? dashas?.antar?.end ?? null;
}

// Fingerprints the LLM-call inputs beyond the chart itself. Each tier has its
// own version constant so a prompt rewrite on one tier doesn't invalidate the
// other's cache.
function fingerprint(version: number, cfg: LlmConfig): string {
  const payload = `v${version}|t${cfg.temperature}|m${cfg.max_tokens}|${cfg.custom_instructions}`;
  return createHash("sha1").update(payload).digest("hex").slice(0, 12);
}

type BirthInput = {
  date_of_birth: string;
  time_of_birth: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

function currentIsStale(
  snapshotJson: string,
  current: BirthInput,
  currentPratyantarEnd: string | null,
  fp: string,
): boolean {
  try {
    const snap = JSON.parse(snapshotJson) as Record<string, unknown>;
    return (
      snap.date_of_birth !== current.date_of_birth ||
      snap.time_of_birth !== current.time_of_birth ||
      snap.latitude !== current.latitude ||
      snap.longitude !== current.longitude ||
      snap.timezone !== current.timezone ||
      snap.pratyantar_end !== currentPratyantarEnd ||
      snap.llm_fingerprint !== fp
    );
  } catch {
    return true;
  }
}

function natalIsStale(snapshotJson: string, current: BirthInput, fp: string): boolean {
  try {
    const snap = JSON.parse(snapshotJson) as Record<string, unknown>;
    return (
      snap.date_of_birth !== current.date_of_birth ||
      snap.time_of_birth !== current.time_of_birth ||
      snap.latitude !== current.latitude ||
      snap.longitude !== current.longitude ||
      snap.timezone !== current.timezone ||
      snap.llm_fingerprint !== fp
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
  const fpCurrent = fingerprint(PROMPT_VERSION_CURRENT, llmConfig);
  const fpNatal   = fingerprint(PROMPT_VERSION_NATAL,   llmConfig);

  // Read both caches in parallel.
  const [cachedCurrent, cachedNatal] = await Promise.all([
    db.readings.latestByEngine(profile_id, ENGINE_CURRENT),
    db.readings.latestByEngine(profile_id, ENGINE_NATAL),
  ]);

  let dashaReading: string | null = null;
  let chartReadingOut: string | null = null;
  let currentFromCache = false;
  let natalFromCache = false;

  if (cachedCurrent && !currentIsStale(cachedCurrent.input_snapshot as string, input, pratyantarEnd, fpCurrent)) {
    try {
      dashaReading = JSON.parse(cachedCurrent.output_data as string).dasha_reading ?? null;
      currentFromCache = true;
    } catch {
      // Corrupt cache — fall through to regenerate
    }
  }

  if (cachedNatal && !natalIsStale(cachedNatal.input_snapshot as string, input, fpNatal)) {
    try {
      chartReadingOut = JSON.parse(cachedNatal.output_data as string).chart_reading ?? null;
      natalFromCache = true;
    } catch {
      // Corrupt cache — fall through to regenerate
    }
  }

  // Generate the stale tiers in parallel. Either or both may run.
  const llmPromises: Promise<unknown>[] = [];
  if (dashaReading === null) {
    llmPromises.push(
      buildCurrentReading(profile, chartOutput, llmConfig)
        .then(async (text) => {
          dashaReading = text;
          await db.readings.save({
            profile_id,
            engine: ENGINE_CURRENT,
            input_snapshot: { ...input, pratyantar_end: pratyantarEnd, llm_fingerprint: fpCurrent },
            output_data: { dasha_reading: text },
          });
        }),
    );
  }
  if (chartReadingOut === null) {
    llmPromises.push(
      buildNatalReading(profile, chartOutput, llmConfig)
        .then(async (text) => {
          chartReadingOut = text;
          await db.readings.save({
            profile_id,
            engine: ENGINE_NATAL,
            input_snapshot: { ...input, llm_fingerprint: fpNatal },
            output_data: { chart_reading: text },
          });
        }),
    );
  }

  if (llmPromises.length > 0) {
    try {
      await Promise.all(llmPromises);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Failed to generate reading" },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({
    output: {
      dasha_reading: dashaReading ?? "",
      chart_reading: chartReadingOut ?? "",
    },
    cached: currentFromCache && natalFromCache,
    cached_tiers: {
      current: currentFromCache,
      natal: natalFromCache,
    },
  });
}
