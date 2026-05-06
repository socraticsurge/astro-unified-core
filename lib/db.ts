import Database from "better-sqlite3";
import path from "path";
import { randomUUID } from "crypto";

const DB_PATH = path.join(process.cwd(), "astrounified.db");

const globalForDb = global as typeof globalThis & { _db?: Database.Database };

export function getDb(): Database.Database {
  if (!globalForDb._db) {
    globalForDb._db = new Database(DB_PATH);
    globalForDb._db.pragma("journal_mode = WAL");
    globalForDb._db.pragma("foreign_keys = ON");
    initSchema(globalForDb._db);
    // Tell the query planner to refresh / build statistics. Without this, queries
    // like `COUNT(*) FROM subjects WHERE EXISTS(facet lookup)` were 3-6s on the 4.6M
    // facets table because SQLite picked a full-scan plan. With analyze stats it
    // uses the (engine, facet_key, facet_value) index and runs in ~80ms.
    globalForDb._db.pragma("optimize");
  }
  return globalForDb._db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      time_of_birth TEXT NOT NULL,
      place_of_birth TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      timezone TEXT NOT NULL,
      timezone_offset REAL NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS readings (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      engine TEXT NOT NULL,
      input_snapshot TEXT NOT NULL,
      output_data TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      context_engines TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_readings_profile ON readings(profile_id);
    CREATE INDEX IF NOT EXISTS idx_readings_engine ON readings(engine);
    CREATE INDEX IF NOT EXISTS idx_readings_profile_engine ON readings(profile_id, engine, created_at);
    CREATE INDEX IF NOT EXISTS idx_chat_profile ON chat_messages(profile_id);

    -- Research corpus (VedAstro 15K dataset). Isolated from user-facing profiles.
    CREATE TABLE IF NOT EXISTS research_subjects (
      row_key TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      gender TEXT,
      date_of_birth TEXT NOT NULL,
      time_of_birth TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      timezone_name TEXT,
      timezone_offset REAL NOT NULL,
      location_name TEXT,
      country TEXT,
      rodden TEXT,
      birth_year INTEGER,
      raw_birthtime TEXT,
      source_dataset TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS research_marriages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_row_key TEXT NOT NULL REFERENCES research_subjects(row_key) ON DELETE CASCADE,
      seq_index INTEGER NOT NULL,
      type_raw TEXT,
      type_normalized TEXT,
      outcome_raw TEXT,
      outcome_normalized TEXT,
      marriage_date TEXT,
      divorce_date TEXT,
      spouse TEXT,
      person_id TEXT,
      credibility TEXT,
      raw_json TEXT
    );

    -- Per-(subject, engine) row. status: pending | running | done | error.
    -- The compute worker picks pending rows, marks them running, computes, sets done/error.
    CREATE TABLE IF NOT EXISTS research_readings (
      subject_row_key TEXT NOT NULL REFERENCES research_subjects(row_key) ON DELETE CASCADE,
      engine TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      output_data TEXT,
      error_msg TEXT,
      duration_ms INTEGER,
      computed_at TEXT,
      PRIMARY KEY (subject_row_key, engine)
    );

    CREATE TABLE IF NOT EXISTS research_jobs (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      status TEXT NOT NULL,
      total INTEGER NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0,
      failed INTEGER NOT NULL DEFAULT 0,
      started_at TEXT,
      finished_at TEXT,
      last_progress_at TEXT,
      notes TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_research_marriages_subject ON research_marriages(subject_row_key);
    CREATE INDEX IF NOT EXISTS idx_research_readings_status ON research_readings(status);
    CREATE INDEX IF NOT EXISTS idx_research_readings_engine_status ON research_readings(engine, status);
    CREATE INDEX IF NOT EXISTS idx_research_subjects_birth_year ON research_subjects(birth_year);
    CREATE INDEX IF NOT EXISTS idx_research_subjects_country ON research_subjects(country);
    CREATE INDEX IF NOT EXISTS idx_research_subjects_gender ON research_subjects(gender);

    -- Pre-extracted facets per (subject, engine) for fast filtering by chart properties.
    CREATE TABLE IF NOT EXISTS research_chart_facets (
      subject_row_key TEXT NOT NULL REFERENCES research_subjects(row_key) ON DELETE CASCADE,
      engine TEXT NOT NULL,
      facet_key TEXT NOT NULL,
      facet_value TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_facets_subject ON research_chart_facets(subject_row_key, engine);
    CREATE INDEX IF NOT EXISTS idx_facets_lookup ON research_chart_facets(engine, facet_key, facet_value);

    -- Univariate analysis: per-facet vs outcome (dissolution / multiple_marriages / never_married)
    CREATE TABLE IF NOT EXISTS research_pattern_findings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric TEXT NOT NULL,
      engine TEXT NOT NULL,
      facet_key TEXT NOT NULL,
      facet_value TEXT NOT NULL,
      n_subjects INTEGER NOT NULL,
      n_universe INTEGER NOT NULL,
      observed_rate REAL NOT NULL,
      baseline_rate REAL NOT NULL,
      lift REAL NOT NULL,
      diff REAL NOT NULL,
      p_value REAL NOT NULL,
      q_value REAL NOT NULL,
      computed_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_findings_metric_q ON research_pattern_findings(metric, q_value);
    CREATE INDEX IF NOT EXISTS idx_findings_engine ON research_pattern_findings(engine, metric);

    -- Cluster analysis: groups of similar charts across all engines
    CREATE TABLE IF NOT EXISTS research_clusters (
      id INTEGER PRIMARY KEY,
      label TEXT,
      size INTEGER NOT NULL,
      description TEXT,
      mean_marriages REAL,
      dissolution_rate REAL,
      n_with_outcome INTEGER,
      top_facets TEXT,
      computed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS research_subject_clusters (
      subject_row_key TEXT PRIMARY KEY REFERENCES research_subjects(row_key) ON DELETE CASCADE,
      cluster_id INTEGER NOT NULL,
      umap_x REAL,
      umap_y REAL
    );
    CREATE INDEX IF NOT EXISTS idx_subject_clusters_cluster ON research_subject_clusters(cluster_id);
  `);
}

export type Profile = {
  id: string;
  name: string;
  date_of_birth: string;
  time_of_birth: string;
  place_of_birth: string;
  latitude: number;
  longitude: number;
  timezone: string;
  timezone_offset: number;
  created_at: string;
};

export type Reading = {
  id: string;
  profile_id: string;
  engine: string;
  input_snapshot: string;
  output_data: string;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  profile_id: string;
  role: "user" | "assistant";
  content: string;
  context_engines: string;
  created_at: string;
};

export type ResearchSubject = {
  row_key: string;
  name: string;
  gender: string | null;
  date_of_birth: string;
  time_of_birth: string;
  latitude: number;
  longitude: number;
  timezone_name: string | null;
  timezone_offset: number;
  location_name: string | null;
  country: string | null;
  rodden: string | null;
  birth_year: number | null;
  raw_birthtime: string | null;
  source_dataset: string;
  created_at: string;
};

export type ResearchMarriage = {
  id: number;
  subject_row_key: string;
  seq_index: number;
  type_raw: string | null;
  type_normalized: string | null;
  outcome_raw: string | null;
  outcome_normalized: string | null;
  marriage_date: string | null;
  divorce_date: string | null;
  spouse: string | null;
  person_id: string | null;
  credibility: string | null;
  raw_json: string | null;
};

export type ResearchReading = {
  subject_row_key: string;
  engine: string;
  status: "pending" | "running" | "done" | "error";
  output_data: string | null;
  error_msg: string | null;
  duration_ms: number | null;
  computed_at: string | null;
};

export type ResearchJob = {
  id: string;
  kind: string;
  status: string;
  total: number;
  completed: number;
  failed: number;
  started_at: string | null;
  finished_at: string | null;
  last_progress_at: string | null;
  notes: string | null;
};

export type PatternMetric =
  | "dissolution"
  | "multiple_marriages"
  | "never_married";

export type PatternFinding = {
  id: number;
  metric: PatternMetric;
  engine: string;
  facet_key: string;
  facet_value: string;
  n_subjects: number;
  n_universe: number;
  observed_rate: number;
  baseline_rate: number;
  lift: number;
  diff: number;
  p_value: number;
  q_value: number;
  computed_at: string;
};

export type ResearchCluster = {
  id: number;
  label: string | null;
  size: number;
  description: string | null;
  mean_marriages: number | null;
  dissolution_rate: number | null;
  n_with_outcome: number | null;
  top_facets: string | null;
  computed_at: string;
};

export type ResearchSubjectCluster = {
  subject_row_key: string;
  cluster_id: number;
  umap_x: number | null;
  umap_y: number | null;
};

// Tiny TTL cache for results that are deterministic given current data.
// Used for aggregations on research tables (countries, decade dist, etc.)
// that only change when the ingest/extract scripts re-run.
const memoCache = new Map<string, { value: unknown; expires: number }>();
const MEMO_TTL_MS = 5 * 60 * 1000; // 5 minutes
function memo<T>(key: string, fn: () => T): T {
  const now = Date.now();
  const hit = memoCache.get(key);
  if (hit && hit.expires > now) return hit.value as T;
  const value = fn();
  memoCache.set(key, { value, expires: now + MEMO_TTL_MS });
  return value;
}

export type SubjectListOpts = {
  gender?: string;
  country?: string;
  decade?: number; // 1900 → 1900..1909
  outcome?: string; // joined on marriages.outcome_normalized
  marriages?: number | "5+"; // exactly N, or "5+" for ≥5
  // Chart-facet filters: an engine + a map of facet_key → facet_value.
  // Subjects must have a research_chart_facets row matching every (engine, key, value).
  facetEngine?: string;
  facets?: Record<string, string>;
  search?: string;
};

function buildSubjectWhere(opts: SubjectListOpts): {
  sql: string;
  params: Array<string | number>;
} {
  const where: string[] = [];
  const params: Array<string | number> = [];

  if (opts.search) {
    where.push("s.name LIKE ?");
    params.push(`%${opts.search}%`);
  }

  if (opts.outcome) {
    where.push(
      "EXISTS (SELECT 1 FROM research_marriages m WHERE m.subject_row_key = s.row_key AND m.outcome_normalized = ?)"
    );
    params.push(opts.outcome);
  }
  if (opts.gender) {
    where.push("s.gender = ?");
    params.push(opts.gender);
  }
  if (opts.country) {
    where.push("s.country = ?");
    params.push(opts.country);
  }
  if (opts.decade !== undefined) {
    where.push("s.birth_year >= ? AND s.birth_year <= ?");
    params.push(opts.decade, opts.decade + 9);
  }
  if (opts.marriages !== undefined) {
    if (opts.marriages === "5+") {
      where.push(
        "(SELECT COUNT(*) FROM research_marriages m WHERE m.subject_row_key = s.row_key) >= 5"
      );
    } else {
      where.push(
        "(SELECT COUNT(*) FROM research_marriages m WHERE m.subject_row_key = s.row_key) = ?"
      );
      params.push(opts.marriages);
    }
  }
  if (opts.facetEngine && opts.facets) {
    for (const [key, value] of Object.entries(opts.facets)) {
      if (!value) continue;
      where.push(
        "EXISTS (SELECT 1 FROM research_chart_facets f WHERE f.subject_row_key = s.row_key AND f.engine = ? AND f.facet_key = ? AND f.facet_value = ?)"
      );
      params.push(opts.facetEngine, key, value);
    }
  }

  return {
    sql: where.length ? " WHERE " + where.join(" AND ") : "",
    params,
  };
}

export const db = {
  profiles: {
    list(): Profile[] {
      return getDb()
        .prepare("SELECT * FROM profiles ORDER BY created_at DESC")
        .all() as Profile[];
    },
    get(id: string): Profile | undefined {
      return getDb()
        .prepare("SELECT * FROM profiles WHERE id = ?")
        .get(id) as Profile | undefined;
    },
    create(data: Omit<Profile, "id" | "created_at">): Profile {
      const id = randomUUID();
      const created_at = new Date().toISOString();
      getDb()
        .prepare(
          `INSERT INTO profiles (id, name, date_of_birth, time_of_birth, place_of_birth,
           latitude, longitude, timezone, timezone_offset, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          data.name,
          data.date_of_birth,
          data.time_of_birth,
          data.place_of_birth,
          data.latitude,
          data.longitude,
          data.timezone,
          data.timezone_offset,
          created_at
        );
      return { id, created_at, ...data };
    },
    delete(id: string): void {
      getDb().prepare("DELETE FROM profiles WHERE id = ?").run(id);
    },
  },
  readings: {
    listForProfile(profileId: string): Reading[] {
      return getDb()
        .prepare(
          "SELECT * FROM readings WHERE profile_id = ? ORDER BY created_at DESC"
        )
        .all(profileId) as Reading[];
    },
    latestByEngine(profileId: string, engine: string): Reading | undefined {
      return getDb()
        .prepare(
          `SELECT * FROM readings WHERE profile_id = ? AND engine = ? ORDER BY created_at DESC LIMIT 1`
        )
        .get(profileId, engine) as Reading | undefined;
    },
    latestPerEngine(profileId: string): Record<string, Reading> {
      const rows = getDb()
        .prepare(
          `SELECT r.* FROM readings r
           WHERE r.profile_id = ?
             AND r.created_at = (
               SELECT MAX(r2.created_at) FROM readings r2
               WHERE r2.profile_id = r.profile_id AND r2.engine = r.engine
             )`
        )
        .all(profileId) as Reading[];
      return Object.fromEntries(rows.map((r) => [r.engine, r]));
    },
    save(data: {
      profile_id: string;
      engine: string;
      input_snapshot: object;
      output_data: object;
    }): Reading {
      const id = randomUUID();
      const created_at = new Date().toISOString();
      getDb()
        .prepare(
          `INSERT INTO readings (id, profile_id, engine, input_snapshot, output_data, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          data.profile_id,
          data.engine,
          JSON.stringify(data.input_snapshot),
          JSON.stringify(data.output_data),
          created_at
        );
      return {
        id,
        profile_id: data.profile_id,
        engine: data.engine,
        input_snapshot: JSON.stringify(data.input_snapshot),
        output_data: JSON.stringify(data.output_data),
        created_at,
      };
    },
  },
  research: {
    subjects: {
      count(): number {
        const r = getDb()
          .prepare("SELECT COUNT(*) as c FROM research_subjects")
          .get() as { c: number };
        return r.c;
      },
      get(rowKey: string): ResearchSubject | undefined {
        return getDb()
          .prepare("SELECT * FROM research_subjects WHERE row_key = ?")
          .get(rowKey) as ResearchSubject | undefined;
      },
      list(opts: SubjectListOpts & { limit?: number; offset?: number; order?: "name" | "year_asc" | "year_desc" } = {}): ResearchSubject[] {
        const limit = Math.min(opts.limit ?? 50, 500);
        const offset = Math.max(opts.offset ?? 0, 0);
        const { sql: whereSql, params } = buildSubjectWhere(opts);
        const order =
          opts.order === "name"
            ? "s.name ASC"
            : opts.order === "year_asc"
              ? "s.birth_year ASC, s.name ASC"
              : "s.birth_year DESC, s.name ASC";
        const sql = `SELECT ${opts.outcome ? "DISTINCT s.*" : "s.*"} FROM research_subjects s${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`;
        return getDb().prepare(sql).all(...params, limit, offset) as ResearchSubject[];
      },
      countFiltered(opts: SubjectListOpts = {}): number {
        const { sql: whereSql, params } = buildSubjectWhere(opts);
        const select = opts.outcome ? "COUNT(DISTINCT s.row_key)" : "COUNT(*)";
        const sql = `SELECT ${select} as c FROM research_subjects s${whereSql}`;
        const r = getDb().prepare(sql).get(...params) as { c: number };
        return r.c;
      },
      countries(): Array<{ country: string; count: number }> {
        return memo("subjects.countries", () =>
          getDb()
            .prepare(
              "SELECT country, COUNT(*) as count FROM research_subjects WHERE country IS NOT NULL AND country != '' GROUP BY country ORDER BY count DESC"
            )
            .all() as Array<{ country: string; count: number }>
        );
      },
      decadeDistribution(): Array<{ decade: number; count: number }> {
        return memo("subjects.decades", () =>
          getDb()
            .prepare(
              `SELECT (birth_year / 10) * 10 as decade, COUNT(*) as count
               FROM research_subjects
               WHERE birth_year IS NOT NULL
               GROUP BY decade
               ORDER BY decade ASC`
            )
            .all() as Array<{ decade: number; count: number }>
        );
      },
    },
    marriages: {
      listForSubject(rowKey: string): ResearchMarriage[] {
        return getDb()
          .prepare(
            "SELECT * FROM research_marriages WHERE subject_row_key = ? ORDER BY seq_index ASC"
          )
          .all(rowKey) as ResearchMarriage[];
      },
      outcomeDistribution(): Array<{ outcome_normalized: string; count: number }> {
        return memo("marriages.outcomes", () =>
          getDb()
            .prepare(
              "SELECT outcome_normalized, COUNT(*) as count FROM research_marriages WHERE outcome_normalized IS NOT NULL GROUP BY outcome_normalized ORDER BY count DESC"
            )
            .all() as Array<{ outcome_normalized: string; count: number }>
        );
      },
      // Distribution of marriages per subject (0, 1, 2, ..., 5+).
      // Includes subjects with zero marriages.
      perSubjectDistribution(): Array<{ marriages: number | "5+"; subjects: number }> {
        return memo("marriages.perSubjectDistribution", () => {
          const rows = getDb()
            .prepare(
              `SELECT mc, COUNT(*) as subjects FROM (
                 SELECT s.row_key,
                   (SELECT COUNT(*) FROM research_marriages m WHERE m.subject_row_key = s.row_key) as mc
                 FROM research_subjects s
               ) GROUP BY mc ORDER BY mc ASC`
            )
            .all() as Array<{ mc: number; subjects: number }>;

          const buckets: Array<{ marriages: number | "5+"; subjects: number }> = [];
          let fivePlus = 0;
          for (const r of rows) {
            if (r.mc < 5) buckets.push({ marriages: r.mc, subjects: r.subjects });
            else fivePlus += r.subjects;
          }
          if (fivePlus > 0) buckets.push({ marriages: "5+", subjects: fivePlus });
          return buckets;
        });
      },
      countsForSubjects(rowKeys: string[]): Map<string, number> {
        const result = new Map<string, number>();
        if (rowKeys.length === 0) return result;
        const CHUNK = 500;
        for (let i = 0; i < rowKeys.length; i += CHUNK) {
          const chunk = rowKeys.slice(i, i + CHUNK);
          const placeholders = chunk.map(() => "?").join(",");
          const rows = getDb()
            .prepare(
              `SELECT subject_row_key, COUNT(*) as c
               FROM research_marriages
               WHERE subject_row_key IN (${placeholders})
               GROUP BY subject_row_key`
            )
            .all(...chunk) as Array<{ subject_row_key: string; c: number }>;
          for (const r of rows) result.set(r.subject_row_key, r.c);
        }
        return result;
      },
    },
    readings: {
      get(rowKey: string, engine: string): ResearchReading | undefined {
        return getDb()
          .prepare(
            "SELECT * FROM research_readings WHERE subject_row_key = ? AND engine = ?"
          )
          .get(rowKey, engine) as ResearchReading | undefined;
      },
      listForSubject(rowKey: string): ResearchReading[] {
        return getDb()
          .prepare("SELECT * FROM research_readings WHERE subject_row_key = ?")
          .all(rowKey) as ResearchReading[];
      },
      countsForSubjects(
        rowKeys: string[]
      ): Map<string, { done: number; pending: number; running: number; error: number; total: number }> {
        const result = new Map<
          string,
          { done: number; pending: number; running: number; error: number; total: number }
        >();
        if (rowKeys.length === 0) return result;
        const CHUNK = 500;
        for (let i = 0; i < rowKeys.length; i += CHUNK) {
          const chunk = rowKeys.slice(i, i + CHUNK);
          const placeholders = chunk.map(() => "?").join(",");
          const rows = getDb()
            .prepare(
              `SELECT subject_row_key,
                      SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done,
                      SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
                      SUM(CASE WHEN status='running' THEN 1 ELSE 0 END) as running,
                      SUM(CASE WHEN status='error' THEN 1 ELSE 0 END) as error,
                      COUNT(*) as total
               FROM research_readings
               WHERE subject_row_key IN (${placeholders})
               GROUP BY subject_row_key`
            )
            .all(...chunk) as Array<{
              subject_row_key: string;
              done: number;
              pending: number;
              running: number;
              error: number;
              total: number;
            }>;
          for (const r of rows) {
            result.set(r.subject_row_key, {
              done: r.done,
              pending: r.pending,
              running: r.running,
              error: r.error,
              total: r.total,
            });
          }
        }
        return result;
      },
      progress(): {
        by_status: Record<string, number>;
        by_engine: Array<{ engine: string; pending: number; running: number; done: number; error: number }>;
      } {
        const byStatus = getDb()
          .prepare("SELECT status, COUNT(*) as c FROM research_readings GROUP BY status")
          .all() as Array<{ status: string; c: number }>;
        const by_status: Record<string, number> = {};
        for (const row of byStatus) by_status[row.status] = row.c;

        const byEngine = getDb()
          .prepare(
            `SELECT engine,
                    SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status='running' THEN 1 ELSE 0 END) as running,
                    SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done,
                    SUM(CASE WHEN status='error' THEN 1 ELSE 0 END) as error
             FROM research_readings GROUP BY engine ORDER BY engine`
          )
          .all() as Array<{
            engine: string;
            pending: number;
            running: number;
            done: number;
            error: number;
          }>;

        return { by_status, by_engine: byEngine };
      },
    },
    jobs: {
      latest(kind: string): ResearchJob | undefined {
        return getDb()
          .prepare(
            "SELECT * FROM research_jobs WHERE kind = ? ORDER BY started_at DESC LIMIT 1"
          )
          .get(kind) as ResearchJob | undefined;
      },
    },
    patterns: {
      // List metrics that have findings.
      metrics(): Array<{ metric: PatternMetric; findings: number }> {
        return getDb()
          .prepare(
            "SELECT metric, COUNT(*) as findings FROM research_pattern_findings GROUP BY metric ORDER BY metric"
          )
          .all() as Array<{ metric: PatternMetric; findings: number }>;
      },
      // Top findings per (metric, engine) ordered by absolute lift, with q-value cutoff.
      top(opts: {
        metric: PatternMetric;
        engine?: string;
        limit?: number;
        maxQ?: number;
        minN?: number;
      }): PatternFinding[] {
        const { metric, engine, limit = 30, maxQ = 0.10, minN = 30 } = opts;
        const where = ["metric = ?", "q_value <= ?", "n_subjects >= ?"];
        const params: Array<string | number> = [metric, maxQ, minN];
        if (engine) {
          where.push("engine = ?");
          params.push(engine);
        }
        const sql = `SELECT * FROM research_pattern_findings
                     WHERE ${where.join(" AND ")}
                     ORDER BY ABS(lift - 1) DESC, q_value ASC
                     LIMIT ?`;
        params.push(limit);
        return getDb().prepare(sql).all(...params) as PatternFinding[];
      },
      // List engines that have findings for a given metric.
      enginesFor(metric: PatternMetric): Array<{ engine: string; findings: number }> {
        return getDb()
          .prepare(
            "SELECT engine, COUNT(*) as findings FROM research_pattern_findings WHERE metric = ? GROUP BY engine ORDER BY engine"
          )
          .all(metric) as Array<{ engine: string; findings: number }>;
      },
      baseline(metric: PatternMetric): number | null {
        const row = getDb()
          .prepare(
            "SELECT baseline_rate FROM research_pattern_findings WHERE metric = ? LIMIT 1"
          )
          .get(metric) as { baseline_rate: number } | undefined;
        return row ? row.baseline_rate : null;
      },
    },
    clusters: {
      list(): ResearchCluster[] {
        return getDb()
          .prepare(
            "SELECT * FROM research_clusters ORDER BY (CASE WHEN id < 0 THEN 1 ELSE 0 END), size DESC"
          )
          .all() as ResearchCluster[];
      },
      get(id: number): ResearchCluster | undefined {
        return getDb()
          .prepare("SELECT * FROM research_clusters WHERE id = ?")
          .get(id) as ResearchCluster | undefined;
      },
      subjectsIn(
        clusterId: number,
        opts: { limit?: number; offset?: number } = {}
      ): ResearchSubject[] {
        const { limit = 50, offset = 0 } = opts;
        return getDb()
          .prepare(
            `SELECT s.* FROM research_subjects s
             JOIN research_subject_clusters sc ON sc.subject_row_key = s.row_key
             WHERE sc.cluster_id = ?
             ORDER BY s.birth_year DESC, s.name ASC
             LIMIT ? OFFSET ?`
          )
          .all(clusterId, limit, offset) as ResearchSubject[];
      },
      countSubjectsIn(clusterId: number): number {
        const r = getDb()
          .prepare(
            "SELECT COUNT(*) as c FROM research_subject_clusters WHERE cluster_id = ?"
          )
          .get(clusterId) as { c: number };
        return r.c;
      },
      forSubject(rowKey: string): ResearchSubjectCluster | undefined {
        return getDb()
          .prepare("SELECT * FROM research_subject_clusters WHERE subject_row_key = ?")
          .get(rowKey) as ResearchSubjectCluster | undefined;
      },
    },
    facets: {
      // List all engines that have any extracted facets.
      // Cached because this is a static aggregation that only changes after extract_facets.py.
      // (Was the slowest query on the page — 6.4s of COUNT DISTINCT over 4.6M rows.)
      enginesWithFacets(): Array<{ engine: string; subjects: number; rows: number }> {
        return memo("facets.enginesWithFacets", () =>
          getDb()
            .prepare(
              `SELECT engine,
                      COUNT(DISTINCT subject_row_key) as subjects,
                      COUNT(*) as rows
               FROM research_chart_facets
               GROUP BY engine ORDER BY engine`
            )
            .all() as Array<{ engine: string; subjects: number; rows: number }>
        );
      },
      // Lightweight version when you only need the engine names (e.g. for the
      // research filter dropdown). Uses the (engine, facet_key, facet_value)
      // covering index, ~200ms vs 6.4s for the full aggregate.
      enginesNames(): string[] {
        return memo("facets.enginesNames", () =>
          (getDb()
            .prepare("SELECT DISTINCT engine FROM research_chart_facets ORDER BY engine")
            .all() as Array<{ engine: string }>).map((r) => r.engine)
        );
      },
      // For an engine, list distinct facet keys (so the UI knows what to render).
      keysForEngine(engine: string): Array<{ facet_key: string; values: number; rows: number }> {
        return getDb()
          .prepare(
            `SELECT facet_key,
                    COUNT(DISTINCT facet_value) as values,
                    COUNT(*) as rows
             FROM research_chart_facets
             WHERE engine = ?
             GROUP BY facet_key
             ORDER BY facet_key`
          )
          .all(engine) as Array<{ facet_key: string; values: number; rows: number }>;
      },
      // Distribution of values for a (engine, facet_key) — counts unique subjects per value.
      valuesFor(
        engine: string,
        facetKey: string,
        limit = 100
      ): Array<{ facet_value: string; subjects: number }> {
        return memo(`facets.values:${engine}:${facetKey}:${limit}`, () =>
          getDb()
            .prepare(
              `SELECT facet_value,
                      COUNT(DISTINCT subject_row_key) as subjects
               FROM research_chart_facets
               WHERE engine = ? AND facet_key = ?
               GROUP BY facet_value
               ORDER BY subjects DESC, facet_value ASC
               LIMIT ?`
            )
            .all(engine, facetKey, limit) as Array<{ facet_value: string; subjects: number }>
        );
      },
      // All facet rows for one subject (used by the detail page).
      forSubject(rowKey: string): Array<{ engine: string; facet_key: string; facet_value: string }> {
        return getDb()
          .prepare(
            "SELECT engine, facet_key, facet_value FROM research_chart_facets WHERE subject_row_key = ? ORDER BY engine, facet_key, facet_value"
          )
          .all(rowKey) as Array<{ engine: string; facet_key: string; facet_value: string }>;
      },
    },
  },
  chat: {
    listForProfile(profileId: string): ChatMessage[] {
      return getDb()
        .prepare(
          "SELECT * FROM chat_messages WHERE profile_id = ? ORDER BY created_at ASC"
        )
        .all(profileId) as ChatMessage[];
    },
    save(data: {
      profile_id: string;
      role: "user" | "assistant";
      content: string;
      context_engines: string[];
    }): ChatMessage {
      const id = randomUUID();
      const created_at = new Date().toISOString();
      getDb()
        .prepare(
          `INSERT INTO chat_messages (id, profile_id, role, content, context_engines, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          data.profile_id,
          data.role,
          data.content,
          JSON.stringify(data.context_engines),
          created_at
        );
      return {
        id,
        profile_id: data.profile_id,
        role: data.role,
        content: data.content,
        context_engines: JSON.stringify(data.context_engines),
        created_at,
      };
    },
  },
};
