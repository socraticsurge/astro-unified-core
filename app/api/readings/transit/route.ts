import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchTransit } from "@/lib/engines/transit";
import { extractEngineError } from "@/lib/engine-error";
import { rateLimit } from "@/lib/rate-limit";
import { RATE_LIMIT_DEFAULT_COUNT, RATE_LIMIT_WINDOW_MS } from "@/lib/constants";
import { resolveProfile } from "@/lib/engines/reading-handler";

// Transit cache is keyed by date so it auto-invalidates daily.
// Format: "transit:YYYY-MM-DD"
function transitEngine(date: string) {
  return `transit:${date}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const r = await resolveProfile(req.nextUrl.searchParams.get("profile_id"), session);
  if (!r.ok) return r.response;
  const { profile_id, input: birthInput } = r;

  const today = todayStr();
  const ENGINE = transitEngine(today);

  const cached = await db.readings.latestByEngine(profile_id, ENGINE);
  if (cached) {
    try {
      return NextResponse.json({
        output: JSON.parse(cached.output_data as string),
        cached: true,
        transit_date: today,
      });
    } catch {
      // Corrupted cache row — fall through to recalculate below.
    }
  }

  const input = { ...birthInput, transit_date: today };

  const output = await fetchTransit(input);
  const errMsg = extractEngineError(output);
  if (errMsg) return NextResponse.json({ error: errMsg }, { status: 502 });

  await db.readings.save({
    profile_id,
    engine: ENGINE,
    input_snapshot: input,
    output_data: output,
  });

  return NextResponse.json({ output, cached: false, transit_date: today });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { profile_id, transit_date } = await req.json();

  if (transit_date && !/^\d{4}-\d{2}-\d{2}$/.test(transit_date)) {
    return NextResponse.json({ error: "transit_date must be in YYYY-MM-DD format" }, { status: 400 });
  }

  if (!rateLimit(`refresh_transit_${profile_id}`, RATE_LIMIT_DEFAULT_COUNT, RATE_LIMIT_WINDOW_MS).success) {
    return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 });
  }

  const r = await resolveProfile(profile_id, session);
  if (!r.ok) return r.response;
  const { input: birthInput } = r;

  const date = transit_date ?? todayStr();
  const ENGINE = transitEngine(date);
  const input = { ...birthInput, transit_date: date };

  const output = await fetchTransit(input);
  const errMsg = extractEngineError(output);
  if (errMsg) return NextResponse.json({ error: errMsg }, { status: 502 });

  const reading = await db.readings.save({
    profile_id,
    engine: ENGINE,
    input_snapshot: input,
    output_data: output,
  });

  return NextResponse.json({ reading, output, cached: false, transit_date: date });
}
