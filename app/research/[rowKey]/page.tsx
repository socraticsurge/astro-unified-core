import Link from "next/link";
import { notFound } from "next/navigation";
import { db, type ResearchReading } from "@/lib/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { VedAstroView } from "@/components/engines/VedAstroView";
import { PanchangamView } from "@/components/engines/PanchangamView";
import { JyotishganitView } from "@/components/engines/JyotishganitView";
import { WesternView } from "@/components/engines/WesternView";
import { HellenisticView } from "@/components/engines/HellenisticView";
import { BaziView } from "@/components/engines/BaziView";
import { NumerologyView } from "@/components/engines/NumerologyView";
import { DashaflowView } from "@/components/engines/DashaflowView";
import { StelliumView } from "@/components/engines/StelliumView";

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
  vedastro: "VedAstro",
  panchangam: "Panchangam",
  jyotishganit: "Jyotishganit",
  western: "Western",
  hellenistic: "Hellenistic",
  bazi: "Ba Zi",
  numerology: "Numerology",
  dashaflow: "Dashaflow",
  stellium: "Stellium",
};

function statusBadge(status: ResearchReading["status"] | "missing") {
  switch (status) {
    case "done":
      return (
        <Badge variant="outline" className="border-green-700/50 text-green-400">
          done
        </Badge>
      );
    case "running":
      return (
        <Badge variant="outline" className="border-zinc-500/60 text-zinc-300">
          running
        </Badge>
      );
    case "error":
      return (
        <Badge variant="outline" className="border-red-700/50 text-red-400">
          error
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="outline" className="border-yellow-700/50 text-yellow-400">
          pending
        </Badge>
      );
    case "missing":
    default:
      return (
        <Badge variant="outline" className="border-zinc-700 text-zinc-500">
          not queued
        </Badge>
      );
  }
}

function renderEngineView(engine: EngineKey, output: Record<string, unknown>) {
  switch (engine) {
    case "vedastro":
      return <VedAstroView output={output} />;
    case "panchangam":
      return <PanchangamView output={output} />;
    case "jyotishganit":
      return <JyotishganitView output={output} />;
    case "western":
      return <WesternView output={output} />;
    case "hellenistic":
      return <HellenisticView output={output} />;
    case "bazi":
      return <BaziView output={output} />;
    case "numerology":
      return <NumerologyView output={output} />;
    case "dashaflow":
      return <DashaflowView output={output} />;
    case "stellium":
      return <StelliumView output={output} />;
  }
}

function safeParse(json: string | null): Record<string, unknown> | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { value: parsed } as Record<string, unknown>;
  } catch {
    return null;
  }
}

