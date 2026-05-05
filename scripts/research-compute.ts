/**
 * research-compute.ts — long-running worker that processes the
 * `research_readings` queue and computes chart data for each
 * (subject, engine) pair using the engine fetchers in lib/engines/.
 *
 * Run:
 *   npx tsx scripts/research-compute.ts
 *
 * Common flags:
 *   --concurrency <N>     (default 4)  Fetchers in flight at once.
 *   --engines <list>      (default all 8 except vedastro) panchangam,jyotishganit,western,...
 *   --batch <N>           (default 200) rows claimed per round.
 *   --retry-errors                also re-process status='error' rows.
 *   --limit <N>                   only process N total rows then exit (for smoke tests).
 *   --no-warmup                   skip Python sidecar reachability check.
 *
 * Resume / kill -9
 *   - Rows stuck in status='running' (left over from a hard kill) are reset to
 *     'pending' at startup, so the worker is idempotent.
 *   - The script claims rows atomically (UPDATE ... WHERE status='pending'
 *     RETURNING) inside a transaction, so multiple workers are safe in theory.
 *
 * Progress
 *   - A row in research_jobs (kind='compute') is created on startup and updated
 *     after each batch with completed/failed/last_progress_at.
 *   - Progress is also printed to stdout once per batch (and at most every 10s)
 *     in a tail -f friendly format.
 *
 * Python sidecar
 *   - Required at PYTHON_SIDECAR_URL (default http://localhost:8001) for
 *     jyotishganit / western / hellenistic / numerology / dashaflow / stellium.
 *   - The default uvicorn process is single-worker; with --concurrency >1 you
 *     may want to start it as `uvicorn app:app --workers 4` so concurrent
 *     requests parallelise.
 */

import path from "path";
import process from "process";
import Database from "better-sqlite3";

import { fetchPanchangam } from "../lib/engines/panchangam";
import { fetchJyotishganit } from "../lib/engines/jyotishganit";
import { fetchWestern } from "../lib/engines/western";
import { fetchHellenistic } from "../lib/engines/hellenistic";
import { fetchBazi } from "../lib/engines/bazi";
import { fetchNumerology } from "../lib/engines/numerology";
import { fetchDashaflow } from "../lib/engines/dashaflow";
import { fetchStellium } from "../lib/engines/stellium";

// ───────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────

type ResearchSubjectRow = {
  row_key: string;
  name: string;
  gender: string | null;
  date_of_birth: string;
  time_of_birth: string;
  latitude: number;
  longitude: number;
  timezone_name: string | null;
  timezone_offset: number;
};

type QueueRow = {
  subject_row_key: string;
  engine: string;
};

type EngineName =
  | "panchangam"
  | "jyotishganit"
  | "western"
  | "hellenistic"
  | "bazi"
  | "numerology"
  | "dashaflow"
  | "stellium";

const ALL_ENGINES: EngineName[] = [
  "panchangam",
  "jyotishganit",
  "western",
  "hellenistic",
  "bazi",
  "numerology",
  "dashaflow",
  "stellium",
];

// ───────────────────────────────────────────────────────────────────────────
// CLI parsing
// ───────────────────────────────────────────────────────────────────────────

function parseArgs(argv: string[]) {
  const out = {
    concurrency: 4,
    engines: ALL_ENGINES.slice() as EngineName[],
    batch: 200,
    retryErrors: false,
    limit: Infinity as number,
    warmup: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--concurrency":
        out.concurrency = Math.max(1, parseInt(next(), 10) || 1);
        break;
      case "--engines": {
        const list = next()
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean) as EngineName[];
        for (const e of list) {
          if (!ALL_ENGINES.includes(e)) {
            console.error(`unknown engine '${e}'. valid: ${ALL_ENGINES.join(",")}`);
            process.exit(2);
          }
        }
        out.engines = list;
        break;
      }
      case "--batch":
        out.batch = Math.max(1, parseInt(next(), 10) || 200);
        break;
      case "--retry-errors":
        out.retryErrors = true;
        break;
      case "--limit":
        out.limit = Math.max(0, parseInt(next(), 10) || 0);
        break;
      case "--no-warmup":
        out.warmup = false;
        break;
      case "-h":
      case "--help":
        console.log(USAGE);
        process.exit(0);
      default:
        console.error(`unknown arg: ${a}`);
        console.error(USAGE);
        process.exit(2);
    }
  }
  return out;
}

