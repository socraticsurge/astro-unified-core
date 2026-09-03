import { createClient, type Client } from "@libsql/client";

let clientInstance: Client | null = null;

export function getClient(): Client {
  if (clientInstance) return clientInstance;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) console.warn("TURSO_DATABASE_URL is not set");

  clientInstance = createClient({ url: url || "file:dummy.db", authToken });
  return clientInstance;
}

interface SchemaInitializationAttempt {
  promise: Promise<void>;
}

// The focused bootstrap shares the deployed guard chain's two-second ceiling:
// admission proceeds only when its single idempotent batch finishes with time
// left for the next signalled operation. Its own deadline also releases the
// shared memo for a later request. The full, sequential bootstrap gets a longer
// but still finite window so a lost Turso request cannot pin a warm instance.
const SCHEMA_INITIALIZATION_TIMEOUT_MS = 15_000;
const RATE_LIMIT_SCHEMA_INITIALIZATION_TIMEOUT_MS = 2_000;

let schemaInitialized = false;
let schemaInitialization: SchemaInitializationAttempt | null = null;
let rateLimitSchemaInitialized = false;
let rateLimitSchemaInitialization: SchemaInitializationAttempt | null = null;

// Bump when the schema changes. ensureSchema() checks a schema_version table
// (not PRAGMA user_version — Turso's HTTP API rejects PRAGMA writes).
//
// Schema lifecycle, designed to be resilient to drift between the version
// flag and reality (Sentry: ASTROCHAGANTI-9 — "no such table: chat_messages"
// despite the version row being at SCHEMA_VERSION):
//
//   1. bootstrapTables() runs on EVERY cold start. All CREATE TABLE / CREATE
//      INDEX statements use IF NOT EXISTS, so it's idempotent and cheap. Any
//      new table added to the codebase exists on first request, regardless
//      of what schema_version says.
//   2. runMigrations() runs only when the DB is behind SCHEMA_VERSION. These
//      are the destructive/incremental steps (ALTER TABLE ADD COLUMN, data
//      seeds) that genuinely need version gating.
//   3. Errors from either step propagate to the caller — we no longer
//      swallow them and pretend the schema is ready. A failed migration
//      surfaces as a clear 500 at the route, gets captured by Sentry, and
//      gets fixed once instead of silently corrupting requests forever.
const SCHEMA_VERSION = 12;

export async function ensureSchema() {
  if (schemaInitialized) return;
  let attempt = schemaInitialization;
  if (!attempt) {
    attempt = {
      promise: withInitializationDeadline(
        initializeSchema(),
        SCHEMA_INITIALIZATION_TIMEOUT_MS,
        "Database schema",
      ),
    };
    schemaInitialization = attempt;
  }

  try {
    await attempt.promise;
    if (schemaInitialization === attempt) {
      schemaInitialized = true;
      schemaInitialization = null;
    }
  } catch (error) {
    if (schemaInitialization === attempt) schemaInitialization = null;
    throw error;
  }
}

/**
 * Prepare only the three limiter objects needed on a guest-route cold start.
 * The full application schema contains many sequential remote DDL statements;
 * making limiter admission wait for all of them would turn a normal cold start
 * into a false storage outage. The full bootstrap also calls this helper.
 */
export async function ensureRateLimitSchema() {
  if (rateLimitSchemaInitialized) return;
  let attempt = rateLimitSchemaInitialization;
  if (!attempt) {
    attempt = {
      promise: withInitializationDeadline(
        initializeRateLimitSchema(),
        RATE_LIMIT_SCHEMA_INITIALIZATION_TIMEOUT_MS,
        "Rate-limit schema",
      ),
    };
    rateLimitSchemaInitialization = attempt;
  }

  try {
    await attempt.promise;
    if (rateLimitSchemaInitialization === attempt) {
      rateLimitSchemaInitialized = true;
      rateLimitSchemaInitialization = null;
    }
  } catch (error) {
    if (rateLimitSchemaInitialization === attempt) {
      rateLimitSchemaInitialization = null;
    }
    throw error;
  }
}

