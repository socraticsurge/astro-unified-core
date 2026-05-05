import Link from "next/link";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

const ENGINE_KEYS = [
  "vedastro",
  "panchangam",
  "jyotishganit",
  "western",
  "hellenistic",
  "bazi",
  "numerology",
  "dashaflow",
  "stellium",
] as const;

const TOTAL_ENGINES = ENGINE_KEYS.length;

const PAGE_SIZE = 50;

// Curated facets to surface per engine. Each engine has 50-180 facet keys total
// (planet × position × house etc.); these are the ones a researcher most often filters on.
type FacetSpec = { key: string; label: string };
const ENGINE_FACETS: Record<string, FacetSpec[]> = {
  panchangam: [
    { key: "tithi", label: "Tithi" },
    { key: "paksha", label: "Paksha" },
    { key: "nakshatra", label: "Nakshatra" },
    { key: "yoga", label: "Yoga" },
    { key: "karana", label: "Karana" },
    { key: "vara", label: "Weekday" },
    { key: "ascendant_sign", label: "Ascendant sign" },
  ],
  jyotishganit: [
    { key: "lagna_sign", label: "Lagna sign" },
    { key: "lagna_nakshatra", label: "Lagna nakshatra" },
    { key: "sun_sign", label: "Sun sign" },
    { key: "sun_house", label: "Sun house" },
    { key: "moon_sign", label: "Moon sign" },
    { key: "moon_house", label: "Moon house" },
    { key: "moon_nakshatra", label: "Moon nakshatra" },
    { key: "mars_house", label: "Mars house" },
    { key: "mercury_house", label: "Mercury house" },
    { key: "jupiter_house", label: "Jupiter house" },
    { key: "venus_house", label: "Venus house" },
    { key: "saturn_house", label: "Saturn house" },
    { key: "rahu_house", label: "Rahu house" },
    { key: "mahadasha_lord", label: "Current mahadasha lord" },
  ],
  western: [
    { key: "chart_type", label: "Day / Night" },
    { key: "sun_sign", label: "Sun sign" },
    { key: "moon_sign", label: "Moon sign" },
    { key: "asc_sign", label: "Ascendant sign" },
    { key: "mc_sign", label: "MC sign" },
    { key: "mercury_sign", label: "Mercury sign" },
    { key: "venus_sign", label: "Venus sign" },
    { key: "mars_sign", label: "Mars sign" },
    { key: "jupiter_sign", label: "Jupiter sign" },
    { key: "saturn_sign", label: "Saturn sign" },
    { key: "sun_house", label: "Sun house" },
    { key: "moon_house", label: "Moon house" },
  ],
  hellenistic: [
    { key: "sect", label: "Sect" },
    { key: "sun_sign", label: "Sun sign" },
    { key: "moon_sign", label: "Moon sign" },
    { key: "sun_dignity", label: "Sun dignity" },
    { key: "moon_dignity", label: "Moon dignity" },
    { key: "mercury_dignity", label: "Mercury dignity" },
    { key: "venus_dignity", label: "Venus dignity" },
    { key: "mars_dignity", label: "Mars dignity" },
    { key: "jupiter_dignity", label: "Jupiter dignity" },
    { key: "saturn_dignity", label: "Saturn dignity" },
    { key: "pars_fortuna_sign", label: "Pars Fortuna sign" },
  ],
  bazi: [
    { key: "day_master_element", label: "Day Master element" },
    { key: "day_master_nature", label: "Day Master nature" },
    { key: "year_animal", label: "Year animal" },
    { key: "month_animal", label: "Month animal" },
    { key: "day_animal", label: "Day animal" },
    { key: "time_animal", label: "Hour animal" },
    { key: "eight_mansions_group", label: "Eight Mansions group" },
    { key: "dominant_element", label: "Dominant element" },
    { key: "weakest_element", label: "Weakest element" },
    { key: "life_gua", label: "Life Gua" },
  ],
  numerology: [
    { key: "pythagorean_life_path", label: "Life path (Pythagorean)" },
    { key: "pythagorean_destiny", label: "Destiny" },
    { key: "pythagorean_expression", label: "Expression" },
    { key: "pythagorean_soul_urge", label: "Soul urge" },
    { key: "pythagorean_personality", label: "Personality" },
    { key: "pythagorean_power", label: "Power" },
    { key: "chaldean_life_path", label: "Life path (Chaldean)" },
    { key: "chaldean_destiny", label: "Destiny (Chaldean)" },
  ],
  dashaflow: [
    { key: "lagna_sign", label: "Lagna sign" },
    { key: "lagna_nakshatra", label: "Lagna nakshatra" },
    { key: "sun_sign", label: "Sun sign" },
    { key: "sun_house", label: "Sun house" },
    { key: "moon_sign", label: "Moon sign" },
    { key: "moon_house", label: "Moon house" },
    { key: "moon_nakshatra", label: "Moon nakshatra" },
    { key: "mahadasha_lord", label: "Mahadasha lord" },
    { key: "antardasha_lord", label: "Antardasha lord" },
    { key: "atmakaraka", label: "Atmakaraka" },
    { key: "amatyakaraka", label: "Amatyakaraka" },
    { key: "sun_dignity", label: "Sun dignity" },
    { key: "moon_dignity", label: "Moon dignity" },
    { key: "panchang_vara", label: "Weekday" },
    { key: "yoga", label: "Yoga (any of)" },
  ],
  stellium: [
    { key: "sect", label: "Sect" },
    { key: "sun_sign", label: "Sun sign" },
    { key: "moon_sign", label: "Moon sign" },
    { key: "asc_sign", label: "Ascendant sign" },
    { key: "mc_sign", label: "MC sign" },
    { key: "profection_year_sign", label: "Annual profection sign" },
    { key: "profection_year_ruler", label: "Annual profection ruler" },
    { key: "lot_part_fortune_sign", label: "Pars Fortuna sign" },
    { key: "lot_part_spirit_sign", label: "Pars Spirit sign" },
  ],
};

