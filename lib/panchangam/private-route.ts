import { NextResponse } from "next/server";
import { PanchangamServiceError } from "./client";
import { PersonalTimingError } from "./personal-timing";

export const PRIVATE_NO_STORE = "private, no-store";

export function privateJson<T>(body: T, status = 200, requestId?: string) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": PRIVATE_NO_STORE,
      ...(requestId ? { "X-Request-ID": requestId } : {}),
    },
  });
}

export function privateFailure(error: unknown, requestId: string) {
  if (error instanceof PersonalTimingError) {
    const messages: Record<PersonalTimingError["code"], string> = {
      profile_not_found: "One or more selected profiles could not be found.",
      current_location_required: "Add a current location to the primary profile.",
      chart_context_unavailable: "A selected profile needs a valid birth chart.",
      chart_engine_unavailable: "The birth-chart service is temporarily unavailable.",
    };
    return privateJson(
      { error: messages[error.code], code: error.code, request_id: requestId },
      error.status,
      requestId,
    );
  }
  if (error instanceof PanchangamServiceError) {
    const message = error.status === 400 || error.status === 422
      ? "The calculation request is not supported."
      : "The timing calculation is temporarily unavailable. Please try again.";
    return privateJson(
      {
        error: message,
        code: error.code,
        request_id: error.requestId ?? requestId,
      },
      error.status,
      requestId,
    );
  }
  return privateJson(
    {
      error: "The timing calculation is temporarily unavailable. Please try again.",
      code: "timing_unavailable",
      request_id: requestId,
    },
    503,
    requestId,
  );
}
