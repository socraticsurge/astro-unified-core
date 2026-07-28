import { NextResponse } from "next/server";
import { getClient } from "@/lib/db/client";
import { getStagingAuthConfig } from "@/lib/staging-auth";
import { getUnificationReleaseConfig } from "@/lib/unification-release";

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

async function checkPanchangam(): Promise<{
  ok: boolean;
  configured: boolean;
  status?: number;
  error?: string;
}> {
  const baseUrl = process.env.PANCHANGAM_API_URL?.replace(/\/$/, "");
  if (!baseUrl || !URL.canParse(baseUrl)) {
    return { ok: false, configured: false, error: "not_configured" };
  }
  try {
    const res = await fetch(`${baseUrl}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    return { ok: res.ok, configured: true, status: res.status };
  } catch {
    return { ok: false, configured: true, error: "unavailable" };
  }
}

export async function GET() {
  const [db, sidecar, panchangam] = await Promise.all([
    checkDb(),
    checkSidecar(),
    checkPanchangam(),
  ]);
  const unification = getUnificationReleaseConfig();
  const ok = db.ok && sidecar.ok &&
    (unification.mode === "legacy" || panchangam.ok);
  const stagingAuth = getStagingAuthConfig();
  return NextResponse.json(
    {
      ok,
      db,
      sidecar,
      panchangam,
      unification,
      staging_auth: {
        enabled: stagingAuth.enabled,
        status: stagingAuth.enabled ? "ready" : stagingAuth.reason,
      },
      timestamp: new Date().toISOString(),
    },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
