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

type SearchParams = {
  decade?: string;
  country?: string;
  gender?: string;
  outcome?: string;
  marriages?: string;
  offset?: string;
  order?: string;
};

type Order = "name" | "year_asc" | "year_desc";
type ParsedFilters = {
  decade: number | undefined;
  country: string | undefined;
  gender: string | undefined;
  outcome: string | undefined;
  marriages: number | "5+" | undefined;
  offset: number;
  order: Order | undefined;
};

function parseFilters(sp: SearchParams): ParsedFilters {
  const decade = sp.decade ? Number(sp.decade) : undefined;
  const country = sp.country || undefined;
  const gender = sp.gender || undefined;
  const outcome = sp.outcome || undefined;
  let marriages: number | "5+" | undefined;
  if (sp.marriages === "5+") marriages = "5+";
  else if (sp.marriages !== undefined && sp.marriages !== "") {
    const n = Number(sp.marriages);
    if (Number.isInteger(n) && n >= 0 && n <= 4) marriages = n;
  }
  const offset = sp.offset ? Math.max(0, Number(sp.offset)) : 0;
  const order: Order | undefined =
    sp.order === "name" || sp.order === "year_asc" || sp.order === "year_desc"
      ? sp.order
      : undefined;
  return { decade, country, gender, outcome, marriages, offset, order };
}

function buildQuery(
  base: SearchParams,
  overrides: Record<string, string | number | undefined>
): string {
  const params = new URLSearchParams();
  const merged: Record<string, string | number | undefined> = { ...base, ...overrides };
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === null || v === "") continue;
    params.set(k, String(v));
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
  const filteredCount = db.research.subjects.countFiltered({
    gender: filters.gender,
    country: filters.country,
    decade: filters.decade,
    outcome: filters.outcome,
    marriages: filters.marriages,
  });

  const subjects = db.research.subjects.list({
    limit: PAGE_SIZE,
    offset: filters.offset,
    gender: filters.gender,
    country: filters.country,
    decade: filters.decade,
    outcome: filters.outcome,
    marriages: filters.marriages,
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
      <section className="rounded-xl border border-zinc-700/60 bg-zinc-900/30 p-4">
        <form method="get" action="/research" className="flex flex-wrap items-end gap-3">
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
        </form>
      </section>

      {/* Result summary */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-zinc-400">
          {filteredCount.toLocaleString()} subjects match
          {(filters.country || filters.decade !== undefined || filters.gender || filters.outcome || filters.marriages !== undefined) && (
            <> · filtered from {totalSubjects.toLocaleString()}</>
          )}
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
                  <td
                    colSpan={7}
                    className="py-12 text-center text-zinc-500"
                  >
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
