"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, AlertCircle, CheckCircle } from "lucide-react";

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

function JsonNode({ value, depth = 0 }: { value: unknown; depth?: number }) {
  const [collapsed, setCollapsed] = useState(depth > 1);

  if (value === null || value === undefined)
    return <span className="text-gray-400">null</span>;
  if (typeof value === "boolean")
    return <span className="text-purple-600">{value.toString()}</span>;
  if (typeof value === "number")
    return <span className="text-blue-600">{value}</span>;
  if (typeof value === "string")
    return <span className="text-green-700">&quot;{value}&quot;</span>;

  if (Array.isArray(value)) {
    if (collapsed)
      return <span className="cursor-pointer text-gray-500 hover:text-gray-800" onClick={() => setCollapsed(false)}>[{value.length} items ▸]</span>;
    return (
      <span>
        <span className="cursor-pointer text-gray-500" onClick={() => setCollapsed(true)}>[</span>
        <div className="ml-4">
          {value.map((v, i) => (
            <div key={i}><JsonNode value={v} depth={depth + 1} />{i < value.length - 1 && ","}</div>
          ))}
        </div>
        ]
      </span>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (collapsed)
      return <span className="cursor-pointer text-gray-500 hover:text-gray-800" onClick={() => setCollapsed(false)}>{"{"}…{"}"}</span>;
    return (
      <span>
        <span className="cursor-pointer text-gray-500" onClick={() => setCollapsed(true)}>{"{"}</span>
        <div className="ml-4">
          {entries.map(([k, v]) => (
            <div key={k}>
              <span className="text-red-700 font-medium">&quot;{k}&quot;</span>{": "}
              <JsonNode value={v} depth={depth + 1} />
            </div>
          ))}
        </div>
        {"}"}
      </span>
    );
  }

  return <span>{String(value)}</span>;
}

export function EnginePanel({ engine, output, onRefresh, loading, error }: Props) {
  const label = ENGINE_LABELS[engine];
  const colorClass = ENGINE_COLORS[engine];

  return (
    <div className={`rounded-lg border p-4 ${colorClass} h-full flex flex-col`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{label}</h3>
          {!!output && !error && <CheckCircle className="h-3 w-3 text-green-600" />}
          {error && <AlertCircle className="h-3 w-3 text-red-500" />}
        </div>
        <Button variant="ghost" size="icon" onClick={onRefresh} disabled={loading} className="h-6 w-6">
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-2">{error}</div>
      )}

      {!output && !error && loading && (
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground gap-2">
          <RefreshCw className="h-3 w-3 animate-spin" /> Fetching…
        </div>
      )}

      {!output && !error && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <Button onClick={onRefresh} size="sm">Fetch {label}</Button>
        </div>
      )}

      {!!output && (
        <ScrollArea className="flex-1 h-[400px]">
          <pre className="text-xs font-mono leading-relaxed">
            <JsonNode value={output} depth={0} />
          </pre>
        </ScrollArea>
      )}
    </div>
  );
}
