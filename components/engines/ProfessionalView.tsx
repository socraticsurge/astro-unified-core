"use client";
import { useState, useEffect } from "react";
import { DashaflowView } from "./DashaflowView";
import { VargaDashboard } from "./VargaDashboard";
import { AntardashaTimeline } from "./AntardashaTimeline";
import { TransitView } from "./TransitView";
import { CareerView } from "./CareerView";
import { MuhurthaView } from "./MuhurthaView";
import { useParams } from "next/navigation";
import { Copy, Check, FileText, RefreshCw } from "lucide-react";
import { generateConsultationNote } from "@/lib/utils/consultation";
import { Button } from "@/components/ui/button";

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
  onFetchTransit?: () => void;
  onFetchCareer?: () => void;
  isTransitLoading?: boolean;
  isCareerLoading?: boolean;
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
  onFetchTransit,
  onFetchCareer,
  isTransitLoading,
  isCareerLoading,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("natal");
  const [copied, setCopied] = useState(false);
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (activeTab === "transit" && onFetchTransit) {
      onFetchTransit();
    }
    if (activeTab === "career" && onFetchCareer) {
      onFetchCareer();
    }
  }, [activeTab, onFetchTransit, onFetchCareer]);

  const data = chartOutput.data as Record<string, unknown> | undefined;
  const planets = data?.planets as Record<string, unknown> | undefined;
  const dashas = data?.dashas as {
    maha?: { planet?: string; start?: string; end?: string };
    antar?: { planet?: string; start?: string; end?: string };
    timeline?: Array<{ planet?: string; start?: string; end?: string }>;
  } | undefined;

  const handleCopyNote = () => {
    const note = generateConsultationNote(chartOutput, transitOutput, careerOutput, transitDate);
    navigator.clipboard.writeText(note);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      {/* ─── Top-level Tab Navigation ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-white/10">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
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
        
        <div className="pb-2">
          <Button 
            onClick={handleCopyNote} 
            variant="outline" 
            size="sm" 
            className="h-8 text-[11px] gap-1.5 border-violet-800/50 hover:bg-violet-950/20 text-violet-300"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <FileText className="h-3 w-3" />}
            {copied ? "Copied!" : "Copy Consultation Note"}
          </Button>
        </div>
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
            {isCareerLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground border border-white/5 rounded-xl bg-white/[0.02]">
                <RefreshCw className="h-8 w-8 animate-spin text-violet-400" />
                <p className="text-sm font-medium">Analyzing career potential...</p>
              </div>
            ) : careerOutput ? (
              <CareerView
                output={careerOutput}
                explainer={explainers["Career Analysis (D10 Dashamsha)"] ?? null}
              />
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground italic bg-white/5 rounded-lg border border-white/10">
                Career analysis data could not be loaded.
              </div>
            )}
          </>
        )}

        {activeTab === "transit" && (
          <>
            {isTransitLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground border border-white/5 rounded-xl bg-white/[0.02]">
                <RefreshCw className="h-8 w-8 animate-spin text-sky-400" />
                <p className="text-sm font-medium">Calculating transits...</p>
              </div>
            ) : transitOutput ? (
              <TransitView
                output={transitOutput}
                transitDate={transitDate}
                explainer={explainers["Transit Analysis (Gochar)"] ?? null}
              />
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground italic bg-white/5 rounded-lg border border-white/10">
                Transit data could not be loaded.
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
