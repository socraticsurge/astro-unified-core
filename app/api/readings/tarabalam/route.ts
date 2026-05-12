import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { fetchTransit } from "@/lib/engines/transit";
import { computeTara, extrapolateMoonNakshatra, type Tara } from "@/lib/tarabalam";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const admin = isAdmin(session);

  const { profile_ids, start_date, end_date } = await req.json() as {
    profile_ids: string[];
    start_date: string;
    end_date: string;
  };

  if (!Array.isArray(profile_ids) || profile_ids.length === 0) {
    return NextResponse.json({ error: "profile_ids required" }, { status: 400 });
  }

  // Collect birth Moon nakshatra for each profile from their dashaflow cache
  const profileData: Array<{ id: string; name: string; birth_moon_nakshatra: string | null }> = [];
  let anchorProfile: Awaited<ReturnType<typeof db.profiles.getAny>> | undefined;

  for (const profileId of profile_ids) {
    const profile = admin
      ? await db.profiles.getAny(profileId)
      : await db.profiles.get(profileId, userId);
    if (!profile) continue;

    if (!anchorProfile) anchorProfile = profile;

    const cached = await db.readings.latestByEngine(profileId, "dashaflow");
    let birthMoonNakshatra: string | null = null;
    if (cached) {
      try {
        const output = JSON.parse(cached.output_data as string);
        birthMoonNakshatra = output?.data?.planets?.Moon?.nakshatra ?? null;
      } catch {
        // corrupted cache — skip
      }
    }

    profileData.push({ id: profileId, name: profile.name, birth_moon_nakshatra: birthMoonNakshatra });
  }

  if (!anchorProfile) {
    return NextResponse.json({ error: "No valid profiles found" }, { status: 404 });
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
  const moonSign = transitPlanets?.Moon?.sign;
  const moonDegree = transitPlanets?.Moon?.degree;
  const signIdx = moonSign ? SIGNS.indexOf(moonSign) : -1;

  const moonLon = signIdx !== -1 && typeof moonDegree === "number"
    ? signIdx * 30 + moonDegree
    : null;

  if (moonLon === null) {
    const detail = transitResult.error ?? `sign=${moonSign}, degree=${moonDegree}`;
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
    const transitNakshatra = extrapolateMoonNakshatra(moonLon, daysFromToday);

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
