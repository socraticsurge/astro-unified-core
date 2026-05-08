// Lazy content-fetch endpoint used by the v2 client view to load
// per-row entries (planet-in-house, dasha-pair, etc.) when a user
// expands an explainer. Sections are pre-loaded server-side by the
// v2 page; this endpoint covers everything else.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { loadByTypeAndKey } from "@/lib/content/loader";
import { renderMarkdown, splitTwoTrack } from "@/lib/content/markdown";
import type { ContentType } from "@/lib/content/types";

const ALLOWED: Set<ContentType> = new Set([
  "section",
  "planet-in-house",
  "dasha-pair",
  "nakshatra",
  "ascendant",
  "house-lordship",
]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string; key: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, key } = await params;
  if (!ALLOWED.has(type as ContentType)) {
    return NextResponse.json({ error: "Unknown content type" }, { status: 400 });
  }

  const entry = loadByTypeAndKey(type as ContentType, key);
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // For two-track entries, split body into source + rendering and let
  // the client decide which to surface. For sections and
  // planet-in-house (single-track), pass body through.
  const isTwoTrack =
    entry.type === "dasha-pair" ||
    entry.type === "nakshatra" ||
    entry.type === "ascendant" ||
    entry.type === "house-lordship";

  if (isTwoTrack) {
    const { source, rendering } = splitTwoTrack(entry.body);
    const sourceHtml = renderMarkdown(source);
    const renderingHtml = rendering ? renderMarkdown(rendering) : null;
    return NextResponse.json({
      type: entry.type,
      key: entry.key,
      title: entry.title,
      sources: entry.sources ?? [],
      rendering_status: "rendering_status" in entry ? entry.rendering_status : "pending",
      sourceHtml,
      renderingHtml,
    });
  }

  // Single-track: section or planet-in-house
  return NextResponse.json({
    type: entry.type,
    key: entry.key,
    title: entry.title,
    sources: entry.sources ?? [],
    bodyHtml: renderMarkdown(entry.body),
    gist: entry.type === "section" ? entry.gist ?? null : null,
  });
}