const FACET_PARAM_PREFIX = "f.";

type SearchParams = Record<string, string | string[] | undefined>;

type Order = "name" | "year_asc" | "year_desc";

type ParsedFilters = {
  decade: number | undefined;
  country: string | undefined;
  gender: string | undefined;
  outcome: string | undefined;
  marriages: number | "5+" | undefined;
  engine: string | undefined;
  facets: Record<string, string>;
  offset: number;
  order: Order | undefined;
};

function firstString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function parseFilters(sp: SearchParams): ParsedFilters {
  const decadeStr = firstString(sp.decade);
  const decade = decadeStr ? Number(decadeStr) : undefined;
  const country = firstString(sp.country) || undefined;
  const gender = firstString(sp.gender) || undefined;
  const outcome = firstString(sp.outcome) || undefined;

  const marriagesStr = firstString(sp.marriages);
  let marriages: number | "5+" | undefined;
  if (marriagesStr === "5+") marriages = "5+";
  else if (marriagesStr) {
    const n = Number(marriagesStr);
    if (Number.isInteger(n) && n >= 0 && n <= 4) marriages = n;
  }

  const engineRaw = firstString(sp.engine);
  const engine = engineRaw && engineRaw in ENGINE_FACETS ? engineRaw : undefined;

  const facets: Record<string, string> = {};
  if (engine) {
    const allowed = new Set(ENGINE_FACETS[engine].map((f) => f.key));
    for (const [k, raw] of Object.entries(sp)) {
      if (!k.startsWith(FACET_PARAM_PREFIX)) continue;
      const facetKey = k.slice(FACET_PARAM_PREFIX.length);
      if (!allowed.has(facetKey)) continue;
      const value = firstString(raw);
      if (value) facets[facetKey] = value;
    }
  }

  const offsetStr = firstString(sp.offset);
  const offset = offsetStr ? Math.max(0, Number(offsetStr)) : 0;

  const orderRaw = firstString(sp.order);
  const order: Order | undefined =
    orderRaw === "name" || orderRaw === "year_asc" || orderRaw === "year_desc"
      ? orderRaw
      : undefined;

  return { decade, country, gender, outcome, marriages, engine, facets, offset, order };
}

function buildQuery(
  base: SearchParams,
  overrides: Record<string, string | number | undefined>
): string {
  const params = new URLSearchParams();
  // Carry over existing keys (handling string-array values defensively)
  for (const [k, v] of Object.entries(base)) {
    if (v === undefined || v === "") continue;
    const value = Array.isArray(v) ? v[0] : v;
    if (!value) continue;
    params.set(k, value);
  }
  // Apply overrides
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined || v === null || v === "") {
      params.delete(k);
    } else {
      params.set(k, String(v));
    }
  }
  const qs = params.toString();
  return qs ? `/research?${qs}` : "/research";
}

