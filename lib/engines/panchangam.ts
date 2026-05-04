// Server-side only — uses the @fusionstrings/panchangam WASM package.

export type PanchangamInput = {
  date_of_birth: string; // YYYY-MM-DD
  time_of_birth: string; // HH:MM
  latitude: number;
  longitude: number;
  timezone_offset: number;
};

export type PanchangamOutput = {
  raw: unknown;
  error?: string;
};

/**
 * Serialize a WASM object that exposes properties via its prototype
 * (DailyPanchang, DayMuhurats, Muhurat, etc. are wasm-bindgen classes
 *  whose own enumerable keys are just `__wbg_ptr`).
 */
function serializeWasm(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(serializeWasm);
  if (typeof obj !== "object") return obj;

  // Plain JS object (no wasm ptr) — recurse into own keys
  const raw = obj as Record<string, unknown>;
  if (!("__wbg_ptr" in raw)) {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(raw)) {
      out[k] = serializeWasm(raw[k]);
    }
    return out;
  }

  // WASM class instance — collect from prototype chain
  const proto = Object.getPrototypeOf(obj);
  const keys = Object.getOwnPropertyNames(proto).filter(
    (k) =>
      k !== "constructor" &&
      !k.startsWith("__") &&
      k !== "free" &&
      k !== "Symbol(Symbol.dispose)"
  );
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    try {
      out[k] = serializeWasm((obj as Record<string, unknown>)[k]);
    } catch {
      // skip unreadable properties
    }
  }
  return out;
}

export async function fetchPanchangam(
  input: PanchangamInput
): Promise<PanchangamOutput> {
  try {
    // Dynamic import because @fusionstrings/panchangam is a WASM module
    const p = await import("@fusionstrings/panchangam");

    // Parse birth date
    const [yearStr, monthStr, dayStr] = input.date_of_birth.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    // Parse birth time as decimal hour (e.g. "10:30" → 10.5)
    const [hourStr, minuteStr] = input.time_of_birth.split(":");
    const hour = parseInt(hourStr, 10) + parseInt(minuteStr, 10) / 60;

    // Adjust to UTC: subtract timezone offset (offset is hours east of UTC)
    const hourUtc = hour - input.timezone_offset;

    // Build Location (altitude = 0 m by default)
    const location = new p.Location(input.latitude, input.longitude, 0);

    // --- Julian Day for the birth moment (includes time) ---
    const jd = p.p_julday(year, month, day, hourUtc, 1);

    // --- Daily Panchangam for the birth date (used for sunrise/sunset/muhurats) ---
    const panchang = p.calculate_daily_panchang(year, month, day, location, 1);

    // --- Per-element panchang at birth-time JD ---
    const AYANAMSHA = 1; // Lahiri
    const JD_UNIX_EPOCH = 2440587.5;
    const MS_PER_DAY = 86400000;
    // Helper: convert Julian Day number → Unix milliseconds
    const jdToMs = (jdVal: number): number =>
      (jdVal - JD_UNIX_EPOCH) * MS_PER_DAY;

    const nakshatra   = p.calculate_nakshatra(jd, AYANAMSHA);
    const tithi       = p.calculate_tithi(jd);
    const yoga        = p.calculate_yoga(jd, AYANAMSHA);
    const karana      = p.calculate_karana(jd);
    const vara        = p.calculate_vara(jd);
    const birthPlanets = p.calculate_planets(jd, AYANAMSHA);

    const nakshatra_s = serializeWasm(nakshatra) as Record<string, unknown>;
    const tithi_s     = serializeWasm(tithi)     as Record<string, unknown>;
    const yoga_s      = serializeWasm(yoga)       as Record<string, unknown>;
    const karana_s    = serializeWasm(karana)     as Record<string, unknown>;
    const vara_s      = serializeWasm(vara)       as Record<string, unknown>;

    // --- Vimshottari Dasha ---
    // Use birth-time Moon longitude (not sunrise-time) for accurate dasha calculation
    const moonData = birthPlanets.find(
      (pl: { name: string; longitude: number }) => pl.name === "Moon"
    );
    const moonLong = moonData?.longitude ?? 0;

    // Birth time as Unix ms — compute via offset subtraction to avoid
    // negative-minute underflow from fractional hourUtc
    const localMs =
      new Date(`${input.date_of_birth}T${input.time_of_birth}:00`).getTime();
    const birthTimeMs = localMs - input.timezone_offset * 3_600_000;
    const currentTimeMs = Date.now();

    const dasha = p.calculate_vimshottari(moonLong, birthTimeMs, currentTimeMs);

    // --- Houses at birth moment ---
    const houses = p.calculate_houses(
      jd,
      input.latitude,
      input.longitude,
      "W", // Whole Sign — standard in Vedic astrology
      1    // Lahiri ayanamsha
    );

    // Serialize all WASM objects into plain JSON-serializable structures
    // Start from daily panchang (keeps sunrise, sunset, ascendant, mc, muhurats, ayanamsha_value)
    const panchangSerialized = serializeWasm(panchang) as Record<string, unknown>;

    // Override the per-element fields with birth-time-accurate values
    const panchangOverridden = {
      ...panchangSerialized,
      // Nakshatra
      nakshatra_index:      nakshatra_s.index,
      nakshatra_name:       nakshatra_s.name,
      nakshatra_pada:       nakshatra_s.pada,
      nakshatra_start_time: jdToMs(p.nakshatra_start_time(jd, AYANAMSHA)),
      nakshatra_end_time:   jdToMs(p.nakshatra_end_time(jd, AYANAMSHA)),
      // Tithi
      tithi_index:          tithi_s.index,
      tithi_name:           tithi_s.name,
      paksha:               tithi_s.paksha,
      tithi_start_time:     jdToMs(p.tithi_start_time(jd)),
      tithi_end_time:       jdToMs(p.tithi_end_time(jd)),
      // Yoga
      yoga_index:           yoga_s.index,
      yoga_name:            yoga_s.name,
      yoga_start_time:      jdToMs(p.yoga_start_time(jd, AYANAMSHA)),
      yoga_end_time:        jdToMs(p.yoga_end_time(jd, AYANAMSHA)),
      // Karana
      karana_index:         karana_s.index,
      karana_name:          karana_s.name,
      karana_start_time:    jdToMs(p.karana_start_time(jd)),
      karana_end_time:      jdToMs(p.karana_end_time(jd)),
      // Vara (weekday)
      vara_name:            vara_s.name,
      // Planets at birth time
      planets:              birthPlanets,
    };

    const result = {
      panchang: panchangOverridden,
      dasha: serializeWasm(dasha),
      houses: serializeWasm(houses),
      birth_julian_day: jd,
      library_version: p.get_version(),
    };

    return { raw: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { raw: null, error: message };
  }
}
