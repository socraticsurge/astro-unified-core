"use client";
import { SectionHeading } from "@/components/unified/SectionHeading";
import { TabSection } from "@/components/unified/TabGrid";

const MAJOR_YOGAS = new Set([
  "Malavya Yoga", "Shasha Yoga", "Bhadra Yoga", "Hamsa Yoga", "Ruchaka Yoga",
  "Gajakesari Yoga", "Raj Yoga", "Lakshmi Yoga", "Adhi Yoga",
]);

type Yoga        = { name: string; formed_by?: string[]; description?: string };
type GrahaYuddha = { winner?: string; loser?: string; description?: string };
type Gandanta    = { planet?: string; sign?: string; degree?: number; nakshatra?: string; description?: string };

export function YogasTab({ chartOutput }: { chartOutput: Record<string, unknown> }) {
  const data = chartOutput?.data as Record<string, unknown> | undefined;

  const yogas       = (data?.yogas       as Yoga[]        | undefined) ?? [];
  const kaalSarpa   = data?.kaal_sarpa   as { type?: string; direction?: string; description?: string } | undefined;
  const grahaYuddha = (data?.graha_yuddha as GrahaYuddha[] | undefined) ?? [];
  const gandanta    = (data?.gandanta    as Gandanta[]     | undefined) ?? [];

  const hasDoshas = !!kaalSarpa || grahaYuddha.length > 0 || gandanta.length > 0;

  if (yogas.length === 0 && !hasDoshas) {
    return (
      <p style={{ fontSize: 12, fontStyle: "italic", color: "var(--color-ink-3)" }}>
        Yoga and dosha data not available.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <TabSection when={yogas.length > 0}>
        <SectionHeading>Yogas ({yogas.length})</SectionHeading>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))",
            gap: 8,
            marginTop: "var(--sp-3)",
          }}
        >
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
                  {y.formed_by?.map((p) => (
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
      </TabSection>

      <TabSection when={hasDoshas}>
        <SectionHeading>Doshas</SectionHeading>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))",
            gap: 10,
            marginTop: "var(--sp-3)",
          }}
        >
          {kaalSarpa && (
            <div className="ac-card ac-card-pad-sm" style={{ borderColor: "var(--color-danger-border)", background: "var(--color-danger-faint)" }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--color-ink-1)", marginBottom: 4 }}>Kaal Sarpa</div>
              <p style={{ fontSize: 12, color: "var(--color-danger)", marginBottom: kaalSarpa.description ? 4 : 0 }}>
                {kaalSarpa.type} · {kaalSarpa.direction}
              </p>
              {kaalSarpa.description && (
                <p style={{ fontSize: 12, color: "var(--color-ink-3)" }}>{kaalSarpa.description}</p>
              )}
            </div>
          )}

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
                  {gw.description && (
                    <span style={{ marginLeft: 6, opacity: 0.6 }}>({gw.description})</span>
                  )}
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
                  {g.description && (
                    <span style={{ marginLeft: 6, opacity: 0.6 }}>({g.description})</span>
                  )}
                </p>
              ))}
            </div>
          )}
        </div>
      </TabSection>
    </div>
  );
}
