// VedAstro public API. Free tier is rate-limited to 5 calls/min, so we
// keep this list at 5 to stay within budget on a fresh profile creation.
// Once a profile is saved its reading is cached in the DB, so subsequent
// page loads don't re-hit the API.
const BASE = process.env.VEDASTRO_API_URL ?? "https://api.vedastro.org/api";
const API_KEY = process.env.VEDASTRO_API_KEY;

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
  const apiKeySegment = API_KEY ? `APIKey/${API_KEY}/` : "";
  const url = `${BASE}/${apiKeySegment}Calculate/${path}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`VedAstro API error ${res.status}: ${url}`);
  const json = (await res.json()) as { Status?: string; Payload?: unknown };
  if (json?.Status === "Fail") {
    const msg = typeof json.Payload === "string" ? json.Payload : "VedAstro returned Status=Fail";
    throw new Error(msg);
  }
  return json;
}

export async function fetchVedAstro(input: VedAstroInput): Promise<VedAstroOutput> {
  const loc = encodeURIComponent(input.place_of_birth);
  const time = buildTimeSegment(input);
  const locTime = `Location/${loc}/${time}`;

  const raw_responses: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  // 5 calls — picked for highest signal in a Vedic birth-chart view.
  // DasaForNow returns a 3-level Vimshottari tree
  // (Mahadasa → Bhukti → Antaram) with planet lords, natures, and
  // descriptions. The endpoint's start/end timestamps are unreliable
  // (known VedAstro quirk) but the structural tree is correct.
  const calcs = [
    { key: "planets",       path: `AllPlanetLongitude/${locTime}` },
    { key: "houses",        path: `AllHouseLongitudes/${locTime}` },
    { key: "rising_sign",   path: `LagnaSignName/${locTime}` },
    { key: "ashtakavarga",  path: `BhinnashtakavargaChart/${locTime}` },
    { key: "dasha",         path: `DasaForNow/${locTime}` },
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
