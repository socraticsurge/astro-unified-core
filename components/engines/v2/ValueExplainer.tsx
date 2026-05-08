"use client";
import { useEffect, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";

type Source = { text: string; chapter?: number | string; sloka?: number | string };

type ValueKind =
  | { kind: "planet-in-house"; planet: string; house: number; label?: string }
  | { kind: "dasha-pair"; mahadasha: string; antardasha: string; label?: string }
  | { kind: "nakshatra"; nakshatra: string; label?: string }
  | { kind: "ascendant"; sign: string; label?: string }
  | { kind: "house-lordship"; lordOfHouse: number; placedInHouse: number; label?: string };

type Props = ValueKind;

type Payload = {
  type: string;
  title: string;
  sources?: Source[];
  // Single-track
  bodyHtml?: string;
  // Two-track
  sourceHtml?: string;
  renderingHtml?: string | null;
  rendering_status?: "pending" | "done";
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

/**
 * Inline expandable for per-row content. Closed by default. On expand,
 * fetches the entry from /api/content/[type]/[key]; if 404, renders
 * nothing (briefing: no placeholders). Once fetched, the response is
 * cached client-side so reopening is instant.
 *
 * For two-track entries with a non-empty rendering, the rendering is
 * shown by default and the source verse is reachable via an
 * "Original source" sub-toggle.
 */
export function ValueExplainer(props: Props) {
  const { type, key } = buildKey(props);
  const cacheKey = `${type}:${key}`;

  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<Payload | null>(() => {
    const cached = cache.get(cacheKey);
    return cached && cached !== "missing" ? cached : null;
  });
  const [missing, setMissing] = useState<boolean>(() => cache.get(cacheKey) === "missing");
  const [showSource, setShowSource] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || payload || missing) return;
    let cancelled = false;
    // Defer the loading-state flip into a microtask so it lands after
    // commit, not synchronously inside the effect — keeps the
    // react-hooks/set-state-in-effect rule happy.
    const run = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      setError(null);
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
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [open, payload, missing, type, key, cacheKey]);

  // If we already know it's missing and the user hasn't opened it yet,
  // don't render any toggle at all — keeps the table clean.
  if (missing && !open) return null;

  // Decide what to display once payload arrives
  const isTwoTrack = payload && (payload.sourceHtml !== undefined);
  const hasRendering = !!(isTwoTrack && payload?.renderingHtml);
  const primaryHtml = !payload
    ? null
    : isTwoTrack
      ? hasRendering
        ? payload.renderingHtml!
        : payload.sourceHtml!
      : (payload.bodyHtml ?? "");

  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        aria-expanded={open}
        aria-label={`Show ${props.label ?? "details"}`}
      >
        <ChevronRight
          className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span className="text-[11px] uppercase tracking-wide">
          {open ? "Hide" : "Show"} verses
        </span>
      </button>

      {open && (
        <div className="mt-2 ml-4 pl-3 border-l border-white/10 text-sm">
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground py-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading…
            </div>
          )}
          {error && <p className="text-red-400 py-1">{error}</p>}
          {missing && !loading && !payload && (
            // Should be unreachable due to early return above, but keeps
            // type narrowing happy.
            <p className="text-muted-foreground italic py-1">No entry available.</p>
          )}
          {payload && primaryHtml && (
            <>
              <div
                className="prose prose-sm prose-invert max-w-none
                  prose-p:leading-relaxed prose-p:my-2
                  prose-headings:font-heading prose-headings:font-medium
                  prose-h3:text-sm prose-h3:my-2 prose-h3:text-muted-foreground
                  prose-blockquote:border-l-2 prose-blockquote:border-amber-500/50
                  prose-blockquote:bg-amber-950/10 prose-blockquote:py-1 prose-blockquote:px-3
                  prose-blockquote:italic prose-blockquote:text-foreground/85
                  prose-em:text-foreground/90"
                dangerouslySetInnerHTML={{ __html: primaryHtml }}
              />
              {isTwoTrack && hasRendering && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setShowSource((s) => !s)}
                    className="text-[11px] uppercase tracking-wide text-muted-foreground hover:text-foreground"
                  >
                    {showSource ? "Hide" : "Show"} original source
                  </button>
                  {showSource && (
                    <div
                      className="mt-2 prose prose-sm prose-invert max-w-none
                        prose-p:leading-relaxed prose-p:my-2
                        prose-h2:text-xs prose-h2:uppercase prose-h2:tracking-wide
                        prose-h2:text-muted-foreground prose-h2:my-1
                        prose-blockquote:border-l-2 prose-blockquote:border-amber-500/50
                        prose-blockquote:bg-amber-950/10 prose-blockquote:py-1 prose-blockquote:px-3
                        prose-blockquote:italic prose-blockquote:text-foreground/85"
                      dangerouslySetInnerHTML={{ __html: payload.sourceHtml! }}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
