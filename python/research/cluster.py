import sqlite3, json, sys, datetime
from pathlib import Path
import numpy as np
from scipy.sparse import csr_matrix
from sklearn.decomposition import TruncatedSVD
from sklearn.preprocessing import normalize
import hdbscan
try:
    import umap
    HAS_UMAP = True
except ImportError:
    HAS_UMAP = False

DB_PATH = Path(__file__).resolve().parents[2] / "astrounified.db"
MIN_FACET_N = 30
MIN_CLUSTER_SIZE = 80
N_COMPONENTS = 100


def main():
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    # Step 1: load subjects
    print("Loading subjects...", flush=True)
    subjects = cur.execute("SELECT row_key FROM research_subjects ORDER BY row_key").fetchall()
    row_keys = [r[0] for r in subjects]
    n_subjects = len(row_keys)
    rk_to_idx = {rk: i for i, rk in enumerate(row_keys)}
    print(f"  {n_subjects} subjects", flush=True)

    # Step 2: pick popular facets (n >= MIN_FACET_N)
    print(f"Loading popular facets (n >= {MIN_FACET_N})...", flush=True)
    facets = cur.execute(
        "SELECT engine, facet_key, facet_value, COUNT(DISTINCT subject_row_key) as n "
        "FROM research_chart_facets GROUP BY engine, facet_key, facet_value HAVING n >= ?",
        (MIN_FACET_N,)
    ).fetchall()
    n_facets = len(facets)
    print(f"  {n_facets} facets selected", flush=True)
    facet_to_col = {(e, k, v): i for i, (e, k, v, _) in enumerate(facets)}

    # Step 3: build sparse matrix
    print("Building sparse matrix...", flush=True)
    rows, cols = [], []
    cur2 = conn.cursor()
    cur2.execute("SELECT subject_row_key, engine, facet_key, facet_value FROM research_chart_facets")
    n_rows_seen = 0
    for rk, e, k, v in cur2:
        n_rows_seen += 1
        ri = rk_to_idx.get(rk)
        ci = facet_to_col.get((e, k, v))
        if ri is not None and ci is not None:
            rows.append(ri)
            cols.append(ci)
    data = np.ones(len(rows), dtype=np.float32)
    X = csr_matrix((data, (rows, cols)), shape=(n_subjects, n_facets))
    # collapse possible duplicates to binary
    X.data[:] = 1.0
    X.sum_duplicates()
    X.data[:] = 1.0
    print(f"  matrix: {X.shape}, nnz={X.nnz} (scanned {n_rows_seen} facet rows)", flush=True)

    # Step 4: SVD
    print(f"Running SVD ({N_COMPONENTS} components)...", flush=True)
    svd = TruncatedSVD(n_components=N_COMPONENTS, random_state=42)
    X_svd = svd.fit_transform(X)
    print(f"  explained variance ratio sum: {svd.explained_variance_ratio_.sum():.3f}", flush=True)

    X_norm = normalize(X_svd, norm='l2')

    # Step 5: HDBSCAN
    print("Running HDBSCAN clustering...", flush=True)
    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=MIN_CLUSTER_SIZE,
        min_samples=5,
        cluster_selection_method='eom',
        metric='euclidean',
    )
    labels = clusterer.fit_predict(X_norm)
    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    n_noise = int((labels == -1).sum())
    print(f"  initial: {n_clusters} clusters, {n_noise} noise ({n_noise/n_subjects*100:.1f}%)", flush=True)

    # Reassign distant noise points to their nearest cluster centroid. Keep a
    # small fraction (the most-isolated points) labelled -1 so the Outliers
    # bucket still surfaces the genuinely odd subjects.
    if n_clusters > 0 and n_noise > 0:
        cluster_ids = sorted(c for c in set(labels) if c != -1)
        centroids = np.vstack([
            X_norm[labels == cid].mean(axis=0) for cid in cluster_ids
        ])
        centroids = normalize(centroids, norm='l2')
        noise_idx = np.where(labels == -1)[0]
        # cosine distance via dot product on L2-normalized vectors
        sims = X_norm[noise_idx] @ centroids.T  # higher = closer
        best = sims.argmax(axis=1)
        best_sim = sims.max(axis=1)
        # keep the bottom ~10% of noise as true outliers
        outlier_threshold = np.quantile(best_sim, 0.10)
        for k, ni in enumerate(noise_idx):
            if best_sim[k] > outlier_threshold:
                labels[ni] = cluster_ids[best[k]]
        n_noise = int((labels == -1).sum())
        print(f"  after reassignment: {n_clusters} clusters, {n_noise} noise "
              f"({n_noise/n_subjects*100:.1f}%)", flush=True)

    # Step 6: UMAP (optional)
    umap_xy = None
    if HAS_UMAP:
        print("Running UMAP...", flush=True)
        try:
            reducer = umap.UMAP(n_components=2, random_state=42, n_neighbors=15, min_dist=0.1)
            umap_xy = reducer.fit_transform(X_norm)
            print(f"  UMAP done", flush=True)
        except Exception as e:
            print(f"  UMAP failed: {e}", file=sys.stderr, flush=True)
            umap_xy = None
    else:
        print("UMAP not available, skipping", flush=True)

    # Step 7: outcome flags
    print("Loading outcomes...", flush=True)
    marriage_counts = dict(cur.execute(
        "SELECT subject_row_key, COUNT(*) FROM research_marriages GROUP BY subject_row_key"
    ).fetchall())
    has_dissolution = set()
    has_credible = set()
    for rk, outcome in cur.execute(
        "SELECT subject_row_key, outcome_normalized FROM research_marriages"
    ):
        if outcome == 'dissolution':
            has_dissolution.add(rk)
            has_credible.add(rk)
        elif outcome == 'happiness':
            has_credible.add(rk)

    # Step 8: cluster summaries
    print("Computing cluster summaries...", flush=True)
    facet_corpus_freq = {}
    for (e, k, v, n) in facets:
        facet_corpus_freq[(e, k, v)] = n / n_subjects

    engine_short_map = {
        "jyotishganit": "Vedic", "panchangam": "Panchang",
        "western": "Tropical", "hellenistic": "Hellenistic",
        "bazi": "BaZi", "numerology": "Num",
        "dashaflow": "Vedic", "stellium": "Hellen",
    }

    cluster_rows = []
    subject_cluster_rows = []
    now_iso = datetime.datetime.utcnow().isoformat()

    unique_labels = sorted(set(int(l) for l in labels))
    for cid in unique_labels:
        cluster_indices = np.where(labels == cid)[0]
        size = len(cluster_indices)

        cluster_subset = X[cluster_indices]
        col_sums = np.asarray(cluster_subset.sum(axis=0)).flatten()
        in_cluster_freqs = col_sums / size

        distinctive = []
        for col_idx in range(n_facets):
            in_freq = float(in_cluster_freqs[col_idx])
            if in_freq < 0.3:
                continue
            e, k, v, _ = facets[col_idx]
            corpus_freq = facet_corpus_freq[(e, k, v)]
            if corpus_freq <= 0:
                continue
            lift = in_freq / corpus_freq
            distinctive.append({
                "engine": e, "key": k, "value": v,
                "in_cluster_freq": round(in_freq, 4),
                "corpus_freq": round(float(corpus_freq), 4),
                "lift": round(float(lift), 3),
            })
        distinctive.sort(key=lambda d: -d["lift"])
        top_facets = distinctive[:8]

        cluster_keys = [row_keys[i] for i in cluster_indices]
        n_credible = sum(1 for rk in cluster_keys if rk in has_credible)
        n_dissolution = sum(1 for rk in cluster_keys if rk in has_dissolution)
        marriages_in = [marriage_counts.get(rk, 0) for rk in cluster_keys]
        mean_marriages = float(np.mean(marriages_in)) if marriages_in else 0.0
        dissolution_rate = (n_dissolution / n_credible) if n_credible else None

        if cid == -1:
            label = "Outliers"
            description = f"{size} subjects too unique to cluster cleanly."
        else:
            top_pairs = top_facets[:3]
            parts = []
            for tp in top_pairs:
                engine_short = engine_short_map.get(tp["engine"], tp["engine"])
                key_pretty = tp["key"].replace("_", " ")
                parts.append(f"{engine_short} {key_pretty}={tp['value']}")
            label = " · ".join(parts)[:60] if parts else f"Cluster {cid}"
            if top_pairs:
                description = (
                    f"{size} subjects. Most distinctive: "
                    + ", ".join(
                        f"{tp['engine']}.{tp['key']}={tp['value']} (lift {tp['lift']:.1f}x)"
                        for tp in top_pairs
                    )
                )
            else:
                description = f"{size} subjects. No facet >=0.3 in-cluster frequency."

        cluster_rows.append((
            int(cid), label, int(size), description,
            mean_marriages,
            dissolution_rate,
            int(n_credible),
            json.dumps(top_facets),
            now_iso,
        ))

        for ri in cluster_indices:
            ux = float(umap_xy[ri][0]) if umap_xy is not None else None
            uy = float(umap_xy[ri][1]) if umap_xy is not None else None
            subject_cluster_rows.append((row_keys[ri], int(cid), ux, uy))

    # Step 9: write to DB
    print("Writing to DB...", flush=True)
    cur.execute("DELETE FROM research_clusters")
    cur.execute("DELETE FROM research_subject_clusters")
    cur.executemany(
        "INSERT INTO research_clusters "
        "(id, label, size, description, mean_marriages, dissolution_rate, n_with_outcome, top_facets, computed_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        cluster_rows,
    )
    cur.executemany(
        "INSERT INTO research_subject_clusters "
        "(subject_row_key, cluster_id, umap_x, umap_y) VALUES (?, ?, ?, ?)",
        subject_cluster_rows,
    )
    conn.commit()
    conn.close()

    print(f"DONE: {n_clusters} clusters + 1 outlier bucket; {len(subject_cluster_rows)} subjects assigned",
          flush=True)


if __name__ == "__main__":
    main()