export default async function ResearchSubjectPage({
  params,
}: {
  params: Promise<{ rowKey: string }>;
}) {
  const { rowKey: rawRowKey } = await params;
  const rowKey = decodeURIComponent(rawRowKey);
  const subject = db.research.subjects.get(rowKey);
  if (!subject) notFound();

  const marriages = db.research.marriages.listForSubject(rowKey);
  const readings = db.research.readings.listForSubject(rowKey);
  const readingByEngine = new Map<string, ResearchReading>(
    readings.map((r) => [r.engine, r])
  );

  const doneCount = readings.filter((r) => r.status === "done").length;
  const errorCount = readings.filter((r) => r.status === "error").length;

  return (
    <div className="space-y-6">
      <div className="text-xs text-zinc-500">
        <Link href="/research" className="hover:text-zinc-300">
          ← Back to research browser
        </Link>
      </div>

      {/* Header */}
      <header className="rounded-xl border border-zinc-700/60 bg-zinc-900/30 p-5">
        <h1 className="text-2xl font-bold text-zinc-100">{subject.name}</h1>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {subject.gender && (
            <Badge variant="outline" className="border-zinc-600 text-zinc-300">
              {subject.gender}
            </Badge>
          )}
          <Badge variant="outline" className="border-zinc-600 text-zinc-300">
            DOB {subject.date_of_birth}
          </Badge>
          <Badge variant="outline" className="border-zinc-600 text-zinc-300">
            TOB {subject.time_of_birth}
            {subject.timezone_name ? ` · ${subject.timezone_name}` : ""}
            {` (UTC${subject.timezone_offset >= 0 ? "+" : ""}${subject.timezone_offset})`}
          </Badge>
          {subject.location_name && (
            <Badge variant="outline" className="border-zinc-600 text-zinc-300">
              {subject.location_name}
            </Badge>
          )}
          {subject.country && (
            <Badge variant="outline" className="border-zinc-600 text-zinc-300">
              {subject.country}
            </Badge>
          )}
          {subject.rodden && (
            <Badge variant="outline" className="border-zinc-600 text-zinc-300">
              Rodden {subject.rodden}
            </Badge>
          )}
          <Badge variant="outline" className="border-zinc-700 text-zinc-500 font-mono text-xs">
            {subject.row_key}
          </Badge>
        </div>
        <div className="mt-3 text-xs text-zinc-500 font-mono">
          lat {subject.latitude}, lon {subject.longitude}
          {subject.raw_birthtime ? ` · raw "${subject.raw_birthtime}"` : ""}
          {` · source ${subject.source_dataset}`}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="text-zinc-400">
            {doneCount}/{ENGINE_KEYS.length} engines computed
          </span>
          {errorCount > 0 && (
            <span className="text-red-400">· {errorCount} errored</span>
          )}
        </div>
      </header>

      {/* Marriages */}
      {marriages.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">
            Marriages ({marriages.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {marriages.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-zinc-700/60 bg-zinc-900/30 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-zinc-200">
                    Marriage #{m.seq_index}
                    {m.type_normalized ? ` · ${m.type_normalized}` : ""}
                  </div>
                  {m.outcome_normalized && (
                    <Badge variant="outline" className="border-zinc-600 text-zinc-300">
                      {m.outcome_normalized}
                    </Badge>
                  )}
                </div>
                {m.spouse && (
                  <div className="text-sm text-zinc-300">
                    <span className="text-zinc-500">spouse:</span> {m.spouse}
                  </div>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-zinc-400 font-mono">
                  {m.marriage_date && <span>m: {m.marriage_date}</span>}
                  {m.divorce_date && <span>d: {m.divorce_date}</span>}
                  {m.credibility && <span>cred: {m.credibility}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Engine tabs */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-3">
          Engine readings
        </h2>
        <Tabs defaultValue={ENGINE_KEYS[0]}>
          <TabsList className="mb-4 flex-wrap h-auto">
            {ENGINE_KEYS.map((engine) => {
              const r = readingByEngine.get(engine);
              const status = r?.status ?? "missing";
              const dot =
                status === "done"
                  ? "bg-green-500"
                  : status === "error"
                    ? "bg-red-500"
                    : status === "running"
                      ? "bg-zinc-400"
                      : status === "pending"
                        ? "bg-yellow-500"
                        : "bg-zinc-700";
              return (
                <TabsTrigger key={engine} value={engine} className="gap-1.5">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${dot}`} />
                  {ENGINE_LABELS[engine]}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {ENGINE_KEYS.map((engine) => {
            const r = readingByEngine.get(engine);
            const status = r?.status ?? "missing";
            const output = r ? safeParse(r.output_data) : null;
            return (
              <TabsContent key={engine} value={engine}>
                <div className="flex items-center justify-between py-3 border-b border-zinc-800 mb-4">
                  <div className="flex items-center gap-2">
                    {statusBadge(status)}
                    <span className="text-sm text-zinc-300">
                      {ENGINE_LABELS[engine]}
                    </span>
                    {r?.duration_ms != null && status === "done" && (
                      <span className="text-xs text-zinc-500 font-mono">
                        {r.duration_ms}ms
                      </span>
                    )}
                    {r?.computed_at && (
                      <span className="text-xs text-zinc-500">
                        · {new Date(r.computed_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {status === "done" && output && renderEngineView(engine, output)}

                {status === "done" && !output && (
                  <div className="rounded-lg border border-yellow-800/40 bg-yellow-950/20 p-4 text-sm text-yellow-300">
                    Reading is marked done but output_data could not be parsed.
                  </div>
                )}

                {status === "pending" && (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-6 text-center text-sm text-zinc-400">
                    Not yet computed (queued)
                  </div>
                )}

                {status === "running" && (
                  <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-6 text-center text-sm text-zinc-300">
                    Currently computing…
                  </div>
                )}

                {status === "error" && (
                  <div className="rounded-lg border border-red-800/50 bg-red-950/20 p-4 space-y-2">
                    <div className="text-sm font-medium text-red-300">Compute error</div>
                    <pre className="text-xs font-mono text-red-200 whitespace-pre-wrap break-all">
                      {r?.error_msg ?? "Unknown error"}
                    </pre>
                  </div>
                )}

                {status === "missing" && (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-6 text-center text-sm text-zinc-500">
                    No reading row exists for this engine. The compute job has not enqueued it yet.
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </section>
    </div>
  );
}
