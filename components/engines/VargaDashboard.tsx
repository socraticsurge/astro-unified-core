"use client";
import { useState } from "react";
import { SectionShell } from "./SectionShell";

type SectionExplainer = {
  title: string;
  gist?: string | null;
  bodyHtml: string;
  sources?: { text: string; chapter?: number | string; sloka?: number | string }[];
};

type PlanetVarga = {
  sign?: string;
  degree?: number;
  house?: number;
  nakshatra?: string;
  dignity?: string;
  is_retrograde?: boolean;
  // 14 varga sign fields
  d2_sign?: string; d3_sign?: string; d4_sign?: string; d7_sign?: string;
  d9_sign?: string; d10_sign?: string; d12_sign?: string; d16_sign?: string;
  d20_sign?: string; d24_sign?: string; d27_sign?: string; d30_sign?: string;
  d40_sign?: string; d60_sign?: string;
};

type Props = {
  planets: Record<string, PlanetVarga> | undefined;
  explainer: SectionExplainer | null;
};

const PLANET_ORDER = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];

const DIGNITY_COLOR: Record<string, string> = {
  exalted:     "text-emerald-400 bg-emerald-950/40 border border-emerald-700/50",
  own:         "text-blue-400 bg-blue-950/40 border border-blue-700/50",
  mooltrikona: "text-blue-300 bg-blue-950/30 border border-blue-700/40",
  friend:      "text-teal-400 bg-teal-950/40 border border-teal-700/50",
  neutral:     "text-gray-400 bg-gray-800/40 border border-gray-600/50",
  enemy:       "text-orange-400 bg-orange-950/40 border border-orange-700/50",
  debilitated: "text-red-400 bg-red-950/40 border border-red-700/50",
};

type TabKey = "d1" | "d9" | "d10" | "d2" | "d3" | "d7" | "others";

const TABS: { key: TabKey; label: string; signKey?: keyof PlanetVarga; desc: string }[] = [
  { key: "d1",  label: "D1 — Natal",    signKey: undefined,  desc: "Birth chart (Rasi). The foundational chart of the whole personality and life circumstances." },
  { key: "d9",  label: "D9 — Navamsa",  signKey: "d9_sign",  desc: "Marriage, spiritual strength, inner planet quality. Confirm D1 predictions here." },
  { key: "d10", label: "D10 — Dashamsha", signKey: "d10_sign", desc: "Career, public reputation, professional achievement. The career birth chart." },
  { key: "d2",  label: "D2 — Hora",     signKey: "d2_sign",  desc: "Wealth and financial potential." },
  { key: "d3",  label: "D3 — Drekkana", signKey: "d3_sign",  desc: "Siblings, courage, short journeys." },
  { key: "d7",  label: "D7 — Saptamsha", signKey: "d7_sign", desc: "Children, creative power." },
  { key: "others", label: "D4/D12–D60", signKey: undefined,  desc: "Remaining divisional charts: property, parents, vehicles, education, spirituality, karma." },
];

const OTHERS_VARGAS: { label: string; key: keyof PlanetVarga }[] = [
  { label: "D4", key: "d4_sign" }, { label: "D12", key: "d12_sign" },
  { label: "D16", key: "d16_sign" }, { label: "D20", key: "d20_sign" },
  { label: "D24", key: "d24_sign" }, { label: "D27", key: "d27_sign" },
  { label: "D30", key: "d30_sign" }, { label: "D40", key: "d40_sign" },
  { label: "D60", key: "d60_sign" },
];

export function VargaDashboard({ planets, explainer }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("d1");

  const th = "text-left py-1.5 pr-3 font-medium text-xs text-muted-foreground";
  const row = "border-b border-white/10 hover:bg-white/5";

  const currentTab = TABS.find((t) => t.key === activeTab)!;

  return (
    <SectionShell
      sectionInView="Varga Chart Dashboard (D1–D60)"
      explainer={explainer}
      accent="text-violet-400"
      defaultOpen={true}
    >
      {/* Tab Strip */}
      <div className="flex gap-1 flex-wrap mt-2 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === tab.key
                ? "bg-violet-800/60 text-violet-200 border border-violet-600/60"
                : "bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Description */}
      <p className="text-xs text-muted-foreground mb-3 italic">{currentTab.desc}</p>

      {/* D1 Table */}
      {activeTab === "d1" && planets && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>Planet</th>
                <th className={th}>Sign</th>
                <th className={th}>Degree</th>
                <th className={th}>House</th>
                <th className={th}>Nakshatra</th>
                <th className={th}>Dignity</th>
                <th className={`${th} text-center`}>℞</th>
              </tr>
            </thead>
            <tbody>
              {PLANET_ORDER.map((name) => {
                const p = planets[name];
                if (!p) return null;
                const dKey = (p.dignity ?? "neutral").toLowerCase();
                const dignClass = DIGNITY_COLOR[dKey] ?? DIGNITY_COLOR.neutral;
                return (
                  <tr key={name} className={row}>
                    <td className="py-2 pr-3 font-semibold text-violet-300">{name}</td>
                    <td className="py-2 pr-3">{p.sign ?? "—"}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">
                      {p.degree !== undefined ? `${p.degree.toFixed(2)}°` : "—"}
                    </td>
                    <td className="py-2 pr-3 text-violet-400 font-bold">
                      {p.house !== undefined ? `H${p.house}` : "—"}
                    </td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{p.nakshatra ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${dignClass}`}>
                        {p.dignity ?? "—"}
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      {p.is_retrograde
                        ? <span className="text-orange-400 font-bold">℞</span>
                        : <span className="text-muted-foreground/40">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Single-varga table (D9, D10, D2, D3, D7) */}
      {activeTab !== "d1" && activeTab !== "others" && currentTab.signKey && planets && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>Planet</th>
                <th className={th}>Sign in {currentTab.label.split("—")[0].trim()}</th>
              </tr>
            </thead>
            <tbody>
              {PLANET_ORDER.map((name) => {
                const p = planets[name];
                if (!p) return null;
                const sign = p[currentTab.signKey!] as string | undefined;
                return (
                  <tr key={name} className={row}>
                    <td className="py-2 pr-3 font-semibold text-violet-300">{name}</td>
                    <td className="py-2 pr-3">{sign ?? <span className="text-muted-foreground/40 text-xs">not in data</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Check if any data actually present */}
          {PLANET_ORDER.every((name) => !planets[name]?.[currentTab.signKey!]) && (
            <p className="text-xs text-amber-400/70 mt-2 italic">
              ⚠ Varga sign data not found in the current chart response. This may indicate the sidecar needs a version check.
            </p>
          )}
        </div>
      )}

      {/* Others: multi-column grid */}
      {activeTab === "others" && planets && (
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>Planet</th>
                {OTHERS_VARGAS.map((v) => (
                  <th key={v.label} className="text-center py-1.5 px-2 font-medium text-muted-foreground">{v.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLANET_ORDER.map((name) => {
                const p = planets[name];
                if (!p) return null;
                return (
                  <tr key={name} className={row}>
                    <td className="py-1.5 pr-3 font-semibold text-violet-300">{name}</td>
                    {OTHERS_VARGAS.map((v) => (
                      <td key={v.label} className="py-1.5 px-2 text-center text-muted-foreground">
                        {(p[v.key] as string | undefined) ?? "—"}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionShell>
  );
}
