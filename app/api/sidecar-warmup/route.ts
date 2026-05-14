import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/sidecar-warmup
// Proxies a /health ping to the dashaflow sidecar server-side so the URL stays secret.
export async function GET() {
  const sidecarUrl = process.env.DASHAFLOW_SIDECAR_URL ?? "https://dashaflow-sidecar.vercel.app";
  try {
    await fetch(`${sidecarUrl}/health`, { cache: "no-store" });
  } catch {
    // Best-effort warmup; ignore errors
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, max-age=0" } });
}
