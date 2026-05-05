"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VedAstroView } from "@/components/engines/VedAstroView";
import { PanchangamView } from "@/components/engines/PanchangamView";
import { JyotishganitView } from "@/components/engines/JyotishganitView";
import { WesternView } from "@/components/engines/WesternView";
import { HellenisticView } from "@/components/engines/HellenisticView";
import { BaziView } from "@/components/engines/BaziView";
import { NumerologyView } from "@/components/engines/NumerologyView";
import { DashaflowView } from "@/components/engines/DashaflowView";
import { StelliumView } from "@/components/engines/StelliumView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, CheckCircle, Code, Copy, Check } from "lucide-react";
import type { Profile } from "@/lib/db";
import { summarizeEngine } from "@/lib/chart-summary";
import { extractEngineError } from "@/lib/engine-error";

type EngineState = { output: unknown; loading: boolean; error?: string };
const DEFAULT_ENGINE: EngineState = { output: null, loading: false };

const ENGINE_KEYS = [
  "vedastro",
  "panchangam",
  "jyotishganit",
  "western",
  "hellenistic",
  "bazi",
  "numerology",
  "dashaflow",
  "stellium",
] as const;
type EngineKey = (typeof ENGINE_KEYS)[number];

const ENGINE_LABELS: Record<EngineKey, string> = {
  vedastro: "VedAstro (Vedic)",
  panchangam: "Panchangam (Indian almanac)",
  jyotishganit: "Jyotishganit (Vedic — divisional charts, Vimshottari)",
  western: "Western — Kerykeion (tropical)",
  hellenistic: "Hellenistic — flatlib (essential dignities, Pars Fortuna)",
  bazi: "Chinese Ba Zi (Four Pillars)",
  numerology: "Numerology (Pythagorean + Chaldean)",
  dashaflow: "Dashaflow (Vedic — Shadbala, Yogas, Jaimini, Karakamsha)",
  stellium: "Stellium (Hellenistic — profections, Arabic Parts, sect)",
};

const ENGINE_ACCENTS: Record<EngineKey, string> = {
  vedastro: "text-blue-400",
  panchangam: "text-amber-400",
  jyotishganit: "text-green-400",
  western: "text-indigo-400",
  hellenistic: "text-purple-400",
  bazi: "text-red-400",
  numerology: "text-emerald-400",
  dashaflow: "text-green-400",
  stellium: "text-rose-400",
};

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

