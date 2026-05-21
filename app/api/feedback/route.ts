import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { RATE_LIMIT_WINDOW_MS } from "@/lib/constants";
import { getPostHogClient } from "@/lib/posthog-server";

// FeedbackWidget renders on every page including the public landing, so anon
// submissions are intentionally allowed. The hardening below prevents the
// store-arbitrary-data abuse vector flagged in the dev → main audit.
const ALLOWED_RATINGS = new Set(["😞", "😐", "😊"]);
const MAX_MESSAGE_LENGTH = 2000;
const MAX_PAGE_URL_LENGTH = 500;
const FEEDBACK_RATE_LIMIT_COUNT = 3;

// Vercel appends the observed client IP as the rightmost value of
// X-Forwarded-For; values to the left are client-supplied and spoofable.
// Read the last segment to get the trusted IP.
function clientIp(request: NextRequest): string {
  const header = request.headers.get("x-forwarded-for");
  if (!header) return "anon";
  const parts = header.split(",").map((p) => p.trim()).filter(Boolean);
  return parts[parts.length - 1] ?? "anon";
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // Rate-limit by user when authed, by trusted IP otherwise.
  const key = session?.user?.email ?? `ip:${clientIp(request)}`;
  const { success } = rateLimit(`feedback:${key}`, FEEDBACK_RATE_LIMIT_COUNT, RATE_LIMIT_WINDOW_MS);
  if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await request.json();
  const { rating, message, page_url } = body as { rating?: unknown; message?: unknown; page_url?: unknown };

  if (typeof rating !== "string" || !ALLOWED_RATINGS.has(rating)) {
    return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
  }
  if (message != null && (typeof message !== "string" || message.length > MAX_MESSAGE_LENGTH)) {
    return NextResponse.json({ error: `message must be a string up to ${MAX_MESSAGE_LENGTH} characters` }, { status: 400 });
  }
  if (page_url != null && (typeof page_url !== "string" || page_url.length > MAX_PAGE_URL_LENGTH)) {
    return NextResponse.json({ error: `page_url must be a string up to ${MAX_PAGE_URL_LENGTH} characters` }, { status: 400 });
  }

  await db.feedback.save({
    user_email: session?.user?.email ?? null,
    rating,
    message: (message as string | null) || null,
    page_url: (page_url as string | null) || null,
  });

  const distinctId = session?.user?.email ?? `ip:${clientIp(request)}`;
  getPostHogClient().capture({
    distinctId,
    event: "feedback_submitted",
    properties: {
      rating,
      has_message: !!(message as string | null),
      authenticated: !!session?.user?.email,
    },
  });

  return NextResponse.json({ success: true });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db.feedback.list();
  return NextResponse.json(rows);
}
