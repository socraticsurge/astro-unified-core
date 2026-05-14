// Lazy content-fetch endpoint used by the v2 client view to load
// per-row entries (planet-in-house, dasha-pair, etc.) when the v2
// view mounts. Returns a unified bodyHtml — rendering when authored,
// source verse otherwise. Maitreya attribution is stripped from the
// body; full attribution lives on /credits and in Privacy/Terms.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { loadByTypeAndKey } from "@/lib/content/loader";
import { renderMarkdown, pickDisplayBody } from "@/lib/content/markdown";
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

  const display = pickDisplayBody(entry.body);
  return NextResponse.json(
    {
      type: entry.type,
      key: entry.key,
      title: entry.title,
      bodyHtml: renderMarkdown(display),
      gist: entry.type === "section" ? entry.gist ?? null : null,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=3600",
      },
    }
  );
}
