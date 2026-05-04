import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchBazi } from "@/lib/engines/bazi";

export async function POST(req: NextRequest) {
  const { profile_id } = await req.json();
  const profile = db.profiles.get(profile_id);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const input = {
    date_of_birth: profile.date_of_birth,
    time_of_birth: profile.time_of_birth,
  };

  const output = await fetchBazi(input);
  const reading = db.readings.save({
    profile_id,
    engine: "bazi",
    input_snapshot: input,
    output_data: output,
  });

  return NextResponse.json({ reading, output });
}
