"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, AlertCircle, CheckCircle, Code } from "lucide-react";
import { VedAstroView } from "@/components/engines/VedAstroView";
import { PanchangamView } from "@/components/engines/PanchangamView";
import { JyotishganitView } from "@/components/engines/JyotishganitView";

type Props = {
  engine: "vedastro" | "panchangam" | "jyotishganit";
  profileId: string;
  output: unknown | null;
  onRefresh: () => void;
  loading: boolean;
  error?: string;
};

const ENGINE_LABELS: Record<string, string> = {
  vedastro: "VedAstro", panchangam: "Panchangam", jyotishganit: "Jyotishganit",
};
const ENGINE_COLORS: Record<string, string> = {
  vedastro: "bg-blue-50 border-blue-200",
  panchangam: "bg-amber-50 border-amber-200",
  jyotishganit: "bg-green-50 border-green-200",
};
const ENGINE_HEADER_COLORS: Record<string, string> = {
  vedastro: "text-blue-800",
  panchangam: "text-amber-800",
  jyotishganit: "text-green-800",
};

function EngineView({ engine, output }: { engine: string; output: unknown }) {
  const data = output as Record<string, unknown>;
  if (engine === "vedastro") return <VedAstroView output={data} />;
  if (engine === "panchangam") return <PanchangamView output={data} />;
  if (engine === "jyotishganit") return <JyotishganitView output={data} />;
  return null;
}

export function EnginePanel({ engine, output, onRefresh, loading, error }: Props) {
  const [showRaw, setShowRaw] = useState(false);
  const label = ENGINE_LABELS[engine];
  const colorClass = ENGINE_COLORS[engine];
  const headerColor = ENGINE_HEADER_COLORS[engine];

  return (
    <div className={`rounded-lg border p-4 ${colorClass} flex flex-col`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className={`font-bold text-base ${headerColor}`}>{label}</h3>
          {!!output && !error && <CheckCircle className="h-3.5 w-3.5 text-green-600" />}
          {error && <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
        </div>
        <div className="flex items-center gap-1">
          {!!output && (
            <Button variant="ghost" size="icon" onClick={() => setShowRaw(r => !r)} className="h-6 w-6" title="Toggle raw JSON">
              <Code className={`h-3 w-3 ${showRaw ? "text-primary" : "text-muted-foreground"}`} />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onRefresh} disabled={loading} className="h-6 w-6">
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-3">{error}</div>
      )}

      {!output && !error && loading && (
        <div className="flex items-center justify-center py-12 text-xs text-muted-foreground gap-2">
          <RefreshCw className="h-3 w-3 animate-spin" /> Fetching from {label}…
        </div>
      )}

      {!output && !error && !loading && (
        <div className="flex items-center justify-center py-12">
          <Button onClick={onRefresh} size="sm" variant="outline">Fetch {label}</Button>
        </div>
      )}

      {!!output && (
        <ScrollArea className="h-[500px]">
          {showRaw
            ? <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-all">{JSON.stringify(output, null, 2)}</pre>
            : <EngineView engine={engine} output={output} />
          }
        </ScrollArea>
      )}
    </div>
  );
}
