import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchNumerology } from "@/lib/engines/numerology";

export async function GET(req: NextRequest) {
  const profile_id = req.nextUrl.searchParams.get("profile_id");
  if (!profile_id) return NextResponse.json({ error: "profile_id is required" }, { status: 400 });

  const profile = db.profiles.get(profile_id);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const cached = db.readings.latestByEngine(profile_id, "numerology");
  if (cached) {
    return NextResponse.json({ output: JSON.parse(cached.output_data), cached: true });
  }

  const input = {
    date_of_birth: profile.date_of_birth,
    name: profile.name,
  };

  const output = await fetchNumerology(input);
  db.readings.save({ profile_id, engine: "numerology", input_snapshot: input, output_data: output });

  return NextResponse.json({ output, cached: false });
}

export async function POST(req: NextRequest) {
  const { profile_id } = await req.json();
  const profile = db.profiles.get(profile_id);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const input = {
    date_of_birth: profile.date_of_birth,
    name: profile.name,
  };

  const output = await fetchNumerology(input);
  const reading = db.readings.save({
    profile_id,
    engine: "numerology",
    input_snapshot: input,
    output_data: output,
  });

  return NextResponse.json({ reading, output, cached: false });
}
