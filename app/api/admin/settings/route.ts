import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import type { AppSettings } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const s = await db.settings.getAll();
  return NextResponse.json(s);
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: Partial<AppSettings> = await request.json();

  for (const [key, value] of Object.entries(body)) {
    if (typeof value === "boolean" || typeof value === "number") {
      await db.settings.set(key as keyof AppSettings, value as boolean | number);
    }
  }

  const updated = await db.settings.getAll();
  return NextResponse.json(updated);
}
