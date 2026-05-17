"use client";
import { useState, useEffect, useCallback } from "react";
import { ChevronDown, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModelPicker } from "@/components/ui/ModelPicker";
import { AIInsightCard } from "./AIInsightCard";
import { DEFAULT_INSIGHT_MODEL, type AiModelKey } from "@/lib/engines/models";
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
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<AiModelKey>(DEFAULT_INSIGHT_MODEL);

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
          setOpen(true);
        }
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    fetchCached();
    return () => { cancelled = true; };
  }, [profileId, tab]);

  const generate = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    setOpen(true);
    try {
      const res = await fetch("/api/readings/ai-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: profileId, tab, model, force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate insight");
      setState({ insight: data.insight, readingId: data.reading_id, rating: data.rating });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [profileId, tab, model]);

  return (
    <div className="mb-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <Sparkles className="h-3.5 w-3.5 text-violet-400 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-2)] flex-1">
          AI Insight
        </span>

        <ModelPicker value={model} onChange={setModel} disabled={checking || loading} />

        {/* Generate (first time) or Regenerate (already has insight) */}
        <Button
          variant="ghost"
          size="sm"
          disabled={checking || loading}
          onClick={(e) => { e.stopPropagation(); generate(!!state); }}
          className="h-6 px-2 text-[11px] text-[var(--color-ink-2)] hover:text-[var(--color-ink-1)] hover:bg-[var(--color-surface-hover)] gap-1 ml-1"
        >
          {loading
            ? <RefreshCw className="h-3 w-3 animate-spin" />
            : <RefreshCw className="h-3 w-3" />}
          {state ? "Regenerate" : "Generate"}
        </Button>

        {(state || loading) && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="p-0.5 text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)] transition-colors"
            aria-expanded={open}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 border-t border-[var(--color-border-subtle)] pt-3">
          {loading && (
            <div className="flex items-center gap-2 py-6 justify-center text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin text-violet-400" />
              Generating insight…
            </div>
          )}
          {error && !loading && (
            <p className="text-xs text-[var(--color-danger)] py-3">{error}</p>
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