function EngineTab({
  engine,
  label,
  state,
  profile,
  onRefresh,
}: {
  engine: EngineKey;
  label: string;
  state: EngineState;
  profile: Profile;
  onRefresh: () => void;
}) {
  const [showRaw, setShowRaw] = useState(false);
  const accent = ENGINE_ACCENTS[engine] ?? "text-gray-700";

  const summaryText = useMemo(() => {
    if (!state.output) return "";
    const body = summarizeEngine(engine, state.output);
    return [
      `=== ${ENGINE_LABELS[engine]} ===`,
      "",
      profileHeaderText(profile),
      "",
      body,
    ].join("\n");
  }, [engine, state.output, profile]);

  return (
    <div>
      {/* Status bar */}
      <div className="flex items-center justify-between py-3 border-b mb-4">
        <div className="flex items-center gap-2">
          {!!state.output && !state.error && <CheckCircle className="h-4 w-4 text-green-600" />}
          {state.error && <AlertCircle className="h-4 w-4 text-red-500" />}
          {state.loading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
          <span className={`text-sm font-medium ${accent}`}>
            {state.loading ? `Fetching from ${label}…` : state.error ? "Error" : state.output ? "Data loaded" : `Not yet fetched`}
          </span>
        </div>
        <div className="flex gap-1">
          {!!state.output && (
            <CopyButton getText={() => summaryText} label="Copy summary" />
          )}
          {!!state.output && (
            <Button variant="ghost" size="sm" onClick={() => setShowRaw(r => !r)} className="h-7 text-xs gap-1">
              <Code className="h-3 w-3" />
              {showRaw ? "Formatted" : "Raw JSON"}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={state.loading} className="h-7 text-xs gap-1">
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </div>
      </div>

      {state.error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-800/50 rounded-lg p-3 mb-4">{state.error}</div>
      )}

      {!state.output && !state.error && !state.loading && (
        <div className="text-center py-16 text-muted-foreground">
          <Button onClick={onRefresh} variant="outline">Fetch {label}</Button>
        </div>
      )}

      {!!state.output && !showRaw && (
        engine === "vedastro" ? <VedAstroView output={state.output as Record<string, unknown>} /> :
        engine === "panchangam" ? <PanchangamView output={state.output as Record<string, unknown>} /> :
        engine === "jyotishganit" ? <JyotishganitView output={state.output as Record<string, unknown>} /> :
        engine === "western" ? <WesternView output={state.output as Record<string, unknown>} /> :
        engine === "hellenistic" ? <HellenisticView output={state.output as Record<string, unknown>} /> :
        engine === "bazi" ? <BaziView output={state.output as Record<string, unknown>} /> :
        engine === "numerology" ? <NumerologyView output={state.output as Record<string, unknown>} /> :
        engine === "dashaflow" ? <DashaflowView output={state.output as Record<string, unknown>} /> :
        engine === "stellium" ? <StelliumView output={state.output as Record<string, unknown>} /> :
        null
      )}

      {!!state.output && showRaw && (
        <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-all bg-white/5 border border-white/10 rounded-lg p-4">
          {JSON.stringify(state.output, null, 2)}
        </pre>
      )}
    </div>
  );
}

function buildAllSystemsText(profile: Profile, engines: Record<EngineKey, EngineState>): string {
  const sections: string[] = [];
  sections.push("=== Birth Profile ===");
  sections.push(profileHeaderText(profile));
  sections.push("");

  for (const key of ENGINE_KEYS) {
    const out = engines[key].output;
    if (!out) continue;
    const summary = summarizeEngine(key, out);
    if (!summary) continue;
    sections.push(`=== ${ENGINE_LABELS[key]} ===`);
    sections.push(summary);
    sections.push("");
  }

  return sections.join("\n").trim() + "\n";
}

function AllSystemsTab({ profile, engines }: { profile: Profile; engines: Record<EngineKey, EngineState> }) {
  const text = useMemo(() => buildAllSystemsText(profile, engines), [profile, engines]);
  const presentCount = ENGINE_KEYS.filter((k) => engines[k].output).length;
  const charCount = text.length;
  const tokenEstimate = Math.round(charCount / 4);

  return (
    <div>
      <div className="flex items-center justify-between py-3 border-b mb-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium">
            {presentCount} of {ENGINE_KEYS.length} systems loaded · {charCount.toLocaleString()} chars · ~{tokenEstimate.toLocaleString()} tokens
          </span>
        </div>
        <CopyButton getText={() => text} label="Copy all to clipboard" />
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        Paste this into ChatGPT, Claude, or any LLM to get a deeper interpretation across all systems. Edit
        the textarea below before copying if you want to trim or augment.
      </p>

      <textarea
        readOnly
        value={text}
        className="w-full h-[600px] text-xs font-mono leading-relaxed bg-white/5 border border-white/10 rounded-lg p-4 resize-y"
      />
    </div>
  );
}

export default function ProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [engines, setEngines] = useState<Record<EngineKey, EngineState>>({
    vedastro: DEFAULT_ENGINE,
    panchangam: DEFAULT_ENGINE,
    jyotishganit: DEFAULT_ENGINE,
    western: DEFAULT_ENGINE,
    hellenistic: DEFAULT_ENGINE,
    bazi: DEFAULT_ENGINE,
    numerology: DEFAULT_ENGINE,
    dashaflow: DEFAULT_ENGINE,
    stellium: DEFAULT_ENGINE,
  });

  const fetchEngine = useCallback(
    async (engine: EngineKey, force = false) => {
      setEngines(e => ({ ...e, [engine]: { output: null, loading: true } }));
      try {
        const res = force
          ? await fetch(`/api/readings/${engine}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ profile_id: id }),
            })
          : await fetch(`/api/readings/${engine}?profile_id=${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Request failed");
        // Cached responses can carry engine-level errors saved by older code paths;
        // surface those instead of showing a misleading "Data loaded" state.
        const innerErr = extractEngineError(data.output);
        if (innerErr) throw new Error(innerErr);
        setEngines(e => ({ ...e, [engine]: { output: data.output, loading: false } }));
      } catch (err) {
        setEngines(e => ({
          ...e,
          [engine]: { output: null, loading: false, error: err instanceof Error ? err.message : "Unknown error" },
        }));
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
        for (const key of ENGINE_KEYS) fetchEngine(key);
      })
      .catch(() => {
        setProfile(null);
      });
  }, [id, fetchEngine]);

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

      <Tabs defaultValue="jyotishganit">
        <TabsList className="mb-6">
          <TabsTrigger value="vedastro" className="text-blue-700">VedAstro</TabsTrigger>
          <TabsTrigger value="panchangam" className="text-amber-700">Panchangam</TabsTrigger>
          <TabsTrigger value="jyotishganit" className="text-green-700">Jyotishganit</TabsTrigger>
          <TabsTrigger value="western" className="text-indigo-400">Western</TabsTrigger>
          <TabsTrigger value="hellenistic" className="text-purple-400">Hellenistic</TabsTrigger>
          <TabsTrigger value="bazi" className="text-red-400">Ba Zi</TabsTrigger>
          <TabsTrigger value="numerology" className="text-emerald-400">Numerology</TabsTrigger>
          <TabsTrigger value="dashaflow" className="text-green-400">Dashaflow</TabsTrigger>
          <TabsTrigger value="stellium" className="text-rose-400">Stellium</TabsTrigger>
          <TabsTrigger value="all">All Systems</TabsTrigger>
        </TabsList>

        {ENGINE_KEYS.map((key) => (
          <TabsContent key={key} value={key}>
            <EngineTab
              engine={key}
              label={ENGINE_LABELS[key]}
              state={engines[key]}
              profile={profile}
              onRefresh={() => fetchEngine(key, true)}
            />
          </TabsContent>
        ))}

        <TabsContent value="all">
          <AllSystemsTab profile={profile} engines={engines} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
