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

let schemaInitialized = false;

// Bump when the schema changes. ensureSchema() checks a schema_version table
// (not PRAGMA user_version — Turso's HTTP API rejects PRAGMA writes). Warm
// Lambda instances skip all DDL via the in-memory flag; cold instances do one
// SELECT to check the version.
const SCHEMA_VERSION = 6;

export async function ensureSchema() {
  if (schemaInitialized) return;

  const client = getClient();
  try {
    await client.execute(
      "CREATE TABLE IF NOT EXISTS schema_version (id INTEGER PRIMARY KEY DEFAULT 1, version INTEGER NOT NULL DEFAULT 0)"
    );
    await client.execute(
      "INSERT OR IGNORE INTO schema_version (id, version) VALUES (1, 0)"
    );

    const vr = await client.execute("SELECT version FROM schema_version WHERE id = 1");
    const dbVersion = Number(vr.rows[0]?.[0] ?? 0);
    if (dbVersion >= SCHEMA_VERSION) {
      schemaInitialized = true;
      return;
    }

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

    await client.execute("CREATE INDEX IF NOT EXISTS idx_readings_lookup ON readings (profile_id, engine);");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles (user_id);");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_compatibility_user ON compatibility_checks (user_id);");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_readings_profile ON readings (profile_id);");

    // New in v4: consultation requests + app settings
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
    await client.execute("CREATE INDEX IF NOT EXISTS idx_consultation_requests_user ON consultation_requests (user_id, status);");
    // Seed default settings — ignore conflict if already seeded.
    await client.execute(`INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('live_consultation_enabled', 'false', '${new Date().toISOString()}')`);

    // Column migrations — silently skip if column already exists.
    try { await client.execute("ALTER TABLE users ADD COLUMN created_at TEXT;"); } catch {}
    try { await client.execute("ALTER TABLE profiles ADD COLUMN relationship TEXT;"); } catch {}
    try { await client.execute("ALTER TABLE profiles ADD COLUMN gender TEXT;"); } catch {}
    try { await client.execute("ALTER TABLE profiles ADD COLUMN current_location TEXT;"); } catch {}
    try { await client.execute("ALTER TABLE profiles ADD COLUMN current_latitude REAL;"); } catch {}
    try { await client.execute("ALTER TABLE profiles ADD COLUMN current_longitude REAL;"); } catch {}
    try { await client.execute("ALTER TABLE profiles ADD COLUMN current_timezone TEXT;"); } catch {}
    try { await client.execute("ALTER TABLE profiles ADD COLUMN current_timezone_offset REAL;"); } catch {}

    // v5: options field + user feedback on consultation requests
    try { await client.execute("ALTER TABLE consultation_requests ADD COLUMN options TEXT;"); } catch {}
    try { await client.execute("ALTER TABLE consultation_requests ADD COLUMN user_rating TEXT;"); } catch {}
    try { await client.execute("ALTER TABLE consultation_requests ADD COLUMN user_feedback_note TEXT;"); } catch {}

    // v6: payment tracking
    try { await client.execute("ALTER TABLE consultation_requests ADD COLUMN amount_paise INTEGER;"); } catch {}

    await client.execute(
      `INSERT OR REPLACE INTO schema_version (id, version) VALUES (1, ${SCHEMA_VERSION})`
    );
    schemaInitialized = true;
  } catch (e) {
    console.error("Failed to initialize schema:", e);
  }
}
