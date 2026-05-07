// VedAstro reading -> compact text summary for clipboard / LLM context.

import {
  parseVedAstroPlanets,
  longitudeToSign,
  longitudeToDegreesInSign,
} from "./astro-utils";

type Output = unknown;
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

type DasaNode = {
  Lord?: string;
  Nature?: string;
  Description?: string;
  SubDasas?: Record<string, DasaNode>;
};

function summarizeDasha(nodes: Record<string, DasaNode>, level = 0): string[] {
  const labels = ["Mahadasha", "Antardasha", "Pratyantardasha"];
  const out: string[] = [];
  for (const [planet, node] of Object.entries(nodes)) {
    const indent = "  ".repeat(level);
    const label = labels[level] ?? "Sub";
    out.push(`${indent}${label}: ${planet}${node.Nature ? ` (${node.Nature})` : ""}`);
    if (node.SubDasas && Object.keys(node.SubDasas).length > 0) {
      out.push(...summarizeDasha(node.SubDasas, level + 1));
    }
  }
  return out;
}

export function summarizeVedAstro(out: Output): string {
  if (!isObj(out)) return "";
  const raw = out.raw_responses as Record<string, unknown> | undefined;
  if (!raw) return "(no data)";

  const lagna = (raw.rising_sign as { Payload?: { LagnaSignName?: string } } | undefined)
    ?.Payload?.LagnaSignName;
  const planetsRaw = (raw.planets as { Payload?: { AllPlanetLongitude?: string } } | undefined)
    ?.Payload?.AllPlanetLongitude;
  const planets = planetsRaw ? parseVedAstroPlanets(planetsRaw) : [];
  const houses = (raw.houses as
    | { Payload?: { AllHouseLongitudes?: Array<{ House: string; Begin: string }> } }
    | undefined)?.Payload?.AllHouseLongitudes ?? [];
  const av = (raw.ashtakavarga as
    | { Payload?: { BhinnashtakavargaChart?: Record<string, { Total: number }> } }
    | undefined)?.Payload?.BhinnashtakavargaChart;
  const dasha = (raw.dasha as { Payload?: { DasaForNow?: Record<string, DasaNode> } } | undefined)
    ?.Payload?.DasaForNow;

  const lines: string[] = [];
  lines.push(`Lagna (Ascendant, sidereal Lahiri): ${lagna ?? "—"}`);

  if (planets.length) {
    lines.push("");
    lines.push("Planets (sidereal):");
    for (const p of planets) {
      lines.push(`  ${p.name}: ${p.sign} ${p.degrees} — Nakshatra ${p.nakshatra}`);
    }
  }

  if (houses.length) {
    const cusps = houses
      .slice()
      .sort((a, b) => parseInt(a.House.replace("House", "")) - parseInt(b.House.replace("House", "")))
      .map((h) => {
        const n = parseInt(h.House.replace("House", ""));
        const lon = parseFloat(h.Begin);
        return `H${n}=${longitudeToSign(lon)} ${longitudeToDegreesInSign(lon)}`;
      });
    lines.push("");
    lines.push(`House cusps: ${cusps.join(", ")}`);
  }

  if (dasha) {
    lines.push("");
    lines.push("Vimshottari Dasha (current):");
    lines.push(...summarizeDasha(dasha));
  }

  if (av) {
    const totals = Object.entries(av)
      .map(([k, v]) => `${k}=${v.Total}`)
      .join(", ");
    lines.push("");
    lines.push(`Ashtakavarga totals (per planet): ${totals}`);
  }

  return lines.join("\n");
}