function pct(num: number, denom: number): number {
  if (denom === 0) return 0;
  return Math.round((num / denom) * 100);
}

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const filters = parseFilters(sp);

  const totalSubjects = db.research.subjects.count();

  const filterOpts = {
    gender: filters.gender,
    country: filters.country,
    decade: filters.decade,
    outcome: filters.outcome,
    marriages: filters.marriages,
    facetEngine: filters.engine,
    facets: filters.facets,
  };

  const filteredCount = db.research.subjects.countFiltered(filterOpts);
  const subjects = db.research.subjects.list({
    ...filterOpts,
    limit: PAGE_SIZE,
    offset: filters.offset,
    order: filters.order,
  });

  const rowKeys = subjects.map((s) => s.row_key);
  const readingCounts = db.research.readings.countsForSubjects(rowKeys);
  const marriageCounts = db.research.marriages.countsForSubjects(rowKeys);

  const progress = db.research.readings.progress();
  const latestJob = db.research.jobs.latest("compute");
  const countries = db.research.subjects.countries();
  const decades = db.research.subjects.decadeDistribution();
  const outcomes = db.research.marriages.outcomeDistribution();
  const marriageBuckets = db.research.marriages.perSubjectDistribution();
  const enginesWithFacets = new Set(db.research.facets.enginesNames());

  // Per-facet value distributions for the currently-selected engine only
  const facetValueLists = filters.engine
    ? ENGINE_FACETS[filters.engine].map((f) => ({
        ...f,
        values: db.research.facets.valuesFor(filters.engine!, f.key, 200),
      }))
    : [];

  const totalReadings =
    (progress.by_status.pending ?? 0) +
    (progress.by_status.running ?? 0) +
    (progress.by_status.done ?? 0) +
    (progress.by_status.error ?? 0);
  const doneReadings = progress.by_status.done ?? 0;
  const runningReadings = progress.by_status.running ?? 0;
  const errorReadings = progress.by_status.error ?? 0;
  const overallPct = pct(doneReadings, totalReadings);

  const page = Math.floor(filters.offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const prevOffset = Math.max(0, filters.offset - PAGE_SIZE);
  const nextOffset = filters.offset + PAGE_SIZE;
  const hasPrev = filters.offset > 0;
  const hasNext = nextOffset < filteredCount;

  const topCountries = countries.slice(0, 20);

  const hasNonFacetFilter =
    !!filters.country ||
    filters.decade !== undefined ||
    !!filters.gender ||
    !!filters.outcome ||
    filters.marriages !== undefined;
  const hasFacetFilter = !!filters.engine && Object.keys(filters.facets).length > 0;
  const hasAnyFilter = hasNonFacetFilter || hasFacetFilter;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Research Corpus</h1>
        <p className="text-sm text-muted-foreground">
          {totalSubjects.toLocaleString()} subjects from the VedAstro 15K dataset.
          Isolated from the user-facing profiles.
        </p>
      </div>

      {/* Job-status banner */}
      <section className="rounded-xl border border-zinc-700/60 bg-zinc-900/40 p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-zinc-200">
              {doneReadings.toLocaleString()} of {totalReadings.toLocaleString()} readings computed
              <span className="text-zinc-400 ml-1">({overallPct}%)</span>
            </span>
            <Badge variant="outline" className="border-yellow-700/50 text-yellow-400">
              pending: {(progress.by_status.pending ?? 0).toLocaleString()}
            </Badge>
            <Badge variant="outline" className="border-zinc-600/50 text-zinc-300">
              running: {runningReadings.toLocaleString()}
            </Badge>
            <Badge variant="outline" className="border-green-800/50 text-green-400">
              done: {doneReadings.toLocaleString()}
            </Badge>
            {errorReadings > 0 && (
              <Badge variant="outline" className="border-red-800/50 text-red-400">
                errors: {errorReadings.toLocaleString()}
              </Badge>
            )}
          </div>
          <a
            href="/research"
            className="text-xs px-2.5 py-1 rounded-md border border-zinc-600 hover:bg-zinc-800 transition-colors"
          >
            Refresh
          </a>
        </div>

        {/* Overall progress bar */}
        <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-green-600/70"
            style={{ width: `${overallPct}%` }}
          />
        </div>

        {/* Per-engine pills */}
        {progress.by_engine.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {progress.by_engine.map((e) => {
              const t = e.pending + e.running + e.done + e.error;
              const p = pct(e.done, t);
              return (
                <div
                  key={e.engine}
                  className="rounded-md border border-zinc-700/60 bg-zinc-950/50 px-2 py-1.5 text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-zinc-300">{e.engine}</span>
                    <span className="text-zinc-500">{p}%</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-zinc-400"
                      style={{ width: `${p}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-zinc-500">
                    <span>{e.done}/{t}</span>
                    {e.error > 0 && <span className="text-red-400">e:{e.error}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {latestJob && (
          <div className="text-xs text-zinc-500">
            Latest <span className="font-mono">{latestJob.kind}</span> job: {latestJob.status}
            {latestJob.total > 0 && (
              <> · {latestJob.completed}/{latestJob.total} done</>
            )}
            {latestJob.failed > 0 && <> · {latestJob.failed} failed</>}
            {latestJob.last_progress_at && (
              <> · last update {new Date(latestJob.last_progress_at).toLocaleString()}</>
            )}
          </div>
        )}
      </section>

      {/* Filter bar */}
      <section className="rounded-xl border border-zinc-700/60 bg-zinc-900/30 p-4 space-y-4">
        <form method="get" action="/research" className="space-y-4">
          {/* Demographic + corpus filters */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">Decade</label>
              <select
                name="decade"
                defaultValue={filters.decade?.toString() ?? ""}
                className="bg-zinc-950 border border-zinc-700 rounded-md text-sm px-2 py-1 min-w-32"
              >
                <option value="">All decades</option>
                {decades.map((d) => (
                  <option key={d.decade} value={d.decade}>
                    {d.decade}s ({d.count.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">Country</label>
              <select
                name="country"
                defaultValue={filters.country ?? ""}
                className="bg-zinc-950 border border-zinc-700 rounded-md text-sm px-2 py-1 min-w-44"
              >
                <option value="">All countries</option>
                {topCountries.map((c) => (
                  <option key={c.country} value={c.country}>
                    {c.country} ({c.count.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">Gender</label>
              <select
                name="gender"
                defaultValue={filters.gender ?? ""}
                className="bg-zinc-950 border border-zinc-700 rounded-md text-sm px-2 py-1 min-w-28"
              >
                <option value="">All</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">Outcome</label>
              <select
                name="outcome"
                defaultValue={filters.outcome ?? ""}
                className="bg-zinc-950 border border-zinc-700 rounded-md text-sm px-2 py-1 min-w-36"
              >
                <option value="">Any outcome</option>
                {outcomes.map((o) => (
                  <option key={o.outcome_normalized} value={o.outcome_normalized}>
                    {o.outcome_normalized} ({o.count.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">Marriages</label>
              <select
                name="marriages"
                defaultValue={
                  filters.marriages === undefined ? "" : String(filters.marriages)
                }
                className="bg-zinc-950 border border-zinc-700 rounded-md text-sm px-2 py-1 min-w-32"
              >
                <option value="">Any</option>
                {marriageBuckets.map((b) => (
                  <option key={String(b.marriages)} value={String(b.marriages)}>
                    {b.marriages === "5+" ? "5 or more" : b.marriages} ({b.subjects.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">Order</label>
              <select
                name="order"
                defaultValue={filters.order ?? ""}
                className="bg-zinc-950 border border-zinc-700 rounded-md text-sm px-2 py-1 min-w-32"
              >
                <option value="">Year (desc)</option>
                <option value="year_asc">Year (asc)</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>

          {/* Chart-property filter — adapts to selected engine */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 space-y-3">
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">
                  Filter by chart properties — system
                </label>
                <select
                  name="engine"
                  defaultValue={filters.engine ?? ""}
                  className="bg-zinc-950 border border-zinc-700 rounded-md text-sm px-2 py-1 min-w-44"
                >
                  <option value="">— None (no chart filter) —</option>
                  {Object.keys(ENGINE_FACETS)
                    .filter((e) => enginesWithFacets.has(e))
                    .map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                </select>
              </div>
              {filters.engine && (
                <p className="text-xs text-zinc-500 max-w-md">
                  Pick any combination of {filters.engine} chart properties below. Subjects must
                  match every selected value (AND).
                </p>
              )}
            </div>

            {filters.engine && facetValueLists.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
                {facetValueLists.map((f) => {
                  const current = filters.facets[f.key] ?? "";
                  return (
                    <div key={f.key} className="flex flex-col gap-1">
                      <label className="text-xs text-zinc-400" title={f.key}>
                        {f.label}
                      </label>
                      <select
                        name={`${FACET_PARAM_PREFIX}${f.key}`}
                        defaultValue={current}
                        className="bg-zinc-950 border border-zinc-700 rounded-md text-sm px-2 py-1"
                      >
                        <option value="">Any</option>
                        {f.values.map((v) => (
                          <option key={v.facet_value} value={v.facet_value}>
                            {v.facet_value} ({v.subjects.toLocaleString()})
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="h-8 px-3 rounded-md bg-zinc-200 text-zinc-900 text-sm font-medium hover:bg-white transition-colors"
            >
              Apply
            </button>
            <Link
              href="/research"
              className="h-8 px-3 inline-flex items-center rounded-md border border-zinc-600 text-sm hover:bg-zinc-800 transition-colors"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      {/* Result summary */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-zinc-400">
          {filteredCount.toLocaleString()} subjects match
          {hasAnyFilter && <> · filtered from {totalSubjects.toLocaleString()}</>}
        </div>
        <div className="text-zinc-500 text-xs">
          Page {page} of {totalPages.toLocaleString()}
        </div>
      </div>

      {/* Subject table */}
      <section className="rounded-xl border border-zinc-700/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="text-left py-2 px-3 font-medium">Name</th>
                <th className="text-left py-2 px-3 font-medium">Gender</th>
                <th className="text-left py-2 px-3 font-medium">DOB</th>
                <th className="text-left py-2 px-3 font-medium">Country</th>
                <th className="text-left py-2 px-3 font-medium">Rodden</th>
                <th className="text-right py-2 px-3 font-medium">Marriages</th>
                <th className="text-left py-2 px-3 font-medium">Readings</th>
              </tr>
            </thead>
            <tbody>
              {subjects.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    {totalSubjects === 0
                      ? "0 subjects, queue empty."
                      : "No subjects match the current filters."}
                  </td>
                </tr>
              )}
              {subjects.map((s) => {
                const rc = readingCounts.get(s.row_key);
                const mc = marriageCounts.get(s.row_key) ?? 0;
                const done = rc?.done ?? 0;
                const errs = rc?.error ?? 0;
                return (
                  <tr
                    key={s.row_key}
                    className="border-t border-zinc-800/70 hover:bg-zinc-900/40"
                  >
                    <td className="py-2 px-3">
                      <Link
                        href={`/research/${encodeURIComponent(s.row_key)}`}
                        className="text-zinc-100 hover:text-white hover:underline"
                      >
                        {s.name}
                      </Link>
                    </td>
                    <td className="py-2 px-3 text-zinc-400">{s.gender ?? "—"}</td>
                    <td className="py-2 px-3 font-mono text-xs text-zinc-300">
                      {s.date_of_birth}
                    </td>
                    <td className="py-2 px-3 text-zinc-300">{s.country ?? "—"}</td>
                    <td className="py-2 px-3 text-zinc-400 text-xs">{s.rodden ?? "—"}</td>
                    <td className="py-2 px-3 text-right text-zinc-300">
                      {mc > 0 ? mc : <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={
                          done === TOTAL_ENGINES
                            ? "text-green-400 text-xs font-mono"
                            : done > 0
                              ? "text-yellow-400 text-xs font-mono"
                              : "text-zinc-500 text-xs font-mono"
                        }
                      >
                        {done}/{TOTAL_ENGINES} done
                      </span>
                      {errs > 0 && (
                        <span className="ml-2 text-red-400 text-xs font-mono">
                          {errs} err
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pagination */}
      {filteredCount > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <Link
            href={hasPrev ? buildQuery(sp, { offset: prevOffset === 0 ? undefined : prevOffset }) : "#"}
            aria-disabled={!hasPrev}
            className={
              "h-8 px-3 inline-flex items-center rounded-md border text-sm transition-colors " +
              (hasPrev
                ? "border-zinc-600 hover:bg-zinc-800"
                : "border-zinc-800 text-zinc-600 pointer-events-none")
            }
          >
            ← Previous
          </Link>
          <div className="text-xs text-zinc-500">
            Showing {filters.offset + 1}–
            {Math.min(filters.offset + PAGE_SIZE, filteredCount).toLocaleString()} of{" "}
            {filteredCount.toLocaleString()}
          </div>
          <Link
            href={hasNext ? buildQuery(sp, { offset: nextOffset }) : "#"}
            aria-disabled={!hasNext}
            className={
              "h-8 px-3 inline-flex items-center rounded-md border text-sm transition-colors " +
              (hasNext
                ? "border-zinc-600 hover:bg-zinc-800"
                : "border-zinc-800 text-zinc-600 pointer-events-none")
            }
          >
            Next →
          </Link>
        </div>
      )}
    </div>
  );
}
