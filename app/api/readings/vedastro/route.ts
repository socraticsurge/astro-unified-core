import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { db } from "@/lib/db";
import { fetchVedAstro } from "@/lib/engines/vedastro";
import { extractEngineError } from "@/lib/engine-error";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id;


  const profile_id = req.nextUrl.searchParams.get("profile_id");
  if (!profile_id) return NextResponse.json({ error: "profile_id is required" }, { status: 400 });

  const profile = await db.profiles.get(profile_id, userId);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const cached = await db.readings.latestByEngine(profile_id, "vedastro");
  if (cached) {
    return NextResponse.json({ output: JSON.parse(cached.output_data as string), cached: true });
  }

  const input = {
    date_of_birth: profile.date_of_birth,
    time_of_birth: profile.time_of_birth,
    place_of_birth: profile.place_of_birth,
    timezone_offset: profile.timezone_offset,
  };

  const output = await fetchVedAstro(input);
  const errMsg = extractEngineError(output);
  if (errMsg) return NextResponse.json({ error: errMsg }, { status: 502 });

  await db.readings.save({ profile_id, engine: "vedastro", input_snapshot: input, output_data: output });

  return NextResponse.json({ output, cached: false });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id;


  const { profile_id } = await req.json();
  const profile = await db.profiles.get(profile_id, userId);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const input = {
    date_of_birth: profile.date_of_birth,
    time_of_birth: profile.time_of_birth,
    place_of_birth: profile.place_of_birth,
    timezone_offset: profile.timezone_offset,
  };

  const output = await fetchVedAstro(input);
  const errMsg = extractEngineError(output);
  if (errMsg) return NextResponse.json({ error: errMsg }, { status: 502 });

  const reading = await db.readings.save({
    profile_id,
    engine: "vedastro",
    input_snapshot: input,
    output_data: output,
  });

  return NextResponse.json({ reading, output, cached: false });
}
