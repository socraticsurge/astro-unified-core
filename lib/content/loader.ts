// Server-only loader for the authored content layer.
//
// Approach A (per CLAUDE-CODE-BRIEFING.md): files are read at request
// time from disk on the server. Parsed entries are cached in a
// module-level Map so repeated reads of the same key are O(1).
//
// Why server-only: gray-matter and `fs` are Node-only. Importing this
// from a "use client" component will fail at build time, which is
// intended — the v2 view loads sections via the page server component
// and per-row entries via /api/content/[type]/[key].

import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type {
  AscendantEntry,
  ContentEntry,
  ContentType,
  DashaPairEntry,
  HouseLordshipEntry,
  NakshatraEntry,
  PlanetInHouseEntry,
  SectionEntry,
  Source,
} from "./types";

const CONTENT_ROOT = path.join(process.cwd(), "content");

type Frontmatter = Record<string, unknown>;

const cache = new Map<string, ContentEntry | null>();

function readFile(typeDir: string, fileKey: string): string | null {
  const full = path.join(CONTENT_ROOT, typeDir, `${fileKey}.md`);
  try {
    return fs.readFileSync(full, "utf8");
  } catch {
    return null;
  }
}

function parseSources(raw: unknown): Source[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .map((s) => (typeof s === "object" && s !== null ? (s as Source) : null))
    .filter((s): s is Source => s !== null);
}

function parseFile(typeDir: string, fileKey: string): ContentEntry | null {
  const text = readFile(typeDir, fileKey);
  if (!text) return null;
  const { data, content } = matter(text) as { data: Frontmatter; content: string };
  const body = content.trim();
  const key = String(data.key ?? `${typeDir}:${fileKey}`);
  const title = String(data.title ?? "");
  const sources = parseSources(data.sources);

  switch (data.type) {
    case "section": {
      const entry: SectionEntry = {
        type: "section",
        key,
        title,
        section_in_view: String(data.section_in_view ?? title),
        gist: data.gist ? String(data.gist) : undefined,
        sources,
        body,
      };
      return entry;
    }
    case "planet-in-house": {
      const f = (data.factors ?? {}) as { planet?: unknown; house?: unknown };
      const entry: PlanetInHouseEntry = {
        type: "planet-in-house",
        key,
        title,
        factors: { planet: String(f.planet ?? ""), house: Number(f.house ?? 0) },
        sources,
        body,
      };
      return entry;
    }
    case "dasha-pair": {
      const f = (data.factors ?? {}) as { mahadasha?: unknown; antardasha?: unknown };
      const entry: DashaPairEntry = {
        type: "dasha-pair",
        key,
        title,
        factors: {
          mahadasha: String(f.mahadasha ?? ""),
          antardasha: String(f.antardasha ?? ""),
        },
        sources,
        rendering_status:
          data.rendering_status === "done" ? "done" : "pending",
        body,
      };
      return entry;
    }
    case "nakshatra": {
      const f = (data.factors ?? {}) as { nakshatra?: unknown; sequence?: unknown };
      const entry: NakshatraEntry = {
        type: "nakshatra",
        key,
        title,
        factors: {
          nakshatra: String(f.nakshatra ?? ""),
          sequence: f.sequence !== undefined ? Number(f.sequence) : undefined,
        },
        sources,
        rendering_status:
          data.rendering_status === "done" ? "done" : "pending",
        body,
      };
      return entry;
    }
    case "ascendant": {
      const f = (data.factors ?? {}) as { sign?: unknown };
      const entry: AscendantEntry = {
        type: "ascendant",
        key,
        title,
        factors: { sign: String(f.sign ?? "") },
        sources,
        rendering_status:
          data.rendering_status === "done" ? "done" : "pending",
        body,
      };
      return entry;
    }
    case "house-lordship": {
      const f = (data.factors ?? {}) as { lord_of_house?: unknown; placed_in_house?: unknown };
      const entry: HouseLordshipEntry = {
        type: "house-lordship",
        key,
        title,
        factors: {
          lord_of_house: Number(f.lord_of_house ?? 0),
          placed_in_house: Number(f.placed_in_house ?? 0),
        },
        sources,
        rendering_status:
          data.rendering_status === "done" ? "done" : "pending",
        body,
      };
      return entry;
    }
    default:
      return null;
  }
}

function load(typeDir: string, fileKey: string): ContentEntry | null {
  const cacheKey = `${typeDir}:${fileKey}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null;
  const parsed = parseFile(typeDir, fileKey);
  cache.set(cacheKey, parsed);
  return parsed;
}

const TYPE_TO_DIR: Record<ContentType, string> = {
  section: "sections",
  "planet-in-house": "planet-in-house",
  "dasha-pair": "dasha-pair",
  nakshatra: "nakshatra",
  ascendant: "ascendant",
  "house-lordship": "house-lordship",
};

export function loadByTypeAndKey(type: ContentType, fileKey: string): ContentEntry | null {
  return load(TYPE_TO_DIR[type], fileKey);
}

/** Load all section explainers as a Map keyed by `section_in_view`. */
export function loadAllSections(): Record<string, SectionEntry> {
  const dir = path.join(CONTENT_ROOT, "sections");
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  } catch {
    return {};
  }
  const out: Record<string, SectionEntry> = {};
  for (const f of files) {
    const fileKey = f.replace(/\.md$/, "");
    const entry = load("sections", fileKey);
    if (entry && entry.type === "section") {
      out[entry.section_in_view] = entry;
    }
  }
  return out;
}
