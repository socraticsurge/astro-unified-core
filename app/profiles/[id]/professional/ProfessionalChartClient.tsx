"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { RefreshCw, AlertCircle, ArrowLeft, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfessionalView } from "@/components/engines/ProfessionalView";
import { extractEngineError } from "@/lib/engine-error";
import type { Profile } from "@/lib/db";
import { 
  RelationshipBadge, 
  GenderBadge, 
  CurrentLocationBadge, 
  BirthDetails, 
  CurrentLocationDetails 
} from "@/components/profile-ui";

type SectionExplainer = {
  title: string;
  gist?: string | null;
  bodyHtml: string;
  sources?: { text: string; chapter?: number | string; sloka?: number | string }[];
};

type EngineState = { output: Record<string, unknown> | null; loading: boolean; error?: string };

type Props = { 
  explainers: Record<string, SectionExplainer>;
  initialChart: Record<string, unknown> | null;
  profile: Profile;
};

export function ProfessionalChartClient({ explainers, initialChart, profile }: Props) {
  const { id } = useParams<{ id: string }>();
  const [chart, setChart] = useState<EngineState>({ 
    output: initialChart, 
    loading: initialChart ? false : true 
  });
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
    if (!initialChart) {
      void fetchChart();
    }
    void fetchTransit();
    void fetchCareer();
  }, [fetchChart, fetchTransit, fetchCareer, initialChart]);

  const anyLoading = chart.loading || transit.loading || career.loading;
  const anyError = chart.error ?? transit.error ?? career.error;

  const initials = profile.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* ─── Breadcrumb / Nav ─── */}
      <div className="flex items-center justify-between mb-8">
        <Link href={`/profiles/${id}`}>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Basic View
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void fetchChart(true);
              void fetchTransit(true);
              void fetchCareer(true);
            }}
            disabled={anyLoading}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${anyLoading ? "animate-spin" : ""}`} />
            Refresh All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRaw(!showRaw)}
            className={`h-8 text-xs gap-1.5 ${showRaw ? "text-yellow-400 bg-yellow-400/10" : ""}`}
          >
            <Code className="h-3.5 w-3.5" />
            {showRaw ? "Hide Raw" : "Raw Data"}
          </Button>
        </div>
      </div>

      {/* ─── Profile Header Card (Shared with Basic View) ─── */}
      <div className="mb-8 flex items-start gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/10 shadow-2xl backdrop-blur-sm">
        {/* Monogram Avatar */}
        <div className="shrink-0 h-16 w-16 rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center shadow-lg border-2 border-white/10">
          <span className="text-2xl font-bold text-white drop-shadow-md">{initials}</span>
        </div>

        {/* Identity + Birth Data */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-violet-400 font-bold mb-1">Professional Reading</p>
              <h1 className="text-3xl font-bold leading-tight tracking-tight">{profile.name}</h1>
            </div>
            <div className="flex gap-1.5 flex-wrap pt-2">
              <RelationshipBadge value={profile.relationship} profileId={profile.id} />
              <GenderBadge value={profile.gender} profileId={profile.id} />
              <CurrentLocationBadge value={profile.current_location} profileId={profile.id} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <BirthDetails
              date_of_birth={profile.date_of_birth}
              time_of_birth={profile.time_of_birth}
              place_of_birth={profile.place_of_birth}
              timezone={profile.timezone}
              timezone_offset={profile.timezone_offset}
            />
            {profile.current_location && profile.current_timezone && (
              <CurrentLocationDetails
                location={profile.current_location}
                timezone={profile.current_timezone}
                timezone_offset={profile.current_timezone_offset ?? 0}
              />
            )}
          </div>
        </div>
      </div>

      {/* ─── Raw Data Display ─── */}
      {showRaw && (
        <div className="space-y-4 mb-8">
          {[
            { label: "Chart", data: chart.output },
            { label: "Transit", data: transit.output },
            { label: "Career", data: career.output },
          ].map(({ label, data }) => (
            <details key={label} className="border border-white/10 rounded-lg">
              <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-white/5 rounded-lg uppercase tracking-wider">
                {label} Raw JSON
              </summary>
              <pre className="px-3 py-3 text-[10px] font-mono whitespace-pre-wrap break-all text-muted-foreground bg-black/20">
                {data ? JSON.stringify(data, null, 2) : "null"}
              </pre>
            </details>
          ))}
        </div>
      )}

      {/* ─── The Main Dashboard ─── */}
      {anyError ? (
        <div className="p-8 rounded-xl bg-red-950/20 border border-red-800/30 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-red-400">Analysis Error</h2>
          <p className="text-sm text-muted-foreground mt-1">{anyError}</p>
          <Button variant="outline" className="mt-4" onClick={() => { fetchChart(true); fetchTransit(true); fetchCareer(true); }}>
            Retry Fetch
          </Button>
        </div>
      ) : (
        chart.output && (
          <ProfessionalView
            chartOutput={chart.output}
            transitOutput={transit.output}
            careerOutput={career.output}
            transitDate={transitDate}
            explainers={explainers}
          />
        )
      )}

      {!chart.output && !chart.loading && !chart.error && (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-white/10 rounded-xl">
          <p className="mb-4">No chart data available.</p>
          <Button onClick={() => fetchChart(true)} variant="outline">Generate Chart</Button>
        </div>
      )}

      <footer className="mt-12 pt-4 border-t border-white/10">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest text-center">
          AstroUnified Professional Interface · Verses adapted from classical sources
        </p>
      </footer>
    </div>
  );
}
