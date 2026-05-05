"""Mine research_chart_facets for statistically meaningful patterns vs marriage outcomes.

Computes three metrics per (engine, facet_key, facet_value) with n_subjects >= MIN_N:
  - dissolution: rate of has-dissolution among subjects with credible outcomes
  - multiple_marriages: rate of >=2 marriages among all subjects
  - never_married: rate of 0 marriages among all subjects

For each, runs a two-proportion z-test (group vs rest-of-universe) and applies
Benjamini-Hochberg FDR correction across all tests within a metric.

Writes results into research_pattern_findings (cleared at start, idempotent).
"""

import sqlite3
import sys
import datetime
from collections import defaultdict
from pathlib import Path

import statsmodels.stats.proportion as smp
import statsmodels.stats.multitest as smm

DB_PATH = Path(__file__).resolve().parents[2] / "astrounified.db"
MIN_N = 30
COMMIT_BATCH = 5000

CREDIBLE_OUTCOMES = {"dissolution", "happiness"}


def log(msg: str) -> None:
    print(msg, flush=True)


def build_subject_features(conn: sqlite3.Connection):
    """Return dict[row_key] -> features and the full set of subject row_keys."""
    log("Loading subjects...")
    cur = conn.execute("SELECT row_key FROM research_subjects")
    all_subjects = {r[0] for r in cur.fetchall()}
    log(f"  {len(all_subjects):,} subjects")

    log("Loading marriages...")
    cur = conn.execute(
        "SELECT subject_row_key, outcome_normalized FROM research_marriages"
    )
    marriages_by_subject: dict[str, list[str | None]] = defaultdict(list)
    for sk, outcome in cur.fetchall():
        marriages_by_subject[sk].append(outcome)

    features: dict[str, dict] = {}
    for sk in all_subjects:
        outs = marriages_by_subject.get(sk, [])
        marriage_count = len(outs)
        has_dissolution = any(o == "dissolution" for o in outs)
        has_credible = any(o in CREDIBLE_OUTCOMES for o in outs)
        features[sk] = {
            "marriage_count": marriage_count,
            "has_dissolution": has_dissolution,
            "has_credible_outcome": has_credible,
            "never_married": marriage_count == 0,
            "multiple_marriages": marriage_count >= 2,
        }
    return features


def two_prop_test(group_pos: int, group_n: int, univ_pos: int, univ_n: int):
    """Group vs rest-of-universe two-proportion z-test. Returns p-value or None."""
    rest_pos = univ_pos - group_pos
    rest_n = univ_n - group_n
    if group_n <= 0 or rest_n <= 0:
        return None
    # All-zero or all-one across both samples => no signal => p=1.0
    total_pos = group_pos + rest_pos
    if total_pos == 0 or total_pos == (group_n + rest_n):
        return 1.0
    try:
        _, p = smp.proportions_ztest(
            count=[group_pos, rest_pos],
            nobs=[group_n, rest_n],
            alternative="two-sided",
        )
        if p is None or p != p:  # NaN guard
            return None
        return float(p)
    except Exception as e:  # noqa: BLE001
        print(f"  z-test failed ({group_pos}/{group_n} vs {rest_pos}/{rest_n}): {e}",
              file=sys.stderr)
        return None


