import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, getUserId } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { privateMuhurtamSchema } from "@/lib/panchangam/contracts";
import { privateFailure, privateJson } from "@/lib/panchangam/private-route";
import { requestId } from "@/lib/panchangam/public-route";
import {
  searchGeneralMuhurtam,
  searchPersonalMuhurtam,
} from "@/lib/panchangam/personal-search";

export async function POST(request: NextRequest) {
  const id = requestId(request);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return privateJson({ error: "Unauthorized" }, 401, id);
  }

  const userId = getUserId(session);
  if (!rateLimit(`muhurtam:${userId}`, 20, 60_000).success) {
    return privateJson({ error: "Too many requests. Please try again shortly." }, 429, id);
  }

  const body = await request.json().catch(() => null) as unknown;
  const parsed = privateMuhurtamSchema.safeParse(body);
  if (!parsed.success) {
    return privateJson(
      { error: "Choose one to four profiles, a supported activity, and up to 14 days." },
      400,
      id,
    );
  }

  try {
    const search = parsed.data.validation_mode === "general"
      ? searchGeneralMuhurtam
      : searchPersonalMuhurtam;
    return privateJson(
      await search(userId, parsed.data, id),
      200,
      id,
    );
  } catch (error) {
    return privateFailure(error, id);
  }
}
