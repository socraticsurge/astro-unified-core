import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchPanchangam } from "@/lib/engines/panchangam";

export async function POST(req: NextRequest) {
  const { profile_id } = await req.json();
  const profile = db.profiles.get(profile_id);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const input = {
    date_of_birth: profile.date_of_birth,
    time_of_birth: profile.time_of_birth,
    latitude: profile.latitude,
    longitude: profile.longitude,
    timezone_offset: profile.timezone_offset,
  };

  const output = await fetchPanchangam(input);
  const reading = db.readings.save({
    profile_id,
    engine: "panchangam",
    input_snapshot: input,
    output_data: output,
  });

  return NextResponse.json({ reading, output });
}
