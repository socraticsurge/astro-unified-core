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

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const queriesParam = searchParams.get("q");

  if (!queriesParam) {
    return NextResponse.json({ error: "Missing q parameter" }, { status: 400 });
  }

  const queries = queriesParam.split(",");

  const results = queries.map((queryStr) => {
    const parts = queryStr.split(":");
    if (parts.length !== 2) {
      return { error: "Invalid query format" };
    }

    const type = parts[0] as ContentType;
    const key = parts[1];

    if (!ALLOWED.has(type)) {
      return { error: "Unknown content type" };
    }

    const entry = loadByTypeAndKey(type, key);
    if (!entry) {
      return { error: "Not found" };
    }

    const display = pickDisplayBody(entry.body);
    return {
      type: entry.type,
      key: entry.key,
      title: entry.title,
      bodyHtml: renderMarkdown(display),
      gist: entry.type === "section" ? entry.gist ?? null : null,
    };
  });

  return NextResponse.json(
    { results },
    {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
