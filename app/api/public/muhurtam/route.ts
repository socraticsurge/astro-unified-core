import { NextRequest, NextResponse } from "next/server";
import { callPanchangamService } from "@/lib/panchangam/client";
import {
  muhurtamQuerySchema,
  type MuhurtamData,
} from "@/lib/panchangam/contracts";
import {
  guardPublicRequest,
  publicFailure,
  publicSuccess,
  PUBLIC_MUHURTAM_CACHE,
  requestId,
} from "@/lib/panchangam/public-route";

export async function GET(request: NextRequest) {
  const limited = guardPublicRequest(request, "muhurtam");
  if (limited) return limited;

  const id = requestId(request);
  const parsed = muhurtamQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Choose a valid activity, date range, location, and system." },
      { status: 400, headers: { "Cache-Control": "private, no-store", "X-Request-ID": id } },
    );
  }

  try {
    const envelope = await callPanchangamService<MuhurtamData>(
      "/v1/muhurtam/search",
      { ...parsed.data, participants: [] },
      id,
      15_000,
    );
    return publicSuccess(envelope, PUBLIC_MUHURTAM_CACHE, id);
  } catch (error) {
    return publicFailure(error, id);
  }
}
