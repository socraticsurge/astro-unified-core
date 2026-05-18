"use client";
import { PLANET_ORDER } from "@/components/unified/types";
import type { Planet, SignName } from "@/components/unified/types";
import { NatalChartGrid } from "@/components/unified/NatalChartGrid";
import { SectionHeading } from "@/components/unified/SectionHeading";

// Each divisional chart: label, signKey, lagna key in the lagna object
const DIVISIONAL_CHARTS: {
  label: string;
  signKey: keyof Planet;
  lagnaKey: string;
}[] = [
  { label: "D2 — Hora",         signKey: "d2_sign",  lagnaKey: "d2_sign"  },
  { label: "D3 — Drekkana",     signKey: "d3_sign",  lagnaKey: "d3_sign"  },
  { label: "D4 — Chaturthamsha",signKey: "d4_sign",  lagnaKey: "d4_sign"  },
  { label: "D7 — Saptamsha",    signKey: "d7_sign",  lagnaKey: "d7_sign"  },
  { label: "D12 — Dvadashamsha",signKey: "d12_sign", lagnaKey: "d12_sign" },
  { label: "D16 — Shodashamsha",signKey: "d16_sign", lagnaKey: "d16_sign" },
  { label: "D20 — Vimshamsha",  signKey: "d20_sign", lagnaKey: "d20_sign" },
  { label: "D24 — Chaturvimshamsha", signKey: "d24_sign", lagnaKey: "d24_sign" },
  { label: "D27 — Nakshatramsha",signKey: "d27_sign", lagnaKey: "d27_sign" },
  { label: "D30 — Trimshamsha", signKey: "d30_sign", lagnaKey: "d30_sign" },
  { label: "D40 — Khavedamsha", signKey: "d40_sign", lagnaKey: "d40_sign" },
  { label: "D60 — Shashtiamsha",signKey: "d60_sign", lagnaKey: "d60_sign" },
];

export function HousesVargasTab({
  chartOutput,
}: {
  chartOutput: Record<string, unknown>;
}) {
  const data    = chartOutput?.data as Record<string, unknown> | undefined;
  const planets = data?.planets     as Record<string, Planet>  | undefined;
  const lagna   = data?.lagna as Record<string, unknown> | undefined;

  return (
    <div className="space-y-10">

      {/* Divisional Charts grid — 4 per row */}
      {planets && (
        <section>
          <SectionHeading>Divisional Charts</SectionHeading>
          <div className="overflow-x-auto overflow-y-visible">
            <div className="grid grid-cols-4 gap-6 min-w-max pb-2">
              {DIVISIONAL_CHARTS.map(({ label, signKey, lagnaKey }) => {
                const divLagnaSign = lagna?.[lagnaKey] as SignName | undefined;
                const hasDivData = PLANET_ORDER.some(n => planets[n]?.[signKey]);
                if (!hasDivData) return null;
                return (
                  <NatalChartGrid
                    key={label}
                    planets={planets}
                    lagnaSign={divLagnaSign}
                    signKey={signKey}
                    label={label}
                  />
                );
              })}
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
