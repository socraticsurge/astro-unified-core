import { NextResponse } from "next/server";
import { getClient } from "@/lib/db/client";

export const dynamic = "force-dynamic";

const SIDECAR_URL =
  process.env.DASHAFLOW_SIDECAR_URL ?? "https://dashaflow-sidecar.vercel.app";

async function checkDb(): Promise<{ ok: boolean; error?: string }> {
  try {
    await getClient().execute("SELECT 1");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

async function checkSidecar(): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const res = await fetch(`${SIDECAR_URL}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

export async function GET() {
  const [db, sidecar] = await Promise.all([checkDb(), checkSidecar()]);
  const ok = db.ok && sidecar.ok;
  return NextResponse.json(
    { ok, db, sidecar, timestamp: new Date().toISOString() },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
