import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { fetchTransit } from "@/lib/engines/transit";
import { extractEngineError } from "@/lib/engine-error";
import { rateLimit } from "@/lib/security";

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
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const profile_id = req.nextUrl.searchParams.get("profile_id");
  if (!profile_id) {
    return NextResponse.json({ error: "profile_id is required" }, { status: 400 });
  }

  const profile = isAdmin(session)
    ? await db.profiles.getAny(profile_id)
    : await db.profiles.get(profile_id, userId);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const today = todayStr();
  const ENGINE = transitEngine(today);

  const cached = await db.readings.latestByEngine(profile_id, ENGINE);
  if (cached) {
    return NextResponse.json({
      output: JSON.parse(cached.output_data as string),
      cached: true,
      transit_date: today,
    });
  }

  const input = {
    date_of_birth: profile.date_of_birth,
    time_of_birth: profile.time_of_birth,
    latitude: profile.latitude,
    longitude: profile.longitude,
    timezone: profile.timezone,
    transit_date: today,
  };

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
  const userId = (session.user as { id: string }).id;

  const { profile_id, transit_date } = await req.json();

  if (!rateLimit(`refresh_transit_${profile_id}`, 5, 60000)) {
    return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 });
  }

  const profile = isAdmin(session)
    ? await db.profiles.getAny(profile_id)
    : await db.profiles.get(profile_id, userId);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const date = transit_date ?? todayStr();
  const ENGINE = transitEngine(date);

  const input = {
    date_of_birth: profile.date_of_birth,
    time_of_birth: profile.time_of_birth,
    latitude: profile.latitude,
    longitude: profile.longitude,
    timezone: profile.timezone,
    transit_date: date,
  };

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
