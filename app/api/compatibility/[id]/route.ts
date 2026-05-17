import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const check = await db.compatibility.get(id, userId);
  if (!check) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.compatibility.delete(id, userId);
  return new NextResponse(null, { status: 204 });
}
