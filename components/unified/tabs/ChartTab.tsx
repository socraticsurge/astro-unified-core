"use client";
import {
  PLANET_ORDER, VARGA_KEYS, formatAspects, dignityTone,
} from "@/components/unified/types";
import type { Planet, SignName } from "@/components/unified/types";
import { NatalChartGrid } from "@/components/unified/NatalChartGrid";
import { SectionHeading } from "@/components/unified/SectionHeading";

export function ChartTab({ chartOutput }: { chartOutput: Record<string, unknown> }) {
  const data     = chartOutput?.data as Record<string, unknown> | undefined;
  const panchang = data?.panchang as {
    tithi?:     { number?: number; name?: string; paksha?: string };
    vara?:      { name?: string; lord?: string };
    nakshatra?: { name?: string; pada?: number; lord?: string };
    yoga?:      { index?: number; name?: string };
    karana?:    string;
  } | undefined;
  const lagna   = data?.lagna   as Record<string, unknown> | undefined;
  const planets = data?.planets as Record<string, Planet>  | undefined;

  const lagnaSign   = lagna?.sign    as SignName | undefined;
  const lagnaD9Sign = lagna?.d9_sign as SignName | undefined;

  return (
    <div className="space-y-8">

      {/* Natal charts — D1 + D9 side by side */}
      {planets && (
        <section>
          <SectionHeading>Birth Chart</SectionHeading>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 max-w-xl">
            <NatalChartGrid planets={planets} lagnaSign={lagnaSign}   signKey="sign"    label="D1 — Rasi" />
            <NatalChartGrid planets={planets} lagnaSign={lagnaD9Sign} signKey="d9_sign" label="D9 — Navamsa" />
          </div>
        </section>
      )}

      {/* Panchang */}
      {panchang && (
        <section>
          <SectionHeading>Panchang at Birth</SectionHeading>
          <div className="ac-card ac-card-pad" style={{ display: "flex", flexWrap: "wrap", gap: "20px 40px" }}>
            {[
              { label: "Tithi",     value: `${panchang.tithi?.name ?? ""}${panchang.tithi?.paksha ? ` · ${panchang.tithi.paksha}` : ""}` },
              { label: "Vara",      value: `${panchang.vara?.name ?? ""} · ${panchang.vara?.lord ?? ""}` },
              { label: "Nakshatra", value: `${panchang.nakshatra?.name ?? ""} P${panchang.nakshatra?.pada ?? ""}` },
              { label: "Yoga",      value: panchang.yoga?.name ?? "" },
              { label: "Karana",    value: panchang.karana ?? "" },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="ac-eyebrow" style={{ marginBottom: 3 }}>{label}</div>
                <div style={{ fontWeight: 600, color: "var(--color-ink-1)", fontSize: 14 }}>{value || "—"}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Divisional lagna strip */}
      {lagna && (
        <section>
          <SectionHeading>Lagna across Vargas</SectionHeading>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <span className="ac-tag solid">D1: {String(lagna.sign ?? "—")}</span>
            {VARGA_KEYS.map(({ label, key }) => {
              const val = (lagna as Record<string, unknown>)[key];
              return val ? (
                <span key={label} className="ac-tag">{label}: {String(val)}</span>
              ) : null;
            })}
          </div>
        </section>
      )}

      {/* Planet table */}
      {planets && (
        <section>
          <SectionHeading>Planetary Positions</SectionHeading>
          <div className="ac-card overflow-x-auto">
            <table className="ac-table">
              <thead>
                <tr>
                  {["Planet","Sign","Deg","House","Nakshatra · Pada","Dignity","℞","☄","Aspects"].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PLANET_ORDER.map(name => {
                  const p = planets[name];
                  if (!p) return null;
                  const tone = dignityTone(p.dignity ?? "");
                  return (
                    <tr key={name}>
                      <td className="planet">{name}</td>
                      <td>{p.sign ?? "—"}</td>
                      <td className="num right">{p.degree != null ? `${p.degree.toFixed(1)}°` : "—"}</td>
                      <td className="num right">{p.house ?? "—"}</td>
                      <td className="muted" style={{ whiteSpace: "nowrap" }}>{p.nakshatra ?? "—"} · P{p.pada ?? "—"}</td>
                      <td><span className={`ac-tag ${tone}`}>{p.dignity ?? "—"}</span></td>
                      <td className="text-center">{p.is_retrograde ? <span className="ac-retro">℞</span> : <span className="ac-dash">—</span>}</td>
                      <td className="text-center">{p.is_combust ? <span className="ac-combust" /> : <span className="ac-dash">—</span>}</td>
                      <td className="muted num" style={{ fontSize: 11 }}>{formatAspects(p.aspects)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
