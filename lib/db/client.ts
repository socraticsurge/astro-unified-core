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
const SCHEMA_VERSION = 11;

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
    await client.execute({
      sql: "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
      args: ["live_consultation_enabled", "false", new Date().toISOString()],
    });

    function migrate(sql: string) {
      return client.execute(sql).catch((e: Error) => {
        if (!e.message?.includes("duplicate column name") && !e.message?.includes("already exists")) {
          console.warn("DB migration warning:", e.message, "|", sql);
        }
      });
    }

    // Column migrations — silently skip if column already exists.
    await migrate("ALTER TABLE users ADD COLUMN created_at TEXT;");
    await migrate("ALTER TABLE profiles ADD COLUMN relationship TEXT;");
    await migrate("ALTER TABLE profiles ADD COLUMN gender TEXT;");
    await migrate("ALTER TABLE profiles ADD COLUMN current_location TEXT;");
    await migrate("ALTER TABLE profiles ADD COLUMN current_latitude REAL;");
    await migrate("ALTER TABLE profiles ADD COLUMN current_longitude REAL;");
    await migrate("ALTER TABLE profiles ADD COLUMN current_timezone TEXT;");
    await migrate("ALTER TABLE profiles ADD COLUMN current_timezone_offset REAL;");

    // v5: options field + user feedback on consultation requests
    await migrate("ALTER TABLE consultation_requests ADD COLUMN options TEXT;");
    await migrate("ALTER TABLE consultation_requests ADD COLUMN user_rating TEXT;");
    await migrate("ALTER TABLE consultation_requests ADD COLUMN user_feedback_note TEXT;");

    // v6: payment tracking
    await migrate("ALTER TABLE consultation_requests ADD COLUMN amount_paise INTEGER;");

    // v8: AI insight ratings on readings
    await migrate("ALTER TABLE readings ADD COLUMN rating INTEGER;");
    await migrate("ALTER TABLE readings ADD COLUMN rated_at TEXT;");

    // v10/v11: user chat messages — kept as migrate() so it runs idempotently
    // even if the schema_version was already bumped to 10 by a partial migration.
    await migrate(`CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
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
    )`);
    await migrate("CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages (user_id, created_at)");
    await migrate("CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages (session_id)");
    // v11 patch: session_id column on existing chat_messages rows (no-op if table was just created)
    await migrate("ALTER TABLE chat_messages ADD COLUMN session_id TEXT NOT NULL DEFAULT ''");

    // v7: live consultation slot booking
    await client.execute(`
      CREATE TABLE IF NOT EXISTS consultation_slots (
        id TEXT PRIMARY KEY,
        starts_at TEXT NOT NULL,
        is_booked INTEGER NOT NULL DEFAULT 0
      );
    `);
    await client.execute("CREATE INDEX IF NOT EXISTS idx_slots_starts_at ON consultation_slots (starts_at);");
    try { await client.execute("ALTER TABLE consultation_requests ADD COLUMN slot_starts_at TEXT;"); } catch {}

    // v9: daily-landing cache (one row per IST date; payload NULL until first
    // successful generation; attempts tracks retry budget per day).
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
    await client.execute("CREATE INDEX IF NOT EXISTS idx_daily_landing_generated ON daily_landing (generated_at);");

    // v10: user chat messages log (quota + feedback)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
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
    await client.execute("CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages (user_id, created_at);");

    await client.execute(
      `INSERT OR REPLACE INTO schema_version (id, version) VALUES (1, ${SCHEMA_VERSION})`
    );
    schemaInitialized = true;
  } catch (e) {
    console.error("Failed to initialize schema:", e);
  }
}
