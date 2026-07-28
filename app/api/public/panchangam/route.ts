import { NextRequest, NextResponse } from "next/server";
import { callPanchangamService } from "@/lib/panchangam/client";
import {
  panchangamQuerySchema,
  type PanchangamData,
} from "@/lib/panchangam/contracts";
import {
  guardPublicRequest,
  publicFailure,
  publicSuccess,
  PUBLIC_DAILY_CACHE,
  requestId,
} from "@/lib/panchangam/public-route";

export async function GET(request: NextRequest) {
  const limited = guardPublicRequest(request, "panchangam");
  if (limited) return limited;

  const id = requestId(request);
  const parsed = panchangamQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Choose a valid date, location, system, and ayanamsa." },
      { status: 400, headers: { "Cache-Control": "private, no-store", "X-Request-ID": id } },
    );
  }

  try {
    const envelope = await callPanchangamService<PanchangamData>(
      "/v1/panchangam/day",
      parsed.data,
      id,
    );
    return publicSuccess(envelope, PUBLIC_DAILY_CACHE, id);
  } catch (error) {
    return publicFailure(error, id);
  }
}
