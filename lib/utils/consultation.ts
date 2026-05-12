/**
 * Generates a formatted plain-text or markdown summary of the chart
 * for easy copying during professional consultations.
 */
export function generateConsultationNote(
  chart: any,
  transit: any,
  career: any,
  transitDate?: string
): string {
  const data = chart?.data || {};
  const meta = data.metadata || {};
  const panchang = data.panchang || {};
  const lagna = data.lagna || {};
  const planets = data.planets || {};
  const dashas = data.dashas || {};
  const ks = data.kaal_sarpa || {};

  const lines: string[] = [];

  lines.push(`--- ASTROUNIFIED CONSULTATION NOTE ---`);
  lines.push(`Profile: ${meta.dob} | ${meta.time} | ${meta.timezone}`);
  lines.push(``);

  lines.push(`1. FUNDAMENTALS`);
  lines.push(`Lagna: ${lagna.sign} (${lagna.degree?.toFixed(2)}°)`);
  lines.push(`Tithi: ${panchang.tithi?.name || "N/A"} (${panchang.tithi?.paksha || ""})`);
  lines.push(`Vara: ${panchang.vara?.name || "N/A"}`);
  lines.push(`Nakshatra: ${panchang.nakshatra?.name || "N/A"} (Pada ${panchang.nakshatra?.pada || "?"})`);
  lines.push(``);

  lines.push(`2. PLANETARY POSITIONS (D1)`);
  ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"].forEach(p => {
    const d = planets[p];
    if (d) {
      lines.push(`${p.padEnd(8)}: ${d.sign.padEnd(12)} | ${d.degree?.toFixed(2).padStart(6)}° | House ${d.house} | ${d.dignity || "Neutral"}${d.is_retrograde ? " (R)" : ""}`);
    }
  });
  lines.push(``);

  lines.push(`3. DASHA STATUS`);
  if (dashas.maha) {
    lines.push(`Mahadasha: ${dashas.maha.planet} (until ${dashas.maha.end})`);
  }
  if (dashas.antar) {
    lines.push(`Antardasha: ${dashas.antar.planet} (until ${dashas.antar.end})`);
  }
  lines.push(``);

  if (ks.present) {
    lines.push(`4. YOGAS & DOSHAS`);
    lines.push(`Kaal Sarpa: ${ks.type} in ${ks.rahu_sign}-${ks.ketu_sign}`);
    lines.push(``);
  }

  if (career && career.data) {
    const cd = career.data;
    lines.push(`5. CAREER INSIGHTS (D10)`);
    lines.push(`10th Lord: ${cd.tenth_house?.lord || "N/A"} in House ${cd.tenth_house?.lord_house || "?"}`);
    if (cd.career_themes?.length) {
      lines.push(`Themes: ${cd.career_themes.join(", ")}`);
    }
    lines.push(``);
  }

  if (transit && transit.data) {
    lines.push(`6. TRANSIT SNAPSHOT (${transitDate || "Current"})`);
    const td = transit.data.planets || {};
    ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"].forEach(p => {
      const d = td[p];
      if (d) {
        lines.push(`${p.padEnd(8)}: ${d.sign.padEnd(12)} (House ${d.house_from_moon} from Moon) | ${d.vedha_status || "No Vedha"}`);
      }
    });
    lines.push(``);
  }

  lines.push(`--- END OF NOTE ---`);

  return lines.join("\n");
}
