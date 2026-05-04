import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchVedAstro } from "@/lib/engines/vedastro";

export async function GET(req: NextRequest) {
  const profile_id = req.nextUrl.searchParams.get("profile_id");
  if (!profile_id) return NextResponse.json({ error: "profile_id is required" }, { status: 400 });

  const profile = db.profiles.get(profile_id);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const cached = db.readings.latestByEngine(profile_id, "vedastro");
  if (cached) {
    return NextResponse.json({ output: JSON.parse(cached.output_data), cached: true });
  }

  const input = {
    date_of_birth: profile.date_of_birth,
    time_of_birth: profile.time_of_birth,
    place_of_birth: profile.place_of_birth,
    timezone_offset: profile.timezone_offset,
  };

  const output = await fetchVedAstro(input);
  db.readings.save({ profile_id, engine: "vedastro", input_snapshot: input, output_data: output });

  return NextResponse.json({ output, cached: false });
}

export async function POST(req: NextRequest) {
  const { profile_id } = await req.json();
  const profile = db.profiles.get(profile_id);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const input = {
    date_of_birth: profile.date_of_birth,
    time_of_birth: profile.time_of_birth,
    place_of_birth: profile.place_of_birth,
    timezone_offset: profile.timezone_offset,
  };

  const output = await fetchVedAstro(input);
  const reading = db.readings.save({
    profile_id,
    engine: "vedastro",
    input_snapshot: input,
    output_data: output,
  });

  return NextResponse.json({ reading, output, cached: false });
}
