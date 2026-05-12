import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { geocodePlace } from "@/lib/geocode";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as { id: string }).id;
    const { id } = await params;

    const existingProfile = await db.profiles.get(id, userId);
    if (!existingProfile) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const { name, date_of_birth, time_of_birth, place_of_birth, current_location, gender, relationship } = body ?? {};

    if (!name || !date_of_birth || !time_of_birth || !place_of_birth) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    if (name.length > 100 || place_of_birth.length > 100 || (current_location && current_location.length > 100)) {
      return NextResponse.json({ error: "Name, birth place, and current location must be under 100 characters." }, { status: 400 });
    }

    let latitude = existingProfile.latitude;
    let longitude = existingProfile.longitude;
    let timezone = existingProfile.timezone;
    let timezone_offset = existingProfile.timezone_offset;
    let finalPlaceOfBirth = existingProfile.place_of_birth;

    // Only re-geocode if the birth place changed
    if (place_of_birth !== existingProfile.place_of_birth) {
      try {
        const geo = await geocodePlace(place_of_birth);
        latitude = geo.latitude;
        longitude = geo.longitude;
        timezone = geo.timezone;
        timezone_offset = geo.timezone_offset;
        finalPlaceOfBirth = geo.display_name;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Geocoding birth place failed";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    let current_latitude = existingProfile.current_latitude;
    let current_longitude = existingProfile.current_longitude;
    let current_timezone = existingProfile.current_timezone;
    let current_timezone_offset = existingProfile.current_timezone_offset;
    let finalCurrentLocation = existingProfile.current_location;

    // Only re-geocode current location if it changed
    if (current_location !== existingProfile.current_location && current_location) {
      try {
        const currentGeo = await geocodePlace(current_location);
        current_latitude = currentGeo.latitude;
        current_longitude = currentGeo.longitude;
        current_timezone = currentGeo.timezone;
        current_timezone_offset = currentGeo.timezone_offset;
        finalCurrentLocation = currentGeo.display_name;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Geocoding current location failed";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    } else if (!current_location) {
      finalCurrentLocation = null;
      current_latitude = null;
      current_longitude = null;
      current_timezone = null;
      current_timezone_offset = null;
    }

    // Check if astrological data changed
    const chartDataChanged = 
      date_of_birth !== existingProfile.date_of_birth ||
      time_of_birth !== existingProfile.time_of_birth ||
      place_of_birth !== existingProfile.place_of_birth;

    if (chartDataChanged) {
      await db.readings.deleteByProfile(id);
    }

    await db.profiles.update(id, userId, {
      name,
      date_of_birth,
      time_of_birth,
      place_of_birth: finalPlaceOfBirth,
      latitude,
      longitude,
      timezone,
      timezone_offset,
      current_location: finalCurrentLocation,
      current_latitude,
      current_longitude,
      current_timezone,
      current_timezone_offset,
      gender,
      relationship,
    });

    const updatedProfile = await db.profiles.get(id, userId);
    return NextResponse.json(updatedProfile);
  } catch (e) {
    console.error("PUT /api/profiles/[id] failed:", e);
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const { id } = await params;
  const profile = isAdmin(session)
    ? await db.profiles.getAny(id)
    : await db.profiles.get(id, userId);
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(profile);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const { id } = await params;
  const profile = await db.profiles.get(id, userId);
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.profiles.delete(id, userId);
  return new NextResponse(null, { status: 204 });
}
