import { NextRequest, NextResponse } from "next/server";
import { callPanchangamService } from "@/lib/panchangam/client";
import {
  horoscopeQuerySchema,
  type RasiPhalaluData,
} from "@/lib/panchangam/contracts";
import {
  guardPublicRequest,
  publicFailure,
  publicSuccess,
  PUBLIC_DAILY_CACHE,
  requestId,
} from "@/lib/panchangam/public-route";

export async function GET(request: NextRequest) {
  const limited = guardPublicRequest(request, "horoscope");
  if (limited) return limited;

  const id = requestId(request);
  const parsed = horoscopeQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Choose a valid date, location, Moon sign, and ayanamsa." },
      { status: 400, headers: { "Cache-Control": "private, no-store", "X-Request-ID": id } },
    );
  }

  const { rasi, ...locationAndDate } = parsed.data;
  try {
    const envelope = await callPanchangamService<RasiPhalaluData>(
      "/v1/rasi-phalalu",
      { ...locationAndDate, janma_rasi: rasi },
      id,
    );
    return publicSuccess(envelope, PUBLIC_DAILY_CACHE, id);
  } catch (error) {
    return publicFailure(error, id);
  }
}