def analyze() -> None:
    log(f"Opening DB: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")

    features = build_subject_features(conn)

    # Universes
    universe_all = set(features.keys())
    universe_credible = {sk for sk, f in features.items() if f["has_credible_outcome"]}

    n_univ_diss = len(universe_credible)
    n_univ_mult = len(universe_all)
    n_univ_never = len(universe_all)

    pos_diss = sum(1 for sk in universe_credible if features[sk]["has_dissolution"])
    pos_mult = sum(1 for sk in universe_all if features[sk]["multiple_marriages"])
    pos_never = sum(1 for sk in universe_all if features[sk]["never_married"])

    base_diss = pos_diss / n_univ_diss if n_univ_diss else 0.0
    base_mult = pos_mult / n_univ_mult if n_univ_mult else 0.0
    base_never = pos_never / n_univ_never if n_univ_never else 0.0

    log(
        f"Universe sizes: dissolution={n_univ_diss}, "
        f"multiple_marriages={n_univ_mult}, never_married={n_univ_never}"
    )
    log(
        f"Baselines: dissolution={base_diss * 100:.2f}%, "
        f"multiple={base_mult * 100:.2f}%, never={base_never * 100:.2f}%"
    )

    # Iterate facets — build subject sets per (engine, facet_key, facet_value).
    log("Loading facets and grouping by (engine, facet_key, facet_value)...")
    cur = conn.execute(
        "SELECT engine, facet_key, facet_value, subject_row_key "
        "FROM research_chart_facets"
    )
    facet_subjects: dict[tuple[str, str, str], set[str]] = defaultdict(set)
    row_count = 0
    for engine, fk, fv, sk in cur:
        facet_subjects[(engine, fk, fv)].add(sk)
        row_count += 1
    log(f"  {row_count:,} facet rows -> {len(facet_subjects):,} unique facets")

    # Per metric: list of pending records (we need p-values first, then BH per metric)
    pending: dict[str, list[dict]] = {
        "dissolution": [],
        "multiple_marriages": [],
        "never_married": [],
    }

    skipped_minN = 0
    skipped_ztest = 0

    for (engine, fk, fv), subjects in facet_subjects.items():
        try:
            # Metric 1: dissolution (universe = credible)
            grp_d = subjects & universe_credible
            n_d = len(grp_d)
            if n_d >= MIN_N:
                k_d = sum(1 for sk in grp_d if features[sk]["has_dissolution"])
                obs = k_d / n_d
                p = two_prop_test(k_d, n_d, pos_diss, n_univ_diss)
                if p is None:
                    skipped_ztest += 1
                else:
                    lift = (obs / base_diss) if base_diss > 0 else 1.0
                    diff = obs - base_diss
                    pending["dissolution"].append({
                        "engine": engine, "facet_key": fk, "facet_value": fv,
                        "n_subjects": n_d, "n_universe": n_univ_diss,
                        "observed_rate": obs, "baseline_rate": base_diss,
                        "lift": lift, "diff": diff, "p_value": p,
                    })
            else:
                skipped_minN += 1

            # Metric 2: multiple_marriages (universe = all)
            grp_a = subjects & universe_all
            n_a = len(grp_a)
            if n_a >= MIN_N:
                k_m = sum(1 for sk in grp_a if features[sk]["multiple_marriages"])
                obs = k_m / n_a
                p = two_prop_test(k_m, n_a, pos_mult, n_univ_mult)
                if p is not None:
                    lift = (obs / base_mult) if base_mult > 0 else 1.0
                    diff = obs - base_mult
                    pending["multiple_marriages"].append({
                        "engine": engine, "facet_key": fk, "facet_value": fv,
                        "n_subjects": n_a, "n_universe": n_univ_mult,
                        "observed_rate": obs, "baseline_rate": base_mult,
                        "lift": lift, "diff": diff, "p_value": p,
                    })
                else:
                    skipped_ztest += 1

                # Metric 3: never_married (same universe, same group size)
                k_n = sum(1 for sk in grp_a if features[sk]["never_married"])
                obs = k_n / n_a
                p = two_prop_test(k_n, n_a, pos_never, n_univ_never)
                if p is not None:
                    lift = (obs / base_never) if base_never > 0 else 1.0
                    diff = obs - base_never
                    pending["never_married"].append({
                        "engine": engine, "facet_key": fk, "facet_value": fv,
                        "n_subjects": n_a, "n_universe": n_univ_never,
                        "observed_rate": obs, "baseline_rate": base_never,
                        "lift": lift, "diff": diff, "p_value": p,
                    })
                else:
                    skipped_ztest += 1
        except Exception as e:  # noqa: BLE001
            print(f"  facet error ({engine},{fk},{fv}): {e}", file=sys.stderr)

    log(
        f"Tests built — dissolution: {len(pending['dissolution'])}, "
        f"multiple: {len(pending['multiple_marriages'])}, "
        f"never: {len(pending['never_married'])} "
        f"(min-N skips: {skipped_minN}, z-test skips: {skipped_ztest})"
    )

    # BH-correct per metric
    for metric, recs in pending.items():
        if not recs:
            continue
        pvals = [r["p_value"] for r in recs]
        _, qvals, _, _ = smm.multipletests(pvals, method="fdr_bh")
        for r, q in zip(recs, qvals):
            r["q_value"] = float(q)
            r["metric"] = metric

    # Write to DB (clear first)
    log("Clearing research_pattern_findings...")
    conn.execute("DELETE FROM research_pattern_findings")
    conn.commit()

    now = datetime.datetime.utcnow().isoformat()
    insert_sql = (
        "INSERT INTO research_pattern_findings ("
        " metric, engine, facet_key, facet_value, n_subjects, n_universe,"
        " observed_rate, baseline_rate, lift, diff, p_value, q_value, computed_at"
        ") VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)"
    )

    written = 0
    for metric, recs in pending.items():
        for r in recs:
            try:
                conn.execute(
                    insert_sql,
                    (
                        metric, r["engine"], r["facet_key"], r["facet_value"],
                        r["n_subjects"], r["n_universe"],
                        r["observed_rate"], r["baseline_rate"],
                        r["lift"], r["diff"], r["p_value"], r["q_value"], now,
                    ),
                )
                written += 1
                if written % COMMIT_BATCH == 0:
                    conn.commit()
            except Exception as e:  # noqa: BLE001
                print(f"  insert failed: {e}", file=sys.stderr)
    conn.commit()

    # Summary
    def counts(metric: str):
        recs = pending[metric]
        q10 = sum(1 for r in recs if r.get("q_value", 1.0) < 0.10)
        q05 = sum(1 for r in recs if r.get("q_value", 1.0) < 0.05)
        q01 = sum(1 for r in recs if r.get("q_value", 1.0) < 0.01)
        return len(recs), q10, q05, q01

    log("")
    log(
        f"Universe sizes: dissolution={n_univ_diss}, "
        f"multiple_marriages={n_univ_mult}, never_married={n_univ_never}"
    )
    log(
        f"Baselines: dissolution={base_diss * 100:.2f}%, "
        f"multiple={base_mult * 100:.2f}%, never={base_never * 100:.2f}%"
    )
    log(f"Findings written: {written} total")
    for m in ("dissolution", "multiple_marriages", "never_married"):
        n, q10, q05, q01 = counts(m)
        log(f"  {m}: {n} findings (q<0.10: {q10}, q<0.05: {q05}, q<0.01: {q01})")

    def top5(metric: str):
        recs = [r for r in pending[metric] if r.get("q_value", 1.0) < 0.05]
        recs.sort(key=lambda r: abs(r["lift"] - 1.0), reverse=True)
        return recs[:5]

    for m in ("dissolution", "multiple_marriages", "never_married"):
        log(f"Top 5 {m} findings (highest |lift-1|, q<0.05):")
        for r in top5(m):
            log(
                f"  [{r['engine']}] {r['facet_key']}={r['facet_value']} "
                f"n={r['n_subjects']} obs={r['observed_rate']*100:.2f}% "
                f"base={r['baseline_rate']*100:.2f}% lift={r['lift']:.3f} "
                f"q={r['q_value']:.2e}"
            )

    conn.close()


if __name__ == "__main__":
    analyze()
