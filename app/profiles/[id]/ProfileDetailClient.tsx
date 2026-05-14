"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { DashaflowView } from "@/components/engines/DashaflowView";
import { ProfessionalView } from "@/components/engines/ProfessionalView";
import { Button } from "@/components/ui/button";
import {
  RefreshCw, AlertCircle, Code, Copy, Check, Info,
  LayoutDashboard, User
} from "lucide-react";
import type { Profile } from "@/lib/db";
import { summarizeDashaflow } from "@/lib/chart-summary";
import { extractEngineError } from "@/lib/engine-error";

import {
  ProfileBadges,
  BirthDetails,
  CurrentLocationDetails,
} from "@/components/profile-ui";

type SectionExplainer = {
  title: string;
  gist?: string | null;
  bodyHtml: string;
  sources?: { text: string; chapter?: number | string; sloka?: number | string }[];
};

type EngineState = { output: any; loading: boolean; error?: string };

type Props = {
  explainers: Record<string, SectionExplainer>;
  profile: Profile;
  profiles: Profile[];
};

function profileHeaderText(p: Profile): string {
  return [
    `Name: ${p.name}`,
    `Relationship: ${p.relationship || "-"}`,
    `Gender: ${p.gender || "-"}`,
    `Date of birth: ${p.date_of_birth}`,
    `Time of birth: ${p.time_of_birth} (${p.timezone}, UTC${p.timezone_offset >= 0 ? "+" : ""}${p.timezone_offset})`,
    `Place of birth: ${p.place_of_birth} (lat ${p.latitude}, lon ${p.longitude})`,
    `Current location: ${p.current_location || "Not set"}`,
  ].join("\n");
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function CopyButton({ getText, label = "Copy" }: { getText: () => string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        const ok = await copyToClipboard(getText());
        if (ok) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }
      }}
      className="h-7 text-xs gap-1"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

