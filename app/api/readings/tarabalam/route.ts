import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { computeTara, extrapolateMoonNakshatra, type Tara } from "@/lib/tarabalam";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const admin = isAdmin(session);

  const { profile_ids, start_date, end_date, transit_moon_longitude } = await req.json() as {
    profile_ids: string[];
    start_date: string;
    end_date: string;
    transit_moon_longitude?: number | null;
  };

  if (!Array.isArray(profile_ids) || profile_ids.length === 0) {
    return NextResponse.json({ error: "profile_ids required" }, { status: 400 });
  }

  // Resolve birth Moon nakshatra for each requested profile
  const profileData: Array<{ id: string; name: string; birth_moon_nakshatra: string | null }> = [];

  for (const profileId of profile_ids) {
    const profile = admin
      ? await db.profiles.getAny(profileId)
      : await db.profiles.get(profileId, userId);
    if (!profile) continue;

    const cached = await db.readings.latestByEngine(profileId, "dashaflow");
    let birthMoonNakshatra: string | null = null;
    if (cached) {
      try {
        const output = JSON.parse(cached.output_data as string);
        birthMoonNakshatra = output?.data?.planets?.Moon?.nakshatra ?? null;
      } catch {
        // corrupted cache row — skip
      }
    }

    profileData.push({ id: profileId, name: profile.name, birth_moon_nakshatra: birthMoonNakshatra });
  }

  // Resolve current Moon longitude: client-supplied > DB transit cache > error
  let moonLon: number | null = typeof transit_moon_longitude === "number" ? transit_moon_longitude : null;

  if (moonLon === null) {
    const transitCached = await db.readings.latestByEngine(profile_ids[0], "transit");
    if (transitCached) {
      try {
        const output = JSON.parse(transitCached.output_data as string);
        const lon = output?.data?.planets?.Moon?.longitude;
        if (typeof lon === "number") moonLon = lon;
      } catch {}
    }
  }

  if (moonLon === null) {
    return NextResponse.json(
      { error: "Moon position unavailable. Open the Transit tab for this profile first." },
      { status: 422 }
    );
  }

  // Build date list from start_date to end_date (inclusive)
  const dates: string[] = [];
  const cursor = new Date(start_date + "T00:00:00Z");
  const endDay = new Date(end_date + "T00:00:00Z");
  while (cursor <= endDay) {
    dates.push(cursor.toISOString().split("T")[0]);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  // "Today" at midnight UTC — baseline for Moon extrapolation
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);

  const taras = dates.map((date) => {
    const daysFromToday = (new Date(date + "T00:00:00Z").getTime() - todayUtc.getTime()) / 86_400_000;
    const transitNakshatra = extrapolateMoonNakshatra(moonLon!, daysFromToday);

    const profileTaras: Record<string, Tara | null> = {};
    for (const p of profileData) {
      profileTaras[p.id] = p.birth_moon_nakshatra
        ? computeTara(p.birth_moon_nakshatra, transitNakshatra)
        : null;
    }

    return { date, transit_moon_nakshatra: transitNakshatra, profile_taras: profileTaras };
  });

  return NextResponse.json({ profiles: profileData, taras });
}
