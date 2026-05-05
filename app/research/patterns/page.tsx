import Link from "next/link";
import { db, type PatternMetric } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

type SearchParams = Record<string, string | string[] | undefined>;

const METRICS: Array<{ key: PatternMetric; label: string }> = [
  { key: "dissolution", label: "Dissolution" },
  { key: "multiple_marriages", label: "Multiple Marriages" },
  { key: "never_married", label: "Never Married" },
];

const Q_OPTIONS = [
  { value: 0.1, label: "q ≤ 0.10" },
  { value: 0.05, label: "q ≤ 0.05" },
  { value: 0.01, label: "q ≤ 0.01" },
];

const METRIC_HINT: Record<PatternMetric, string> = {
  dissolution:
    "Lift > 1.2 = group divorces more often than baseline; Lift < 0.8 = less.",
  multiple_marriages:
    "Lift > 1.2 = group has multiple marriages more often than baseline; Lift < 0.8 = less.",
  never_married:
    "Lift > 1.2 = group has more never-married subjects (cohort effect: young people); Lift < 0.8 = less.",
};

const METRIC_OUTCOME_LABEL: Record<PatternMetric, string> = {
  dissolution: "dissolution rate",
  multiple_marriages: "multiple-marriages rate",
  never_married: "never-married rate",
};

function firstString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function isMetric(s: string | undefined): s is PatternMetric {
  return s === "dissolution" || s === "multiple_marriages" || s === "never_married";
}

function buildHref(
  base: SearchParams,
  overrides: Record<string, string | number | undefined>
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) {
    if (v === undefined || v === "") continue;
    const value = Array.isArray(v) ? v[0] : v;
    if (!value) continue;
    params.set(k, value);
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined || v === null || v === "") {
      params.delete(k);
    } else {
      params.set(k, String(v));
    }
  }
  const qs = params.toString();
  return qs ? `/research/patterns?${qs}` : "/research/patterns";
}

function fmtPct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function fmtQ(q: number): string {
  if (q < 0.001) return q.toExponential(1);
  return q.toFixed(3);
}

function liftClass(lift: number): string {
  if (lift > 1.2) return "text-green-400 font-semibold";
  if (lift < 0.8) return "text-red-400 font-semibold";
  return "text-zinc-400";
}

