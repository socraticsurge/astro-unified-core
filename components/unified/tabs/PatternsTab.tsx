"use client";
import { useState } from "react";
import { SIGNS_ORDER } from "@/components/unified/types";
import type { SignName } from "@/components/unified/types";
import { SavChartGrid } from "@/components/unified/SavChartGrid";
import { SectionHeading } from "@/components/unified/SectionHeading";
import { cn } from "@/lib/utils";

const MAJOR_YOGAS = new Set([
  "Malavya Yoga", "Shasha Yoga", "Bhadra Yoga", "Hamsa Yoga", "Ruchaka Yoga",
  "Gajakesari Yoga", "Raj Yoga", "Lakshmi Yoga", "Adhi Yoga",
]);

const KARAKA_ORDER = [
  "Atmakaraka", "Amatyakaraka", "Bhratrikaraka", "Matrikaraka",
  "Putrakaraka", "Gnatikaraka", "Darakaraka",
];

type Yoga         = { name: string; formed_by?: string[]; description?: string };
type GrahaYuddha  = { winner?: string; loser?: string; description?: string };
type Gandanta     = { planet?: string; sign?: string; degree?: number; nakshatra?: string; description?: string };
type KarakaEntry  = { planet?: string; description?: string };
type ArudhaPada   = { name?: string; sign?: string };

type PatternsSubTab = "yogas" | "doshas" | "jaimini" | "ashtakavarga";

const PATTERNS_TABS: { id: PatternsSubTab; label: string }[] = [
  { id: "yogas",        label: "Yogas"        },
  { id: "doshas",       label: "Doshas"       },
  { id: "jaimini",      label: "Jaimini"      },
  { id: "ashtakavarga", label: "Ashtakavarga" },
];

