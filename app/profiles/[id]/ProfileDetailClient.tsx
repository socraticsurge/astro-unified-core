"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { DashaflowView } from "@/components/engines/DashaflowView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, CheckCircle, Code, Copy, Check, Info } from "lucide-react";
import type { Profile } from "@/lib/db";
import { summarizeDashaflow } from "@/lib/chart-summary";
import { extractEngineError } from "@/lib/engine-error";
import { isAdmin } from "@/lib/admin";

type SectionExplainer = {
  title: string;
  gist?: string | null;
  bodyHtml: string;
  sources?: { text: string; chapter?: number | string; sloka?: number | string }[];
};

type EngineState = { output: unknown; loading: boolean; error?: string };

type Props = {
  explainers: Record<string, SectionExplainer>;
};

function profileHeaderText(p: Profile): string {
  return [
    `Name: ${p.name}`,
    `Relationship: ${p.relationship || "-"}`,
    `Gender: ${p.gender || "-"}`,
    `Date of birth: ${p.date_of_birth}`,
    `Time of birth: ${p.time_of_birth} (${p.timezone}, UTC${p.timezone_offset >= 0 ? "+" : ""}${p.timezone_offset})`,
    `Place of birth: ${p.place_of_birth} (lat ${p.latitude}, lon ${p.longitude})`,
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

export function ProfileDetailClient({ explainers }: Props) {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const showAdminTools = isAdmin(session);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reading, setReading] = useState<EngineState>({ output: null, loading: true });
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

  useEffect(() => {
    let cancelled = false;
    // Defer state updates one microtask so they don't fire
    // synchronously inside the effect body — keeps the
    // react-hooks/set-state-in-effect rule happy.
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      fetch(`/api/profiles/${id}`)
        .then(async (r) => {
          if (!r.ok) throw new Error(`Failed to load profile (${r.status})`);
          return r.json() as Promise<Profile>;
        })
        .then((p) => { if (!cancelled) setProfile(p); })
        .catch(() => { if (!cancelled) setProfile(null); });
      fetchReading();
    })();
    return () => { cancelled = true; };
  }, [id, fetchReading]);

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

  if (!profile) return <div className="text-center py-16 text-muted-foreground">Loading…</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{profile.name}</h1>
        <div className="flex gap-2 mt-2 flex-wrap">
          {profile.relationship && <Badge variant="secondary" className="bg-amber-900/50 text-amber-200 hover:bg-amber-900/50">{profile.relationship}</Badge>}
          {profile.gender && <Badge variant="secondary" className="bg-blue-900/50 text-blue-200 hover:bg-blue-900/50">{profile.gender}</Badge>}
          <Badge variant="outline">{profile.date_of_birth}</Badge>
          <Badge variant="outline">{profile.time_of_birth}</Badge>
          <Badge variant="outline">{profile.place_of_birth}</Badge>
          <Badge variant="secondary">{profile.timezone}</Badge>
        </div>
      </div>

      <div className="flex items-center justify-between py-3 border-b mb-4">
        <div className="flex items-center gap-2">
          {!!reading.output && !reading.error && <CheckCircle className="h-4 w-4 text-green-600" />}
          {reading.error && <AlertCircle className="h-4 w-4 text-red-500" />}
          {reading.loading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
          <span className="text-sm font-medium text-green-400">
            {reading.loading ? "Preparing your chart…" : reading.error ? "Error" : reading.output ? "Vedic chart loaded" : "Not yet fetched"}
          </span>
        </div>
        <div className="flex gap-1">
          {showAdminTools && !!reading.output && (
            <CopyButton getText={() => summaryText} label="Copy summary" />
          )}
          {showAdminTools && !!reading.output && (
            <Button variant="ghost" size="sm" onClick={() => setShowRaw((r) => !r)} className="h-7 text-xs gap-1">
              <Code className="h-3 w-3" />
              {showRaw ? "Formatted" : "Raw JSON"}
            </Button>
          )}
          {showAdminTools && (
            <Button variant="ghost" size="sm" onClick={() => fetchReading(true)} disabled={reading.loading} className="h-7 text-xs gap-1">
              <RefreshCw className="h-3 w-3" />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Permanent hint strip — always visible once chart is loaded */}
      {!!reading.output && !reading.error && (
        <div className="flex items-start gap-2 mb-4 px-3 py-2.5 rounded-lg bg-amber-950/20 border border-amber-800/30">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-400/80" />
          <p className="text-xs text-amber-300/80 leading-relaxed">
            Each section below has a <span className="text-amber-300 font-semibold">ⓘ</span> button. Tap it to read the classical Vedic interpretation for that section of your chart.
          </p>
        </div>
      )}

      {reading.error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-800/50 rounded-lg p-3 mb-4">
          {reading.error}
        </div>
      )}

      {!reading.output && !reading.error && !reading.loading && (
        <div className="text-center py-16 text-muted-foreground">
          <Button onClick={() => fetchReading(true)} variant="outline">Generate chart</Button>
        </div>
      )}

      {!!reading.output && !(showAdminTools && showRaw) && (
        <DashaflowView
          output={reading.output as Record<string, unknown>}
          explainers={explainers}
        />
      )}

      {showAdminTools && !!reading.output && showRaw && (
        <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-all bg-white/5 border border-white/10 rounded-lg p-4">
          {JSON.stringify(reading.output, null, 2)}
        </pre>
      )}

      <p className="text-xs text-muted-foreground mt-12 pt-4 border-t border-white/10">
        Verses adapted from classical sources; rephrasings are by Dr. Vinay Kumar Chaganti.
        See{" "}
        <Link href="/credits" className="hover:underline">
          credits
        </Link>{" "}
        for source attribution.
      </p>
    </div>
  );
}
