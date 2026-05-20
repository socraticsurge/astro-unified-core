import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getClient } from "@/lib/db/client";

export async function POST() {
  const session = await getServerSession(authOptions);
  
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = getClient();

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
