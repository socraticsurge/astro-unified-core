import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { createClient } from "@libsql/client";

export async function POST() {
  const session = await getServerSession(authOptions);
  
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = process.env.TURSO_DATABASE_URL || "file:dummy.db";
    const authToken = process.env.TURSO_AUTH_TOKEN;
    const client = createClient({ url, authToken });

    const rs = await client.execute(
      "UPDATE users SET created_at = last_login WHERE created_at IS NULL OR created_at = ''"
    );

    return NextResponse.json({ 
      success: true, 
      message: `Successfully backfilled created_at for ${rs.rowsAffected} users.` 
    });
  } catch (error) {
    console.error("Backfill failed:", error);
    return NextResponse.json({ error: "Backfill failed" }, { status: 500 });
  }
}
