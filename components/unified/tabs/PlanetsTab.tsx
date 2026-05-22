"use client";
import { PLANET_ORDER, dignityTone } from "@/components/unified/types";
import type { Planet } from "@/components/unified/types";
import { SectionHeading } from "@/components/unified/SectionHeading";
import { formatAspects } from "@/components/unified/types";

export function PlanetsTab({ chartOutput }: { chartOutput: Record<string, unknown> }) {
  const data     = chartOutput?.data as Record<string, unknown> | undefined;
  const planets  = data?.planets     as Record<string, Planet>         | undefined;
  const avasthas = data?.avasthas    as Record<string, { avastha?: string }> | undefined;
  const yogas    = data?.yogas       as { name: string; formed_by?: string[] }[] | undefined;

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


    </div>
  );
}
