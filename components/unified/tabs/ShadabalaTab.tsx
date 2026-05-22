"use client";
import { PLANET_ORDER } from "@/components/unified/types";
import type { ShadbalaPlanet } from "@/components/unified/types";
import { SectionHeading } from "@/components/unified/SectionHeading";

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

export function ShadabalaTab({ chartOutput }: { chartOutput: Record<string, unknown> }) {
  const data        = chartOutput?.data as Record<string, unknown> | undefined;
  const shadbala    = data?.shadbala    as Record<string, ShadbalaPlanet> | undefined;
  const bhavaChalit = data?.bhava_chalit as Record<string, { rashi_house?: number; bhava_house?: number; shifted?: boolean }> | undefined;

  return (
    <div className="space-y-8">

      {/* Shadbala */}
      {shadbala ? (
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
      ) : (
        <p style={{ fontSize: 13, fontStyle: "italic", color: "var(--color-ink-3)" }}>
          Shadbala data not available.
        </p>
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
