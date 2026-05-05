import Link from "next/link";
import { db, type ResearchCluster } from "@/lib/db";

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

function fmtPct(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

function clusterDisplayLabel(c: ResearchCluster): string {
  if (c.id < 0) return c.label ?? "Outliers";
  return c.label ?? `Cluster ${c.id}`;
}

export default async function ClustersPage() {
  const clusters = db.research.clusters.list();
  const totalSubjects = db.research.subjects.count();

  // Determine SVD dim from first cluster (best-effort wording — db doesn't store it)
  const totalInClusters = clusters.reduce((acc, c) => acc + c.size, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cluster Analysis</h1>
        <p className="text-sm text-muted-foreground">
          {clusters.length.toLocaleString()} clusters discovered via HDBSCAN over
          ~4,000-dimensional facet vectors (TruncatedSVD + L2-norm).
          {totalInClusters > 0 && (
            <>
              {" "}
              Covers {totalInClusters.toLocaleString()} of{" "}
              {totalSubjects.toLocaleString()} subjects.
            </>
          )}
        </p>
      </div>

      {/* Methodology callout */}
      <section className="rounded-xl border border-amber-700/50 bg-amber-950/20 p-4 space-y-2">
        <div className="text-sm font-semibold text-amber-300">
          ⚠ How clustering works here.
        </div>
        <p className="text-sm text-amber-100/90">
          Each subject is encoded as a binary vector across all chart facets
          (~4,000 dims). We reduced to 100 dims via TruncatedSVD, normalized,
          then clustered with HDBSCAN. Outliers (~5%) form their own bucket.
          Distinctive facets per cluster are those with the highest in-cluster
          frequency vs corpus baseline (lift).
        </p>
      </section>

      {/* Cluster grid */}
      {clusters.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-12 text-center text-sm text-zinc-500">
          No clusters have been computed yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clusters.map((c) => {
            const topFacets = parseTopFacets(c.top_facets).slice(0, 5);
            const isOutlier = c.id < 0;
            return (
              <Link
                key={c.id}
                href={`/research/clusters/${c.id}`}
                className={
                  "block rounded-xl border p-4 space-y-3 transition-colors " +
                  (isOutlier
                    ? "border-zinc-800 bg-zinc-950/30 hover:border-zinc-700 hover:bg-zinc-900/40"
                    : "border-zinc-700/60 bg-zinc-900/30 hover:border-zinc-600 hover:bg-zinc-900/60")
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-zinc-100 leading-snug line-clamp-2">
                    {clusterDisplayLabel(c)}
                  </h3>
                  <span className="text-xs text-zinc-500 font-mono shrink-0">
                    #{c.id}
                  </span>
                </div>
                <div className="text-xs text-zinc-400">
                  <span className="text-zinc-200 font-mono">
                    {c.size.toLocaleString()}
                  </span>{" "}
                  subjects
                </div>
                <div className="text-xs text-zinc-500 flex flex-wrap gap-x-3 gap-y-1">
                  <span>
                    mean marriages:{" "}
                    <span className="text-zinc-300 font-mono">
                      {c.mean_marriages !== null
                        ? c.mean_marriages.toFixed(2)
                        : "—"}
                    </span>
                  </span>
                  <span>
                    dissolution:{" "}
                    <span className="text-zinc-300 font-mono">
                      {fmtPct(c.dissolution_rate)}
                    </span>
                  </span>
                  {c.n_with_outcome !== null && (
                    <span className="text-zinc-600">
                      ({c.n_with_outcome.toLocaleString()}/{c.size.toLocaleString()} outcomes)
                    </span>
                  )}
                </div>
                {topFacets.length > 0 && (
                  <div className="pt-1 space-y-1">
                    <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                      Top distinctive facets
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {topFacets.map((f, i) => (
                        <span
                          key={i}
                          className="text-[11px] px-2 py-0.5 rounded-md border border-zinc-700 bg-zinc-950/60 font-mono text-zinc-300"
                        >
                          {f.engine}.{f.key}=
                          <span className="text-zinc-100">{f.value}</span>{" "}
                          <span className="text-green-400">
                            (lift {f.lift.toFixed(1)}×)
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
