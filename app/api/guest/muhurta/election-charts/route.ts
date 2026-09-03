import { z } from "zod";
import {
  DashaflowElectionChartError,
  deriveDashaflowElectionCharts,
} from "@/lib/engines/dashaflow-election";
import { guestElectionChartEnabled } from "@/lib/guest-calculation-gates";
import {
  guestClientIp,
  guestJson,
  guestOptions,
  readLimitedJson,
  rejectDisallowedGuestOrigin,
} from "@/lib/guest-api";
import { enforceGuestRateLimit } from "@/lib/guest-rate-limit";

const DAY_MS = 24 * 60 * 60 * 1_000;
const MAX_PAST_MS = 366 * DAY_MS;
const MAX_FUTURE_MS = 1_830 * DAY_MS;
const MINUTE_INSTANT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:00(?:\.000)?(?:Z|[+-](?:(?:0\d|1[0-3]):[0-5]\d|14:00))$/;

function realCalendarDate(value: string): boolean {
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

function minuteInstant(value: string): boolean {
  const match = MINUTE_INSTANT_PATTERN.exec(value);
  if (!match || !realCalendarDate(`${match[1]}-${match[2]}-${match[3]}`)) return false;
  return Number.isFinite(Date.parse(value));
}

function ianaTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

const ElectionChartBodySchema = z.object({
  contract_version: z.literal("1.0"),
  location: z.object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    timezone: z.string().min(1).max(80)
      .refine((value) => value === value.trim())
      .refine(ianaTimezone),
  }).strict(),
  instants: z.array(z.string().max(35).refine(minuteInstant)).min(1).max(24),
}).strict().superRefine((value, context) => {
  const now = Date.now();
  const seen = new Set<number>();

  value.instants.forEach((instant, index) => {
    const epoch = Date.parse(instant);
    if (seen.has(epoch)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["instants", index],
        message: "Instants must be unique",
      });
    }
    seen.add(epoch);

    if (epoch < now - MAX_PAST_MS || epoch > now + MAX_FUTURE_MS) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["instants", index],
        message: "Instant is outside the supported calculation window",
      });
    }
  });
});

export function OPTIONS(request: Request): Response {
  return guestOptions(request);
}

export async function POST(request: Request): Promise<Response> {
  const originError = rejectDisallowedGuestOrigin(request);
  if (originError) return originError;

  if (!guestElectionChartEnabled()) {
    return guestJson(
      request,
      { error: "This calculation is temporarily unavailable. Please try again later." },
      { status: 503, headers: { "Retry-After": "300" } },
    );
  }

  const ip = guestClientIp(request);
  const limit = await enforceGuestRateLimit("election-charts", ip);
  if (limit.unavailable) {
    return guestJson(
      request,
      { error: "Chart screening is temporarily unavailable. Please try again." },
      {
        status: 503,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }
  if (!limit.success) {
    return guestJson(
      request,
      { error: "Too many chart calculations. Please wait a minute and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const body = await readLimitedJson(request);
  if (!body.ok) {
    return guestJson(request, { error: body.error }, { status: body.status });
  }

  const parsed = ElectionChartBodySchema.safeParse(body.value);
  if (!parsed.success) {
    return guestJson(
      request,
      { error: "Provide a valid location and 1 to 24 unique, minute-precision instants" },
      { status: 400 },
    );
  }

  try {
    const contract = await deriveDashaflowElectionCharts(parsed.data);
    return guestJson(request, contract);
  } catch (error) {
    if (error instanceof DashaflowElectionChartError) {
      if (error.code === "invalid-input") {
        return guestJson(
          request,
          { error: "The requested charts could not be calculated. Check the location and instants." },
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
