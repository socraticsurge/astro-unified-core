import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@libsql/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = process.env.TURSO_DATABASE_URL || "file:dummy.db";
    const authToken = process.env.TURSO_AUTH_TOKEN;
    const client = createClient({ url, authToken });

    const rs = await client.execute("DELETE FROM compatibility_checks;");

    return NextResponse.json({ 
      success: true, 
      message: `Successfully cleared compatibility checks. Rows affected: ${rs.rowsAffected}` 
    });
  } catch (error) {
    console.error("Clear failed:", error);
    return NextResponse.json({ error: "Clear failed" }, { status: 500 });
  }
}
