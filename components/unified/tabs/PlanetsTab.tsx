"use client";
import { PLANET_ORDER, DIGNITY_COLORS, formatAspects, TABLE_STYLES } from "@/components/unified/types";
import type { Planet, ShadbalaPlanet } from "@/components/unified/types";
import { SectionHeading } from "@/components/unified/SectionHeading";

const { th, td, row } = TABLE_STYLES;

const SHADBALA_COLS = [
  { key: "sthana_bala", label: "Sthana" },
  { key: "dig_bala",    label: "Dig"    },
  { key: "kala_bala",   label: "Kala"   },
  { key: "chesta_bala", label: "Chesta" },
  { key: "naisargika_bala", label: "Naisargika" },
  { key: "drik_bala",   label: "Drik"   },
  { key: "total_rupas", label: "Total"  },
];

function getShadVal(sb: ShadbalaPlanet, key: string): string {
  if (key === "sthana_bala") {
    const v = sb.sthana_bala?.total;
    return v != null ? v.toFixed(2) : "—";
  }
  if (key === "total_rupas") {
    return sb.total_rupas != null ? sb.total_rupas.toFixed(2) : "—";
  }
  type K = "dig_bala" | "kala_bala" | "chesta_bala" | "naisargika_bala" | "drik_bala";
  const v = sb[key as K];
  return v != null ? (v as number).toFixed(2) : "—";
}

export function PlanetsTab({ chartOutput }: { chartOutput: Record<string, unknown> }) {
  const data     = chartOutput?.data as Record<string, unknown> | undefined;
  const planets  = data?.planets  as Record<string, Planet>         | undefined;
  const shadbala = data?.shadbala as Record<string, ShadbalaPlanet> | undefined;
  const avasthas = data?.avasthas as Record<string, { avastha?: string; description?: string }> | undefined;
  const yogas    = data?.yogas    as { name: string; formed_by?: string[] }[] | undefined;

  if (!planets) return null;

  return (
    <div className="space-y-8">
      {/* Planet positions */}
      <section>
        <SectionHeading>Positions</SectionHeading>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {["Planet","Sign","Deg","House","Nakshatra · Pada","Dignity","Retro","Combust","Avastha","Aspects"].map(h => (
                  <th key={h} className={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLANET_ORDER.map(name => {
                const p  = planets[name];
                if (!p) return null;
                const av = avasthas?.[name];
                const planetYogas = yogas?.filter(y => y.formed_by?.includes(name)) ?? [];
                return (
                  <tr key={name} className={row}>
                    <td className="py-2 px-2 font-semibold text-[var(--color-ink-1)] whitespace-nowrap">
                      {name}
                      {planetYogas.length > 0 && (
                        <span className="ml-1 text-[10px] text-[var(--color-accent)] opacity-70" title={planetYogas.map(y => y.name).join(', ')}>
                          ✦
                        </span>
                      )}
                    </td>
                    <td className={td}>{p.sign ?? "—"}</td>
                    <td className="py-2 px-2 font-mono text-sm text-[var(--color-ink-3)]">{p.degree != null ? `${p.degree.toFixed(1)}°` : "—"}</td>
                    <td className="py-2 px-2 text-center text-sm text-[var(--color-ink-2)]">{p.house ?? "—"}</td>
                    <td className={`${td} whitespace-nowrap`}>{p.nakshatra ?? "—"} · P{p.pada ?? "—"}</td>
                    <td className={`py-2 px-2 text-sm ${DIGNITY_COLORS[p.dignity ?? ""] ?? "text-dignity-neutral"}`}>{p.dignity ?? "—"}</td>
                    <td className="py-2 px-2 text-center">
                      {p.is_retrograde ? <span className="text-planet-retrograde font-semibold">℞</span> : <span className="text-muted-foreground/30">—</span>}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {p.is_combust ? <span className="text-planet-combust font-semibold">●</span> : <span className="text-muted-foreground/30">—</span>}
                    </td>
                    <td className={`${td} whitespace-nowrap`}>{av?.avastha ?? "—"}</td>
                    <td className="py-2 px-2 font-mono text-xs text-muted-foreground whitespace-nowrap">{formatAspects(p.aspects)}</td>
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
          <SectionHeading>Shadbala (Rupas)</SectionHeading>
          <div className="overflow-x-auto">
            <table className="text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className={th}>Planet</th>
                  {SHADBALA_COLS.map(c => <th key={c.key} className={`${th} text-center`}>{c.label}</th>)}
                  <th className={`${th} text-center`}>Req</th>
                  <th className={`${th} text-center`}>Ishta</th>
                  <th className={`${th} text-center`}>Kashta</th>
                </tr>
              </thead>
              <tbody>
                {PLANET_ORDER.map(name => {
                  const sb = shadbala[name];
                  if (!sb) return null;
                  const total = sb.total_rupas;
                  const req   = sb.required_rupas;
                  const strong = req != null && total != null && total >= req;
                  return (
                    <tr key={name} className={row}>
                      <td className="py-2 px-2 font-semibold text-[var(--color-ink-1)]">{name}</td>
                      {SHADBALA_COLS.map(c => (
                        <td key={c.key} className={`py-2 px-2 text-center font-mono text-xs ${c.key === "total_rupas" && strong ? "text-success font-bold" : "text-[var(--color-ink-3)]"}`}>
                          {getShadVal(sb, c.key)}
                        </td>
                      ))}
                      <td className="py-2 px-2 text-center font-mono text-xs text-[var(--color-ink-3)]">
                        {req != null ? req.toFixed(2) : "—"}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-xs text-success">
                        {sb.ishta_phala ?? "—"}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-xs text-danger">
                        {sb.kashta_phala ?? "—"}
                      </td>
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
