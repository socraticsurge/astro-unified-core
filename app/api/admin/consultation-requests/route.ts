import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

// PATCH /api/admin/consultation-requests?id=<id>
// body: { action: "mark_paid" } | { admin_note?: string }
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await request.json().catch(() => ({}));

  if (body.action === "mark_paid") {
    await db.consultationRequests.markPaid(id);
    return NextResponse.json({ success: true });
  }

  const adminNote: string | undefined = body.admin_note ?? undefined;
  await db.consultationRequests.markAnswered(id, adminNote);
  return NextResponse.json({ success: true });
}
