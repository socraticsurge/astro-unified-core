"use client";
import { SectionHeading } from "@/components/unified/SectionHeading";
import { TabSection } from "@/components/unified/TabGrid";

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

  // Reorder per PDF observation #4: data first, reference at the bottom.
  //   Karakamsha · soul's direction  → personal-specific data
  //   Arudha Padas                   → personal-specific data
  //   Upapada                        → personal-specific data
  //   Karaka reference table         → describes the karaka concept (reference)

  return (
    <div className="space-y-6">
      <TabSection when={!!karakamsha}>
        <SectionHeading><span className="ac-section-title accent">Karakamsha · soul&apos;s direction</span></SectionHeading>
        <div
          className="ac-card ac-card-pad"
          style={{ background: "var(--accent-bg)", borderColor: "var(--accent-line)", marginTop: "var(--sp-3)" }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--sp-5)" }}>
            <div>
              <div className="ac-eyebrow" style={{ marginBottom: 6 }}>Atmakaraka</div>
              <div className="ac-h1" style={{ fontStyle: "italic" }}>{karakamsha?.atmakaraka ?? "—"}</div>
            </div>
            <div>
              <div className="ac-eyebrow" style={{ marginBottom: 6 }}>Karakamsha sign</div>
              <div className="ac-h1" style={{ fontStyle: "italic" }}>{karakamsha?.karakamsha_sign ?? "—"}</div>
            </div>
            <div>
              <div className="ac-eyebrow" style={{ marginBottom: 6 }}>Planets in Karakamsha</div>
              {karakamsha?.planets_in_karakamsha && karakamsha.planets_in_karakamsha.length > 0 ? (
                <div className="ac-pills" style={{ marginTop: 4 }}>
                  {karakamsha.planets_in_karakamsha.map((p) => (
                    <span key={p} className="ac-pill cool">{p}</span>
                  ))}
                </div>
              ) : (
                <div className="ac-h1" style={{ fontStyle: "italic" }}>—</div>
              )}
            </div>
          </div>
        </div>
      </TabSection>

      <TabSection when={!!arudhaPadas}>
        <SectionHeading>Arudha Padas</SectionHeading>
        {/* Loosened spacing (#4): wider minimum tile, more breathing room. */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: 10,
            marginTop: "var(--sp-3)",
          }}
        >
          {arudhaPadas &&
            Object.entries(arudhaPadas).map(([num, v]) => (
              <div
                key={num}
                className="ac-card"
                style={{ padding: "12px 14px", textAlign: "center" }}
              >
                <div className="ac-eyebrow" style={{ marginBottom: 4 }}>{v.name ?? `A${num}`}</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--color-ink-1)" }}>
                  {v.sign ?? "—"}
                </div>
              </div>
            ))}
        </div>
      </TabSection>

      <TabSection when={!!upapada}>
        <SectionHeading>Upapada (A12) · spouse indicator</SectionHeading>
        <div className="ac-card ac-card-pad" style={{ marginTop: "var(--sp-3)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, auto) 1fr", gap: "var(--sp-6)", alignItems: "baseline" }}>
            <div>
              <div className="ac-eyebrow" style={{ marginBottom: 4 }}>UL sign</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18 }}>{upapada?.sign ?? "—"}</div>
            </div>
            <div>
              <div className="ac-eyebrow" style={{ marginBottom: 4 }}>Lord</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--cool)" }}>{upapada?.lord ?? "—"}</div>
            </div>
            <div>
              <div className="ac-eyebrow" style={{ marginBottom: 4 }}>2nd from UL</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18 }}>{upapada?.second_from_ul ?? "—"}</div>
            </div>
            {upapada?.description && (
              <div style={{ color: "var(--color-ink-2)", lineHeight: 1.55, fontSize: 13 }}>{upapada.description}</div>
            )}
          </div>
        </div>
      </TabSection>

      {/* Soul Indicators — reference at the bottom (#4). */}
      <TabSection when={!!jaiminiKarakas}>
        <SectionHeading>Jaimini — Soul Indicators</SectionHeading>
        <div className="ac-card overflow-x-auto" style={{ marginTop: "var(--sp-3)" }}>
          <table className="ac-table">
            <thead>
              <tr>
                {["Karaka", "Planet", "Description"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jaiminiKarakas &&
                KARAKA_ORDER.map((k) => {
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
      </TabSection>

      {!jaiminiKarakas && !karakamsha && !arudhaPadas && !upapada && (
        <p style={{ fontSize: 12, fontStyle: "italic", color: "var(--color-ink-3)" }}>Jaimini data not available.</p>
      )}
    </div>
  );
}
