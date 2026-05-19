/**
 * Shared helpers for reading route handlers.
 *
 * All five GET-based reading routes (dashaflow, career, transit, muhurtha,
 * tarabalam) repeat the same auth → profile-fetch → birth-input boilerplate.
 * This module extracts that pattern so each route stays focused on its own
 * cache and engine logic.
 *
 * Usage in a GET handler:
 *   const session = await getServerSession(authOptions);
 *   const r = await resolveProfile(req.nextUrl.searchParams.get("profile_id"), session);
 *   if (!r.ok) return r.response;
 *   const { profile_id, profile, input } = r;
 *
 * Usage in a POST handler (after body is parsed):
 *   const r = await resolveProfile(body.profile_id, session);
 *   if (!r.ok) return r.response;
 */

import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import type { Profile } from "@/lib/db";

export type BirthInput = {
  date_of_birth: string;
  time_of_birth: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

type Resolved =
  | { ok: false; response: NextResponse }
  | { ok: true; userId: string; profile_id: string; profile: Profile; input: BirthInput };

export async function resolveProfile(
  profile_id: string | null | undefined,
  session: Session | null,
): Promise<Resolved> {
  if (!session?.user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!profile_id) {
    return { ok: false, response: NextResponse.json({ error: "profile_id is required" }, { status: 400 }) };
  }

  const userId = (session.user as { id: string }).id;
  const profile = isAdmin(session)
    ? await db.profiles.getAny(profile_id)
    : await db.profiles.get(profile_id, userId);

  if (!profile) {
    return { ok: false, response: NextResponse.json({ error: "Profile not found" }, { status: 404 }) };
  }

  const { date_of_birth, time_of_birth, latitude, longitude, timezone } = profile;
  if (!date_of_birth || !time_of_birth || latitude == null || longitude == null || !timezone) {
    return { ok: false, response: NextResponse.json({ error: "Profile is missing required birth data" }, { status: 400 }) };
  }

  const input: BirthInput = { date_of_birth, time_of_birth, latitude, longitude, timezone };

  return { ok: true, userId, profile_id, profile, input };
}
