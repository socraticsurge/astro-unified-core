"use client";
import { useState, useEffect, useCallback } from "react";
import { ChevronDown, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIInsightCard } from "./AIInsightCard";
import type { InsightTab, TabInsight } from "@/lib/ai-insight";

type Props = {
  profileId: string;
  tab: InsightTab;
};

type InsightState = {
  insight: TabInsight;
  readingId: string;
  rating: 1 | -1 | null;
} | null;

export function AIInsightShell({ profileId, tab }: Props) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<InsightState>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const isTransit = tab === "transit";

  // On mount: check for cached insight
  useEffect(() => {
    let cancelled = false;
    async function fetchCached() {
      try {
        const res = await fetch(
          `/api/readings/ai-insight?profile_id=${profileId}&tab=${tab}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.insight) {
          setState({ insight: data.insight, readingId: data.reading_id, rating: data.rating });
        }
      } catch {
        // silently ignore — user can generate manually
      } finally {
        if (!cancelled) setInitialized(true);
      }
    }
    fetchCached();
    return () => { cancelled = true; };
  }, [profileId, tab]);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOpen(true);
    try {
      const res = await fetch("/api/readings/ai-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: profileId, tab }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate insight");
      setState({ insight: data.insight, readingId: data.reading_id, rating: data.rating });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [profileId, tab]);

  const hasCached = !!state && !isTransit;
  const showGenerate = !hasCached || isTransit;

  if (!initialized) return null;

  return (
    <div className="mb-5 rounded-xl border border-violet-800/30 bg-violet-950/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <Sparkles className="h-3.5 w-3.5 text-violet-400 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wider text-violet-300 flex-1">
          AI Insight
        </span>

        {showGenerate && (
          <Button
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={(e) => { e.stopPropagation(); generate(); }}
            className="h-6 px-2 text-[11px] text-violet-300 hover:text-violet-100 hover:bg-violet-900/40 gap-1"
          >
            {loading ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            {isTransit && state ? "Refresh" : "Generate"}
          </Button>
        )}

        {(state || loading) && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="p-0.5 text-violet-400/60 hover:text-violet-300 transition-colors"
            aria-expanded={open}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 border-t border-violet-800/20 pt-3">
          {loading && (
            <div className="flex items-center gap-2 py-6 justify-center text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin text-violet-400" />
              Generating insight…
            </div>
          )}
          {error && !loading && (
            <p className="text-xs text-red-400 py-3">{error}</p>
          )}
          {state && !loading && (
            <AIInsightCard
              insight={state.insight}
              readingId={state.readingId}
              initialRating={state.rating}
            />
          )}
        </div>
      )}
    </div>
  );
}
