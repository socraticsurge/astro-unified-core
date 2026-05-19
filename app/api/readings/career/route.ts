import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchCareer } from "@/lib/engines/career";
import { extractEngineError } from "@/lib/engine-error";
import { rateLimit } from "@/lib/rate-limit";
import { birthDataChanged } from "@/lib/engines/cache-validate";
import { RATE_LIMIT_DEFAULT_COUNT, RATE_LIMIT_WINDOW_MS } from "@/lib/constants";
import { resolveProfile } from "@/lib/engines/reading-handler";

const ENGINE = "career";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const r = await resolveProfile(req.nextUrl.searchParams.get("profile_id"), session);
  if (!r.ok) return r.response;
  const { profile_id, input } = r;

  const cached = await db.readings.latestByEngine(profile_id, ENGINE);
  if (cached && !birthDataChanged(cached.input_snapshot as string, input)) {
    try {
      return NextResponse.json({ output: JSON.parse(cached.output_data as string), cached: true });
    } catch {
      // Corrupted cache row — fall through to recalculate below.
    }
  }

  const output = await fetchCareer(input);
  const errMsg = extractEngineError(output);
  if (errMsg) return NextResponse.json({ error: errMsg }, { status: 502 });

  await db.readings.save({ profile_id, engine: ENGINE, input_snapshot: input, output_data: output });

  return NextResponse.json({ output, cached: false });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { profile_id } = await req.json();

  if (!rateLimit(`refresh_career_${profile_id}`, RATE_LIMIT_DEFAULT_COUNT, RATE_LIMIT_WINDOW_MS).success) {
    return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 });
  }

  const r = await resolveProfile(profile_id, session);
  if (!r.ok) return r.response;
  const { input } = r;

  const output = await fetchCareer(input);
  const errMsg = extractEngineError(output);
  if (errMsg) return NextResponse.json({ error: errMsg }, { status: 502 });

  const reading = await db.readings.save({
    profile_id,
    engine: ENGINE,
    input_snapshot: input,
    output_data: output,
  });

  return NextResponse.json({ reading, output, cached: false });
}
