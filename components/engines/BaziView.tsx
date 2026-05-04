"use client";
import { Section } from "@/components/Section";

type Pillar = { chinese?: string; element?: string; animal?: string; branch?: { element?: string } };
type Pillars = { year?: Pillar; month?: Pillar; day?: Pillar; time?: Pillar };
type DayMaster = { stem?: string; nature?: string; element?: string };
type FiveFactors = { WOOD?: number; FIRE?: number; EARTH?: number; METAL?: number; WATER?: number };
type EightMansions = {
  group?: string;
  lucky?: { wealth?: string; health?: string; romance?: string; career?: string };
  unlucky?: { obstacles?: string; quarrels?: string; setbacks?: string; totalLoss?: string };
};
type BasicAnalysis = {
  lifeGua?: number; dayMaster?: DayMaster; nobleman?: string[];
  intelligence?: string; skyHorse?: string; peachBlossom?: string;
  fiveFactors?: FiveFactors; eightMansions?: EightMansions;
};

type Props = { output: Record<string, unknown> };

const ELEMENT_COLORS: Record<string, string> = {
  WOOD: "text-green-300 bg-green-950/30 border-green-700/40",
  FIRE: "text-red-300 bg-red-950/30 border-red-700/40",
  EARTH: "text-yellow-300 bg-yellow-950/30 border-yellow-700/40",
  METAL: "text-slate-300 bg-slate-800/30 border-slate-600/40",
  WATER: "text-blue-300 bg-blue-950/30 border-blue-700/40",
};
const ELEMENT_BAR: Record<string, string> = {
  WOOD: "bg-green-500",
  FIRE: "bg-red-500",
  EARTH: "bg-yellow-500",
  METAL: "bg-slate-400",
  WATER: "bg-blue-500",
};

