"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { RefreshCw, AlertCircle, ArrowLeft, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfessionalView } from "@/components/engines/ProfessionalView";
import { extractEngineError } from "@/lib/engine-error";

type SectionExplainer = {
  title: string;
  gist?: string | null;
  bodyHtml: string;
  sources?: { text: string; chapter?: number | string; sloka?: number | string }[];
};

type EngineState = { output: Record<string, unknown> | null; loading: boolean; error?: string };

type Props = { explainers: Record<string, SectionExplainer> };

export function ProfessionalChartClient({ explainers }: Props) {
  const { id } = useParams<{ id: string }>();
  const [chart, setChart] = useState<EngineState>({ output: null, loading: true });
  const [transit, setTransit] = useState<EngineState>({ output: null, loading: true });
  const [career, setCareer] = useState<EngineState>({ output: null, loading: true });
  const [transitDate, setTransitDate] = useState<string | undefined>();
  const [showRaw, setShowRaw] = useState(false);

  const fetchChart = useCallback(async (force = false) => {
    setChart({ output: null, loading: true });
    try {
      const res = force
        ? await fetch(`/api/readings/dashaflow`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile_id: id }) })
        : await fetch(`/api/readings/dashaflow?profile_id=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Chart fetch failed");
      const err = extractEngineError(data.output);
      if (err) throw new Error(err);
      setChart({ output: data.output as Record<string, unknown>, loading: false });
    } catch (e) {
      setChart({ output: null, loading: false, error: e instanceof Error ? e.message : String(e) });
    }
  }, [id]);

  const fetchTransit = useCallback(async (force = false) => {
    setTransit({ output: null, loading: true });
    try {
      const res = force
        ? await fetch(`/api/readings/transit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile_id: id }) })
        : await fetch(`/api/readings/transit?profile_id=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Transit fetch failed");
      setTransitDate(data.transit_date);
      setTransit({ output: data.output as Record<string, unknown>, loading: false });
    } catch (e) {
      setTransit({ output: null, loading: false, error: e instanceof Error ? e.message : String(e) });
    }
  }, [id]);

  const fetchCareer = useCallback(async (force = false) => {
    setCareer({ output: null, loading: true });
    try {
      const res = force
        ? await fetch(`/api/readings/career`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile_id: id }) })
        : await fetch(`/api/readings/career?profile_id=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Career fetch failed");
      setCareer({ output: data.output as Record<string, unknown>, loading: false });
    } catch (e) {
      setCareer({ output: null, loading: false, error: e instanceof Error ? e.message : String(e) });
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      fetchChart();
      fetchTransit();
      fetchCareer();
    })();
    return () => { cancelled = true; };
  }, [fetchChart, fetchTransit, fetchCareer]);

  const anyLoading = chart.loading || transit.loading || career.loading;
  const anyError = chart.error ?? transit.error ?? career.error;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b">
        <div className="flex items-center gap-3">
          <Link href={`/profiles/${id}`} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-violet-300">Professional Chart</h1>
            <p className="text-xs text-muted-foreground">Admin-only detailed view · All DashaFlow engines</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => setShowRaw((r) => !r)} className="h-7 text-xs gap-1">
            <Code className="h-3 w-3" />
            {showRaw ? "View" : "Raw"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => fetchTransit(true)} disabled={transit.loading} className="h-7 text-xs gap-1">
            <RefreshCw className={`h-3 w-3 ${transit.loading ? "animate-spin" : ""}`} />
            Transit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { fetchChart(true); fetchCareer(true); }} disabled={anyLoading} className="h-7 text-xs gap-1">
            <RefreshCw className={`h-3 w-3 ${anyLoading ? "animate-spin" : ""}`} />
            Refresh All
          </Button>
        </div>
      </div>

      {/* Status Row */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        {[
          { label: "Chart", state: chart },
          { label: "Transit", state: transit },
          { label: "Career", state: career },
        ].map(({ label, state }) => (
          <div key={label} className="flex items-center gap-1.5">
            {state.loading && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
            {state.error && <AlertCircle className="h-3 w-3 text-red-400" />}
            <span className={`${state.loading ? "text-muted-foreground" : state.error ? "text-red-400" : "text-emerald-400"}`}>
              {label}: {state.loading ? "Loading…" : state.error ? "Error" : "Ready"}
            </span>
          </div>
        ))}
      </div>

      {/* Error display */}
      {anyError && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-800/50 rounded-lg p-3 mb-4">
          {anyError}
        </div>
      )}

      {/* Raw JSON toggle (shows all 3 payloads) */}
      {showRaw && (
        <div className="space-y-4 mb-6">
          {[
            { label: "Chart", data: chart.output },
            { label: "Transit", data: transit.output },
            { label: "Career", data: career.output },
          ].map(({ label, data }) => (
            <details key={label} className="border border-white/10 rounded-lg" open>
              <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-white/5 rounded-lg">
                {label} Raw JSON
              </summary>
              <pre className="px-3 pb-3 text-xs font-mono whitespace-pre-wrap break-all text-muted-foreground">
                {data ? JSON.stringify(data, null, 2) : "null"}
              </pre>
            </details>
          ))}
        </div>
      )}

      {/* Main professional view */}
      {!showRaw && chart.output && (
        <ProfessionalView
          chartOutput={chart.output}
          transitOutput={transit.output}
          careerOutput={career.output}
          transitDate={transitDate}
          explainers={explainers}
        />
      )}

      {!chart.output && !chart.loading && !chart.error && (
        <div className="text-center py-16 text-muted-foreground">
          <Button onClick={() => fetchChart(true)} variant="outline">Generate chart</Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-12 pt-4 border-t border-white/10">
        Verses adapted from classical sources; rephrasings by Dr. Vinay Kumar Chaganti.
      </p>
    </div>
  );
}
