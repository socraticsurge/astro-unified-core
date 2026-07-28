import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { resolveProfile } from "@/lib/engines/reading-handler";
import { fetchDashaflowSubperiods } from "@/lib/engines/dashaflow";
import { rateLimit } from "@/lib/rate-limit";
import { RATE_LIMIT_DEFAULT_COUNT, RATE_LIMIT_WINDOW_MS } from "@/lib/constants";
import { toTimeZoneIsoDate } from "@/lib/local-date";

const privateJson = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

function validPath(value: unknown): value is number[] {
  return Array.isArray(value)
    && value.length >= 1
    && value.length <= 4
    && value.every(index => Number.isInteger(index) && index >= 0 && index <= 8);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return privateJson({ error: "Unauthorized" }, 401);

  let body: { profile_id?: unknown; path?: unknown };
  try {
    body = await req.json();
  } catch {
    return privateJson({ error: "Invalid JSON body" }, 400);
  }

  if (typeof body.profile_id !== "string" || !body.profile_id) {
    return privateJson({ error: "profile_id is required" }, 400);
  }
  if (!validPath(body.path)) {
    return privateJson(
      { error: "path must contain 1 to 4 indexes between 0 and 8" },
      400,
    );
  }

  const key = `dasha_subperiods_${session.user.email ?? "user"}_${body.profile_id}`;
  if (!rateLimit(key, RATE_LIMIT_DEFAULT_COUNT * 3, RATE_LIMIT_WINDOW_MS).success) {
    return privateJson(
      { error: "Too many timeline requests. Please wait a minute." },
      429,
    );
  }

  const resolved = await resolveProfile(body.profile_id, session);
  if (!resolved.ok) {
    resolved.response.headers.set("Cache-Control", "private, no-store");
    return resolved.response;
  }

  const queryDate = toTimeZoneIsoDate(new Date(), resolved.input.timezone);
  const output = await fetchDashaflowSubperiods(
    resolved.input,
    body.path,
    queryDate,
  );
  if (output.error) return privateJson({ error: output.error }, 502);

  return privateJson(output);
}
