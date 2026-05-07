"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { VedAstroView } from "@/components/engines/VedAstroView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, CheckCircle, Code, Copy, Check } from "lucide-react";
import type { Profile } from "@/lib/db";
import { summarizeVedAstro } from "@/lib/chart-summary";
import { extractEngineError } from "@/lib/engine-error";

type EngineState = { output: unknown; loading: boolean; error?: string };

function profileHeaderText(p: Profile): string {
  return [
    `Name: ${p.name}`,
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

export default function ProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reading, setReading] = useState<EngineState>({ output: null, loading: true });
  const [showRaw, setShowRaw] = useState(false);

  const fetchReading = useCallback(
    async (force = false) => {
      setReading({ output: null, loading: true });
      try {
        const res = force
          ? await fetch(`/api/readings/vedastro`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ profile_id: id }),
            })
          : await fetch(`/api/readings/vedastro?profile_id=${id}`);
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
    fetch(`/api/profiles/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed to load profile (${r.status})`);
        return r.json() as Promise<Profile>;
      })
      .then((p) => {
        setProfile(p);
        fetchReading();
      })
      .catch(() => {
        setProfile(null);
      });
  }, [id, fetchReading]);

  const summaryText = useMemo(() => {
    if (!profile || !reading.output) return "";
    return [
      "=== VedAstro (Vedic) ===",
      "",
      profileHeaderText(profile),
      "",
      summarizeVedAstro(reading.output),
    ].join("\n");
  }, [profile, reading.output]);

  if (!profile) return <div className="text-center py-16 text-muted-foreground">Loading…</div>;

  return (
    <div>
      {/* Profile header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{profile.name}</h1>
        <div className="flex gap-2 mt-2 flex-wrap">
          <Badge variant="outline">{profile.date_of_birth}</Badge>
          <Badge variant="outline">{profile.time_of_birth}</Badge>
          <Badge variant="outline">{profile.place_of_birth}</Badge>
          <Badge variant="secondary">{profile.timezone}</Badge>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between py-3 border-b mb-4">
        <div className="flex items-center gap-2">
          {!!reading.output && !reading.error && <CheckCircle className="h-4 w-4 text-green-600" />}
          {reading.error && <AlertCircle className="h-4 w-4 text-red-500" />}
          {reading.loading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
          <span className="text-sm font-medium text-blue-400">
            {reading.loading ? "Fetching from VedAstro…" : reading.error ? "Error" : reading.output ? "Vedic chart loaded" : "Not yet fetched"}
          </span>
        </div>
        <div className="flex gap-1">
          {!!reading.output && (
            <CopyButton getText={() => summaryText} label="Copy summary" />
          )}
          {!!reading.output && (
            <Button variant="ghost" size="sm" onClick={() => setShowRaw((r) => !r)} className="h-7 text-xs gap-1">
              <Code className="h-3 w-3" />
              {showRaw ? "Formatted" : "Raw JSON"}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => fetchReading(true)} disabled={reading.loading} className="h-7 text-xs gap-1">
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </div>
      </div>

      {reading.error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-800/50 rounded-lg p-3 mb-4">
          {reading.error}
        </div>
      )}

      {!reading.output && !reading.error && !reading.loading && (
        <div className="text-center py-16 text-muted-foreground">
          <Button onClick={() => fetchReading(true)} variant="outline">Fetch VedAstro reading</Button>
        </div>
      )}

      {!!reading.output && !showRaw && (
        <VedAstroView output={reading.output as Record<string, unknown>} />
      )}

      {!!reading.output && showRaw && (
        <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-all bg-white/5 border border-white/10 rounded-lg p-4">
          {JSON.stringify(reading.output, null, 2)}
        </pre>
      )}
    </div>
  );
}
