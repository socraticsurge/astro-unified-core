"use client";
import { DashaflowView } from "./DashaflowView";
import { VargaDashboard } from "./VargaDashboard";
import { AntardashaTimeline } from "./AntardashaTimeline";
import { TransitView } from "./TransitView";
import { CareerView } from "./CareerView";

type SectionExplainer = {
  title: string;
  gist?: string | null;
  bodyHtml: string;
  sources?: { text: string; chapter?: number | string; sloka?: number | string }[];
};

type Props = {
  chartOutput: Record<string, unknown>;
  transitOutput: Record<string, unknown> | null;
  careerOutput: Record<string, unknown> | null;
  transitDate?: string;
  explainers: Record<string, SectionExplainer>;
};

export function ProfessionalView({
  chartOutput,
  transitOutput,
  careerOutput,
  transitDate,
  explainers,
}: Props) {
  const data = chartOutput.data as Record<string, unknown> | undefined;
  const planets = data?.planets as Record<string, unknown> | undefined;
  const dashas = data?.dashas as {
    maha?: { planet?: string; start?: string; end?: string };
    antar?: { planet?: string; start?: string; end?: string };
    timeline?: Array<{ planet?: string; start?: string; end?: string }>;
  } | undefined;

  return (
    <div>
      {/* ─── Varga Dashboard — inserted right after Lagna section ─── */}
      <VargaDashboard
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        planets={planets as any}
        explainer={explainers["Varga Chart Dashboard (D1–D60)"] ?? null}
      />

      {/* ─── All standard 17 DashaFlow sections ─── */}
      <DashaflowView output={chartOutput} explainers={explainers} />

      {/* ─── Full Antardasha nested tree (replaces/supplements the DashaflowView inline tree) ─── */}
      <AntardashaTimeline
        dashas={dashas}
        explainer={explainers["Antardasha Timeline (Full Dasha Tree)"] ?? null}
      />

      {/* ─── Career Analysis ─── */}
      {careerOutput && (
        <CareerView
          output={careerOutput}
          explainer={explainers["Career Analysis (D10 Dashamsha)"] ?? null}
        />
      )}

      {/* ─── Transit Analysis ─── */}
      {transitOutput && (
        <TransitView
          output={transitOutput}
          transitDate={transitDate}
          explainer={explainers["Transit Analysis (Gochar)"] ?? null}
        />
      )}

      {!careerOutput && (
        <div className="border-b py-4 px-1 text-sm text-muted-foreground italic">
          Career analysis: not loaded yet.
        </div>
      )}
      {!transitOutput && (
        <div className="border-b py-4 px-1 text-sm text-muted-foreground italic">
          Transit analysis: not loaded yet.
        </div>
      )}
    </div>
  );
}
