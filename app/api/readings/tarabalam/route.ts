import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, getUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { fetchTransit } from "@/lib/engines/transit";
import { rateLimit } from "@/lib/rate-limit";
import {
  computeTara, computeTithi,
  extrapolateMoonLongitude, extrapolateMoonNakshatra, extrapolateSunLongitude,
  type Tara, type Tithi,
} from "@/lib/tarabalam";

const MAX_DAYS = 90;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = getUserId(session);
  const admin = isAdmin(session);

  const { success } = rateLimit(`tarabalam:${userId}`, 20, 60_000);
  if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { profile_ids, start_date, end_date } = await req.json() as {
    profile_ids: string[];
    start_date: string;
    end_date: string;
  };

  if (!Array.isArray(profile_ids) || profile_ids.length === 0) {
    return NextResponse.json({ error: "profile_ids required" }, { status: 400 });
  }

  if (!start_date || !end_date) {
    return NextResponse.json({ error: "start_date and end_date are required" }, { status: 400 });
  }

  const startMs = new Date(start_date + "T00:00:00Z").getTime();
  const endMs = new Date(end_date + "T00:00:00Z").getTime();
  if (isNaN(startMs) || isNaN(endMs)) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }
  const daysDiff = (endMs - startMs) / 86_400_000;
  if (daysDiff > MAX_DAYS) {
    return NextResponse.json({ error: `Date range cannot exceed ${MAX_DAYS} days` }, { status: 400 });
  }

  // Collect birth Moon nakshatra for each profile from their dashaflow cache
  const profileData: Array<{ id: string; name: string; birth_moon_nakshatra: string | null }> = [];
  let anchorProfile: Awaited<ReturnType<typeof db.profiles.getAny>> | undefined;

  // 1. Fetch profiles in batch
  const profiles = admin
    ? await db.profiles.getManyAny(profile_ids)
    : await db.profiles.getMany(profile_ids, userId);

  const validProfiles = profiles.filter((p) => p !== undefined && p !== null);

  if (validProfiles.length > 0) {
    anchorProfile = validProfiles[0];
  } else {
    return NextResponse.json({ error: "No valid profiles found" }, { status: 404 });
  }

  // 2. Fetch all cached readings in batch
  const validProfileIds = validProfiles.map((p) => p.id);
  const cachedReadings = await db.readings.latestByEngineMany(validProfileIds, "dashaflow");
  const readingMap = new Map(cachedReadings.map((r) => [r.profile_id, r]));

  // 3. Map readings back to profileData
  for (const profile of validProfiles) {
    const cached = readingMap.get(profile.id);
    let birthMoonNakshatra: string | null = null;
    if (cached) {
      try {
        const output = JSON.parse(cached.output_data as string);
        birthMoonNakshatra = output?.data?.planets?.Moon?.nakshatra ?? null;
      } catch {
        // corrupted cache — skip
      }
    }

    profileData.push({ id: profile.id, name: profile.name, birth_moon_nakshatra: birthMoonNakshatra });
  }

  // Get today's Moon longitude from the sidecar using the first profile's birth data.
  // We only need this to anchor the Moon's position; birth details don't affect the
  // transit Moon longitude itself.
  const today = new Date().toISOString().slice(0, 10);
  const transitResult = await fetchTransit({
    date_of_birth: anchorProfile.date_of_birth,
    time_of_birth: anchorProfile.time_of_birth,
    latitude: anchorProfile.latitude,
    longitude: anchorProfile.longitude,
    timezone: anchorProfile.timezone,
    transit_date: today,
  });

  // Transit output has sign + degree (within sign), not a raw longitude field.
  // Reconstruct: longitude = sign_index * 30 + degree_in_sign (already sidereal/Lahiri).
  const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  const transitPlanets = (transitResult.data as Record<string, unknown> | null)
    ?.planets as Record<string, { sign?: string; degree?: number; nakshatra?: string }> | undefined;

  function toSiderealLon(planet: { sign?: string; degree?: number } | undefined): number | null {
    const idx = planet?.sign ? SIGNS.indexOf(planet.sign) : -1;
    return idx !== -1 && typeof planet?.degree === "number" ? idx * 30 + planet.degree : null;
  }

  const moonLon = toSiderealLon(transitPlanets?.Moon);
  const sunLon  = toSiderealLon(transitPlanets?.Sun);

  if (moonLon === null) {
    const detail = transitResult.error ?? `Moon sign=${transitPlanets?.Moon?.sign}, degree=${transitPlanets?.Moon?.degree}`;
    return NextResponse.json(
      { error: `Could not determine today's Moon position (${detail}). Please try again.` },
      { status: 502 }
    );
  }

  // Build the date list
  const dates: string[] = [];
  const cursor = new Date(start_date + "T00:00:00Z");
  const endDay = new Date(end_date + "T00:00:00Z");
  while (cursor <= endDay) {
    dates.push(cursor.toISOString().split("T")[0]);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  // Anchor baseline: today at midnight UTC
  const todayMs = new Date(today + "T00:00:00Z").getTime();

  const taras = dates.map((date) => {
    const daysFromToday = (new Date(date + "T00:00:00Z").getTime() - todayMs) / 86_400_000;
    const moonLonDay = extrapolateMoonLongitude(moonLon, daysFromToday);
    const transitNakshatra = extrapolateMoonNakshatra(moonLon, daysFromToday);

    const tithi: Tithi | null = sunLon !== null
      ? computeTithi(moonLonDay, extrapolateSunLongitude(sunLon, daysFromToday))
      : null;

    const profileTaras: Record<string, Tara | null> = {};
    for (const p of profileData) {
      profileTaras[p.id] = p.birth_moon_nakshatra
        ? computeTara(p.birth_moon_nakshatra, transitNakshatra)
        : null;
    }

    return { date, transit_moon_nakshatra: transitNakshatra, tithi, profile_taras: profileTaras };
  });

  return NextResponse.json({ profiles: profileData, taras });
}
