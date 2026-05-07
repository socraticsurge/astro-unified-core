import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { geocodePlace } from "@/lib/geocode";
import { getServerSession } from "next-auth/next";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const userId = (session.user as { id: string }).id;
  const profiles = await db.profiles.list(userId);
  return NextResponse.json(profiles);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const userId = (session.user as { id: string }).id;
  const body = await req.json();
  const { name, date_of_birth, time_of_birth, place_of_birth } = body;

  if (!name || !date_of_birth || !time_of_birth || !place_of_birth) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  const geo = await geocodePlace(place_of_birth);
  const profile = await db.profiles.create(userId, {
    name,
    date_of_birth,
    time_of_birth,
    place_of_birth: geo.display_name,
    latitude: geo.latitude,
    longitude: geo.longitude,
    timezone: geo.timezone,
    timezone_offset: geo.timezone_offset,
  });

  return NextResponse.json(profile, { status: 201 });
}
