import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { MIN_FIELD_LENGTH } from "@/lib/consultation";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requests = await db.consultationRequests.listByUser(userId);
  return NextResponse.json(requests);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { success } = rateLimit(`consultation:${userId}`, 5, 60_000);
  if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const pending = await db.consultationRequests.getPending(userId);
  if (pending) {
    return NextResponse.json(
      { error: "You already have a pending question. Please wait for it to be answered before submitting another." },
      { status: 409 }
    );
  }

  const body = await request.json();
  const { profile_ids, life_area, observation, constraint_text, objective, options, delivery_mode } = body;

  if (!profile_ids || !life_area || !observation || !constraint_text || !objective || !options || !delivery_mode) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  if (
    observation.trim().length < MIN_FIELD_LENGTH ||
    constraint_text.trim().length < MIN_FIELD_LENGTH ||
    objective.trim().length < MIN_FIELD_LENGTH ||
    options.trim().length < MIN_FIELD_LENGTH
  ) {
    return NextResponse.json(
      { error: `Each field must be at least ${MIN_FIELD_LENGTH} characters` },
      { status: 400 }
    );
  }

  if (delivery_mode !== "written" && delivery_mode !== "appointment") {
    return NextResponse.json({ error: "Invalid delivery mode" }, { status: 400 });
  }

  const created = await db.consultationRequests.create(userId, {
    profile_ids: JSON.stringify(Array.isArray(profile_ids) ? profile_ids : [profile_ids]),
    life_area,
    observation: observation.trim(),
    constraint_text: constraint_text.trim(),
    objective: objective.trim(),
    options: options.trim(),
    delivery_mode,
  });

  return NextResponse.json(created, { status: 201 });
}
