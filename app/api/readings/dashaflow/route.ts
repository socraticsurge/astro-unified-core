import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchDashaflow } from "@/lib/engines/dashaflow";
import { extractEngineError } from "@/lib/engine-error";
import { rateLimit } from "@/lib/rate-limit";
import { birthDataChanged } from "@/lib/engines/cache-validate";
import { RATE_LIMIT_DEFAULT_COUNT, RATE_LIMIT_WINDOW_MS } from "@/lib/constants";
import { resolveProfile } from "@/lib/engines/reading-handler";
import { toTimeZoneIsoDate } from "@/lib/local-date";

const ENGINE = "dashaflow";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const r = await resolveProfile(req.nextUrl.searchParams.get("profile_id"), session);
  if (!r.ok) return r.response;
  const { profile_id, input } = r;

  const cached = await db.readings.latestByEngine(profile_id, ENGINE);
  const queryDate = toTimeZoneIsoDate(new Date(), input.timezone);
  if (cached && !birthDataChanged(cached.input_snapshot as string, input)) {
    try {
      const output = JSON.parse(cached.output_data as string) as {
        data?: { metadata?: { query_date?: string } };
      };
      if (output.data?.metadata?.query_date === queryDate) {
        return NextResponse.json(
          { output, cached: true },
          { headers: { "Cache-Control": "private, no-store" } },
        );
      }
    } catch {
      // Corrupted cache row — fall through to recalculate below.
    }
  }

  const output = await fetchDashaflow(input, queryDate);
  const errMsg = extractEngineError(output);
  if (errMsg) return NextResponse.json({ error: errMsg }, { status: 502 });

  await db.readings.save({ profile_id, engine: ENGINE, input_snapshot: input, output_data: output });

  return NextResponse.json({ output, cached: false }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { profile_id } = await req.json();

  if (!rateLimit(`refresh_${profile_id}`, RATE_LIMIT_DEFAULT_COUNT, RATE_LIMIT_WINDOW_MS).success) {
    return NextResponse.json({ error: "Too many refresh requests. Please wait a minute." }, { status: 429 });
  }

  const r = await resolveProfile(profile_id, session);
  if (!r.ok) return r.response;
  const { input } = r;

  const output = await fetchDashaflow(input);
  const errMsg = extractEngineError(output);
  if (errMsg) return NextResponse.json({ error: errMsg }, { status: 502 });

  const reading = await db.readings.save({
    profile_id,
    engine: ENGINE,
    input_snapshot: input,
    output_data: output,
  });

  return NextResponse.json({ reading, output, cached: false }, { headers: { "Cache-Control": "private, no-store" } });
}
