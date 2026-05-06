import Link from "next/link";
import { notFound } from "next/navigation";
import { db, type ResearchCluster } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

const PAGE_SIZE = 50;

type SearchParams = Record<string, string | string[] | undefined>;

type TopFacet = {
  engine: string;
  key: string;
  value: string;
  in_cluster_freq: number;
  corpus_freq: number;
  lift: number;
};

function parseTopFacets(raw: string | null): TopFacet[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (f): f is TopFacet =>
        f &&
        typeof f === "object" &&
        typeof f.engine === "string" &&
        typeof f.key === "string" &&
        typeof f.value === "string" &&
        typeof f.lift === "number"
    );
  } catch {
    return [];
  }
}

function firstString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function fmtPct(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

function liftClass(lift: number): string {
  if (lift > 1.2) return "text-green-400 font-semibold";
  if (lift < 0.8) return "text-red-400 font-semibold";
  return "text-zinc-400";
}

function clusterDisplayLabel(c: ResearchCluster): string {
  if (c.id < 0) return c.label ?? "Outliers";
  return c.label ?? `Cluster ${c.id}`;
}

export default async function ClusterDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id: idRaw } = await params;
  const sp = await searchParams;

  const id = Number(idRaw);
  if (!Number.isInteger(id)) notFound();

  const cluster = db.research.clusters.get(id);
  if (!cluster) notFound();

  const totalInCluster = db.research.clusters.countSubjectsIn(id);

  const offsetRaw = firstString(sp.offset);
  const offset = offsetRaw ? Math.max(0, Number(offsetRaw) || 0) : 0;
  const subjects = db.research.clusters.subjectsIn(id, {
    limit: PAGE_SIZE,
    offset,
  });

  const marriageCounts = db.research.marriages.countsForSubjects(
    subjects.map((s) => s.row_key)
  );

  const topFacets = parseTopFacets(cluster.top_facets).slice(0, 8);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(totalInCluster / PAGE_SIZE));
  const prevOffset = Math.max(0, offset - PAGE_SIZE);
  const nextOffset = offset + PAGE_SIZE;
  const hasPrev = offset > 0;
  const hasNext = nextOffset < totalInCluster;

  function buildHref(o: number | undefined): string {
    if (!o) return `/research/clusters/${id}`;
    return `/research/clusters/${id}?offset=${o}`;
  }

  return (
    <div className="space-y-6">
      <div className="text-xs text-zinc-500">
        <Link href="/research/clusters" className="hover:text-zinc-300">
          ← Back to clusters
        </Link>
      </div>

      {/* Header */}
      <header className="rounded-xl border border-zinc-700/60 bg-zinc-900/30 p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-zinc-100">
            {clusterDisplayLabel(cluster)}
          </h1>
          <Badge
            variant="outline"
            className="border-zinc-700 text-zinc-400 font-mono text-xs"
          >
            cluster #{cluster.id}
          </Badge>
        </div>
        {cluster.description && (
          <p className="text-sm text-zinc-300">{cluster.description}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-zinc-600 text-zinc-300">
            {cluster.size.toLocaleString()} subjects
          </Badge>
          <Badge variant="outline" className="border-zinc-600 text-zinc-300">
            mean marriages:{" "}
            <span className="font-mono ml-1">
              {cluster.mean_marriages !== null
                ? cluster.mean_marriages.toFixed(2)
                : "—"}
            </span>
          </Badge>
          <Badge variant="outline" className="border-zinc-600 text-zinc-300">
            dissolution rate:{" "}
            <span className="font-mono ml-1">
              {fmtPct(cluster.dissolution_rate)}
            </span>
          </Badge>
          {cluster.n_with_outcome !== null && (
            <Badge variant="outline" className="border-zinc-700 text-zinc-500">
              {cluster.n_with_outcome.toLocaleString()}/
              {cluster.size.toLocaleString()} with outcomes
            </Badge>
          )}
        </div>
      </header>

      {/* Distinctive facets */}
      {topFacets.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">
            Distinctive facets ({topFacets.length})
          </h2>
          <div className="rounded-xl border border-zinc-700/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-400">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium">Engine</th>
                    <th className="text-left py-2 px-3 font-medium">Key</th>
                    <th className="text-left py-2 px-3 font-medium">Value</th>
                    <th className="text-right py-2 px-3 font-medium">In cluster</th>
                    <th className="text-right py-2 px-3 font-medium">Corpus</th>
                    <th className="text-right py-2 px-3 font-medium">Lift</th>
                  </tr>
                </thead>
                <tbody>
                  {topFacets.map((f, i) => (
                    <tr
                      key={i}
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
                      <td className="py-2 px-3 font-mono text-xs text-zinc-300">
                        {f.key}
                      </td>
                      <td className="py-2 px-3 font-mono text-xs text-zinc-100">
                        {f.value}
                      </td>
                      <td className="py-2 px-3 text-right text-zinc-200 font-mono">
                        {fmtPct(f.in_cluster_freq)}
                      </td>
                      <td className="py-2 px-3 text-right text-zinc-500 font-mono">
                        {fmtPct(f.corpus_freq)}
                      </td>
                      <td
                        className={
                          "py-2 px-3 text-right font-mono " + liftClass(f.lift)
                        }
                      >
                        {f.lift.toFixed(2)}×
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Subject list */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">
            Subjects ({totalInCluster.toLocaleString()})
          </h2>
          <div className="text-xs text-zinc-500">
            Page {page} of {totalPages.toLocaleString()}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-700/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="text-left py-2 px-3 font-medium">Name</th>
                  <th className="text-left py-2 px-3 font-medium">Gender</th>
                  <th className="text-left py-2 px-3 font-medium">Birth year</th>
                  <th className="text-left py-2 px-3 font-medium">Country</th>
                  <th className="text-right py-2 px-3 font-medium">Marriages</th>
                </tr>
              </thead>
              <tbody>
                {subjects.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-zinc-500">
                      No subjects in this cluster page.
                    </td>
                  </tr>
                )}
                {subjects.map((s) => {
                  const mc = marriageCounts.get(s.row_key) ?? 0;
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
                      <td className="py-2 px-3 text-zinc-400">
                        {s.gender ?? "—"}
                      </td>
                      <td className="py-2 px-3 font-mono text-xs text-zinc-300">
                        {s.birth_year ?? "—"}
                      </td>
                      <td className="py-2 px-3 text-zinc-300">
                        {s.country ?? "—"}
                      </td>
                      <td className="py-2 px-3 text-right text-zinc-300 font-mono">
                        {mc > 0 ? mc : <span className="text-zinc-600">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalInCluster > PAGE_SIZE && (
          <div className="flex items-center justify-between">
            <Link
              href={hasPrev ? buildHref(prevOffset === 0 ? undefined : prevOffset) : "#"}
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
              Showing {(offset + 1).toLocaleString()}–
              {Math.min(offset + PAGE_SIZE, totalInCluster).toLocaleString()} of{" "}
              {totalInCluster.toLocaleString()}
            </div>
            <Link
              href={hasNext ? buildHref(nextOffset) : "#"}
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
      </section>
    </div>
  );
}
