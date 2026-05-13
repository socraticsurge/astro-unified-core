import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const slots = await db.consultationSlots.listAll();
  return NextResponse.json(slots);
}

// POST body: { starts_at: string }  — ISO string in IST
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { starts_at } = await request.json();
  if (!starts_at || typeof starts_at !== "string") {
    return NextResponse.json({ error: "starts_at is required" }, { status: 400 });
  }

  const slot = await db.consultationSlots.create(starts_at);
  return NextResponse.json(slot, { status: 201 });
}

// DELETE ?id=<id>
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.consultationSlots.delete(id);
  return NextResponse.json({ success: true });
}
