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

    // --- Daily Panchangam for the birth date ---
    const panchang = p.calculate_daily_panchang(year, month, day, location, 1);

    // --- Vimshottari Dasha ---
    // Moon longitude comes from the birth-day panchang planets array
    const planets: Array<{ name: string; longitude: number }> =
      panchang.planets ?? [];
    const moonData = planets.find((pl) => pl.name === "Moon");
    const moonLong = moonData?.longitude ?? 0;

    // Birth time as Unix ms (using UTC hour derived from local time - offset)
    const birthDate = new Date(
      Date.UTC(year, month - 1, day, Math.floor(hourUtc), Math.round((hourUtc % 1) * 60))
    );
    const birthTimeMs = birthDate.getTime();
    const currentTimeMs = Date.now();

    const dasha = p.calculate_vimshottari(moonLong, birthTimeMs, currentTimeMs);

    // --- Julian Day for the birth moment (for granular calculations) ---
    const jd = p.p_julday(year, month, day, hourUtc, 1);

    // --- Houses at birth moment ---
    const houses = p.calculate_houses(
      jd,
      input.latitude,
      input.longitude,
      "W", // Whole Sign — standard in Vedic astrology
      1    // Lahiri ayanamsha
    );

    // Serialize all WASM objects into plain JSON-serializable structures
    const result = {
      panchang: serializeWasm(panchang),
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
