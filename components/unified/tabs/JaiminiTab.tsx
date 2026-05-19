"use client";
import { SectionHeading } from "@/components/unified/SectionHeading";

const KARAKA_ORDER = [
  "Atmakaraka", "Amatyakaraka", "Bhratrikaraka", "Matrikaraka",
  "Putrakaraka", "Gnatikaraka", "Darakaraka",
];

type KarakaEntry = { planet?: string; description?: string };
type ArudhaPada  = { name?: string; sign?: string };

export function JaiminiTab({ chartOutput }: { chartOutput: Record<string, unknown> }) {
  const data = chartOutput?.data as Record<string, unknown> | undefined;

  const jaiminiKarakas = data?.jaimini_karakas as Record<string, KarakaEntry> | undefined;
  const karakamsha     = data?.karakamsha as {
    atmakaraka?: string; karakamsha_sign?: string; ishta_devata?: string;
    planets_in_karakamsha?: string[];
  } | undefined;
  const arudhaPadas    = data?.arudha_padas as Record<string, ArudhaPada> | undefined;
  const upapada        = data?.upapada as {
    sign?: string; lord?: string; second_from_ul?: string; description?: string;
  } | undefined;

  return (
    <div className="space-y-6">
      <SectionHeading>Jaimini — Soul Indicators</SectionHeading>

      {/* Chara Karakas */}
      {jaiminiKarakas && (
        <section>
          <div className="ac-card overflow-x-auto">
            <table className="ac-table">
              <thead>
                <tr>
                  {["Karaka", "Planet", "Description"].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
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
        </section>
      )}

      {/* Karakamsha */}
      {karakamsha && (
        <section>
          <div className="ac-card ac-card-pad" style={{ borderColor: "var(--color-accent-dim)", background: "var(--color-accent-faint)" }}>
            <div className="ac-eyebrow" style={{ marginBottom: 12 }}>Karakamsha — Soul&apos;s Direction</div>
            <div className="ac-kv">
              <div>
                <span className="k">Atmakaraka</span>
                <span className="v">{karakamsha.atmakaraka ?? "—"}</span>
              </div>
              <div>
                <span className="k">Karakamsha sign</span>
                <span className="v">{karakamsha.karakamsha_sign ?? "—"}</span>
              </div>
              {karakamsha.ishta_devata && (
                <div>
                  <span className="k">Ishta Devata</span>
                  <span className="v accent" style={{ fontSize: 15 }}>{karakamsha.ishta_devata}</span>
                </div>
              )}
            </div>
            {karakamsha.planets_in_karakamsha && karakamsha.planets_in_karakamsha.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="ac-eyebrow" style={{ marginBottom: 6 }}>Planets in Karakamsha</div>
                <div className="ac-pills">
                  {karakamsha.planets_in_karakamsha.map(p => (
                    <span key={p} className="ac-pill cool">{p}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Arudha Padas */}
      {arudhaPadas && (
        <section>
          <SectionHeading>Arudha Padas</SectionHeading>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px,1fr))", gap: 6 }}>
            {Object.entries(arudhaPadas).map(([num, v]) => (
              <div key={num} className="ac-card" style={{ padding: "8px 10px", textAlign: "center" }}>
                <div className="ac-eyebrow" style={{ marginBottom: 2 }}>{v.name ?? `A${num}`}</div>
                <div style={{ fontWeight: 600, fontSize: 13, color: "var(--color-ink-1)" }}>{v.sign ?? "—"}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Upapada */}
      {upapada && (
        <section>
          <SectionHeading>Upapada (A12) — Spouse Indicator</SectionHeading>
          <div className="ac-card ac-card-pad">
            <div className="ac-kv">
              <div><span className="k">UL sign</span><span className="v">{upapada.sign ?? "—"}</span></div>
              <div><span className="k">Lord</span><span className="v cool">{upapada.lord ?? "—"}</span></div>
              <div><span className="k">2nd from UL</span><span className="v">{upapada.second_from_ul ?? "—"}</span></div>
            </div>
            {upapada.description && (
              <p style={{ marginTop: 10, fontSize: 12, color: "var(--color-ink-3)", lineHeight: 1.5 }}>
                {upapada.description}
              </p>
            )}
          </div>
        </section>
      )}

      {!jaiminiKarakas && !karakamsha && !arudhaPadas && (
        <p style={{ fontSize: 12, fontStyle: "italic", color: "var(--color-ink-3)" }}>Jaimini data not available.</p>
      )}
    </div>
  );
}
