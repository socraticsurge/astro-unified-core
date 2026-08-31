import { z } from "zod";
import {
  DashaflowProfileError,
  deriveDashaflowProfile,
} from "@/lib/engines/dashaflow";
import { guestBirthProfileEnabled } from "@/lib/guest-calculation-gates";
import {
  guestClientIp,
  guestJson,
  guestOptions,
  readLimitedJson,
  rejectDisallowedGuestOrigin,
} from "@/lib/guest-api";
import { rateLimit } from "@/lib/rate-limit";
import { RATE_LIMIT_DEFAULT_COUNT, RATE_LIMIT_WINDOW_MS } from "@/lib/constants";

function exactCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1];
}

function ianaTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function dateInTimezone(timezone: string, instant = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

const DeriveBodySchema = z.object({
  date_of_birth: z.string().refine(exactCalendarDate),
  time_of_birth: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  timezone: z.string().min(1).max(80)
    .refine((value) => value === value.trim())
    .refine(ianaTimezone),
}).strict().superRefine((value, context) => {
  if (
    exactCalendarDate(value.date_of_birth)
    && ianaTimezone(value.timezone)
    && value.date_of_birth > dateInTimezone(value.timezone)
  ) {
    context.addIssue({
      code: "custom",
      path: ["date_of_birth"],
      message: "Birth date must not be in the future at the birthplace",
    });
  }
});

export function OPTIONS(request: Request): Response {
  return guestOptions(request);
}

export async function POST(request: Request): Promise<Response> {
  const originError = rejectDisallowedGuestOrigin(request);
  if (originError) return originError;

  if (!guestBirthProfileEnabled()) {
    return guestJson(
      request,
      { error: "This calculation is temporarily unavailable. Please try again later." },
      { status: 503, headers: { "Retry-After": "300" } },
    );
  }

  const ip = guestClientIp(request);
  const limit = rateLimit(
    `guest:profile-derive:${ip}`,
    RATE_LIMIT_DEFAULT_COUNT,
    RATE_LIMIT_WINDOW_MS,
  );
  if (!limit.success) {
    return guestJson(
      request,
      { error: "Too many calculations. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const body = await readLimitedJson(request);
  if (!body.ok) {
    return guestJson(request, { error: body.error }, { status: body.status });
  }

  const parsed = DeriveBodySchema.safeParse(body.value);
  if (!parsed.success) {
    return guestJson(
      request,
      { error: "Provide an exact birth date, time, selected coordinates, and IANA timezone" },
      { status: 400 },
    );
  }

  try {
    const contract = await deriveDashaflowProfile(parsed.data);
    return guestJson(request, contract);
  } catch (error) {
    if (error instanceof DashaflowProfileError) {
      if (error.code === "invalid-input") {
        return guestJson(
          request,
          { error: "The birth details could not be calculated. Check the selected place, date, and time." },
          { status: 422 },
        );
      }
      if (error.code === "rate-limited") {
        return guestJson(
          request,
          { error: "The calculation service is busy. Please wait and try again." },
          {
            status: 429,
            headers: { "Retry-After": String(error.retryAfterSeconds ?? 60) },
          },
        );
      }

      const retryAfter = error.retryAfterSeconds ?? 10;
      return guestJson(
        request,
        { error: "The calculation service is temporarily unavailable. Please try again." },
        {
          status: error.code === "invalid-response" ? 502 : 503,
          headers: { "Retry-After": String(retryAfter) },
        },
      );
    }

    return guestJson(
      request,
      { error: "The calculation service is temporarily unavailable. Please try again." },
      { status: 503, headers: { "Retry-After": "10" } },
    );
  }
}