const USAGE = `Usage: npx tsx scripts/research-compute.ts [flags]

  --concurrency <N>     Default 4. Fetchers in flight at once.
  --engines <list>      Comma-separated; default all 8 (excl. vedastro).
  --batch <N>           Default 200. Rows claimed per round.
  --retry-errors        Also reprocess rows with status='error'.
  --limit <N>           Only process N total rows then exit (smoke test).
  --no-warmup           Skip Python sidecar reachability check.
  -h, --help            Show this help.
`;

// ───────────────────────────────────────────────────────────────────────────
// DB helpers
// ───────────────────────────────────────────────────────────────────────────

const DB_PATH = path.join(process.cwd(), "astrounified.db");

function openDb(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  // busy_timeout: better-sqlite3 is sync, but a parallel process (Next dev
  // server) may be writing too. 5s is generous.
  db.pragma("busy_timeout = 5000");
  return db;
}

// ───────────────────────────────────────────────────────────────────────────
// Engine dispatch
// ───────────────────────────────────────────────────────────────────────────

type FetcherResult = { ok: true; output: unknown } | { ok: false; error: string };

async function runEngine(
  engine: EngineName,
  subj: ResearchSubjectRow
): Promise<FetcherResult> {
  // Subjects predating standard timezones may have timezone_name = NULL.
  // The Python sidecar's BirthData.timezone defaults to "UTC"; passing "UTC"
  // alongside the correct timezone_offset is safe — flatlib does its own UTC
  // conversion from the offset.
  const tz = subj.timezone_name ?? "UTC";

  const baseLocal = {
    date_of_birth: subj.date_of_birth,
    time_of_birth: subj.time_of_birth,
    latitude: subj.latitude,
    longitude: subj.longitude,
    timezone_offset: subj.timezone_offset,
  };

  try {
    switch (engine) {
      case "panchangam": {
        const r = await fetchPanchangam(baseLocal);
        if (r.error) return { ok: false, error: r.error };
        return { ok: true, output: { raw: r.raw } };
      }
      case "jyotishganit": {
        const r = await fetchJyotishganit(baseLocal);
        if (r.error) return { ok: false, error: r.error };
        return { ok: true, output: { data: r.data } };
      }
      case "western": {
        const r = await fetchWestern({
          ...baseLocal,
          timezone: tz,
          name: subj.name,
        });
        if (r.error) return { ok: false, error: r.error };
        return { ok: true, output: { data: r.data } };
      }
      case "hellenistic": {
        const r = await fetchHellenistic({ ...baseLocal, timezone: tz });
        if (r.error) return { ok: false, error: r.error };
        return { ok: true, output: { data: r.data } };
      }
      case "bazi": {
        const r = await fetchBazi({
          date_of_birth: subj.date_of_birth,
          time_of_birth: subj.time_of_birth,
          gender:
            subj.gender === "M"
              ? "male"
              : subj.gender === "F"
                ? "female"
                : (subj.gender as "male" | "female" | undefined) ?? undefined,
        });
        if (r.error) return { ok: false, error: r.error };
        return { ok: true, output: { data: r.data } };
      }
      case "numerology": {
        const r = await fetchNumerology({
          date_of_birth: subj.date_of_birth,
          name: subj.name,
        });
        if (r.error) return { ok: false, error: r.error };
        return { ok: true, output: { data: r.data } };
      }
      case "dashaflow": {
        const r = await fetchDashaflow({
          date_of_birth: subj.date_of_birth,
          time_of_birth: subj.time_of_birth,
          latitude: subj.latitude,
          longitude: subj.longitude,
          timezone: tz,
          timezone_offset: subj.timezone_offset,
        });
        if (r.error) return { ok: false, error: r.error };
        return { ok: true, output: { data: r.data } };
      }
      case "stellium": {
        const r = await fetchStellium({
          ...baseLocal,
          timezone: tz,
          name: subj.name,
        });
        if (r.error) return { ok: false, error: r.error };
        return { ok: true, output: { data: r.data } };
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e);
    return { ok: false, error: msg };
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Concurrency primitive
// ───────────────────────────────────────────────────────────────────────────

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners: Promise<void>[] = [];
  const n = Math.min(limit, items.length);
  for (let i = 0; i < n; i++) {
    runners.push(
      (async () => {
        while (true) {
          const idx = cursor++;
          if (idx >= items.length) return;
          results[idx] = await worker(items[idx], idx);
        }
      })()
    );
  }
  await Promise.all(runners);
  return results;
}

// ───────────────────────────────────────────────────────────────────────────
// Time / formatting
// ───────────────────────────────────────────────────────────────────────────

function fmtEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "?";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${Math.floor(seconds % 60)}s`;
  return `${Math.floor(seconds)}s`;
}

function isoNow(): string {
  return new Date().toISOString().replace(/\.\d+Z$/, "Z");
}

// ───────────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────────

async function checkSidecar(): Promise<void> {
  const url = process.env.PYTHON_SIDECAR_URL ?? "http://localhost:8001";
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok && res.status !== 404 && res.status !== 405) {
      console.warn(`[warn] python sidecar at ${url} returned HTTP ${res.status}`);
    } else {
      console.log(`[info] python sidecar reachable at ${url}`);
    }
  } catch (e) {
    console.warn(
      `[warn] could not reach python sidecar at ${url}: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
    console.warn(
      `[warn] engines jyotishganit/western/hellenistic/numerology/dashaflow/stellium will fail until it's up.`
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log(`[${isoNow()}] research-compute starting`);
  console.log(
    `  concurrency=${args.concurrency} batch=${args.batch} retry-errors=${args.retryErrors} limit=${
      args.limit === Infinity ? "all" : args.limit
    }`
  );
  console.log(`  engines=${args.engines.join(",")}`);
  if (args.concurrency > 1) {
    console.log(
      `  tip: with concurrency>1 the python sidecar may become the bottleneck.`
    );
    console.log(
      `       start it with multiple workers, e.g.  uvicorn app:app --workers 4`
    );
  }

  if (args.warmup) await checkSidecar();

  const db = openDb();

  // 1) Reset stuck 'running' rows from a previous kill -9.
  const resetInfo = db
    .prepare(
      `UPDATE research_readings
         SET status = 'pending', error_msg = NULL
       WHERE status = 'running'`
    )
    .run();
  if (resetInfo.changes > 0) {
    console.log(`[${isoNow()}] reset ${resetInfo.changes} stuck 'running' rows -> 'pending'`);
  }

  // Optional: also flip 'error' -> 'pending' if --retry-errors. Restrict to
  // the engines we're working on so we don't blow away unrelated work.
  if (args.retryErrors) {
    const placeholders = args.engines.map(() => "?").join(",");
    const info = db
      .prepare(
        `UPDATE research_readings
           SET status = 'pending', error_msg = NULL
         WHERE status = 'error' AND engine IN (${placeholders})`
      )
      .run(...args.engines);
    if (info.changes > 0) {
      console.log(`[${isoNow()}] re-queued ${info.changes} previously errored rows`);
    }
  }

  // 2) Print queue stats.
  printQueueStats(db, args.engines);

  // 3) Open / create a research_jobs row.
  const jobId = `compute-${Date.now()}`;
  const totalAtStart = db
    .prepare(
      `SELECT COUNT(*) as c FROM research_readings
        WHERE engine IN (${args.engines.map(() => "?").join(",")})`
    )
    .get(...args.engines) as { c: number };
  const doneAtStart = db
    .prepare(
      `SELECT COUNT(*) as c FROM research_readings
        WHERE status='done' AND engine IN (${args.engines.map(() => "?").join(",")})`
    )
    .get(...args.engines) as { c: number };
  const failedAtStart = db
    .prepare(
      `SELECT COUNT(*) as c FROM research_readings
        WHERE status='error' AND engine IN (${args.engines.map(() => "?").join(",")})`
    )
    .get(...args.engines) as { c: number };

  db.prepare(
    `INSERT INTO research_jobs (id, kind, status, total, completed, failed, started_at, last_progress_at, notes)
     VALUES (?, 'compute', 'running', ?, ?, ?, ?, ?, ?)`
  ).run(
    jobId,
    totalAtStart.c,
    doneAtStart.c,
    failedAtStart.c,
    new Date().toISOString(),
    new Date().toISOString(),
    `engines=${args.engines.join(",")} concurrency=${args.concurrency}`
  );

  // 4) Prepared statements.
  const claimStmt = db.prepare(
    `UPDATE research_readings
        SET status='running'
      WHERE rowid IN (
        SELECT rowid FROM research_readings
         WHERE status='pending' AND engine IN (${args.engines.map(() => "?").join(",")})
         LIMIT ?
      )
      RETURNING subject_row_key, engine`
  );
  const subjectStmt = db.prepare(
    `SELECT row_key, name, gender, date_of_birth, time_of_birth,
            latitude, longitude, timezone_name, timezone_offset
       FROM research_subjects
      WHERE row_key = ?`
  );
  const finishOkStmt = db.prepare(
    `UPDATE research_readings
        SET status='done', output_data=?, error_msg=NULL,
            duration_ms=?, computed_at=?
      WHERE subject_row_key=? AND engine=?`
  );
  const finishErrStmt = db.prepare(
    `UPDATE research_readings
        SET status='error', output_data=NULL, error_msg=?,
            duration_ms=?, computed_at=?
      WHERE subject_row_key=? AND engine=?`
  );
  const updateJobStmt = db.prepare(
    `UPDATE research_jobs
        SET completed=?, failed=?, last_progress_at=?, status=?
      WHERE id=?`
  );
  const finishJobStmt = db.prepare(
    `UPDATE research_jobs
        SET status=?, completed=?, failed=?, finished_at=?, last_progress_at=?
      WHERE id=?`
  );

  // 5) Main loop.
  const startedAt = Date.now();
  let totalProcessed = 0;
  let totalSuccess = 0;
  let totalErrors = 0;
  let lastPrintAt = 0;
  let inflight = 0;
  let shuttingDown = false;

  const onSignal = (sig: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[${isoNow()}] caught ${sig}; finishing in-flight tasks then exiting...`);
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  while (!shuttingDown) {
    if (totalProcessed >= args.limit) break;

    const claimSize = Math.min(
      args.batch,
      args.limit === Infinity ? args.batch : args.limit - totalProcessed
    );
    if (claimSize <= 0) break;

    const claimed = claimStmt.all(...args.engines, claimSize) as QueueRow[];
    if (claimed.length === 0) {
      // Nothing pending. We're done.
      console.log(`[${isoNow()}] queue drained (no pending rows for selected engines)`);
      break;
    }

    await runWithConcurrency(claimed, args.concurrency, async (row) => {
      inflight++;
      const t0 = Date.now();
      const subj = subjectStmt.get(row.subject_row_key) as ResearchSubjectRow | undefined;
      if (!subj) {
        const dur = Date.now() - t0;
        finishErrStmt.run(
          `subject not found: ${row.subject_row_key}`,
          dur,
          new Date().toISOString(),
          row.subject_row_key,
          row.engine
        );
        totalErrors++;
        totalProcessed++;
        inflight--;
        return;
      }

      const result = await runEngine(row.engine as EngineName, subj);
      const dur = Date.now() - t0;
      const ts = new Date().toISOString();
      if (result.ok) {
        try {
          finishOkStmt.run(
            JSON.stringify(result.output),
            dur,
            ts,
            row.subject_row_key,
            row.engine
          );
          totalSuccess++;
        } catch (e) {
          // JSON.stringify failed (cycles?) or DB error — record as error.
          finishErrStmt.run(
            `serialize-failure: ${e instanceof Error ? e.message : String(e)}`,
            dur,
            ts,
            row.subject_row_key,
            row.engine
          );
          totalErrors++;
        }
      } else {
        // Truncate huge stack traces to keep DB tidy.
        const msg = result.error.length > 4000 ? result.error.slice(0, 4000) + "…[trunc]" : result.error;
        finishErrStmt.run(msg, dur, ts, row.subject_row_key, row.engine);
        totalErrors++;
      }
      totalProcessed++;
      inflight--;
    });

    // Update job + maybe print progress.
    const completedSoFar = doneAtStart.c + totalSuccess;
    const failedSoFar = failedAtStart.c + totalErrors;
    updateJobStmt.run(
      completedSoFar,
      failedSoFar,
      new Date().toISOString(),
      "running",
      jobId
    );

    const now = Date.now();
    if (now - lastPrintAt >= 10_000 || claimed.length < args.batch) {
      printProgress(db, args.engines, {
        completedSoFar,
        failedSoFar,
        totalAtStart: totalAtStart.c,
        startedAt,
        inflight,
      });
      lastPrintAt = now;
    }
  }

  // 6) Mark job finished.
  const finalStatus = shuttingDown ? "interrupted" : "done";
  finishJobStmt.run(
    finalStatus,
    doneAtStart.c + totalSuccess,
    failedAtStart.c + totalErrors,
    new Date().toISOString(),
    new Date().toISOString(),
    jobId
  );

  console.log(
    `[${isoNow()}] worker ${finalStatus}. processed=${totalProcessed} success=${totalSuccess} errors=${totalErrors}`
  );
  printQueueStats(db, args.engines);
  db.close();
}

// ───────────────────────────────────────────────────────────────────────────
// Stats / progress printing
// ───────────────────────────────────────────────────────────────────────────

function printQueueStats(db: Database.Database, engines: EngineName[]) {
  const placeholders = engines.map(() => "?").join(",");
  const overall = db
    .prepare(
      `SELECT status, COUNT(*) as c FROM research_readings
        WHERE engine IN (${placeholders}) GROUP BY status`
    )
    .all(...engines) as Array<{ status: string; c: number }>;
  const total = overall.reduce((s, r) => s + r.c, 0);
  const byStatus: Record<string, number> = {};
  for (const r of overall) byStatus[r.status] = r.c;
  console.log(
    `[${isoNow()}] queue: total=${total} pending=${byStatus.pending ?? 0} running=${
      byStatus.running ?? 0
    } done=${byStatus.done ?? 0} error=${byStatus.error ?? 0}`
  );
  const byEngine = db
    .prepare(
      `SELECT engine,
              SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
              SUM(CASE WHEN status='running' THEN 1 ELSE 0 END) as running,
              SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done,
              SUM(CASE WHEN status='error' THEN 1 ELSE 0 END) as error,
              COUNT(*) as total
         FROM research_readings
        WHERE engine IN (${placeholders})
        GROUP BY engine ORDER BY engine`
    )
    .all(...engines) as Array<{
      engine: string;
      pending: number;
      running: number;
      done: number;
      error: number;
      total: number;
    }>;
  for (const e of byEngine) {
    const finished = e.done === e.total;
    const tag = finished ? `${e.done}✓` : `${e.done}/${e.total}`;
    console.log(
      `   ${e.engine.padEnd(13)} ${tag.padEnd(14)} pending=${e.pending} running=${e.running} error=${e.error}`
    );
  }
}

function printProgress(
  db: Database.Database,
  engines: EngineName[],
  state: {
    completedSoFar: number;
    failedSoFar: number;
    totalAtStart: number;
    startedAt: number;
    inflight: number;
  }
) {
  const pendingLeft =
    state.totalAtStart - state.completedSoFar - state.failedSoFar;
  const totalDone = state.completedSoFar + state.failedSoFar;
  const pct =
    state.totalAtStart > 0
      ? ((totalDone / state.totalAtStart) * 100).toFixed(1)
      : "0.0";

  // Per-engine breakdown.
  const placeholders = engines.map(() => "?").join(",");
  const byEngine = db
    .prepare(
      `SELECT engine,
              SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done,
              SUM(CASE WHEN status='error' THEN 1 ELSE 0 END) as error,
              COUNT(*) as total
         FROM research_readings
        WHERE engine IN (${placeholders})
        GROUP BY engine ORDER BY engine`
    )
    .all(...engines) as Array<{ engine: string; done: number; error: number; total: number }>;

  // Compute live rate.
  // We approximate per-run rate by tracking via static closure variable.
  const rate = computeRate(totalDone);
  const eta = rate > 0 ? pendingLeft / rate : Infinity;

  const byEngineStr = byEngine
    .map((e) => {
      const finished = e.done === e.total;
      return finished
        ? `${e.engine}=${e.done}✓`
        : `${e.engine}=${e.done}`;
    })
    .join(" ");

  console.log(
    `[${isoNow()}] done=${state.completedSoFar}/${state.totalAtStart} (${pct}%) | error=${
      state.failedSoFar
    } | rate=${rate >= 0 ? rate.toFixed(2) : "?"}/s | eta=${fmtEta(eta)} | running=${state.inflight}`
  );
  console.log(`  by engine: ${byEngineStr}`);
}

// Track rate across calls.
let _rateLastDone = -1;
let _rateLastTime = 0;
let _rateSmoothed = -1;
function computeRate(totalDoneNow: number): number {
  const now = Date.now();
  if (_rateLastDone < 0) {
    _rateLastDone = totalDoneNow;
    _rateLastTime = now;
    return -1;
  }
  const dt = (now - _rateLastTime) / 1000;
  if (dt <= 0) return _rateSmoothed;
  const inst = (totalDoneNow - _rateLastDone) / dt;
  _rateLastDone = totalDoneNow;
  _rateLastTime = now;
  // EMA
  _rateSmoothed = _rateSmoothed < 0 ? inst : _rateSmoothed * 0.5 + inst * 0.5;
  return _rateSmoothed;
}

// ───────────────────────────────────────────────────────────────────────────
main().catch((e) => {
  console.error(`[${isoNow()}] fatal:`, e);
  process.exit(1);
});
