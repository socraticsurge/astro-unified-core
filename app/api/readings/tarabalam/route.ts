import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, getUserId } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { privateTarabalamSchema } from "@/lib/panchangam/contracts";
import { requestId } from "@/lib/panchangam/public-route";
import {
  privateFailure,
  privateJson,
} from "@/lib/panchangam/private-route";
import { searchPersonalTarabalam } from "@/lib/panchangam/personal-search";

export async function POST(request: NextRequest) {
  const id = requestId(request);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return privateJson({ error: "Unauthorized" }, 401, id);
  }

  const userId = getUserId(session);
  if (!rateLimit(`tarabalam:${userId}`, 20, 60_000).success) {
    return privateJson({ error: "Too many requests. Please try again shortly." }, 429, id);
  }

  const body = await request.json().catch(() => null) as unknown;
  const parsed = privateTarabalamSchema.safeParse(body);
  if (!parsed.success) {
    return privateJson(
      { error: "Choose one to four profiles and a valid date range." },
      400,
      id,
    );
  }

  try {
    return privateJson(
      await searchPersonalTarabalam(userId, parsed.data, id),
      200,
      id,
    );
  } catch (error) {
    return privateFailure(error, id);
  }
}