function withInitializationDeadline(
  operation: Promise<void>,
  timeoutMs: number,
  label: string,
): Promise<void> {
  // Initializers deliberately do not mutate the memoized state themselves.
  // If an uncancellable DDL finishes after this deadline, its idempotent SQL is
  // harmless and this old attempt has no reference with which to clobber a
  // newer attempt.
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`${label} initialization timed out`));
    }, timeoutMs);
    const unref = (timer as unknown as { unref?: () => void }).unref;
    if (typeof unref === "function") unref.call(timer);

    operation.then(
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function initializeRateLimitSchema() {
  const client = getClient();
  // One remote write transaction prevents an outer caller timeout from
  // leaving a sequential initializer free to dispatch additional DDL later.
  await client.batch([
    `
      CREATE TABLE IF NOT EXISTS distributed_rate_limits (
        counter_key TEXT PRIMARY KEY
          CHECK(length(counter_key) = 64 AND counter_key NOT GLOB '*[^0-9a-f]*'),
        count INTEGER NOT NULL CHECK(count BETWEEN 1 AND 1000000),
        expires_at_ms INTEGER NOT NULL CHECK(expires_at_ms > 0)
      ) WITHOUT ROWID;
    `,
    `
      CREATE TABLE IF NOT EXISTS geocoder_provider_budget (
        budget_key TEXT PRIMARY KEY
          CHECK(length(budget_key) = 64 AND budget_key NOT GLOB '*[^0-9a-f]*'),
        utc_day TEXT NOT NULL,
        day_count INTEGER NOT NULL CHECK(day_count BETWEEN 1 AND 1500),
        daily_limit INTEGER NOT NULL CHECK(daily_limit BETWEEN 1 AND 1500),
        next_allowed_at_ms INTEGER NOT NULL CHECK(next_allowed_at_ms > 0),
        CHECK(day_count <= daily_limit)
      ) WITHOUT ROWID;
    `,
    "CREATE INDEX IF NOT EXISTS idx_distributed_rate_limits_expiry ON distributed_rate_limits (expires_at_ms);",
  ], "write");
}

async function initializeSchema() {
  const client = getClient();

  await client.execute(
    "CREATE TABLE IF NOT EXISTS schema_version (id INTEGER PRIMARY KEY DEFAULT 1, version INTEGER NOT NULL DEFAULT 0)"
  );
  await client.execute(
    "INSERT OR IGNORE INTO schema_version (id, version) VALUES (1, 0)"
  );

  await bootstrapTables(client);

  const vr = await client.execute("SELECT version FROM schema_version WHERE id = 1");
  const dbVersion = Number(vr.rows[0]?.[0] ?? 0);
  if (dbVersion < SCHEMA_VERSION) {
    await runMigrations(client);
    await client.execute(
      `INSERT OR REPLACE INTO schema_version (id, version) VALUES (1, ${SCHEMA_VERSION})`
    );
  }
}

// Always-on idempotent DDL. Add new tables/indexes here as the schema grows
// so a fresh deploy or drifted version flag is self-healing.
async function bootstrapTables(client: Client) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      image TEXT,
      last_login TEXT
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      time_of_birth TEXT NOT NULL,
      place_of_birth TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      timezone TEXT NOT NULL,
      timezone_offset REAL NOT NULL,
      created_at TEXT NOT NULL,
      current_location TEXT,
      current_latitude REAL,
      current_longitude REAL,
      current_timezone TEXT,
      current_timezone_offset REAL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS compatibility_checks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      profile_id_1 TEXT NOT NULL,
      profile_id_2 TEXT NOT NULL,
      score REAL NOT NULL,
      result_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS readings (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      engine TEXT NOT NULL,
      input_snapshot TEXT NOT NULL,
      output_data TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      user_email TEXT,
      rating TEXT NOT NULL,
      message TEXT,
      page_url TEXT,
      created_at TEXT NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS consultation_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      profile_ids TEXT NOT NULL,
      life_area TEXT NOT NULL,
      observation TEXT NOT NULL,
      constraint_text TEXT NOT NULL,
      objective TEXT NOT NULL,
      delivery_mode TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_note TEXT,
      created_at TEXT NOT NULL,
      answered_at TEXT
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS consultation_slots (
      id TEXT PRIMARY KEY,
      starts_at TEXT NOT NULL,
      is_booked INTEGER NOT NULL DEFAULT 0
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS daily_landing (
      id TEXT PRIMARY KEY,
      ist_date TEXT UNIQUE NOT NULL,
      payload TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_attempt_at TEXT,
      generated_at TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // chat_messages — the table whose absence prompted the ensureSchema
  // rewrite. Created with the full v11 column set so a fresh DB doesn't
  // need any of the ALTER COLUMN migrations below.
  await client.execute(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL DEFAULT '',
      user_id TEXT NOT NULL,
      profile_id TEXT,
      check_id TEXT,
      session_type TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      model TEXT,
      rating INTEGER,
      rated_at TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Shared abuse counters contain only deployment-scoped HMAC digests and
  // integer timing/count fields. Guest identifiers and profile/place data are
  // never written to these tables. The focused helper keeps guest cold starts
  // independent of the rest of this full schema bootstrap.
  await ensureRateLimitSchema();

  await client.execute("CREATE INDEX IF NOT EXISTS idx_readings_lookup ON readings (profile_id, engine);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles (user_id);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_compatibility_user ON compatibility_checks (user_id);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_readings_profile ON readings (profile_id);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_consultation_requests_user ON consultation_requests (user_id, status);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_slots_starts_at ON consultation_slots (starts_at);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_daily_landing_generated ON daily_landing (generated_at);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages (user_id, created_at);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages (session_id);");

  // Seed the live-consultation default — INSERT OR IGNORE is idempotent.
  await client.execute({
    sql: "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
    args: ["live_consultation_enabled", "false", new Date().toISOString()],
  });
}

// Version-gated migrations: ALTER TABLE for older DBs that pre-date a column.
// Each runs through migrate(), which silently no-ops only on the
// expected-idempotency errors (duplicate column / already exists). Any other
// failure rethrows so a real problem doesn't get silently buried.
async function runMigrations(client: Client) {
  await migrate(client, "ALTER TABLE users ADD COLUMN created_at TEXT;");
  await migrate(client, "ALTER TABLE profiles ADD COLUMN relationship TEXT;");
  await migrate(client, "ALTER TABLE profiles ADD COLUMN gender TEXT;");
  await migrate(client, "ALTER TABLE profiles ADD COLUMN current_location TEXT;");
  await migrate(client, "ALTER TABLE profiles ADD COLUMN current_latitude REAL;");
  await migrate(client, "ALTER TABLE profiles ADD COLUMN current_longitude REAL;");
  await migrate(client, "ALTER TABLE profiles ADD COLUMN current_timezone TEXT;");
  await migrate(client, "ALTER TABLE profiles ADD COLUMN current_timezone_offset REAL;");

  // v5: options + user feedback on consultation requests
  await migrate(client, "ALTER TABLE consultation_requests ADD COLUMN options TEXT;");
  await migrate(client, "ALTER TABLE consultation_requests ADD COLUMN user_rating TEXT;");
  await migrate(client, "ALTER TABLE consultation_requests ADD COLUMN user_feedback_note TEXT;");

  // v6: payment tracking
  await migrate(client, "ALTER TABLE consultation_requests ADD COLUMN amount_paise INTEGER;");

  // v7: slot booking
  await migrate(client, "ALTER TABLE consultation_requests ADD COLUMN slot_starts_at TEXT;");

  // v8: AI insight ratings on readings
  await migrate(client, "ALTER TABLE readings ADD COLUMN rating INTEGER;");
  await migrate(client, "ALTER TABLE readings ADD COLUMN rated_at TEXT;");

  // v11: session_id column on existing chat_messages rows (the bootstrap
  // CREATE TABLE above already includes it for fresh DBs).
  await migrate(client, "ALTER TABLE chat_messages ADD COLUMN session_id TEXT NOT NULL DEFAULT ''");
}

// Rethrow on any error that isn't an expected idempotent-noop. Previously
// this helper logged-and-continued unconditionally, which let a failed
// CREATE TABLE silently pass while the version row was bumped — the exact
// shape of the chat_messages incident.
async function migrate(client: Client, sql: string) {
  try {
    await client.execute(sql);
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (msg.includes("duplicate column name") || msg.includes("already exists")) return;
    throw e;
  }
}
