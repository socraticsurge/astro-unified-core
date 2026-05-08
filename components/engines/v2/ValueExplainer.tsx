"use client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type ValueKind =
  | { kind: "planet-in-house"; planet: string; house: number }
  | { kind: "dasha-pair"; mahadasha: string; antardasha: string }
  | { kind: "nakshatra"; nakshatra: string }
  | { kind: "ascendant"; sign: string }
  | { kind: "house-lordship"; lordOfHouse: number; placedInHouse: number };

type Props = ValueKind & {
  /**
   * Visual variant.
   * - "card": padded panel with a left accent border and "What this means" header.
   *   Use under Lagna, Maha-Antar dasha, Nakshatra cards.
   * - "row": compact inline prose without the header. Use inside a table cell
   *   that spans the row, e.g. under each planet's row in Planetary Positions.
   */
  variant?: "card" | "row";
};

type Payload = {
  type: string;
  title: string;
  bodyHtml: string;
};

const slug = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "-");

function buildKey(p: Props): { type: string; key: string } {
  switch (p.kind) {
    case "planet-in-house":
      return { type: "planet-in-house", key: `${slug(p.planet)}-${p.house}` };
    case "dasha-pair":
      return { type: "dasha-pair", key: `${slug(p.mahadasha)}-${slug(p.antardasha)}` };
    case "nakshatra":
      return { type: "nakshatra", key: slug(p.nakshatra) };
    case "ascendant":
      return { type: "ascendant", key: slug(p.sign) };
    case "house-lordship":
      return { type: "house-lordship", key: `${p.lordOfHouse}-in-${p.placedInHouse}` };
  }
}

const cache = new Map<string, Payload | "missing">();

const proseClasses = `
  prose prose-sm prose-invert max-w-none
  prose-p:leading-relaxed prose-p:my-1.5
  prose-headings:font-heading prose-headings:font-medium prose-headings:text-foreground
  prose-h2:text-base prose-h2:mt-3 prose-h2:mb-1
  prose-h3:text-sm prose-h3:mt-2 prose-h3:mb-1 prose-h3:text-muted-foreground prose-h3:uppercase prose-h3:tracking-wide prose-h3:text-[11px]
  prose-blockquote:border-l-2 prose-blockquote:border-amber-500/50
  prose-blockquote:bg-amber-950/10 prose-blockquote:py-1 prose-blockquote:px-3
  prose-blockquote:not-italic prose-blockquote:text-foreground/85
  prose-blockquote:my-2
  prose-strong:text-foreground prose-em:text-foreground/90
  prose-table:text-xs prose-th:font-medium prose-th:text-left
  prose-th:border-b prose-th:border-white/10 prose-th:py-1.5
  prose-td:py-1.5 prose-td:border-b prose-td:border-white/5
  prose-a:text-blue-300 prose-a:no-underline hover:prose-a:underline
  prose-ul:my-2 prose-li:my-0.5
`;

/**
 * Always-visible inline interpretation. Fetches the entry on mount,
 * caches by (type, key), and renders nothing if the entry is missing.
 * No manual toggle — the content is the point.
 */
export function ValueExplainer(props: Props) {
  const variant = props.variant ?? "card";
  const { type, key } = buildKey(props);
  const cacheKey = `${type}:${key}`;

  const [payload, setPayload] = useState<Payload | null>(() => {
    const cached = cache.get(cacheKey);
    return cached && cached !== "missing" ? cached : null;
  });
  const [missing, setMissing] = useState<boolean>(() => cache.get(cacheKey) === "missing");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(() => {
    const cached = cache.get(cacheKey);
    return cached === undefined;
  });

  useEffect(() => {
    if (payload || missing) return;
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      try {
        const r = await fetch(`/api/content/${type}/${key}`);
        if (cancelled) return;
        if (r.status === 404) {
          cache.set(cacheKey, "missing");
          setMissing(true);
          return;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const p = (await r.json()) as Payload;
        if (cancelled) return;
        cache.set(cacheKey, p);
        setPayload(p);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [payload, missing, type, key, cacheKey]);

  // Missing entries: render nothing (no placeholder)
  if (missing) return null;
  // Don't surface fetch errors loudly to end users — just render nothing
  if (error && !payload) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground/70 py-1">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading interpretation…
      </div>
    );
  }

  if (!payload) return null;

  if (variant === "row") {
    return (
      <div
        className={`${proseClasses} text-foreground/85`}
        dangerouslySetInnerHTML={{ __html: payload.bodyHtml }}
      />
    );
  }

  // "card" variant
  return (
    <div className="bg-white/5 border-l-2 border-green-500/40 rounded-r-lg px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-green-400/70 font-medium mb-1.5">
        What this means
      </p>
      <div
        className={proseClasses}
        dangerouslySetInnerHTML={{ __html: payload.bodyHtml }}
      />
    </div>
  );
}
