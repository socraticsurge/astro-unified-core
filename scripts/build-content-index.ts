/**
 * Pre-builds the content index JSON at build time so the Lambda never parses
 * markdown files at runtime. Run via `npm run prebuild` before `next build`.
 *
 * Output: lib/content/content-index.json
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const CONTENT_ROOT = path.join(process.cwd(), "content");
const OUTPUT = path.join(process.cwd(), "lib/content/content-index.json");

type Source = { text: string; chapter?: string; url?: string };
type Frontmatter = Record<string, unknown>;

const TYPE_TO_DIR: Record<string, string> = {
  section: "sections",
  "planet-in-house": "planet-in-house",
  "dasha-pair": "dasha-pair",
  nakshatra: "nakshatra",
  ascendant: "ascendant",
  "house-lordship": "house-lordship",
};

function parseSources(raw: unknown): Source[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .map((s) => (typeof s === "object" && s !== null ? (s as Source) : null))
    .filter((s): s is Source => s !== null);
}

function parseFile(typeDir: string, fileKey: string): unknown | null {
  const full = path.join(CONTENT_ROOT, typeDir, `${fileKey}.md`);
  let text: string;
  try {
    text = fs.readFileSync(full, "utf8");
  } catch {
    return null;
  }
  const { data, content } = matter(text) as { data: Frontmatter; content: string };
  const body = content.trim();
  const key = String(data.key ?? `${typeDir}:${fileKey}`);
  const title = String(data.title ?? "");
  const sources = parseSources(data.sources);

  switch (data.type) {
    case "section":
      return {
        type: "section", key, title,
        section_in_view: String(data.section_in_view ?? title),
        gist: data.gist ? String(data.gist) : undefined,
        sources, body,
      };
    case "planet-in-house": {
      const f = (data.factors ?? {}) as { planet?: unknown; house?: unknown };
      return {
        type: "planet-in-house", key, title,
        factors: { planet: String(f.planet ?? ""), house: Number(f.house ?? 0) },
        sources, body,
      };
    }
    case "dasha-pair": {
      const f = (data.factors ?? {}) as { mahadasha?: unknown; antardasha?: unknown };
      return {
        type: "dasha-pair", key, title,
        factors: { mahadasha: String(f.mahadasha ?? ""), antardasha: String(f.antardasha ?? "") },
        sources,
        rendering_status: data.rendering_status === "done" ? "done" : "pending",
        body,
      };
    }
    case "nakshatra": {
      const f = (data.factors ?? {}) as { nakshatra?: unknown; sequence?: unknown };
      return {
        type: "nakshatra", key, title,
        factors: {
          nakshatra: String(f.nakshatra ?? ""),
          sequence: f.sequence !== undefined ? Number(f.sequence) : undefined,
        },
        sources,
        rendering_status: data.rendering_status === "done" ? "done" : "pending",
        body,
      };
    }
    case "ascendant": {
      const f = (data.factors ?? {}) as { sign?: unknown };
      return {
        type: "ascendant", key, title,
        factors: { sign: String(f.sign ?? "") },
        sources,
        rendering_status: data.rendering_status === "done" ? "done" : "pending",
        body,
      };
    }
    case "house-lordship": {
      const f = (data.factors ?? {}) as { lord_of_house?: unknown; placed_in_house?: unknown };
      return {
        type: "house-lordship", key, title,
        factors: {
          lord_of_house: Number(f.lord_of_house ?? 0),
          placed_in_house: Number(f.placed_in_house ?? 0),
        },
        sources,
        rendering_status: data.rendering_status === "done" ? "done" : "pending",
        body,
      };
    }
    default:
      return null;
  }
}

const index: Record<string, unknown> = {};
let total = 0;

for (const [, dir] of Object.entries(TYPE_TO_DIR)) {
  const dirPath = path.join(CONTENT_ROOT, dir);
  let files: string[] = [];
  try {
    files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".md"));
  } catch {
    continue;
  }
  for (const f of files) {
    const fileKey = f.replace(/\.md$/, "");
    const cacheKey = `${dir}:${fileKey}`;
    const entry = parseFile(dir, fileKey);
    if (entry !== null) {
      index[cacheKey] = entry;
      total++;
    }
  }
}

fs.writeFileSync(OUTPUT, JSON.stringify(index));
console.log(`Content index built: ${total} entries → ${OUTPUT}`);
