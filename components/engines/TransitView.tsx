"use client";
import { SectionShell } from "./SectionShell";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";

type SectionExplainer = {
  title: string;
  gist?: string | null;
  bodyHtml: string;
  sources?: { text: string; chapter?: number | string; sloka?: number | string }[];
};

type TransitPlanet = {
  sign?: string;
  degree?: number;
  is_retrograde?: boolean;
  nakshatra?: string;
  house_from_lagna?: number;
  house_from_moon?: number;
  sav_points?: number;
};

type SadeSatiData = {
  active?: boolean;
  phase?: string;
  saturn_transit_sign?: string;
  natal_moon_sign?: string;
  description?: string;
};

type RahuKetuAxis = {
  rahu_sign?: string;
  ketu_sign?: string;
  rahu_house_from_lagna?: number;
  ketu_house_from_lagna?: number;
  description?: string;
};

type TransitRaw = {
  planets?: Record<string, TransitPlanet>;
  sade_sati?: SadeSatiData;
  rahu_ketu_axis?: RahuKetuAxis;
  transit_date?: string;
};

type Props = {
  output: Record<string, unknown> | undefined;
  transitDate?: string;
  explainer: SectionExplainer | null;
};

const PLANET_ORDER = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
const th = "text-left py-1.5 pr-3 font-medium text-xs text-muted-foreground";
const row = "border-b border-white/10 hover:bg-white/5";

export function TransitView({ output, transitDate, explainer }: Props) {
  const accent = "text-sky-400";
  const card = "bg-sky-950/20 border border-sky-800/30 rounded-lg p-3";

  if (!output) {
    return (
      <SectionShell sectionInView="Transit Analysis (Gochar)" explainer={explainer} accent={accent}>
        <p className="text-muted-foreground text-sm py-2">Transit data not available.</p>
      </SectionShell>
    );
  }

  // Handle wrapped output ({data: {...}}) or direct object
  const raw = ((output.data ?? output) as TransitRaw);
  const planets = raw.planets;
  const sadeSati = raw.sade_sati;
  const rahuKetu = raw.rahu_ketu_axis;
  const date = transitDate ?? (output.transit_date as string | undefined);

  return (
    <SectionShell
      sectionInView="Transit Analysis (Gochar)"
      explainer={explainer}
      accent={accent}
      defaultOpen={true}
    >
      {date && (
        <p className="text-xs text-muted-foreground mt-2 mb-3">
          Transit snapshot for{" "}
          <span className="text-sky-300 font-mono font-semibold">{date}</span>. Positions recalculated daily.
        </p>
      )}

      {/* Sade Sati Banner */}
      {sadeSati && (
        <div className={`mb-4 p-3 rounded-lg border ${sadeSati.active
          ? "bg-orange-950/30 border-orange-700/50"
          : "bg-emerald-950/20 border-emerald-800/30"
        }`}>
          <div className="flex items-center gap-2">
            {sadeSati.active
              ? <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0" />
              : <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />}
            <p className={`font-semibold text-sm ${sadeSati.active ? "text-orange-300" : "text-emerald-300"}`}>
              Sade Sati:{" "}
              {sadeSati.active
                ? `Active — ${sadeSati.phase ?? "ongoing"} phase`
                : "Not currently active"}
            </p>
          </div>
          {sadeSati.description && (
            <p className="text-xs text-muted-foreground mt-1 ml-6 leading-relaxed">
              {sadeSati.description}
            </p>
          )}
          {sadeSati.active && (
            <div className="flex gap-4 mt-2 ml-6 text-xs text-muted-foreground">
              {sadeSati.saturn_transit_sign && (
                <span>Saturn in: <span className="text-orange-300">{sadeSati.saturn_transit_sign}</span></span>
              )}
              {sadeSati.natal_moon_sign && (
                <span>Natal Moon: <span className="text-orange-300">{sadeSati.natal_moon_sign}</span></span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Rahu-Ketu Axis */}
      {rahuKetu && (
        <div className={`${card} mb-4`}>
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-3.5 w-3.5 text-sky-400" />
            <p className="text-xs text-sky-300 font-semibold uppercase tracking-wide">
              Rahu-Ketu Nodal Axis
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Transit Rahu</p>
              <p className="font-semibold text-sky-200">{rahuKetu.rahu_sign ?? "—"}</p>
              {rahuKetu.rahu_house_from_lagna && (
                <p className="text-muted-foreground/60">House: {rahuKetu.rahu_house_from_lagna}</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground">Transit Ketu</p>
              <p className="font-semibold text-sky-200">{rahuKetu.ketu_sign ?? "—"}</p>
              {rahuKetu.ketu_house_from_lagna && (
                <p className="text-muted-foreground/60">House: {rahuKetu.ketu_house_from_lagna}</p>
              )}
            </div>
          </div>
          {rahuKetu.description && (
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              {rahuKetu.description}
            </p>
          )}
        </div>
      )}

      {/* Planet-by-planet transit table */}
      {planets && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>Planet</th>
                <th className={th}>Transit Sign</th>
                <th className={th}>H from Lagna</th>
                <th className={th}>H from ☽</th>
                <th className={th}>SAV Points</th>
                <th className={`${th} text-center`}>Rx</th>
              </tr>
            </thead>
            <tbody>
              {PLANET_ORDER.map((name) => {
                const p = planets[name];
                if (!p) return null;
                const savScore = p.sav_points;
                return (
                  <tr key={name} className={row}>
                    <td className="py-2 pr-3 font-semibold text-sky-300">{name}</td>
                    <td className="py-2 pr-3 font-semibold text-sky-200">{p.sign ?? "—"}</td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {p.house_from_lagna !== undefined ? `H${p.house_from_lagna}` : "—"}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {p.house_from_moon !== undefined ? `H${p.house_from_moon}` : "—"}
                    </td>
                    <td className="py-2 pr-3">
                      {savScore !== undefined ? (
                        <span className={`font-mono font-bold ${
                          savScore >= 30 ? "text-emerald-400" : savScore <= 22 ? "text-red-400" : "text-muted-foreground"
                        }`}>
                          {savScore}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-2 text-center text-orange-400 font-bold">
                      {p.is_retrograde ? "℞" : <span className="text-muted-foreground/40 text-xs">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!planets && !sadeSati && !rahuKetu && (
        <details className="mt-2 border border-white/10 rounded-lg">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-sky-400 hover:bg-white/5 rounded-lg">
            Raw Transit Data
          </summary>
          <pre className="px-3 pb-3 text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
            {JSON.stringify(output, null, 2)}
          </pre>
        </details>
      )}
    </SectionShell>
  );
}
