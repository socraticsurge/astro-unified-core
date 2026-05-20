import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { MIN_FIELD_LENGTH } from "@/lib/consultation";
import { rateLimit } from "@/lib/rate-limit";
import { isAdmin } from "@/lib/admin";
import { MAX_FIELD_LENGTH, MAX_CONSULTATION_PROFILES, RATE_LIMIT_DEFAULT_COUNT, RATE_LIMIT_WINDOW_MS, PAYMENT_FLOW_ENABLED } from "@/lib/constants";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requests = await db.consultationRequests.listByUser(userId);
  return NextResponse.json(requests, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { success } = rateLimit(`consultation:${userId}`, RATE_LIMIT_DEFAULT_COUNT, RATE_LIMIT_WINDOW_MS);
  if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  // Prevent multiple in-flight requests per user — only one at a time should
  // be awaiting payment / answer. The user can submit a fresh request once
  // the prior one has been answered.
  const existing = await db.consultationRequests.getPending(userId);
  if (existing) {
    return NextResponse.json(
      { error: "You already have an outstanding consultation request. Please wait for it to be answered." },
      { status: 409 }
    );
  }

  const body = await request.json();
  const { profile_ids, delivery_mode, slot_id } = body;

  // Simplified mode: single question field
  // Legacy mode: structured 4-part fields (observation, constraint_text, objective, options)
  const isSimplified = typeof body.question === "string";

  let life_area: string;
  let observation: string;
  let constraint_text: string;
  let objective: string;
  let options: string;

  if (isSimplified) {
    const q = body.question as string;
    if (!profile_ids || !delivery_mode) {
      return NextResponse.json({ error: "profile_ids and delivery_mode are required" }, { status: 400 });
    }
    if (!q || q.trim().length < MIN_FIELD_LENGTH) {
      return NextResponse.json({ error: `Question must be at least ${MIN_FIELD_LENGTH} characters` }, { status: 400 });
    }
    if (q.trim().length > MAX_FIELD_LENGTH) {
      return NextResponse.json({ error: `Question must be at most ${MAX_FIELD_LENGTH} characters` }, { status: 400 });
    }
    life_area = "General";
    observation = q.trim();
    constraint_text = "";
    objective = "";
    options = "";
  } else {
    const raw = body as { life_area?: string; observation?: string; constraint_text?: string; objective?: string; options?: string };
    if (!profile_ids || !raw.life_area || !raw.observation || !raw.constraint_text || !raw.objective || !raw.options || !delivery_mode) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (
      raw.observation.trim().length < MIN_FIELD_LENGTH ||
      raw.constraint_text.trim().length < MIN_FIELD_LENGTH ||
      raw.objective.trim().length < MIN_FIELD_LENGTH ||
      raw.options.trim().length < MIN_FIELD_LENGTH
    ) {
      return NextResponse.json({ error: `Each field must be at least ${MIN_FIELD_LENGTH} characters` }, { status: 400 });
    }
    if (
      raw.observation.trim().length > MAX_FIELD_LENGTH ||
      raw.constraint_text.trim().length > MAX_FIELD_LENGTH ||
      raw.objective.trim().length > MAX_FIELD_LENGTH ||
      raw.options.trim().length > MAX_FIELD_LENGTH
    ) {
      return NextResponse.json({ error: `Each field must be at most ${MAX_FIELD_LENGTH} characters` }, { status: 400 });
    }
    life_area = raw.life_area;
    observation = raw.observation.trim();
    constraint_text = raw.constraint_text.trim();
    objective = raw.objective.trim();
    options = raw.options.trim();
  }

  if (delivery_mode !== "written" && delivery_mode !== "appointment") {
    return NextResponse.json({ error: "Invalid delivery mode" }, { status: 400 });
  }

  if (delivery_mode === "appointment" && !slot_id) {
    return NextResponse.json({ error: "A slot selection is required for live consultation" }, { status: 400 });
  }

  // Validate profile_ids belong to the requesting user
  const profileIdsArray: string[] = Array.isArray(profile_ids) ? profile_ids : [profile_ids];
  if (profileIdsArray.length > MAX_CONSULTATION_PROFILES) {
    return NextResponse.json({ error: "Too many profiles" }, { status: 400 });
  }
  const admin = isAdmin(session);
  for (const pid of profileIdsArray) {
    const profile = admin ? await db.profiles.getAny(pid) : await db.profiles.get(pid, userId);
    if (!profile) {
      return NextResponse.json({ error: "One or more profiles not found" }, { status: 404 });
    }
  }

  // Verify and book the slot for appointment mode
  let slot_starts_at: string | null = null;
  if (delivery_mode === "appointment") {
    const slot = await db.consultationSlots.getById(slot_id);
    if (!slot) {
      return NextResponse.json({ error: "Selected slot not found" }, { status: 400 });
    }
    if (slot.is_booked) {
      return NextResponse.json({ error: "This slot has already been booked. Please choose another." }, { status: 409 });
    }
    const booked = await db.consultationSlots.book(slot_id);
    if (!booked) {
      return NextResponse.json({ error: "This slot has already been booked. Please choose another." }, { status: 409 });
    }
    slot_starts_at = slot.starts_at;
  }

  // When PAYMENT_FLOW_ENABLED=false, skip the awaiting-payment state entirely:
  // amount_paise is 0 and initial status is `pending` (admin answers directly).
  let amount_paise = 0;
  if (PAYMENT_FLOW_ENABLED) {
    const appSettings = await db.settings.getAll();
    amount_paise = delivery_mode === "written"
      ? appSettings.written_fee_paise
      : appSettings.live_fee_paise;
  }

  try {
    const created = await db.consultationRequests.create(userId, {
      profile_ids: JSON.stringify(profileIdsArray),
      life_area,
      observation: observation.trim(),
      constraint_text: constraint_text.trim(),
      objective: objective.trim(),
      options: options.trim(),
      delivery_mode,
      amount_paise,
      slot_starts_at,
      initial_status: PAYMENT_FLOW_ENABLED ? "pending_payment" : "pending",
    });
    return NextResponse.json(created, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    // If create fails after a slot was booked, release the slot to prevent orphaning
    if (slot_starts_at && slot_id) {
      await db.consultationSlots.unbook(slot_id).catch(() => {});
    }
    console.error("Failed to create consultation request:", err);
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
  }
}