export function PatternsTab({ chartOutput }: { chartOutput: Record<string, unknown> }) {
  const [activeTab, setActiveTab] = useState<PatternsSubTab>("yogas");
  const data = chartOutput?.data as Record<string, unknown> | undefined;

  const yogas        = (data?.yogas        as Yoga[]                           | undefined) ?? [];
  const kaalSarpa    = data?.kaal_sarpa    as { type?: string; direction?: string; description?: string } | undefined;
  const grahaYuddha  = (data?.graha_yuddha as GrahaYuddha[]                    | undefined) ?? [];
  const gandanta     = (data?.gandanta     as Gandanta[]                        | undefined) ?? [];
  const jaiminiKarakas = data?.jaimini_karakas as Record<string, KarakaEntry>  | undefined;
  const karakamsha   = data?.karakamsha   as {
    atmakaraka?: string; karakamsha_sign?: string; ishta_devata?: string;
    planets_in_karakamsha?: string[];
  } | undefined;
  const arudhaPadas  = data?.arudha_padas as Record<string, ArudhaPada>        | undefined;
  const upapada      = data?.upapada      as { sign?: string; lord?: string; second_from_ul?: string; description?: string } | undefined;
  const ashtakavarga = data?.ashtakavarga as Record<string, unknown>           | undefined;

  const sav = ashtakavarga?.sarvashtakavarga   as Record<string, number>                   | undefined;
  const bav = ashtakavarga?.bhinnashtakavarga  as Record<string, Record<string, number>>   | undefined;

  return (
    <div className="space-y-0">
      {/* Sub-tab bar */}
      <div role="tablist" className="flex gap-1.5 mb-5">
        {PATTERNS_TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "px-3 py-1.5 rounded text-xs border transition-colors",
              activeTab === t.id
                ? "text-[var(--color-ink-1)] border-[var(--color-border-strong,var(--color-border))] bg-[var(--color-surface-2)]"
                : "text-[var(--color-ink-3)] border-[var(--color-border)] bg-transparent hover:border-[var(--color-border-strong,var(--color-border))]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Yogas */}
      {activeTab === "yogas" && (
        <section>
          <SectionHeading>Yogas ({yogas.length})</SectionHeading>
          {yogas.length === 0 ? (
            <p style={{ fontSize: 12, fontStyle: "italic", color: "var(--color-ink-3)" }}>No yoga data available.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 8 }}>
              {yogas.map((y, i) => (
                <div
                  key={`${y.name}-${i}`}
                  className="ac-card ac-card-pad-sm"
                  style={MAJOR_YOGAS.has(y.name) ? { borderColor: "var(--color-accent-dim)", background: "var(--color-accent-faint)" } : {}}
                >
                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: y.description ? 6 : 0 }}>
                    <span style={{
                      fontWeight: 600, fontSize: 13,
                      color: MAJOR_YOGAS.has(y.name) ? "var(--color-accent)" : "var(--color-ink-1)",
                    }}>
                      {y.name}
                    </span>
                    {MAJOR_YOGAS.has(y.name) && (
                      <span className="ac-tag solid" style={{ fontSize: 9, padding: "1px 6px", letterSpacing: "0.07em" }}>Major</span>
                    )}
                    <div className="ac-pills" style={{ gap: 4 }}>
                      {y.formed_by?.map(p => (
                        <span key={p} className="ac-pill cool" style={{ fontSize: 10 }}>{p}</span>
                      ))}
                    </div>
                  </div>
                  {y.description && (
                    <p style={{ fontSize: 12, color: "var(--color-ink-3)", lineHeight: 1.5 }}>{y.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Doshas */}
      {activeTab === "doshas" && (
        <section>
          <SectionHeading>Doshas</SectionHeading>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 10 }}>
            <div
              className="ac-card ac-card-pad-sm"
              style={kaalSarpa ? { borderColor: "var(--color-danger-border)", background: "var(--color-danger-faint)" } : {}}
            >
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--color-ink-1)", marginBottom: 4 }}>Kaal Sarpa</div>
              {kaalSarpa ? (
                <>
                  <p style={{ fontSize: 12, color: "var(--color-danger)", marginBottom: kaalSarpa.description ? 4 : 0 }}>
                    {kaalSarpa.type} · {kaalSarpa.direction}
                  </p>
                  {kaalSarpa.description && (
                    <p style={{ fontSize: 12, color: "var(--color-ink-3)" }}>{kaalSarpa.description}</p>
                  )}
                </>
              ) : (
                <p style={{ fontSize: 12, color: "var(--color-success)" }}>Not detected</p>
              )}
            </div>

            {grahaYuddha.length > 0 && (
              <div className="ac-card ac-card-pad-sm" style={{ borderColor: "var(--color-warning-border)", background: "var(--color-warning-faint)" }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "var(--color-ink-1)", marginBottom: 6 }}>
                  Graha Yuddha — Planetary Wars ({grahaYuddha.length})
                </div>
                {grahaYuddha.map((gw, i) => (
                  <div key={i} style={{ fontSize: 12, color: "var(--color-ink-3)", marginBottom: 3 }}>
                    <span style={{ color: "var(--color-warning)", fontWeight: 600 }}>{gw.winner}</span>
                    <span style={{ margin: "0 4px" }}>defeats</span>
                    <span style={{ color: "var(--color-danger)" }}>{gw.loser}</span>
                    {gw.description && <span style={{ marginLeft: 6, opacity: 0.6 }}>({gw.description})</span>}
                  </div>
                ))}
              </div>
            )}

            {gandanta.length > 0 && (
              <div className="ac-card ac-card-pad-sm" style={{ borderColor: "var(--color-accent-dim)", background: "var(--color-accent-faint)" }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "var(--color-ink-1)", marginBottom: 6 }}>
                  Gandanta — Karmic Junctions ({gandanta.length})
                </div>
                {gandanta.map((g, i) => (
                  <p key={i} style={{ fontSize: 12, color: "var(--color-ink-3)", marginBottom: 2 }}>
                    <span style={{ color: "var(--color-accent)", fontWeight: 600 }}>{g.planet}</span>
                    {" "}{g.sign} {g.degree?.toFixed(2)}° · {g.nakshatra}
                    {g.description && <span style={{ marginLeft: 6, opacity: 0.6 }}>({g.description})</span>}
                  </p>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Jaimini */}
      {activeTab === "jaimini" && (
        <section>
          <SectionHeading>Jaimini — Soul Indicators</SectionHeading>

          {jaiminiKarakas && (
            <div className="ac-card overflow-x-auto" style={{ marginBottom: 16 }}>
              <table className="ac-table">
                <thead>
                  <tr>{["Karaka","Planet","Description"].map(h => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {KARAKA_ORDER.map(k => {
                    const entry = jaiminiKarakas[k];
                    if (!entry) return null;
                    return (
                      <tr key={k}>
                        <td>{k}</td>
                        <td className="planet">{entry.planet ?? "—"}</td>
                        <td className="muted">{entry.description ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {karakamsha && (
            <div className="ac-card ac-card-pad" style={{ borderColor: "var(--color-accent-dim)", background: "var(--color-accent-faint)", marginBottom: 16 }}>
              <div className="ac-eyebrow" style={{ marginBottom: 10 }}>Karakamsha — Soul&apos;s Direction</div>
              <div className="ac-kv">
                <div><span className="k">Atmakaraka</span><span className="v">{karakamsha.atmakaraka ?? "—"}</span></div>
                <div><span className="k">Karakamsha sign</span><span className="v">{karakamsha.karakamsha_sign ?? "—"}</span></div>
                {karakamsha.ishta_devata && (
                  <div><span className="k">Ishta Devata</span><span className="v accent" style={{ fontSize: 15 }}>{karakamsha.ishta_devata}</span></div>
                )}
              </div>
              {karakamsha.planets_in_karakamsha && karakamsha.planets_in_karakamsha.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div className="ac-eyebrow" style={{ marginBottom: 6 }}>Planets in Karakamsha</div>
                  <div className="ac-pills">
                    {karakamsha.planets_in_karakamsha.map(p => (
                      <span key={p} className="ac-pill cool">{p}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {arudhaPadas && (
            <div style={{ marginBottom: 16 }}>
              <div className="ac-eyebrow" style={{ marginBottom: 8 }}>Arudha Padas</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px,1fr))", gap: 6 }}>
                {Object.entries(arudhaPadas).map(([num, v]) => (
                  <div key={num} className="ac-card" style={{ padding: "8px 10px", textAlign: "center" }}>
                    <div className="ac-eyebrow" style={{ marginBottom: 2 }}>{v.name ?? `A${num}`}</div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "var(--color-ink-1)" }}>{v.sign ?? "—"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {upapada && (
            <div className="ac-card ac-card-pad">
              <div className="ac-eyebrow" style={{ marginBottom: 8 }}>Upapada (A12) — Spouse Indicator</div>
              <div className="ac-kv">
                <div><span className="k">UL sign</span><span className="v">{upapada.sign ?? "—"}</span></div>
                <div><span className="k">Lord</span><span className="v cool">{upapada.lord ?? "—"}</span></div>
                <div><span className="k">2nd from UL</span><span className="v">{upapada.second_from_ul ?? "—"}</span></div>
              </div>
              {upapada.description && (
                <p style={{ marginTop: 8, fontSize: 12, color: "var(--color-ink-3)", lineHeight: 1.5 }}>{upapada.description}</p>
              )}
            </div>
          )}
        </section>
      )}

      {/* Ashtakavarga */}
      {activeTab === "ashtakavarga" && (
        <section>
          <SectionHeading>Ashtakavarga</SectionHeading>

          {sav && (
            <div style={{ marginBottom: 20 }}>
              <SavChartGrid
                sav={sav}
                lagnaSign={
                  ((chartOutput?.data as Record<string, unknown> | undefined)
                    ?.lagna as Record<string, unknown> | undefined)
                    ?.sign as SignName | undefined
                }
              />
            </div>
          )}

          {bav && (
            <div>
              <div className="ac-eyebrow" style={{ marginBottom: 8 }}>Bhinnashtakavarga (BAV) — per planet</div>
              <div className="ac-card overflow-x-auto">
                <table className="ac-table">
                  <thead>
                    <tr>
                      <th>Planet</th>
                      {SIGNS_ORDER.map(s => <th key={s} className="right" style={{ minWidth: 26 }}>{s.slice(0, 3)}</th>)}
                      <th className="right">Σ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(bav).map(([planet, scores]) => {
                      const total = SIGNS_ORDER.reduce((acc, sign) => acc + (scores[sign] ?? 0), 0);
                      return (
                        <tr key={planet}>
                          <td className="planet">{planet}</td>
                          {SIGNS_ORDER.map(sign => {
                            const val = scores[sign] ?? 0;
                            const cls = val >= 6 ? "ac-cell-good" : val <= 2 ? "ac-cell-bad" : "";
                            return <td key={sign} className={`num right ${cls}`}>{val}</td>;
                          })}
                          <td className="num right" style={{ fontWeight: 700 }}>{total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!sav && !bav && (
            <p style={{ fontSize: 12, fontStyle: "italic", color: "var(--color-ink-3)" }}>Ashtakavarga data not available.</p>
          )}
        </section>
      )}
    </div>
  );
}
