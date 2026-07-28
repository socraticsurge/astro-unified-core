import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, getUserId } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { privateMuhurtamSchema } from "@/lib/panchangam/contracts";
import { privateFailure, privateJson } from "@/lib/panchangam/private-route";
import { requestId } from "@/lib/panchangam/public-route";
import { searchPersonalMuhurtam } from "@/lib/panchangam/personal-search";

const LEGACY_ACTIVITY: Record<string, string> = {
  marriage: "wedding",
  house_entry: "gruhapravesha",
  business: "business",
  travel: "travel",
  education: "vidyarambha",
  medical: "surgery",
};

/**
 * Compatibility endpoint for the historic /muhurtha spelling and payload.
 * It now uses the canonical Telugu Calendar computation and safe error model;
 * no request reaches the retired DashaFlow six-event approximation.
 */
export async function POST(request: NextRequest) {
  const id = requestId(request);
  const session = await getServerSession(authOptions);
  if (!session?.user) return privateJson({ error: "Unauthorized" }, 401, id);

  const userId = getUserId(session);
  if (!rateLimit(`muhurtha-compat:${userId}`, 20, 60_000).success) {
    return privateJson({ error: "Too many requests. Please try again shortly." }, 429, id);
  }

  const legacy = await request.json().catch(() => null) as Record<string, unknown> | null;
  const eventType = typeof legacy?.event_type === "string" ? legacy.event_type : "marriage";
  const parsed = privateMuhurtamSchema.safeParse({
    profile_ids: typeof legacy?.profile_id === "string" ? [legacy.profile_id] : [],
    start_date: legacy?.start_date,
    end_date: legacy?.end_date,
    activity: LEGACY_ACTIVITY[eventType] ?? eventType,
    chandra_mode: "stars",
    include_night: false,
  });
  if (!parsed.success) {
    return privateJson({ error: "Choose a profile, supported event, and up to 14 days." }, 400, id);
  }

  try {
    const result = await searchPersonalMuhurtam(userId, parsed.data, id);
    return privateJson(
      {
        timings: result.data.slots.map((slot) => ({
          start_time: slot.start,
          end_time: slot.end,
          date: slot.date,
          points: slot.reasons,
          score: slot.score,
          tier: slot.tier,
        })),
        evidence: result.evidence,
        warnings: result.warnings,
        request_id: result.request_id,
      },
      200,
      id,
    );
  } catch (error) {
    return privateFailure(error, id);
  }
}
