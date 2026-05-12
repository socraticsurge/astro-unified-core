import { useState } from "react";
import { DashaflowView } from "./DashaflowView";
import { VargaDashboard } from "./VargaDashboard";
import { AntardashaTimeline } from "./AntardashaTimeline";
import { TransitView } from "./TransitView";
import { CareerView } from "./CareerView";
import { MuhurthaView } from "./MuhurthaView";
import { useParams } from "next/navigation";

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

type TabKey = "natal" | "vargas" | "dashas" | "career" | "transit" | "muhurtha";

const TABS: { key: TabKey; label: string }[] = [
  { key: "natal", label: "Natal Chart" },
  { key: "vargas", label: "Varga Dashboard" },
  { key: "dashas", label: "Dasha Timeline" },
  { key: "career", label: "Career Analysis" },
  { key: "transit", label: "Transit (Gochar)" },
  { key: "muhurtha", label: "Muhurtha" },
];

export function ProfessionalView({
  chartOutput,
  transitOutput,
  careerOutput,
  transitDate,
  explainers,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("natal");
  const { id } = useParams<{ id: string }>();

  const data = chartOutput.data as Record<string, unknown> | undefined;
  const planets = data?.planets as Record<string, unknown> | undefined;
  const dashas = data?.dashas as {
    maha?: { planet?: string; start?: string; end?: string };
    antar?: { planet?: string; start?: string; end?: string };
    timeline?: Array<{ planet?: string; start?: string; end?: string }>;
  } | undefined;

  return (
    <div>
      {/* ─── Top-level Tab Navigation ─── */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 border-b border-white/10 no-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-violet-400 text-violet-300"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-white/20"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ─── */}
      <div className="min-h-[50vh]">
        {activeTab === "natal" && (
          <DashaflowView output={chartOutput} explainers={explainers} />
        )}

        {activeTab === "vargas" && (
          <VargaDashboard
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            planets={planets as any}
            explainer={explainers["Varga Chart Dashboard (D1–D60)"] ?? null}
          />
        )}

        {activeTab === "dashas" && (
          <AntardashaTimeline
            dashas={dashas}
            explainer={explainers["Antardasha Timeline (Full Dasha Tree)"] ?? null}
          />
        )}

        {activeTab === "career" && (
          <>
            {careerOutput ? (
              <CareerView
                output={careerOutput}
                explainer={explainers["Career Analysis (D10 Dashamsha)"] ?? null}
              />
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground italic bg-white/5 rounded-lg border border-white/10">
                Career analysis data has not been loaded yet. Try refreshing.
              </div>
            )}
          </>
        )}

        {activeTab === "transit" && (
          <>
            {transitOutput ? (
              <TransitView
                output={transitOutput}
                transitDate={transitDate}
                explainer={explainers["Transit Analysis (Gochar)"] ?? null}
              />
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground italic bg-white/5 rounded-lg border border-white/10">
                Transit analysis data has not been loaded yet. Try refreshing.
              </div>
            )}
          </>
        )}

        {activeTab === "muhurtha" && (
          <MuhurthaView
            profileId={id}
            explainer={explainers["Muhurtha (Auspicious Timings)"] ?? null}
          />
        )}
      </div>
    </div>
  );
}
