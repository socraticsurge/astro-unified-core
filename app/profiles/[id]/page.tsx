"use client";
import { useEffect, useState, useCallback } from "react";
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
import { ComparePanel } from "@/components/ComparePanel";
import { ChatPanel } from "@/components/ChatPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, CheckCircle, Code } from "lucide-react";
import type { Profile } from "@/lib/db";

type EngineState = { output: unknown; loading: boolean; error?: string };
const DEFAULT_ENGINE: EngineState = { output: null, loading: false };

const ENGINE_ACCENTS: Record<string, string> = {
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

function EngineTab({
  engine,
  label,
  state,
  onRefresh,
}: {
  engine: string;
  label: string;
  state: EngineState;
  onRefresh: () => void;
}) {
  const [showRaw, setShowRaw] = useState(false);
  const accent = ENGINE_ACCENTS[engine] ?? "text-gray-700";

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

export default function ProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [engines, setEngines] = useState<Record<string, EngineState>>({
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
    async (engine: "vedastro" | "panchangam" | "jyotishganit" | "western" | "hellenistic" | "bazi" | "numerology" | "dashaflow" | "stellium", force = false) => {
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
      .then(r => r.json())
      .then((p: Profile) => {
        setProfile(p);
        fetchEngine("vedastro");
        fetchEngine("panchangam");
        fetchEngine("jyotishganit");
        fetchEngine("western");
        fetchEngine("hellenistic");
        fetchEngine("bazi");
        fetchEngine("numerology");
        fetchEngine("dashaflow");
        fetchEngine("stellium");
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
          <TabsTrigger value="consolidated">Consolidated</TabsTrigger>
          <TabsTrigger value="chat">Chat (Ollama)</TabsTrigger>
        </TabsList>

        <TabsContent value="vedastro">
          <EngineTab engine="vedastro" label="VedAstro" state={engines.vedastro} onRefresh={() => fetchEngine("vedastro", true)} />
        </TabsContent>
        <TabsContent value="panchangam">
          <EngineTab engine="panchangam" label="Panchangam" state={engines.panchangam} onRefresh={() => fetchEngine("panchangam", true)} />
        </TabsContent>
        <TabsContent value="jyotishganit">
          <EngineTab engine="jyotishganit" label="Jyotishganit" state={engines.jyotishganit} onRefresh={() => fetchEngine("jyotishganit", true)} />
        </TabsContent>

        <TabsContent value="western">
          <EngineTab engine="western" label="Western (Kerykeion)" state={engines.western} onRefresh={() => fetchEngine("western", true)} />
        </TabsContent>
        <TabsContent value="hellenistic">
          <EngineTab engine="hellenistic" label="Hellenistic (flatlib)" state={engines.hellenistic} onRefresh={() => fetchEngine("hellenistic", true)} />
        </TabsContent>
        <TabsContent value="bazi">
          <EngineTab engine="bazi" label="Chinese Ba Zi" state={engines.bazi} onRefresh={() => fetchEngine("bazi", true)} />
        </TabsContent>

        <TabsContent value="numerology">
          <EngineTab engine="numerology" label="Numerology" state={engines.numerology} onRefresh={() => fetchEngine("numerology", true)} />
        </TabsContent>
        <TabsContent value="dashaflow">
          <EngineTab engine="dashaflow" label="Dashaflow (Vedic)" state={engines.dashaflow} onRefresh={() => fetchEngine("dashaflow", true)} />
        </TabsContent>
        <TabsContent value="stellium">
          <EngineTab engine="stellium" label="Stellium (Hellenistic)" state={engines.stellium} onRefresh={() => fetchEngine("stellium", true)} />
        </TabsContent>

        <TabsContent value="consolidated">
          <ComparePanel
            vedastroOutput={engines.vedastro.output}
            panchangamOutput={engines.panchangam.output}
            jyotishganitOutput={engines.jyotishganit.output}
          />
        </TabsContent>

        <TabsContent value="chat">
          <ChatPanel profileId={id} profileName={profile.name} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