export default async function PatternsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const metricRaw = firstString(sp.metric);
  const metric: PatternMetric = isMetric(metricRaw) ? metricRaw : "dissolution";

  const engineRaw = firstString(sp.engine);
  const engine = engineRaw && engineRaw !== "all" ? engineRaw : undefined;

  const maxQRaw = firstString(sp.max_q);
  const maxQNum = maxQRaw ? Number(maxQRaw) : NaN;
  const maxQ = Q_OPTIONS.some((o) => o.value === maxQNum) ? maxQNum : 0.05;

  const metricCounts = db.research.patterns.metrics();
  const metricCountMap = new Map(metricCounts.map((m) => [m.metric, m.findings]));

  const baseline = db.research.patterns.baseline(metric);
  const enginesForMetric = db.research.patterns.enginesFor(metric);
  const totalSubjects = db.research.subjects.count();

  const findings = db.research.patterns.top({
    metric,
    engine,
    limit: 30,
    maxQ,
  });

  // Pull n_universe from the first finding (universe size for this metric)
  const nUniverse = findings[0]?.n_universe ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pattern Findings</h1>
        <p className="text-sm text-muted-foreground">
          Univariate associations between chart facets and marriage outcomes,
          across the {totalSubjects.toLocaleString()}-subject research corpus.
        </p>
      </div>

      {/* Methodology callout */}
      <section className="rounded-xl border border-amber-700/50 bg-amber-950/20 p-4 space-y-2">
        <div className="text-sm font-semibold text-amber-300">
          ⚠ Read this first.
        </div>
        <p className="text-sm text-amber-100/90">
          These are univariate associations,{" "}
          <span className="font-semibold">not causal claims</span>. We tested
          ~12,400 facet-vs-outcome pairs and applied Benjamini-Hochberg
          correction (FDR). Two important biases:
        </p>
        <ol className="list-decimal pl-5 space-y-1.5 text-sm text-amber-100/90">
          <li>
            <span className="font-semibold">Cohort confound</span>:
            outer-planet signs (Pluto, Neptune, Uranus) are heavily concentrated
            in specific birth cohorts. Strong &ldquo;lifts&rdquo; you see for
            these are often just age-related (young subjects haven&rsquo;t
            divorced yet) rather than astrological.
          </li>
          <li>
            <span className="font-semibold">Population bias</span>: corpus is
            88% Western, 1900-1960, 79% male, AA Rodden-rated only. Findings
            reflect this slice, not humanity at large.
          </li>
        </ol>
        <p className="text-sm text-amber-100/90">
          Treat findings with intuition, not as proof. Use the lift × n_subjects
          together — small n = unstable.
        </p>
      </section>

      {/* Metric tabs */}
      <section className="space-y-3">
        <div className="flex gap-1 border-b border-zinc-800">
          {METRICS.map((m) => {
            const isActive = m.key === metric;
            const count = metricCountMap.get(m.key) ?? 0;
            return (
              <Link
                key={m.key}
                href={buildHref(sp, { metric: m.key, engine: undefined, offset: undefined })}
                className={
                  "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors " +
                  (isActive
                    ? "border-zinc-200 text-zinc-100"
                    : "border-transparent text-zinc-500 hover:text-zinc-300")
                }
              >
                {m.label}
                <span className="ml-2 text-xs text-zinc-500">
                  ({count.toLocaleString()})
                </span>
              </Link>
            );
          })}
        </div>

        {baseline !== null && (
          <div className="text-sm text-zinc-400">
            Baseline:{" "}
            <span className="text-zinc-200 font-mono">
              {fmtPct(baseline)}
            </span>{" "}
            {METRIC_OUTCOME_LABEL[metric]}
            {nUniverse !== null && (
              <>
                {" "}
                in the universe of{" "}
                <span className="text-zinc-200 font-mono">
                  {nUniverse.toLocaleString()}
                </span>{" "}
                subjects with credible outcomes
              </>
            )}
            .
          </div>
        )}
      </section>

      {/* Engine filter strip */}
      <section className="space-y-2">
        <div className="text-xs uppercase tracking-wide text-zinc-500">
          Engine
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={buildHref(sp, { engine: undefined })}
            className={
              "text-xs px-2.5 py-1 rounded-full border transition-colors " +
              (!engine
                ? "border-zinc-300 bg-zinc-200 text-zinc-900"
                : "border-zinc-700 text-zinc-300 hover:bg-zinc-800")
            }
          >
            All ({enginesForMetric.reduce((acc, e) => acc + e.findings, 0).toLocaleString()})
          </Link>
          {enginesForMetric.map((e) => {
            const isActive = e.engine === engine;
            return (
              <Link
                key={e.engine}
                href={buildHref(sp, { engine: e.engine })}
                className={
                  "text-xs px-2.5 py-1 rounded-full border transition-colors font-mono " +
                  (isActive
                    ? "border-zinc-300 bg-zinc-200 text-zinc-900"
                    : "border-zinc-700 text-zinc-300 hover:bg-zinc-800")
                }
              >
                {e.engine} ({e.findings.toLocaleString()})
              </Link>
            );
          })}
        </div>
      </section>

      {/* Significance filter */}
      <section className="flex items-center gap-2 flex-wrap">
        <div className="text-xs uppercase tracking-wide text-zinc-500 mr-1">
          Significance
        </div>
        {Q_OPTIONS.map((opt) => {
          const isActive = opt.value === maxQ;
          return (
            <Link
              key={opt.value}
              href={buildHref(sp, { max_q: opt.value })}
              className={
                "text-xs px-2.5 py-1 rounded-md border transition-colors " +
                (isActive
                  ? "border-zinc-300 bg-zinc-200 text-zinc-900"
                  : "border-zinc-700 text-zinc-300 hover:bg-zinc-800")
              }
            >
              {opt.label}
            </Link>
          );
        })}
      </section>

      {/* Findings table */}
      <section className="rounded-xl border border-zinc-700/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="text-left py-2 px-3 font-medium">Engine</th>
                <th className="text-left py-2 px-3 font-medium">Facet</th>
                <th className="text-right py-2 px-3 font-medium">N subjects</th>
                <th className="text-right py-2 px-3 font-medium">Observed</th>
                <th className="text-right py-2 px-3 font-medium">Baseline</th>
                <th className="text-right py-2 px-3 font-medium">Lift</th>
                <th className="text-right py-2 px-3 font-medium">q-value</th>
              </tr>
            </thead>
            <tbody>
              {findings.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    No findings match the current filters.
                  </td>
                </tr>
              )}
              {findings.map((f) => (
                <tr
                  key={f.id}
                  className="border-t border-zinc-800/70 hover:bg-zinc-900/40"
                >
                  <td className="py-2 px-3">
                    <Badge
                      variant="outline"
                      className="border-zinc-600 text-zinc-300 font-mono"
                    >
                      {f.engine}
                    </Badge>
                  </td>
                  <td className="py-2 px-3 font-mono text-xs text-zinc-200">
                    <span className="text-zinc-500">{f.engine}.</span>
                    {f.facet_key}
                    <span className="text-zinc-500"> = </span>
                    <span className="text-zinc-100">{f.facet_value}</span>
                  </td>
                  <td className="py-2 px-3 text-right text-zinc-300 font-mono">
                    {f.n_subjects.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-right text-zinc-200 font-mono">
                    {fmtPct(f.observed_rate)}
                  </td>
                  <td className="py-2 px-3 text-right text-zinc-500 font-mono">
                    {fmtPct(f.baseline_rate)}
                  </td>
                  <td
                    className={
                      "py-2 px-3 text-right font-mono " + liftClass(f.lift)
                    }
                  >
                    {f.lift.toFixed(2)}×
                  </td>
                  <td className="py-2 px-3 text-right text-zinc-400 font-mono text-xs">
                    {fmtQ(f.q_value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-zinc-500">{METRIC_HINT[metric]}</p>
    </div>
  );
}
