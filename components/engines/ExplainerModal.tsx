"use client";
import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";

type Source = { text: string; chapter?: number | string; sloka?: number | string };

export type ChartEntry = {
  /** Content type — matches /api/content/[type]/[key]. */
  type: "planet-in-house" | "dasha-pair" | "nakshatra" | "ascendant" | "house-lordship";
  /** File key inside that type. */
  key: string;
  /** Heading rendered above each entry's body in the modal. */
  heading: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Pre-rendered HTML for the section explainer body (the "About" tab). */
  bodyHtml: string;
  /** Optional one-line summary rendered above the tabs. */
  gist?: string | null;
  /** Sources for the section explainer (rendered in About-tab footer). */
  sources?: Source[];
  /**
   * Chart-specific entries to render in the "For your chart" tab. When
   * empty (or undefined), the modal renders only the explainer with no
   * tabs.
   */
  chartEntries?: ChartEntry[];
};

type FetchedEntry = {
  heading: string;
  bodyHtml: string;
};

const proseClasses = `
  prose prose-sm prose-invert max-w-none
  prose-headings:font-heading prose-headings:font-medium
  prose-h2:text-lg prose-h2:mt-5 prose-h2:mb-2
  prose-h3:text-base prose-h3:mt-4 prose-h3:mb-1.5
  prose-p:leading-relaxed prose-p:text-foreground/90
  prose-blockquote:border-l-2 prose-blockquote:border-amber-500/50
  prose-blockquote:bg-amber-950/10 prose-blockquote:py-1 prose-blockquote:px-3
  prose-blockquote:not-italic prose-blockquote:text-foreground/85
  prose-table:text-xs prose-th:font-medium prose-th:text-left
  prose-th:border-b prose-th:border-white/10 prose-th:py-1.5
  prose-td:py-1.5 prose-td:border-b prose-td:border-white/5
  prose-strong:text-foreground prose-em:text-foreground/90
  prose-a:text-blue-300 prose-a:no-underline hover:prose-a:underline
`;

// Lightweight client-side cache for chart-specific fetches.
const entryCache = new Map<string, FetchedEntry | "missing">();

/**
 * Hand-rolled accessible modal: backdrop + center panel, focus trap on
 * close button, Esc / click-outside / X-button to close, body scroll
 * locked while open. Below 768px it spans the full viewport.
 *
 * If `chartEntries` is provided and non-empty, the body splits into two
 * tabs: "For your chart" (default) and "About". Otherwise the body
 * renders the section explainer with no tabs (single-track behaviour).
 */
export function ExplainerModal({
  open,
  onClose,
  title,
  bodyHtml,
  gist,
  sources,
  chartEntries,
}: Props) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const hasChartEntries = !!chartEntries && chartEntries.length > 0;
  const [tab, setTab] = useState<"chart" | "about">(hasChartEntries ? "chart" : "about");
  const [chartLoading, setChartLoading] = useState(false);
  const [chartFetched, setChartFetched] = useState<Array<FetchedEntry | null>>([]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Fetch chart-specific entries once when the modal opens (or when the
  // entry list changes). Cached across opens of the same modal.
  useEffect(() => {
    if (!open || !hasChartEntries || !chartEntries) return;
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      // If every entry is already cached, skip the loading flicker.
      const allCached = chartEntries.every((e) =>
        entryCache.has(`${e.type}:${e.key}`)
      );
      if (!allCached) setChartLoading(true);
      const results = await Promise.all(
        chartEntries.map(async (e) => {
          const cacheKey = `${e.type}:${e.key}`;
          const cached = entryCache.get(cacheKey);
          if (cached === "missing") return null;
          if (cached) {
            return { heading: e.heading, bodyHtml: cached.bodyHtml };
          }
          try {
            const r = await fetch(`/api/content/${e.type}/${e.key}`);
            if (r.status === 404) {
              entryCache.set(cacheKey, "missing");
              return null;
            }
            if (!r.ok) return null;
            const json = (await r.json()) as { bodyHtml?: string };
            if (!json.bodyHtml) return null;
            const fetched = { heading: e.heading, bodyHtml: json.bodyHtml };
            entryCache.set(cacheKey, fetched);
            return fetched;
          } catch {
            return null;
          }
        })
      );
      if (cancelled) return;
      setChartFetched(results);
      setChartLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, hasChartEntries, chartEntries]);

  useEffect(() => {
    if (!open) return;
    setTab(hasChartEntries ? "chart" : "about");
  }, [open, hasChartEntries]);

  if (!open) return null;

  const renderedAbout = (
    <>
      <div
        className={`px-5 py-4 ${proseClasses}`}
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
      {sources && sources.length > 0 && (
        <div className="px-5 pb-4 -mt-2 text-xs text-muted-foreground">
          <span className="font-medium uppercase tracking-wide text-[10px]">Sources</span>{" "}
          {sources
            .map((s) => [s.text, s.chapter, s.sloka].filter(Boolean).join(" "))
            .join(" · ")}
        </div>
      )}
    </>
  );

  const renderedChart = hasChartEntries ? (
    chartLoading && chartFetched.length === 0 ? (
      <div className="flex items-center gap-2 text-sm text-muted-foreground px-5 py-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading readings…
      </div>
    ) : (
      <div className="px-5 py-4 space-y-6">
        {chartFetched.map((entry, i) => {
          if (!entry) return null;
          return (
            <section key={i}>
              <h3 className="font-heading text-base font-medium text-green-300 mb-2">
                {entry.heading}
              </h3>
              <div
                className={proseClasses}
                dangerouslySetInnerHTML={{ __html: entry.bodyHtml }}
              />
            </section>
          );
        })}
        {chartFetched.length > 0 && chartFetched.every((e) => e === null) && (
          <p className="text-sm text-muted-foreground italic">
            No readings available for this section.
          </p>
        )}
      </div>
    )
  ) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="explainer-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm md:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full h-full md:h-auto md:max-h-[85vh] md:w-[640px] md:max-w-[92vw] md:rounded-lg border border-white/10 bg-zinc-950 shadow-2xl flex flex-col">
        <header className="flex items-start justify-between gap-3 p-5 border-b border-white/10">
          <div>
            <h2 id="explainer-title" className="font-heading text-xl font-medium text-foreground">
              {title}
            </h2>
            {gist && (
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{gist}</p>
            )}
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {hasChartEntries ? (
          <>
            <div className="border-b border-white/10 px-5">
              <div role="tablist" className="flex gap-4 -mb-px">
                <button
                  role="tab"
                  aria-selected={tab === "chart"}
                  type="button"
                  onClick={() => setTab("chart")}
                  className={`py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    tab === "chart"
                      ? "border-green-400 text-green-300"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  For your chart
                </button>
                <button
                  role="tab"
                  aria-selected={tab === "about"}
                  type="button"
                  onClick={() => setTab("about")}
                  className={`py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    tab === "about"
                      ? "border-green-400 text-green-300"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  About
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {tab === "chart" ? renderedChart : renderedAbout}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto">{renderedAbout}</div>
        )}
      </div>
    </div>
  );
}