export function BaziView({ output }: Props) {
  const data = output.data as Record<string, unknown> | undefined;
  if (!data) return <p className="text-muted-foreground text-sm p-4">{output.error ? String(output.error) : "No data"}</p>;

  const pillars = data.mainPillars as Pillars | undefined;
  const analysis = data.basicAnalysis as BasicAnalysis | undefined;

  const accent = "text-red-400";

  const fiveFactors = analysis?.fiveFactors;
  const totalFactors = fiveFactors
    ? Object.values(fiveFactors).reduce((s, v) => s + (v ?? 0), 0)
    : 0;

  return (
    <div>
      {pillars && (
        <Section title="Four Pillars (八字 Bā Zì)" accent={accent}>
          <div className="grid grid-cols-4 gap-3 mt-3">
            {(["year","month","day","time"] as const).map(key => {
              const p = pillars[key];
              if (!p) return null;
              const elColors = ELEMENT_COLORS[p.element ?? ""] ?? "text-muted-foreground bg-white/5 border-white/10";
              return (
                <div key={key} className={`border rounded-lg p-3 text-center ${elColors}`}>
                  <p className="text-xs uppercase tracking-widest opacity-70 mb-2">{key}</p>
                  <p className="text-4xl font-bold leading-none mb-2">{p.chinese}</p>
                  <p className="text-base font-semibold">{p.animal}</p>
                  <div className="mt-2 space-y-1 text-xs opacity-70">
                    <p>Stem: {p.element}</p>
                    <p>Branch: {p.branch?.element}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {analysis?.dayMaster && (
        <Section title="Day Master (日主)" accent={accent}>
          <div className={`mt-2 inline-block border rounded-lg p-5 text-center ${ELEMENT_COLORS[analysis.dayMaster.element ?? ""] ?? "border-white/10"}`}>
            <p className="text-xs uppercase tracking-widest opacity-70 mb-1">Day Stem</p>
            <p className="text-5xl font-bold">{analysis.dayMaster.stem}</p>
            <p className="text-lg font-semibold mt-2">{analysis.dayMaster.nature} {analysis.dayMaster.element}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed max-w-lg">
            The Day Master is the most important pillar — it represents the self. Its element and polarity (Yin/Yang) shape personality, relationships, and destiny analysis.
          </p>
        </Section>
      )}

      {fiveFactors && totalFactors > 0 && (
        <Section title="Five Elements Balance (五行 Wǔ Xíng)" accent={accent}>
          <div className="space-y-2 mt-3">
            {(["WOOD","FIRE","EARTH","METAL","WATER"] as const).map(el => {
              const val = fiveFactors[el] ?? 0;
              const pct = totalFactors > 0 ? (val / totalFactors) * 100 : 0;
              return (
                <div key={el} className="flex items-center gap-3">
                  <span className={`text-xs font-bold w-14 ${ELEMENT_COLORS[el].split(" ")[0]}`}>{el}</span>
                  <div className="flex-1 bg-white/10 rounded-full h-4 overflow-hidden">
                    <div className={`h-4 rounded-full ${ELEMENT_BAR[el]}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground w-12 text-right">{val} ({pct.toFixed(0)}%)</span>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {analysis && (
        <Section title="Life Gua & Special Stars" accent={accent}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            {analysis.lifeGua !== undefined && (
              <div className="bg-red-950/20 border border-red-800/30 rounded-lg p-3 text-center">
                <p className="text-xs text-red-400/70 uppercase tracking-wide">Life Gua (卦)</p>
                <p className="text-4xl font-bold text-red-200 mt-1">{analysis.lifeGua}</p>
              </div>
            )}
            {[
              { label: "Nobleman Stars (贵人)", value: analysis.nobleman?.join(", ") },
              { label: "Intelligence Star (文昌)", value: analysis.intelligence },
              { label: "Sky Horse (驿马)", value: analysis.skyHorse },
              { label: "Peach Blossom (桃花)", value: analysis.peachBlossom },
            ].filter(x => x.value).map(({ label, value }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-lg p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className="text-base font-semibold text-red-200 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {analysis?.eightMansions && (
        <Section title="Eight Mansions Feng Shui (八宅)" accent={accent}>
          <div className="mt-2 space-y-3">
            <p className="text-xs text-muted-foreground">
              Life Group: <span className="font-semibold text-red-300">{analysis.eightMansions.group}</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-lg p-3">
                <p className="text-xs text-emerald-400 uppercase tracking-wide mb-2">Lucky Directions</p>
                {[
                  { label: "Wealth (生气)", dir: analysis.eightMansions.lucky?.wealth },
                  { label: "Health (天医)", dir: analysis.eightMansions.lucky?.health },
                  { label: "Romance (延年)", dir: analysis.eightMansions.lucky?.romance },
                  { label: "Career (伏位)", dir: analysis.eightMansions.lucky?.career },
                ].filter(x => x.dir).map(({ label, dir }) => (
                  <div key={label} className="flex justify-between text-sm py-0.5">
                    <span className="text-muted-foreground text-xs">{label}</span>
                    <span className="font-bold text-emerald-300">{dir}</span>
                  </div>
                ))}
              </div>
              <div className="bg-red-950/20 border border-red-800/30 rounded-lg p-3">
                <p className="text-xs text-red-400 uppercase tracking-wide mb-2">Unlucky Directions</p>
                {[
                  { label: "Obstacles (六煞)", dir: analysis.eightMansions.unlucky?.obstacles },
                  { label: "Quarrels (五鬼)", dir: analysis.eightMansions.unlucky?.quarrels },
                  { label: "Setbacks (祸害)", dir: analysis.eightMansions.unlucky?.setbacks },
                  { label: "Total Loss (绝命)", dir: analysis.eightMansions.unlucky?.totalLoss },
                ].filter(x => x.dir).map(({ label, dir }) => (
                  <div key={label} className="flex justify-between text-sm py-0.5">
                    <span className="text-muted-foreground text-xs">{label}</span>
                    <span className="font-bold text-red-300">{dir}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}
