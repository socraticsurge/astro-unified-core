"use client";
import { PLANET_ORDER, dignityTone } from "@/components/unified/types";
import type { Planet, ShadbalaPlanet } from "@/components/unified/types";
import { SectionHeading } from "@/components/unified/SectionHeading";
import { formatAspects } from "@/components/unified/types";

const SHADBALA_COLS = [
  { key: "sthana_bala",     label: "Sthana"      },
  { key: "dig_bala",        label: "Dig"         },
  { key: "kala_bala",       label: "Kala"        },
  { key: "chesta_bala",     label: "Chesta"      },
  { key: "naisargika_bala", label: "Naisargika"  },
  { key: "drik_bala",       label: "Drik"        },
];

function getShadVal(sb: ShadbalaPlanet, key: string): string {
  if (key === "sthana_bala") {
    const v = sb.sthana_bala?.total;
    return v != null ? v.toFixed(2) : "—";
  }
  type K = "dig_bala" | "kala_bala" | "chesta_bala" | "naisargika_bala" | "drik_bala";
  const v = sb[key as K];
  return v != null ? (v as number).toFixed(2) : "—";
}

export function PlanetsTab({ chartOutput }: { chartOutput: Record<string, unknown> }) {
  const data        = chartOutput?.data as Record<string, unknown> | undefined;
  const planets     = data?.planets     as Record<string, Planet>         | undefined;
  const shadbala    = data?.shadbala    as Record<string, ShadbalaPlanet> | undefined;
  const avasthas    = data?.avasthas    as Record<string, { avastha?: string }> | undefined;
  const yogas       = data?.yogas       as { name: string; formed_by?: string[] }[] | undefined;
  const bhavaChalit = data?.bhava_chalit as Record<string, { rashi_house?: number; bhava_house?: number; shifted?: boolean }> | undefined;

  if (!planets) return null;

  return (
    <div className="space-y-8">

      {/* Planet positions */}
      <section>
        <SectionHeading>Positions</SectionHeading>
        <div className="ac-card overflow-x-auto">
          <table className="ac-table">
            <thead>
              <tr>
                {["Planet","Sign","Deg","House","Nakshatra · Pada","Dignity","℞","☄","Avastha","Aspects"].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLANET_ORDER.map(name => {
                const p  = planets[name];
                if (!p) return null;
                const av = avasthas?.[name];
                const tone = dignityTone(p.dignity ?? "");
                const planetYogas = yogas?.filter(y => y.formed_by?.includes(name)) ?? [];
                return (
                  <tr key={name}>
                    <td className="planet">
                      {name}
                      {planetYogas.length > 0 && (
                        <span className="ml-1 text-[9px] opacity-60" title={planetYogas.map(y => y.name).join(", ")}>
                          ✦
                        </span>
                      )}
                    </td>
                    <td>{p.sign ?? "—"}</td>
                    <td className="num right">{p.degree != null ? `${p.degree.toFixed(1)}°` : "—"}</td>
                    <td className="num right">{p.house ?? "—"}</td>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>{p.nakshatra ?? "—"} · P{p.pada ?? "—"}</td>
                    <td><span className={`ac-tag ${tone}`}>{p.dignity ?? "—"}</span></td>
                    <td className="text-center">{p.is_retrograde ? <span className="ac-retro">℞</span> : <span className="ac-dash">—</span>}</td>
                    <td className="text-center">{p.is_combust ? <span className="ac-combust" /> : <span className="ac-dash">—</span>}</td>
                    <td className="muted">{av?.avastha ?? "—"}</td>
                    <td className="muted num" style={{ fontSize: 11 }}>{formatAspects(p.aspects)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Shadbala */}
      {shadbala && (
        <section>
          <SectionHeading>Shadbala · Rupas</SectionHeading>
          <div className="ac-card overflow-x-auto">
            <table className="ac-table">
              <thead>
                <tr>
                  <th>Planet</th>
                  {SHADBALA_COLS.map(c => <th key={c.key} className="right">{c.label}</th>)}
                  <th className="right">Total</th>
                  <th className="right">Req</th>
                  <th className="right">Ishta</th>
                  <th className="right">Kashta</th>
                </tr>
              </thead>
              <tbody>
                {PLANET_ORDER.map(name => {
                  const sb = shadbala[name];
                  if (!sb) return null;
                  const total  = sb.total_rupas;
                  const req    = sb.required_rupas;
                  const strong = req != null && total != null && total >= req;
                  return (
                    <tr key={name}>
                      <td className="planet">{name}</td>
                      {SHADBALA_COLS.map(c => (
                        <td key={c.key} className="num right muted">{getShadVal(sb, c.key)}</td>
                      ))}
                      <td
                        className="num right"
                        style={{ fontWeight: 700, color: strong ? "var(--color-success)" : "var(--color-danger)" }}
                      >
                        {total != null ? total.toFixed(2) : "—"}
                      </td>
                      <td className="num right muted">{req != null ? req.toFixed(2) : "—"}</td>
                      <td className="num right" style={{ color: "var(--color-success)" }}>{sb.ishta_phala ?? "—"}</td>
                      <td className="num right" style={{ color: "var(--color-danger)" }}>{sb.kashta_phala ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Bhava Chalit */}
      {bhavaChalit && (() => {
        const shifted = Object.entries(bhavaChalit).filter(([, v]) => v.shifted);
        if (shifted.length === 0) return null;
        return (
          <section>
            <SectionHeading>Bhava Chalit · House Shifts</SectionHeading>
            <div className="ac-card ac-card-pad" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: "12px 24px" }}>
              {shifted.map(([planet, v]) => (
                <div key={planet} style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span className="planet" style={{ color: "var(--color-cool)", fontWeight: 600 }}>{planet}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-accent)" }}>
                    H{v.rashi_house} → H{v.bhava_house}
                  </span>
                </div>
              ))}
            </div>
          </section>
        );
      })()}

    </div>
  );
}
