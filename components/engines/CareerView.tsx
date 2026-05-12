"use client";
import { SectionShell } from "./SectionShell";
import { Briefcase, Star } from "lucide-react";

type SectionExplainer = {
  title: string;
  gist?: string | null;
  bodyHtml: string;
  sources?: { text: string; chapter?: number | string; sloka?: number | string }[];
};

type CareerData = {
  career_themes?: string[];
  primary_planets?: Array<{ planet: string; domains: string[]; strength?: string; description?: string }>;
  d10_lagna?: string;
  d10_lagna_lord?: string;
  tenth_lord_in_d10?: string;
  recommendations?: string[];
  summary?: string;
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
  const themes = raw.career_themes ?? [];
  const planets = raw.primary_planets ?? [];
  const recommendations = raw.recommendations ?? [];

  return (
    <SectionShell
      sectionInView="Career Analysis (D10 Dashamsha)"
      explainer={explainer}
      accent={accent}
      defaultOpen={true}
    >
      {/* D10 Lagna summary */}
      {(raw.d10_lagna || raw.d10_lagna_lord) && (
        <div className={`${card} mt-2 mb-4`}>
          <p className="text-xs text-yellow-400/70 uppercase tracking-wide font-medium mb-1">D10 Chart</p>
          <div className="flex gap-4 flex-wrap text-sm">
            {raw.d10_lagna && (
              <span>D10 Lagna: <span className="text-yellow-200 font-bold">{raw.d10_lagna}</span></span>
            )}
            {raw.d10_lagna_lord && (
              <span>Lagna Lord: <span className="text-yellow-200 font-bold">{raw.d10_lagna_lord}</span></span>
            )}
            {raw.tenth_lord_in_d10 && (
              <span>10th Lord in D10: <span className="text-yellow-200 font-bold">{raw.tenth_lord_in_d10}</span></span>
            )}
          </div>
          {raw.summary && (
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{raw.summary}</p>
          )}
        </div>
      )}

      {/* Career Themes */}
      {themes.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Star className="h-3.5 w-3.5 text-yellow-400" />
            <p className="text-xs text-yellow-300 font-semibold uppercase tracking-wide">Career Themes</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {themes.map((theme, i) => (
              <span key={i} className="text-sm px-3 py-1 bg-yellow-900/30 border border-yellow-700/40 text-yellow-200 rounded-full font-medium">
                {theme}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Primary Planets & Domains */}
      {planets.length > 0 && (
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Briefcase className="h-3.5 w-3.5 text-yellow-400" />
            <p className="text-xs text-yellow-300 font-semibold uppercase tracking-wide">Career Significators</p>
          </div>
          {planets.map((p, i) => (
            <div key={i} className={card}>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className={`font-bold text-base ${PLANET_COLORS[p.planet] ?? "text-yellow-200"}`}>
                  {p.planet}
                </span>
                {p.strength && (
                  <span className="text-xs text-muted-foreground">{p.strength}</span>
                )}
              </div>
              {p.domains && p.domains.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {p.domains.map((d, di) => (
                    <span key={di} className="text-xs px-1.5 py-0.5 bg-yellow-950/50 border border-yellow-800/40 text-yellow-300 rounded">
                      {d}
                    </span>
                  ))}
                </div>
              )}
              {p.description && (
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{p.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <p className="text-xs text-yellow-300 font-semibold uppercase tracking-wide mb-2">Recommendations</p>
          <ul className="space-y-1.5">
            {recommendations.map((rec, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-yellow-400 shrink-0">→</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {themes.length === 0 && planets.length === 0 && recommendations.length === 0 && (
        <details className="mt-2 border border-white/10 rounded-lg">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-yellow-400 hover:bg-white/5 rounded-lg">
            Raw Career Data
          </summary>
          <pre className="px-3 pb-3 text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
            {JSON.stringify(output, null, 2)}
          </pre>
        </details>
      )}
    </SectionShell>
  );
}
