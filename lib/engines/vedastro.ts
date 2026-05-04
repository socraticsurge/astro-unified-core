const BASE = process.env.VEDASTRO_API_URL ?? "https://api.vedastro.org/api";

export type VedAstroInput = {
  date_of_birth: string;
  time_of_birth: string;
  place_of_birth: string;
  timezone_offset: number;
};

export type VedAstroOutput = {
  raw_responses: Record<string, unknown>;
  errors: Record<string, string>;
};

function formatOffset(offset: number): string {
  // Use %2B instead of + so the offset survives as a URL path segment
  const sign = offset >= 0 ? "%2B" : "-";
  const abs = Math.abs(offset);
  const h = Math.floor(abs).toString().padStart(2, "0");
  const m = Math.round((abs % 1) * 60).toString().padStart(2, "0");
  return `${sign}${h}:${m}`;
}

function buildTimeSegment(input: VedAstroInput): string {
  const [year, month, day] = input.date_of_birth.split("-");
  const time = input.time_of_birth;
  const offset = formatOffset(input.timezone_offset);
  return `Time/${time}/${day}/${month}/${year}/${offset}`;
}

async function callCalc(path: string): Promise<unknown> {
  const url = `${BASE}/Calculate/${path}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`VedAstro API error ${res.status}: ${url}`);
  return res.json();
}

export async function fetchVedAstro(input: VedAstroInput): Promise<VedAstroOutput> {
  const loc = encodeURIComponent(input.place_of_birth);
  const time = buildTimeSegment(input);
  const locTime = `Location/${loc}/${time}`;

  const raw_responses: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  // Note: VedAstro's DasaForNow endpoint returns Start = End = current moment with
  // 0-hour duration (server-side bug). Vimshottari dasha is provided by Jyotishganit
  // which is accurate. So we don't fetch dasha from VedAstro.
  const calcs = [
    { key: "planetary_positions", path: `AllPlanetLongitude/${locTime}` },
    { key: "house_cusps",         path: `AllHouseLongitudes/${locTime}` },
    { key: "rising_sign",         path: `LagnaSignName/${locTime}` },
    { key: "ashtakavarga",        path: `BhinnashtakavargaChart/${locTime}` },
    { key: "shadbala",            path: `PlanetShadbalaPinda/${locTime}` },
  ];

  await Promise.all(
    calcs.map(async ({ key, path }) => {
      try {
        raw_responses[key] = await callCalc(path);
      } catch (e) {
        errors[key] = e instanceof Error ? e.message : String(e);
      }
    })
  );

  return { raw_responses, errors };
}