export function ProfileDetailClient({ explainers, profile, profiles }: Props) {
  const id = profile.id;
  const { data: session } = useSession();
  const showAdminTools = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin === true;

  const [reading, setReading] = useState<EngineState>({ output: null, loading: true });
  const [transit, setTransit] = useState<EngineState>({ output: null, loading: false });
  const [career, setCareer] = useState<EngineState>({ output: null, loading: false });
  const [transitDate, setTransitDate] = useState<string | undefined>();

  const [isProfessional, setIsProfessional] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const fetchReading = useCallback(
    async (force = false) => {
      setReading({ output: null, loading: true });
      try {
        const res = force
          ? await fetch(`/api/readings/dashaflow`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ profile_id: id }),
            })
          : await fetch(`/api/readings/dashaflow?profile_id=${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Request failed");
        const innerErr = extractEngineError(data.output);
        if (innerErr) throw new Error(innerErr);
        setReading({ output: data.output, loading: false });
      } catch (err) {
        setReading({
          output: null,
          loading: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
    [id]
  );

  const fetchTransit = useCallback(async (force = false) => {
    if (transit.output && !force) return;
    setTransit({ output: null, loading: true });
    try {
      const res = force
        ? await fetch(`/api/readings/transit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile_id: id }) })
        : await fetch(`/api/readings/transit?profile_id=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Transit fetch failed");
      setTransitDate(data.transit_date);
      setTransit({ output: data.output, loading: false });
    } catch (e) {
      setTransit({ output: null, loading: false, error: e instanceof Error ? e.message : String(e) });
    }
  }, [id, transit.output]);

  const fetchCareer = useCallback(async (force = false) => {
    if (career.output && !force) return;
    setCareer({ output: null, loading: true });
    try {
      const res = force
        ? await fetch(`/api/readings/career`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile_id: id }) })
        : await fetch(`/api/readings/career?profile_id=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Career fetch failed");
      setCareer({ output: data.output, loading: false });
    } catch (e) {
      setCareer({ output: null, loading: false, error: e instanceof Error ? e.message : String(e) });
    }
  }, [id, career.output]);

  useEffect(() => {
    fetchReading();
  // fetchReading is stable for a given id; re-running on id change is correct.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const summaryText = useMemo(() => {
    if (!profile || !reading.output) return "";
    return [
      "=== DashaFlow (Vedic, sidereal Lahiri) ===",
      "",
      profileHeaderText(profile),
      "",
      summarizeDashaflow(reading.output),
    ].join("\n");
  }, [profile, reading.output]);

  const initials = profile.name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Missing Information Nudge */}
      {!profile.current_location && (
        <div className="mb-6 flex items-center justify-between gap-4 p-3 rounded-lg bg-red-950/20 border border-red-800/40 text-sm">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span>Muhurtha and Transit features require your current location.</span>
          </div>
          <Link href={`/profiles/${profile.id}/edit`}>
            <Button size="sm" variant="destructive" className="h-8 text-xs">
              Complete Profile
            </Button>
          </Link>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="mb-8 flex items-start gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/10 shadow-2xl backdrop-blur-sm">
        {/* Monogram Avatar */}
        <div className="shrink-0 h-16 w-16 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg border-2 border-white/10">
          <span className="text-2xl font-bold text-amber-950 drop-shadow-md">{initials}</span>
        </div>

        {/* Identity + Birth Data */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <h1 className="text-3xl font-bold leading-tight tracking-tight">{profile.name}</h1>
            <ProfileBadges
              relationship={profile.relationship}
              gender={profile.gender}
              current_location={profile.current_location}
              profileId={profile.id}
            />
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

      <div className="flex items-center justify-between py-3 border-b border-white/10 mb-6">
        <div className="flex items-center gap-2">
          {reading.error && <AlertCircle className="h-4 w-4 text-red-500" />}
          {reading.loading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
          <span className="text-sm font-medium text-green-400">
            {reading.loading ? "Preparing your chart…" : reading.error ? "Error loading chart" : ""}
          </span>
        </div>
        
        <div className="flex gap-2 items-center">
          {showAdminTools && (
            <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/10 shadow-inner">
              <Button 
                variant={isProfessional ? "ghost" : "secondary"} 
                size="sm" 
                onClick={() => setIsProfessional(false)}
                className={`h-7 text-[10px] px-3 gap-1.5 uppercase font-bold tracking-wider transition-all ${!isProfessional ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-white"}`}
              >
                <User className="h-3 w-3" />
                Basic
              </Button>
              <Button 
                variant={isProfessional ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setIsProfessional(true)}
                className={`h-7 text-[10px] px-3 gap-1.5 uppercase font-bold tracking-wider transition-all ${isProfessional ? "bg-violet-500/20 text-violet-300 shadow-sm border border-violet-500/30" : "text-muted-foreground hover:text-white"}`}
              >
                <LayoutDashboard className="h-3 w-3" />
                Professional
              </Button>
            </div>
          )}

          {showAdminTools && !!reading.output && !isProfessional && (
            <CopyButton getText={() => summaryText} label="Copy summary" />
          )}
          {showAdminTools && !!reading.output && (
            <Button variant="ghost" size="sm" onClick={() => setShowRaw(!showRaw)} className={`h-7 text-xs gap-1 ${showRaw ? "text-yellow-400 bg-yellow-400/10" : ""}`}>
              <Code className="h-3 w-3" />
              {showRaw ? "JSON" : "Raw"}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => void fetchReading(true)} disabled={reading.loading} className="h-7 text-xs gap-1">
            <RefreshCw className={`h-3 w-3 ${reading.loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {reading.error && (
        <div className="mb-6 p-4 rounded-lg bg-red-950/20 border border-red-800/40 text-red-400 text-sm">
          {reading.error}
        </div>
      )}

      {showRaw && reading.output && (
        <details className="mb-6 border border-white/10 rounded-lg overflow-hidden" open>
          <summary className="cursor-pointer px-4 py-2 bg-white/5 text-xs font-mono font-bold text-muted-foreground hover:bg-white/10 border-b border-white/10">
            Engine Output Snapshot
          </summary>
          <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-all text-muted-foreground bg-black/40">
            {JSON.stringify(reading.output, null, 2)}
          </pre>
        </details>
      )}

      {isProfessional && reading.output ? (
        <ProfessionalView
          chartOutput={reading.output}
          transitOutput={transit.output}
          careerOutput={career.output}
          transitDate={transitDate}
          explainers={explainers}
          profiles={profiles}
          onFetchTransit={fetchTransit}
          onFetchCareer={fetchCareer}
          isTransitLoading={transit.loading}
          isCareerLoading={career.loading}
        />
      ) : (
        <>
          {/* Permanent hint strip for basic view */}
          {!!reading.output && (
            <div className="flex items-start gap-2 mb-6 px-3 py-2.5 rounded-lg bg-amber-950/20 border border-amber-800/30">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-400/80" />
              <p className="text-xs text-amber-300/80 leading-relaxed">
                Each section below has a <span className="text-amber-300 font-semibold">ⓘ</span> button. Tap it to read the classical Vedic interpretation for your chart.
              </p>
            </div>
          )}
          {reading.output ? (
            <DashaflowView output={reading.output} explainers={explainers} />
          ) : !reading.error && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground border border-white/5 rounded-2xl bg-white/[0.02]">
              <RefreshCw className="h-10 w-10 animate-spin text-green-500/50" />
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-white/80">Calculating your chart...</p>
                <p className="text-xs">Connecting to the Swiss Ephemeris sidecar</p>
              </div>
            </div>
          )}
        </>
      )}

      <footer className="mt-12 pt-6 border-t border-white/10">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Verses adapted from classical sources; rephrasings by Dr. Vinay Kumar Chaganti.
          See <Link href="/credits" className="hover:underline text-violet-400">credits</Link> for source attribution.
        </p>
      </footer>
    </div>
  );
}
