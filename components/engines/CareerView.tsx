"use client";
import { SectionShell } from "./SectionShell";
import { Briefcase, Star, Info } from "lucide-react";

type SectionExplainer = {
  title: string;
  gist?: string | null;
  bodyHtml: string;
  sources?: { text: string; chapter?: number | string; sloka?: number | string }[];
};

type CareerData = {
  tenth_house?: {
    sign?: string;
    lord?: string;
    lord_house?: number;
    lord_sign?: string;
    lord_d10?: string;
    lord_dignity?: string;
    occupants?: string[];
  };
  d10_indicators?: Record<
    string,
    {
      d10_sign?: string;
      d10_lord?: string;
      d10_strong?: boolean;
    }
  >;
  career_themes?: string[];
  primary_planets?: string[];
  strength_factors?: string[];
  d10_strong_planets?: string[];
};

type Props = {
  output: Record<string, unknown> | undefined;
  explainer: SectionExplainer | null;
};

const PLANET_COLORS: Record<string, string> = {
  Sun: "text-amber-400", Moon: "text-blue-300", Mars: "text-red-400",
  Mercury: "text-green-400", Jupiter: "text-yellow-400", Venus: "text-pink-400",
  Saturn: "text-indigo-400", Rahu: "text-violet-400", Ketu: "text-orange-400",
};

export function CareerView({ output, explainer }: Props) {
  const accent = "text-yellow-400";
  const card = "bg-yellow-950/20 border border-yellow-800/30 rounded-lg p-3";

  if (!output) {
    return (
      <SectionShell sectionInView="Career Analysis (D10 Dashamsha)" explainer={explainer} accent={accent}>
        <p className="text-muted-foreground text-sm py-2">Career analysis data not available.</p>
      </SectionShell>
    );
  }

  const raw = (output.data ?? output) as CareerData;
  const tenth = raw.tenth_house;
  const d10Indicators = raw.d10_indicators ?? {};
  const themes = raw.career_themes ?? [];
  const primary = raw.primary_planets ?? [];
  const strongD10 = raw.d10_strong_planets ?? [];
  const strengths = raw.strength_factors ?? [];

  return (
    <SectionShell
      sectionInView="Career Analysis (D10 Dashamsha)"
      explainer={explainer}
      accent={accent}
      defaultOpen={true}
    >
      {/* 10th House Summary */}
      {tenth && (
        <div className={`${card} mt-2 mb-4`}>
          <p className="text-xs text-yellow-400/70 uppercase tracking-wide font-medium mb-2">10th House (Karma Bhava)</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">10th Sign</p>
              <p className="font-semibold text-yellow-200">{tenth.sign ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">10th Lord</p>
              <p className="font-semibold text-yellow-200">{tenth.lord ?? "—"}</p>
            </div>
            {tenth.lord_house && (
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">Lord Placement</p>
                <p className="font-medium text-yellow-200/80">
                  {tenth.lord} is in House {tenth.lord_house} ({tenth.lord_sign}) 
                  {tenth.lord_dignity ? ` — ${tenth.lord_dignity.replace("_", " ")}` : ""}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Career Themes */}
      {themes.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Star className="h-3.5 w-3.5 text-yellow-400" />
            <p className="text-xs text-yellow-300 font-semibold uppercase tracking-wide">Suggested Career Themes</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {themes.map((theme, i) => (
              <span key={i} className="text-sm px-3 py-1 bg-yellow-900/30 border border-yellow-700/40 text-yellow-200 rounded-full font-medium capitalize">
                {theme.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Primary Planets */}
      {(primary.length > 0 || strongD10.length > 0) && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Briefcase className="h-3.5 w-3.5 text-yellow-400" />
            <p className="text-xs text-yellow-300 font-semibold uppercase tracking-wide">Key Professional Significators</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set([...primary, ...strongD10])).map((p, i) => {
              const color = PLANET_COLORS[p] ?? "text-yellow-200";
              const isPrimary = primary.includes(p);
              const isStrongD10 = strongD10.includes(p);
              return (
                <div key={i} className="flex flex-col bg-yellow-950/40 border border-yellow-800/40 rounded p-2 px-3">
                  <span className={`font-bold ${color}`}>{p}</span>
                  <div className="flex gap-1 mt-1">
                    {isPrimary && <span className="text-[10px] uppercase bg-yellow-900/40 text-yellow-400/80 px-1 rounded border border-yellow-800/30">Primary</span>}
                    {isStrongD10 && <span className="text-[10px] uppercase bg-emerald-900/40 text-emerald-400/80 px-1 rounded border border-emerald-800/30">Strong in D10</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Strength Factors */}
      {strengths.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Info className="h-3.5 w-3.5 text-yellow-400" />
            <p className="text-xs text-yellow-300 font-semibold uppercase tracking-wide">Astrological Indicators</p>
          </div>
          <ul className="space-y-1.5">
            {strengths.map((s, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-yellow-400 shrink-0">→</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* D10 Table */}
      {Object.keys(d10Indicators).length > 0 && (
        <details className="mt-2 border border-white/10 rounded-lg">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-yellow-400 hover:bg-white/5 rounded-lg uppercase tracking-wide">
            View D10 Planetary Details
          </summary>
          <div className="p-3 overflow-x-auto">
            <table className="w-full text-xs text-left text-muted-foreground border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-2 pr-3 font-medium">Planet</th>
                  <th className="pb-2 pr-3 font-medium">D10 Sign</th>
                  <th className="pb-2 pr-3 font-medium">D10 Lord</th>
                  <th className="pb-2 font-medium">D10 Strong</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(d10Indicators).map(([planet, data]) => (
                  <tr key={planet} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-1.5 pr-3 font-semibold text-yellow-200/80">{planet}</td>
                    <td className="py-1.5 pr-3">{data.d10_sign}</td>
                    <td className="py-1.5 pr-3">{data.d10_lord}</td>
                    <td className="py-1.5">
                      {data.d10_strong ? <span className="text-emerald-400">Yes</span> : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      {/* Raw Data Toggle */}
      <div className="mt-8 pt-4 border-t border-white/10">
        <details className="group">
          <summary className="cursor-pointer text-[10px] text-muted-foreground uppercase tracking-widest hover:text-yellow-400/80 transition-colors list-none flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-900/50 group-open:bg-yellow-500"></span>
            View Raw Career Data
          </summary>
          <pre className="mt-4 p-4 rounded-lg bg-black/40 border border-white/5 text-[10px] font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(output, null, 2)}
          </pre>
        </details>
      </div>
    </SectionShell>
  );
}
